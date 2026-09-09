import { AfterViewInit, Component, ElementRef, EventEmitter, NgZone, OnDestroy, Output, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThreatLensCategoryMapData, ThreatLensCategoryModelKey } from '../../models/geo-fencing.models';
import { ThreatLensService } from '../threat-lens.service';
import { loadEsriModules } from '../map-utils/threat-lens-arcgis.loader';
import { ThreatLensGeoUtils } from '../map-utils/threat-lens-geo.utils';
import { ThreatLensMapUtils } from '../map-utils/threat-lens-map.utils';
import { ThreatLensArcRenderer } from '../map-overlays/threat-lens-arc.renderer';
import { ThreatLensCountryLayerRenderer } from '../map-overlays/threat-lens-country-layer.renderer';
import { ThreatLensIpMarkerRenderer } from '../map-overlays/threat-lens-ip-marker.renderer';
import { ThreatLensTooltipRenderer } from '../map-overlays/threat-lens-tooltip.renderer';
import { EsriConstructor, EsriExtent, EsriFeatureLayer, EsriGeometry, EsriGeometryEngine, EsriGraphicsLayer, EsriMapLike, EsriSceneView, EsriWebMercatorUtils, ThreatLensArcBatchStatus, ThreatLensArcRenderResult, ThreatLensArcSelection, ThreatLensCoordinates, ThreatLensCountryBoundary, ThreatLensCountrySelection, ThreatLensIpRecord, ThreatLensIpViewportScanRequest, ThreatLensMapGraphic } from '../models/threat-lens-map.types';
import { TranslationService } from '../../../../shared/services/translation.service';

@Component({
  selector: 'app-threat-lens-map-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './threat-lens-map-renderer.component.html',
})
export class ThreatLensMapRendererComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) private mapContainer?: ElementRef<HTMLDivElement>;
  private view: EsriSceneView | null = null;
  private countryRenderer = new ThreatLensCountryLayerRenderer();
  private readonly translationService = inject(TranslationService);
  private tooltipRenderer = new ThreatLensTooltipRenderer(key => this.translationService.translate(key));
  private arcRenderer: ThreatLensArcRenderer | null = null;
  private ipMarkerRenderer: ThreatLensIpMarkerRenderer | null = null;
  private geometryEngine: EsriGeometryEngine | null = null;
  private webMercatorUtils: EsriWebMercatorUtils | null = null;
  private countryFillGraphicsLayer: EsriGraphicsLayer | null = null;
  private arcGraphicsLayer: EsriGraphicsLayer | null = null;
  private animatedArcGraphicsLayer: EsriGraphicsLayer | null = null;
  private ipScanGraphicsLayer: EsriGraphicsLayer | null = null;
  private mapClickHandle: { remove: () => void } | null = null;
  private pointerMoveHandle: { remove: () => void } | null = null;
  private mapPointerLeaveHandle: { remove: () => void } | null = null;
  private documentPointerMoveHandle: { remove: () => void } | null = null;
  private viewScaleWatchHandle: { remove: () => void } | null = null;
  private viewZoomWatchHandle: { remove: () => void } | null = null;
  private viewInteractingWatchHandle: { remove: () => void } | null = null;
  private viewportDragHandle: { remove: () => void } | null = null;
  private viewportWheelHandle: { remove: () => void } | null = null;
  private mapResizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private mapResizeFrame: number | null = null;
  private viewportIpScanTimer: ReturnType<typeof setTimeout> | null = null;
  private hoverHitTestPending = false;
  private lastHoverHitTestAt = 0;
  private hoveredCountryKey = '';
  private activeBasemapId = '';
  private lastViewportIpScanKey = '';
  private hasPendingViewportNavigation = false;
  private destroyed = false;
  private cypressMapFallback = false;
  private readonly darkThreatBasemapId = 'dark-gray-vector';
  private readonly darkStreetBasemapId = 'streets-night-vector';
  private readonly lightThreatBasemapId = 'gray-vector';
  private readonly lightStreetBasemapId = 'streets-vector';
  private readonly streetBasemapMinZoom = 6;
  private readonly hoverHitTestMinIntervalMs = 80;
  private readonly maxGlobeCanvasAspectRatio = 1.62;

  isMapCursorPointer = false;

  @Output() mapReady = new EventEmitter<void>();
  @Output() mapError = new EventEmitter<string>();
  @Output() countrySelected = new EventEmitter<ThreatLensCountrySelection>();
  @Output() emptySelection = new EventEmitter<void>();
  @Output() ipSelected = new EventEmitter<string>();
  @Output() arcSelected = new EventEmitter<ThreatLensArcSelection>();
  @Output() viewportIpScanRequested = new EventEmitter<ThreatLensIpViewportScanRequest>();
  @Output() arcCountChange = new EventEmitter<number>();
  @Output() arcBatchStatusChange = new EventEmitter<ThreatLensArcBatchStatus | null>();

  constructor(private ngZone: NgZone, private threatLensService: ThreatLensService) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      void this.initializeMap();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.mapClickHandle?.remove();
    this.pointerMoveHandle?.remove();
    this.mapPointerLeaveHandle?.remove();
    this.documentPointerMoveHandle?.remove();
    this.viewScaleWatchHandle?.remove();
    this.viewZoomWatchHandle?.remove();
    this.viewInteractingWatchHandle?.remove();
    this.viewportDragHandle?.remove();
    this.viewportWheelHandle?.remove();
    this.mapResizeObserver?.disconnect();
    this.themeObserver?.disconnect();
    this.arcRenderer?.destroy();
    this.ipMarkerRenderer?.clear();
    this.countryRenderer.destroy();
    this.tooltipRenderer.destroy();

    if (this.mapResizeFrame !== null) {
      cancelAnimationFrame(this.mapResizeFrame);
      this.mapResizeFrame = null;
    }
    this.clearViewportIpScanTimer();

    this.view?.destroy();
    this.view = null;
    this.geometryEngine = null;
    this.webMercatorUtils = null;
  }

  hasCountryKey(countryKey: string): boolean {
    return this.countryRenderer.hasCountryKey(countryKey);
  }

  getCountryName(countryKey: string): string {
    return this.countryRenderer.getCountryName(countryKey);
  }

  renderThreatData(categoryData: ThreatLensCategoryMapData[], activeCountryFilterKey: string): ThreatLensArcRenderResult {
    this.countryRenderer.setSelectedCountryKey(activeCountryFilterKey);
    const arcResult = this.arcRenderer?.render(categoryData, activeCountryFilterKey) ?? { totalArcCount: 0, arcCountByCategory: new Map() };
    return arcResult;
  }

  setArcBatchSize(size: number): void {
    this.arcRenderer?.setBatchSize(size);
  }

  setArcRangeIndex(index: number): void {
    this.arcRenderer?.setSelectedRangeIndex(index);
  }

  setArcCategoryFilter(categoryKey: ThreatLensCategoryModelKey | null): void {
    this.arcRenderer?.setActiveCategory(categoryKey);
  }

  async focusCountryByKey(countryKey: string): Promise<ThreatLensCountrySelection | null> {
    if (!this.view || !countryKey) {
      return null;
    }

    const graphic = this.countryRenderer.getFeature(countryKey);
    if (!graphic) {
      return null;
    }

    const selection = this.buildCountrySelection(graphic);
    this.countryRenderer.setSelectedCountryKey(selection.key);
    this.countryRenderer.applyHighlight(graphic);
    const center = this.getFeatureAnchorCoordinates(graphic);

    if (center) {
      const target: Record<string, unknown> = { center: [center.lon, center.lat] };
      const currentZoom = Number(this.view.zoom);
      if (Number.isFinite(currentZoom)) {
        target.zoom = currentZoom;
      }

      this.clearViewportNavigationRequest();
      await this.view.goTo(target, { duration: 750, easing: 'ease-in-out' }).then(() => undefined, () => undefined);
      this.clearViewportNavigationRequest();
    }
    return selection;
  }

  renderIpScanMarkers(records: ThreatLensIpRecord[], center: ThreatLensCoordinates, radiusKm: number, boundary: ThreatLensCountryBoundary | null = null): boolean {
    if (this.cypressMapFallback) {
      return records.length > 0;
    }
    return this.ipMarkerRenderer?.render(records, center, radiusKm, boundary) ?? false;
  }

  clearIpScanMarkers(): void {
    this.ipMarkerRenderer?.clear();
  }

  clearSelections(): void {
    this.countryRenderer.clearHighlight();
    this.countryRenderer.setSelectedCountryKey('');
    this.clearHoverHighlight();
    this.tooltipRenderer.hide();
  }

  async resetGlobePosition(): Promise<void> {
    if (!this.view) {
      return;
    }

    await this.view.goTo({
      position: { longitude: 0, latitude: 0, z: 25000000 },
      tilt: 0,
    }, { duration: 500 }).then(() => undefined, () => undefined);
  }

  requestViewportIpScan(): boolean {
    return this.emitViewportIpScanRequest(true);
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapContainer?.nativeElement) {
      return;
    }

    if (this.shouldUseCypressMapFallback()) {
      this.initializeCypressMapFallback();
      return;
    }

    try {
      const [
        EsriMap,
        SceneView,
        FeatureLayer,
        GraphicsLayer,
        geometryEngine,
        webMercatorUtils,
      ] = await loadEsriModules<[
            EsriConstructor<EsriMapLike>,
            EsriConstructor<EsriSceneView>,
            EsriConstructor<EsriFeatureLayer>,
            EsriConstructor<EsriGraphicsLayer>,
            EsriGeometryEngine,
            EsriWebMercatorUtils,
          ]>([
            'esri/Map',
            'esri/views/SceneView',
            'esri/layers/FeatureLayer',
            'esri/layers/GraphicsLayer',
            'esri/geometry/geometryEngine',
            'esri/geometry/support/webMercatorUtils',
          ]);

      if (this.destroyed) {
        return;
      }

      this.geometryEngine = geometryEngine;
      this.webMercatorUtils = webMercatorUtils;
      const countryLayer = this.countryRenderer.createLayer(FeatureLayer);
      this.countryFillGraphicsLayer = new GraphicsLayer({
        title: 'Threat Lens Country Fills',
        elevationInfo: { mode: 'on-the-ground' },
      });
      this.countryRenderer.setFillGraphicsLayer(this.countryFillGraphicsLayer);
      this.arcGraphicsLayer = new GraphicsLayer({
        title: 'Threat Lens Country Arcs',
        elevationInfo: { mode: 'absolute-height' },
      });
      this.animatedArcGraphicsLayer = new GraphicsLayer({
        title: 'Threat Lens Animated Arcs',
        elevationInfo: { mode: 'absolute-height' },
      });
      this.ipScanGraphicsLayer = new GraphicsLayer({ title: 'Threat Lens IP Scan Markers' });

      const initialBasemapId = this.getThreatBasemapId();
      this.activeBasemapId = initialBasemapId;

      const map = new EsriMap({
        basemap: initialBasemapId,
        layers: [
          countryLayer,
          this.countryFillGraphicsLayer,
          this.arcGraphicsLayer,
          this.animatedArcGraphicsLayer,
          this.ipScanGraphicsLayer,
        ],
      });

      this.view = new SceneView({
        container: this.mapContainer.nativeElement,
        map,
        qualityProfile: 'high',
        viewingMode: 'global',
        camera: {
          position: { longitude: 0, latitude: 0, z: 25000000 },
          tilt: 0,
        },
        constraints: {
          tilt: { max: 0.5 },
        },
        navigation: {
          actionMap: {
            dragPrimary: 'pan',
            dragSecondary: 'none',
            dragTertiary: 'none',
          },
        },
        environment: this.getSceneEnvironment(),
      });

      await this.view.when();
      if (this.destroyed) {
        return;
      }

      this.view.ui.components = [];
      this.view.highlightOptions = { color: [96, 165, 250, 0.98], haloOpacity: 0.55, fillOpacity: 0.08 };
      this.updateBasemapForZoom();
      await this.countryRenderer.init(this.view,
        (value) => this.threatLensService.normalizeCountryLabel(value),
        (value) => this.toCountryKey(value),);

      if (this.destroyed) {
        return;
      }

      this.arcRenderer = new ThreatLensArcRenderer(this.ngZone,
        this.countryRenderer,
        this.arcGraphicsLayer,
        this.animatedArcGraphicsLayer,
        geometryEngine,
        webMercatorUtils,
        (value) => this.toCountryKey(value),
        (count) => {
          this.arcCountChange.emit(count);
        },
        (status) => {
          this.arcBatchStatusChange.emit(status);
        },);
      this.ipMarkerRenderer = new ThreatLensIpMarkerRenderer(this.view, this.ipScanGraphicsLayer);

      this.tooltipRenderer.init();
      this.observeMapResize();
      this.observeThemeChanges();
      this.scheduleMapResize();
      [0, 150, 500, 1000, 2000].forEach((delay) => window.setTimeout(() => {
        this.scheduleMapResize();
      }, delay));
      this.registerViewScaleWatcher();
      this.registerBasemapWatcher();
      this.registerViewInteractingWatcher();
      this.registerViewportNavigationHandler();
      this.registerClickHandler();
      this.registerHoverHandler();
      this.ngZone.run(() => {
        this.mapReady.emit();
      });
    }
    catch (error) {
      console.error('Failed to initialize threat lens map', error);
      this.ngZone.run(() => {
        this.mapError.emit('Failed to initialize threat lens map.');
      });
    }
  }

  private shouldUseCypressMapFallback(): boolean {
    return typeof window !== 'undefined' && 'Cypress' in window;
  }

  private initializeCypressMapFallback(): void {
    this.cypressMapFallback = true;
    const container = this.mapContainer?.nativeElement;
    if (container) {
      const fallback = document.createElement('div');
      fallback.setAttribute('data-testid', 'threat-lens-map-fallback');
      fallback.className = 'flex h-full w-full items-center justify-center bg-black text-[12px] text-[var(--color-text3)] [body.light-theme_&]:bg-[#edf4fb]';
      fallback.textContent = this.translationService.translate('Threat Lens map fallback');
      container.replaceChildren(fallback);
    }
    this.ngZone.run(() => {
      this.mapReady.emit();
    });
  }

  private registerClickHandler(): void {
    if (!this.view || !this.countryRenderer.layer) {
      return;
    }

    this.mapClickHandle = this.view.on('click', async (event) => {
      if (!this.view || !this.countryRenderer.layer) {
        return;
      }

      const hit = await this.view.hitTest(event, {
        include: [
          this.ipScanGraphicsLayer,
          this.animatedArcGraphicsLayer,
          this.arcGraphicsLayer,
          this.countryRenderer.layer,
        ].filter(Boolean),
      });
      const clusterGraphic = hit.results.find((result) => this.ipMarkerRenderer?.isClusterGraphic(result.graphic))?.graphic;
      if (clusterGraphic) {
        this.tooltipRenderer.hide();
        this.clearHoverHighlight();
        return;
      }

      const ipGraphic = hit.results.find((result) => this.ipMarkerRenderer?.isMarkerGraphic(result.graphic))?.graphic;

      if (ipGraphic) {
        const ip = typeof ipGraphic.attributes?.ip === 'string' ? ipGraphic.attributes.ip : '';
        if (ip) {
          this.tooltipRenderer.hide();
          this.clearHoverHighlight();
          this.ngZone.run(() => {
            this.ipSelected.emit(ip);
          });
        }
        return;
      }

      const endpointGraphic = hit.results.find((result) => this.arcRenderer?.isEndpointGraphic(result.graphic))?.graphic;
      if (endpointGraphic) {
        const selection = this.buildArcSelection(endpointGraphic.attributes ?? {});
        if (selection) {
          this.tooltipRenderer.hide();
          this.clearHoverHighlight();
          this.ngZone.run(() => {
            this.arcSelected.emit(selection);
          });
        }
        return;
      }

      const countryGraphic = hit.results.find((result) => result.graphic?.layer === this.countryRenderer.layer)?.graphic;

      if (countryGraphic) {
        const selection = this.buildCountrySelection(countryGraphic);
        this.ngZone.run(() => {
          this.countrySelected.emit(selection);
        });
        await this.focusCountryByKey(selection.key);
        this.emitViewportIpScanRequest(true);
        return;
      }

      const arcGraphic = hit.results.find((result) => this.arcRenderer?.isTooltipGraphic(result.graphic))?.graphic;
      if (arcGraphic) {
        const selection = this.buildArcSelection(arcGraphic.attributes ?? {});
        if (selection) {
          this.tooltipRenderer.hide();
          this.clearHoverHighlight();
          this.ngZone.run(() => {
            this.arcSelected.emit(selection);
          });
        }
        return;
      }

      this.countryRenderer.clearHighlight();
      this.countryRenderer.setSelectedCountryKey('');
      this.ngZone.run(() => {
        this.emptySelection.emit();
      });
    });
  }

  private registerHoverHandler(): void {
    if (!this.view || !this.countryRenderer.layer) {
      return;
    }

    this.registerTooltipDismissHandlers();
    this.pointerMoveHandle = this.view.on('pointer-move', async (event) => {
      if (!this.view || !this.countryRenderer.layer || this.view.interacting) {
        this.hideHoverTooltip();
        return;
      }

      const now = performance.now();
      if (this.hoverHitTestPending || now - this.lastHoverHitTestAt < this.hoverHitTestMinIntervalMs) {
        this.tooltipRenderer.move(event);
        return;
      }

      this.hoverHitTestPending = true;
      this.lastHoverHitTestAt = now;

      const hit = await this.view.hitTest(event, {
        include: [
          this.ipScanGraphicsLayer,
          this.animatedArcGraphicsLayer,
          this.arcGraphicsLayer,
          this.countryRenderer.layer,
        ].filter(Boolean),
      }).finally(() => {
        this.hoverHitTestPending = false;
      });

      const clusterGraphic = hit.results.find((result) => this.ipMarkerRenderer?.isClusterGraphic(result.graphic))?.graphic;
      if (clusterGraphic) {
        this.clearHoverHighlight();
        this.setMapCursor('');
        this.ipMarkerRenderer?.showAccuracyRadius(clusterGraphic);
        this.tooltipRenderer.showIpCluster(event, clusterGraphic.attributes ?? {});
        return;
      }

      const ipGraphic = hit.results.find((result) => this.ipMarkerRenderer?.isMarkerGraphic(result.graphic))?.graphic;
      if (ipGraphic) {
        this.clearHoverHighlight();
        this.setMapCursor('pointer');
        this.ipMarkerRenderer?.showAccuracyRadius(ipGraphic);
        this.tooltipRenderer.showIpScan(event, ipGraphic.attributes ?? {});
        return;
      }

      const arcGraphic = hit.results.find((result) => this.arcRenderer?.isTooltipGraphic(result.graphic))?.graphic;
      if (arcGraphic) {
        this.clearCountryHoverHighlight();
        this.ipMarkerRenderer?.clearAccuracyRadius();
        if (this.arcRenderer?.isEndpointGraphic(arcGraphic)) {
          this.setMapCursor('pointer');
          this.arcRenderer.setHoveredEndpointGraphic(arcGraphic);
        }
        else {
          this.setMapCursor('');
          this.arcRenderer?.clearEndpointHover();
        }
        this.tooltipRenderer.hide();
        return;
      }

      const countryGraphic = hit.results.find((result) => result.graphic?.layer === this.countryRenderer.layer)?.graphic;
      if (!countryGraphic) {
        this.clearHoverHighlight();
        this.tooltipRenderer.hide();
        return;
      }

      const selection = this.buildCountrySelection(countryGraphic, false);
      if (this.hoveredCountryKey === selection.key) {
        this.tooltipRenderer.move(event);
        return;
      }

      this.clearHoverHighlight();
      this.setMapCursor('pointer');
      this.hoveredCountryKey = selection.key;
      this.countryRenderer.applyHoverHighlight(countryGraphic);
      this.tooltipRenderer.showCountry(event, selection.name);
    });
  }

  private registerTooltipDismissHandlers(): void {
    const mapElement = this.mapContainer?.nativeElement;
    if (!mapElement || typeof document === 'undefined') {
      return;
    }

    this.mapPointerLeaveHandle?.remove();
    this.documentPointerMoveHandle?.remove();

    const hide = () => {
      this.hideHoverTooltip();
    };
    const handleDocumentPointerMove = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }

      if (!mapElement.contains(target) || this.isMapUiElement(target)) {
        hide();
      }
    };

    mapElement.addEventListener('pointerleave', hide);
    document.addEventListener('pointermove', handleDocumentPointerMove, true);

    this.mapPointerLeaveHandle = { remove: () => {
      mapElement.removeEventListener('pointerleave', hide);
    } };
    this.documentPointerMoveHandle = { remove: () => {
      document.removeEventListener('pointermove', handleDocumentPointerMove, true);
    } };
  }

  private isMapUiElement(target: Element): boolean {
    return Boolean(target.closest('.map-overlay-menu, .esri-ui, .ui-filter-sidebar-panel, app-threat-lens-ip-detail-popup'));
  }

  private hideHoverTooltip(): void {
    this.clearHoverHighlight();
    this.tooltipRenderer.hide();
  }

  private buildCountrySelection(countryGraphic: ThreatLensMapGraphic, includeIpScanRequest = true): ThreatLensCountrySelection {
    const name = this.countryRenderer.extractCountryName(countryGraphic?.attributes);
    const key = this.toCountryKey(name);
    return {
      name,
      key,
      ipScanRequest: includeIpScanRequest ? this.getCountryIpScanRequest(countryGraphic) : null,
    };
  }

  private buildArcSelection(attributes: Record<string, unknown>): ThreatLensArcSelection | null {
    const categoryKey = String(attributes.category ?? '').trim();
    const countryAKey = String(attributes.country_a ?? '').trim();
    const countryBKey = String(attributes.country_b ?? '').trim();

    if (!categoryKey || !countryAKey || !countryBKey) {
      return null;
    }

    return {
      categoryKey: categoryKey as ThreatLensCategoryModelKey,
      categoryLabel: String(attributes.category_label ?? 'Threat').trim(),
      countryAKey,
      countryBKey,
      countryAName: String(attributes.start_country ?? countryAKey).trim(),
      countryBName: String(attributes.end_country ?? countryBKey).trim(),
      weight: Number(attributes.weight ?? 0),
    };
  }

  private registerViewScaleWatcher(): void {
    if (!this.view?.watch) {
      return;
    }

    this.viewScaleWatchHandle?.remove();
    this.viewScaleWatchHandle = this.view.watch('scale', () => {
      this.ipMarkerRenderer?.updateSymbols();
      this.markViewportNavigation();
    });
  }

  private registerBasemapWatcher(): void {
    if (!this.view?.watch) {
      return;
    }

    this.viewZoomWatchHandle?.remove();
    this.viewZoomWatchHandle = this.view.watch('zoom', () => {
      this.updateBasemapForZoom();
      this.ipMarkerRenderer?.updateSymbols();
      this.markViewportNavigation();
    });
  }

  private registerViewInteractingWatcher(): void {
    if (!this.view?.watch) {
      return;
    }

    this.viewInteractingWatchHandle?.remove();
    this.viewInteractingWatchHandle = this.view.watch('interacting', (isInteracting: boolean) => {
      this.arcRenderer?.setAnimationPaused(isInteracting);
      if (isInteracting) {
        this.hasPendingViewportNavigation = true;
        this.clearViewportIpScanTimer();
        return;
      }
      if (this.hasPendingViewportNavigation) {
        this.scheduleViewportIpScanRequest();
      }
    });
  }

  private registerViewportNavigationHandler(): void {
    if (!this.view?.on) {
      return;
    }

    this.viewportDragHandle?.remove();
    this.viewportWheelHandle?.remove();
    this.viewportDragHandle = this.view.on('drag', () => {
      this.markViewportNavigation();
    });
    this.viewportWheelHandle = this.view.on('mouse-wheel', () => {
      this.markViewportNavigation();
    });
  }

  private markViewportNavigation(): void {
    this.hasPendingViewportNavigation = true;
    this.scheduleViewportIpScanRequest();
  }

  private scheduleViewportIpScanRequest(): void {
    if (this.destroyed) {
      return;
    }

    this.clearViewportIpScanTimer();

    this.viewportIpScanTimer = setTimeout(() => {
      this.viewportIpScanTimer = null;
      this.hasPendingViewportNavigation = false;
      this.emitViewportIpScanRequest();
    }, 1000);
  }

  private clearViewportIpScanTimer(): void {
    if (this.viewportIpScanTimer !== null) {
      clearTimeout(this.viewportIpScanTimer);
      this.viewportIpScanTimer = null;
    }
  }

  private clearViewportNavigationRequest(): void {
    this.hasPendingViewportNavigation = false;
    this.clearViewportIpScanTimer();
  }

  private emitViewportIpScanRequest(force = false): boolean {
    const viewport = this.getIpScanViewport();
    if (!viewport) {
      return false;
    }

    const key = `${viewport.center.lat.toFixed(2)}:${viewport.center.lon.toFixed(2)}:${Math.round(viewport.radiusKm / 25)}`;
    if (!force && key === this.lastViewportIpScanKey) {
      return false;
    }

    this.lastViewportIpScanKey = key;
    this.ngZone.run(() => {
      this.viewportIpScanRequested.emit(viewport);
    });
    return true;
  }

  private getIpScanViewport(): ThreatLensIpViewportScanRequest | null {
    const center = this.getViewportCenterCoordinates();
    if (!center) {
      return null;
    }

    return {
      center,
      radiusKm: this.getViewportRadiusKm(center),
    };
  }

  private getCountryIpScanRequest(countryGraphic: ThreatLensMapGraphic): ThreatLensIpViewportScanRequest | null {
    const extent = countryGraphic?.geometry?.extent ?? countryGraphic?.geometry;
    const center = this.getFeatureAnchorCoordinates(countryGraphic);
    if (!center) {
      return null;
    }

    const corners = this.getExtentCornerCoordinates(extent);
    const distances = corners.map((point) => ThreatLensGeoUtils.getThreatLensDistanceKm(center, point)).filter((value) => Number.isFinite(value) && value > 0);
    const radiusKm = distances.length ? Math.max(...distances) : 250;

    return {
      center,
      radiusKm: Math.round(Math.max(25, Math.min(12000, radiusKm))),
      boundary: this.getCountryBoundary(countryGraphic),
    };
  }

  private getCountryBoundary(countryGraphic: ThreatLensMapGraphic): ThreatLensCountryBoundary | null {
    const rings = countryGraphic?.geometry?.rings;
    if (!Array.isArray(rings) || !rings.length) {
      return null;
    }

    const convertedRings = rings
      .map((ring: unknown[]) => Array.isArray(ring)
        ? ring.map((point) => this.toRingCoordinates(point)).filter((point): point is ThreatLensCoordinates => Boolean(point))
        : [])
      .filter((ring: ThreatLensCoordinates[]) => ring.length >= 3);

    if (!convertedRings.length) {
      return null;
    }

    const extent = convertedRings.reduce((bounds, ring) => {
      for (const point of ring) {
        bounds.minLat = Math.min(bounds.minLat, point.lat);
        bounds.maxLat = Math.max(bounds.maxLat, point.lat);
        bounds.minLon = Math.min(bounds.minLon, point.lon);
        bounds.maxLon = Math.max(bounds.maxLon, point.lon);
      }
      return bounds;
    }, {
      minLat: 90,
      maxLat: -90,
      minLon: 180,
      maxLon: -180,
    });

    return {
      rings: convertedRings,
      extent,
    };
  }

  private toRingCoordinates(point: unknown): ThreatLensCoordinates | null {
    if (Array.isArray(point)) {
      return this.toThreatLensCoordinates({ x: point[0], y: point[1] });
    }

    return point && typeof point === 'object'
      ? this.toThreatLensCoordinates(point as EsriGeometry)
      : null;
  }

  private getExtentCornerCoordinates(extent: EsriExtent | EsriGeometry | null | undefined): ThreatLensCoordinates[] {
    const xmin = Number(extent?.xmin);
    const xmax = Number(extent?.xmax);
    const ymin = Number(extent?.ymin);
    const ymax = Number(extent?.ymax);
    if (![xmin, xmax, ymin, ymax].every(Number.isFinite)) {
      return [];
    }

    return [
      this.toThreatLensCoordinates({ x: xmin, y: ymin }),
      this.toThreatLensCoordinates({ x: xmax, y: ymin }),
      this.toThreatLensCoordinates({ x: xmin, y: ymax }),
      this.toThreatLensCoordinates({ x: xmax, y: ymax }),
    ].filter((point): point is ThreatLensCoordinates => Boolean(point));
  }

  private getFeatureAnchorCoordinates(feature: ThreatLensMapGraphic): ThreatLensCoordinates | null {
    if (!this.geometryEngine || !this.webMercatorUtils) {
      return null;
    }
    const anchor = ThreatLensMapUtils.getFeatureAnchor(feature, this.geometryEngine, this.webMercatorUtils);

    if (!ThreatLensMapUtils.isValidLngLat(anchor)) {
      return null;
    }

    return {
      lat: anchor[1],
      lon: anchor[0],
    };
  }

  private getViewportCenterCoordinates(): ThreatLensCoordinates | null {
    const width = Number(this.view?.width ?? 0);
    const height = Number(this.view?.height ?? 0);
    if (width > 0 && height > 0) {
      const center = this.getMapCoordinatesAtScreen(width / 2, height / 2);
      if (center) {
        return center;
      }
    }

    return this.toThreatLensCoordinates(this.view?.center) ?? this.toThreatLensCoordinates(this.view?.camera?.position);
  }

  private getViewportRadiusKm(center: ThreatLensCoordinates): number {
    const width = Number(this.view?.width ?? 0);
    const height = Number(this.view?.height ?? 0);
    const edgePoints = width > 0 && height > 0
      ? [
        this.getMapCoordinatesAtScreen(width * 0.18, height / 2),
        this.getMapCoordinatesAtScreen(width * 0.82, height / 2),
        this.getMapCoordinatesAtScreen(width / 2, height * 0.18),
        this.getMapCoordinatesAtScreen(width / 2, height * 0.82),
      ].filter((point): point is ThreatLensCoordinates => Boolean(point))
      : [];
    const distances = edgePoints.map((point) => ThreatLensGeoUtils.getThreatLensDistanceKm(center, point)).filter((value) => Number.isFinite(value) && value > 0);
    const radiusKm = distances.length ? Math.max(...distances) : this.defaultViewportRadiusKm();

    return Math.round(Math.max(25, Math.min(12000, radiusKm)));
  }

  private getMapCoordinatesAtScreen(x: number, y: number): ThreatLensCoordinates | null {
    if (!this.view?.toMap) {
      return null;
    }

    try {
      return this.toThreatLensCoordinates(this.view.toMap({ x, y }));
    }
    catch {
      return null;
    }
  }

  private toThreatLensCoordinates(point: EsriGeometry | null | undefined): ThreatLensCoordinates | null {
    const lat = Number(point?.latitude ?? point?.lat);
    const lon = Number(point?.longitude ?? point?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90) {
      return this.normalizeCoordinates(lat, lon);
    }

    const x = Number(point?.x);
    const y = Number(point?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    if (Math.abs(x) <= 180 && Math.abs(y) <= 90) {
      return this.normalizeCoordinates(y, x);
    }

    if (this.webMercatorUtils?.xyToLngLat) {
      try {
        const [convertedLon, convertedLat] = this.webMercatorUtils.xyToLngLat(x, y);
        if (Number.isFinite(convertedLat) && Number.isFinite(convertedLon)) {
          return this.normalizeCoordinates(convertedLat, convertedLon);
        }
      }
      catch (error) {
        void error;
      }
    }

    const convertedLon = (x / 20037508.34) * 180;
    const mercatorLat = (y / 20037508.34) * 180;
    const convertedLat = (180 / Math.PI) * (2 * Math.atan(Math.exp((mercatorLat * Math.PI) / 180)) - (Math.PI / 2));
    if (!Number.isFinite(convertedLat) || !Number.isFinite(convertedLon)) {
      return null;
    }

    return this.normalizeCoordinates(convertedLat, convertedLon);
  }

  private normalizeCoordinates(lat: number, lon: number): ThreatLensCoordinates | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90) {
      return null;
    }

    return {
      lat: Math.round(lat * 1000000) / 1000000,
      lon: Math.round(ThreatLensGeoUtils.normalizeThreatLensLongitude(lon) * 1000000) / 1000000,
    };
  }

  private defaultViewportRadiusKm(): number {
    const zoom = Number(this.view?.zoom);
    if (Number.isFinite(zoom)) {
      return Math.max(25, Math.min(12000, 12000 / Math.max(1, zoom)));
    }

    return 1000;
  }

  private updateBasemapForZoom(): void {
    if (!this.view?.map) {
      return;
    }

    const nextBasemapId = (this.view.zoom ?? 0) >= this.streetBasemapMinZoom ? this.getStreetBasemapId() : this.getThreatBasemapId();
    if (nextBasemapId === this.activeBasemapId) {
      return;
    }

    this.activeBasemapId = nextBasemapId;
    this.view.map.basemap = nextBasemapId;
  }

  private observeThemeChanges(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.themeObserver?.disconnect();
    this.themeObserver = new MutationObserver(() => {
      this.applyThemeMode();
    });
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  private applyThemeMode(): void {
    if (!this.view) {
      return;
    }

    this.view.environment = this.getSceneEnvironment();
    this.activeBasemapId = '';
    this.updateBasemapForZoom();
    this.view.requestRender?.();
  }

  private getThreatBasemapId(): string {
    return this.isLightTheme() ? this.lightThreatBasemapId : this.darkThreatBasemapId;
  }

  private getStreetBasemapId(): string {
    return this.isLightTheme() ? this.lightStreetBasemapId : this.darkStreetBasemapId;
  }

  private getSceneEnvironment(): Record<string, unknown> {
    if (this.isLightTheme()) {
      return {
        background: { type: 'color', color: [231, 239, 249, 1] },
        atmosphereEnabled: false,
        starsEnabled: false,
      };
    }

    return {
      atmosphereEnabled: false,
      starsEnabled: true,
    };
  }

  private isLightTheme(): boolean {
    return typeof document !== 'undefined' && document.body.classList.contains('light-theme');
  }

  private observeMapResize(): void {
    const element = this.mapContainer?.nativeElement;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.mapResizeObserver?.disconnect();
    this.mapResizeObserver = new ResizeObserver(() => {
      this.scheduleMapResize();
    });
    this.mapResizeObserver.observe(element);
  }

  private scheduleMapResize(): void {
    if (this.mapResizeFrame !== null || typeof requestAnimationFrame !== 'function') {
      return;
    }

    this.mapResizeFrame = requestAnimationFrame(() => {
      this.mapResizeFrame = null;
      this.view?.resize?.();
      this.syncArcgisCanvasBackingSize();
    });
  }

  private syncArcgisCanvasBackingSize(): void {
    const element = this.mapContainer?.nativeElement;
    const canvas = element?.querySelector('canvas');
    if (!element || !canvas) {
      return;
    }

    const renderedBackingHeight = Math.round(element.clientHeight * (window.devicePixelRatio || 1));
    const aspectBackingHeight = Math.round(canvas.width / this.maxGlobeCanvasAspectRatio);
    const nextBackingHeight = Math.max(renderedBackingHeight, aspectBackingHeight);
    if (nextBackingHeight > canvas.height) {
      canvas.height = nextBackingHeight;
      this.view?.requestRender?.();
    }
  }

  private clearHoverHighlight(): void {
    this.clearCountryHoverHighlight();
    this.arcRenderer?.clearEndpointHover();
    this.ipMarkerRenderer?.clearAccuracyRadius();
    this.setMapCursor('');
  }

  private clearCountryHoverHighlight(): void {
    this.countryRenderer.clearHoverHighlight();
    this.hoveredCountryKey = '';
  }

  private setMapCursor(cursor: string): void {
    const isPointer = cursor === 'pointer';
    if (this.isMapCursorPointer !== isPointer) {
      this.ngZone.run(() => {
        this.isMapCursorPointer = isPointer;
      });
    }
  }

  private toCountryKey(value: string): string {
    const normalized = this.threatLensService.normalizeCountryLabel(value);
    return this.threatLensService._toCountryKey(normalized);
  }
}
