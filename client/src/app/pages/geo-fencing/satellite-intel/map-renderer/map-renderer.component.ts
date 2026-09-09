import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EnvironmentInjector, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { SatelliteAnomalyResponse, SatelliteLiveAircraft, SatelliteLiveShip } from '../model/satellite-intel-api.models';
import { OrionSatelliteFeature, TrackingEntityState, TrackingEntityType, TrackingSidebarBridge } from '../../models/geo-fencing.models';
import { SatelliteAircraftTrackingService } from '../map-entities/aircraft/aircraft-tracking.service';
import { EntityRenderer } from '../map-entities/entity-renderer';
import { SatelliteShipTrackingService } from '../map-entities/ships/ship-tracking.service';
import { normalizeEntityId } from '../map-utils/renderer-utils';
import { CountryBoundaryMapRenderer } from '../map-overlays/country-boundary-map-renderer';
import { SearchLocationMapRenderer } from '../map-overlays/search-location-map-renderer';
import { Observable, Subscription } from 'rxjs';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';
import type * as Leaflet from 'leaflet';
import { asUnknownRecord, Augmented, Nullable, UnknownRecord } from '../../../../shared/utils/type-guards.util';

type LoadableLeafletLayer = Augmented<Leaflet.Layer, Partial<{
  getMaplibreMap: () => { loaded: () => boolean; once: (event: string, handler: () => void) => void; off: (event: string, handler: () => void) => void };
  isLoading: () => boolean;
}>>;

@Component({
  selector:    'app-satellite-map-renderer',
  imports: [TranslatePipe],
  standalone:  true,
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './map-renderer.component.html',
  styleUrls: ['./map-renderer.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MapRendererComponent implements AfterViewInit, OnChanges, OnDestroy {
  private static readonly WORLD_BOUNDS: Leaflet.LatLngBoundsLiteral = [[-85.05112878, -180], [85.05112878, 180]];
  private static readonly OPEN_FREE_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('zoomLabelElement') private zoomLabelElement?: ElementRef<HTMLDivElement>;
  private leafletMap: Nullable<Leaflet.Map> = null;
  private esriLayer: Nullable<Leaflet.TileLayer> = null;
  private esriReferenceLayer: Nullable<Leaflet.TileLayer> = null;
  private osmLayer: Nullable<Leaflet.MaplibreGL> = null;
  private L: Nullable<typeof Leaflet> = null;
  private moveTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private entityRenderer?: EntityRenderer;
  private countryBoundaryRenderer?: CountryBoundaryMapRenderer;
  private searchLocationRenderer?: SearchLocationMapRenderer;
  private sidebarRequestToken = 0;
  private mapReadyEmitted = false;
  private mapReadySubscription?: Subscription;

  selectedEntity: { type: TrackingEntityType; data: UnknownRecord | null } | null = null;
  sidebarVisible = false;
  sidebarLoading = false;
  sidebarError: string | null = null;
  activeEntity: TrackingEntityState | null = null;
  loadingEntity: TrackingEntityState | null = null;

  @Input() lat:              number | null = null;
  @Input() lon:              number | null = null;
  @Input() delta             = 0.05;
  @Input() selectedLayer:    'esri' | 'osm' = 'osm';
  @Input() facilitiesVisible = true;
  @Input() facilityFeatures:  OrionSatelliteFeature[] = [];
  @Input() anomalyData:      SatelliteAnomalyResponse['result'] | null = null;
  @Input() aircraftData:     SatelliteLiveAircraft[] = [];
  @Input() shipsData:        SatelliteLiveShip[]     = [];
  @Input() orionData:        OrionSatelliteFeature[] = [];
  @Input() focusedFeature:   OrionSatelliteFeature | null = null;
  @Input() topControlsInset = false;

  @Output() mapMoved  = new EventEmitter<{ lat: number; lon: number; zoom: number; trackingDelta: number }>();
  @Output() featureSelected = new EventEmitter<OrionSatelliteFeature>();
  @Output() mapReady = new EventEmitter<void>();
  @Output() mapError = new EventEmitter<void>();

  constructor(private environmentInjector: EnvironmentInjector, private aircraftTrackingService: SatelliteAircraftTrackingService, private shipTrackingService: SatelliteShipTrackingService, private cd: ChangeDetectorRef, private ngZone: NgZone, private translationService: TranslationService) {}

  openSidebarLoading(type: TrackingEntityType, id: string, seedData: unknown): number {
    const token = ++this.sidebarRequestToken;
    this.ngZone.run(() => {
      this.selectedEntity  = { type, data: seedData == null ? null : asUnknownRecord(seedData) };
      this.sidebarVisible  = true;
      this.sidebarLoading  = true;
      this.sidebarError    = null;
      this.activeEntity    = { type, id };
      this.loadingEntity   = { type, id };
      this.refreshSelectionState();
      this.cd.detectChanges();
    });
    return token;
  }

  openSidebar(type: TrackingEntityType, data: unknown): void {
    this.ngZone.run(() => {
      this.selectedEntity = { type, data: asUnknownRecord(data) };
      this.sidebarVisible = true;
      this.sidebarLoading = false;
      this.sidebarError = null;
      const id = this.getEntityId(type, data);
      this.activeEntity = id ? { type, id } : this.activeEntity;
      this.loadingEntity = null;
      this.refreshSelectionState();
      this.cd.detectChanges();
    });
  }

  openSidebarError(type: TrackingEntityType, id: string, message: string): void {
    this.ngZone.run(() => {
      this.selectedEntity = { type, data: null };
      this.sidebarVisible = true;
      this.sidebarLoading = false;
      this.sidebarError = message || 'Unable to load details';
      this.activeEntity = { type, id };
      this.loadingEntity = null;
      this.refreshSelectionState();
      this.cd.detectChanges();
    });
  }

  closeSidebar(): void {
    this.selectedEntity = null;
    this.sidebarVisible = false;
    this.sidebarLoading = false;
    this.sidebarError = null;
    this.activeEntity = null;
    this.loadingEntity = null;
    this.entityRenderer?.clearAircraftTrack();
    this.refreshSelectionState();
    this.cd.detectChanges();
  }

  focusLocation(lat: number, lon: number, delta: number): void {
    this.lat = lat;
    this.lon = lon;
    this.delta = delta;
    this.ngZone.runOutsideAngular(() => {
      this.updateMapView();
    });
  }

  clearLocation(): void {
    this.lat = null;
    this.lon = null;
    this.searchLocationRenderer?.render(null, null);
    if (this.leafletMap && this.L) {
      this.leafletMap.fitBounds(this.L.latLngBounds(MapRendererComponent.WORLD_BOUNDS));
      this.updateZoomLabel();
    }
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      void this.initMap();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.ngZone.runOutsideAngular(() => {
      if (changes.lat || changes.lon || changes.delta) {
        this.updateMapView();
      }
      if (changes.facilityFeatures) {
        this.entityRenderer?.renderFacilities(this.facilityFeatures);
      }
      if (changes.anomalyData)     {
        this.entityRenderer?.renderAnomaly(this.anomalyData);
      }
      if (changes.aircraftData) {
        this.entityRenderer?.renderAircraft(true);
      }
      if (changes.shipsData) {
        this.entityRenderer?.renderShips(true);
      }
      if (changes.orionData) {
        this.entityRenderer?.renderOrionFacilities(true);
      }
      if (changes.focusedFeature) {
        this.focusOnFeature();
        this.entityRenderer?.renderOrionFacilities(true);
      }
      if (changes.selectedLayer)   {
        this.switchLayer();
      }
      if (changes.facilitiesVisible) {
        this.entityRenderer?.setFacilitiesVisible(this.facilitiesVisible);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
    }
    this.entityRenderer?.destroy();
    this.countryBoundaryRenderer?.destroy();
    this.searchLocationRenderer?.destroy();
    this.resizeObserver?.disconnect();
    this.mapReadySubscription?.unsubscribe();
    this.leafletMap?.remove();
  }

  private async initMap(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const [L, maplibreLeaflet] = await Promise.all([
        import('leaflet'),
        import('@maplibre/maplibre-gl-leaflet'),
      ]);
      this.L = L;
      if (!this.mapContainer?.nativeElement) {
        return;
      }

      this.leafletMap = this.L.map(this.mapContainer.nativeElement, {
        center:   [this.lat ?? 24.78, this.lon ?? 67.35],
        zoom:     2.5,
        minZoom:  2,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        zoomControl: true,
        attributionControl: false,
        maxBounds: this.L.latLngBounds(MapRendererComponent.WORLD_BOUNDS),
        maxBoundsViscosity: 1,
        worldCopyJump: false,
        zoomAnimation: true,
        fadeAnimation: true,
        scrollWheelZoom: true,
        wheelDebounceTime: 25,
        wheelPxPerZoomLevel: 90,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true,
        keyboard: true,
        keyboardPanDelta: 60,
        inertia: true,
        inertiaDeceleration: 3000,
        inertiaMaxSpeed: 1500,
        easeLinearity: 0.2,
        bounceAtZoomLimits: false,
        markerZoomAnimation: true,
        preferCanvas: true,
      });

      const imageryTileOptions = {
        attribution: '',
        maxZoom: 20,
        maxNativeZoom: 20,
        noWrap: true,
        bounds: MapRendererComponent.WORLD_BOUNDS,
        updateWhenIdle: false,
        updateWhenZooming: true,
        updateInterval: 150,
        keepBuffer: 2,
        detectRetina: false,
      };

      this.esriLayer = this.L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          ...imageryTileOptions,
          zIndex: 1,
        },);

      this.esriReferenceLayer = this.L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          ...imageryTileOptions,
          opacity: 0.9,
          zIndex: 2,
        },);

      this.osmLayer = maplibreLeaflet.maplibreGL({
        style: MapRendererComponent.OPEN_FREE_MAP_STYLE_URL,
        interactive: false,
        attributionControl: false,
        maxZoom: 19,
        renderWorldCopies: false,
        fadeDuration: 180,
      });

      const initialLayer = this.refreshBaseLayerDetail();
      this.updateZoomLabel();

      this.countryBoundaryRenderer = new CountryBoundaryMapRenderer(this.L, this.leafletMap);
      await this.countryBoundaryRenderer.init();
      this.countryBoundaryRenderer.setFocusedFeature(this.focusedFeature);
      this.searchLocationRenderer = new SearchLocationMapRenderer(this.L, this.leafletMap);

      this.updateMinZoomToFitContainer();
      const trackingSidebar: TrackingSidebarBridge = {
        getActiveEntity: () => this.activeEntity,
        getLoadingEntity: () => this.loadingEntity,
        isCurrentRequestToken: (token: number) => token === this.sidebarRequestToken,
        openLoading: (type: TrackingEntityType, id: string, seedData) => this.openSidebarLoading(type, id, seedData),
        openData: (type: TrackingEntityType, data) => {
          this.openSidebar(type, data);
        },
        openError: (type: TrackingEntityType, id: string, message: string) => {
          this.openSidebarError(type, id, message);
        },
      };
      this.entityRenderer = new EntityRenderer({
        L: this.L,
        map: this.leafletMap,
        environmentInjector: this.environmentInjector,
        aircraftService: this.aircraftTrackingService,
        shipService: this.shipTrackingService,
        sidebar: trackingSidebar,
        getAircraftData: () => this.aircraftData,
        getShipsData: () => this.shipsData,
        getOrionData: () => this.orionData,
        getFocusedFeature: () => this.focusedFeature,
        onFeatureSelected: (feature: OrionSatelliteFeature) => {
          this.ngZone.run(() => {
            this.featureSelected.emit(feature);
          });
        },
      });
      this.entityRenderer.init(this.facilitiesVisible);

      this.leafletMap.on('zoomstart', () => {
        this.loadingEntity = null;
      });

      this.leafletMap.on('zoomend', () => {
        const z = this.leafletMap?.getZoom() ?? 0;
        this.updateZoomLabel();
        this.refreshMarkerSizingForZoom(z);
        this.entityRenderer?.renderViewport();
        this.scheduleViewportEmit();
      });

      this.leafletMap.on('moveend', () => {
        this.updateZoomLabel();
        this.entityRenderer?.renderViewport();
        this.scheduleViewportEmit();
      });

      this.leafletMap.on('mousemove', (event: Leaflet.LeafletMouseEvent) => {
        this.updateZoomLabel(event.latlng);
      });

      this.leafletMap.on('mouseout', () => {
        this.updateZoomLabel();
      });

      if (Number.isFinite(this.lat) && Number.isFinite(this.lon)) {
        this.updateMapView();
      }
      if (this.facilityFeatures?.length) {
        this.entityRenderer?.renderFacilities(this.facilityFeatures);
      }
      if (this.anomalyData)     {
        this.entityRenderer?.renderAnomaly(this.anomalyData);
      }
      if (this.aircraftData?.length) {
        this.entityRenderer?.renderAircraft();
      }
      if (this.shipsData?.length) {
        this.entityRenderer?.renderShips();
      }
      if (this.orionData?.length) {
        this.entityRenderer?.renderOrionFacilities();
      }
      this.resizeObserver = new ResizeObserver(() => {
        this.leafletMap?.invalidateSize();
        this.updateMinZoomToFitContainer();
      });
      this.resizeObserver.observe(this.mapContainer.nativeElement);
      setTimeout(() => {
        this.leafletMap?.invalidateSize();
        this.updateMinZoomToFitContainer();
        this.updateZoomLabel();
        this.scheduleViewportEmit();
      }, 0);
      this.mapReadySubscription?.unsubscribe();
      this.mapReadySubscription = this.waitForTileLayerLoad(initialLayer).subscribe(() => {
        this.emitMapReady();
      });
    }
    catch {
      this.ngZone.run(() => {
        this.mapError.emit();
      });
    }
  }

  private updateMapView(): void {
    const lat = this.lat;
    const lon = this.lon;
    if (!this.leafletMap || typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }
    this.leafletMap.setView([lat, lon], this.deltaToZoom(this.delta));
    this.leafletMap.invalidateSize();
    this.searchLocationRenderer?.render(lat, lon);
    this.updateZoomLabel();
  }

  private updateMinZoomToFitContainer(): void {
    if (!this.leafletMap || !this.L) {
      return;
    }

    const worldBounds = this.L.latLngBounds(MapRendererComponent.WORLD_BOUNDS);
    const minZoom = Math.max(1, this.leafletMap.getBoundsZoom(worldBounds, true));
    this.leafletMap.setMinZoom(minZoom);

    if (this.leafletMap.getZoom() < minZoom) {
      this.leafletMap.setZoom(minZoom);
    }
    this.updateZoomLabel();
  }

  private switchLayer(): void {
    if (!this.leafletMap || !this.L) {
      return;
    }
    this.refreshBaseLayerDetail();
  }

  private refreshBaseLayerDetail(): Nullable<LoadableLeafletLayer> {
    if (!this.leafletMap) {
      return null;
    }
    const map = this.leafletMap;

    [this.esriLayer, this.esriReferenceLayer, this.osmLayer].forEach(layer => {
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    if (this.selectedLayer === 'osm') {
      this.osmLayer?.addTo(map);
      return this.osmLayer;
    }
    else {
      this.esriLayer?.addTo(map);
      this.esriReferenceLayer?.addTo(map);
      return this.esriLayer;
    }
  }

  private waitForTileLayerLoad(layer: Nullable<LoadableLeafletLayer>): Observable<void> {
    return new Observable<void>((subscriber) => {
      const maplibreMap = layer?.getMaplibreMap?.();
      const eventSource = maplibreMap ?? layer;
      const isLoaded = maplibreMap
        ? maplibreMap.loaded?.()
        : typeof layer?.isLoading === 'function' && !layer.isLoading();

      if (!layer || isLoaded) {
        subscriber.next();
        subscriber.complete();
        return;
      }

      const finish = () => {
        if (subscriber.closed) {
          return;
        }
        subscriber.next();
        subscriber.complete();
      };
      const onLoad = () => {
        window.clearTimeout(timeout);
        finish();
      };
      const timeout = window.setTimeout(finish, 12000);
      eventSource?.once?.('load', onLoad);

      return () => {
        window.clearTimeout(timeout);
        eventSource?.off?.('load', onLoad);
      };
    });
  }

  private emitMapReady(): void {
    if (this.mapReadyEmitted) {
      return;
    }
    this.mapReadyEmitted = true;
    this.ngZone.run(() => {
      this.mapReady.emit();
    });
  }

  private refreshSelectionState(): void {
    this.entityRenderer?.refreshSelectionState();
  }

  private getEntityId(type: TrackingEntityType, data: unknown): string | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    if (type === 'aircraft' && 'icao24' in data) {
      return normalizeEntityId(data.icao24);
    }
    if (type === 'ship' && 'mmsi' in data) {
      return normalizeEntityId(data.mmsi);
    }
    return null;
  }

  private refreshMarkerSizingForZoom(zoom: number): void {
    const bucket = Math.round(zoom * 2);
    this.entityRenderer?.setMarkerZoomBucket(bucket);
  }

  private updateZoomLabel(coordinates?: { lat: number; lng: number }): void {
    if (!this.leafletMap || !this.zoomLabelElement?.nativeElement) {
      return;
    }
    const location = coordinates ?? this.leafletMap.getCenter();
    const zoom = this.leafletMap.getZoom();
    const latitude = `${Math.abs(location.lat).toFixed(4)}°${location.lat >= 0 ? 'N' : 'S'}`;
    const longitude = `${Math.abs(location.lng).toFixed(4)}°${location.lng >= 0 ? 'E' : 'W'}`;
    this.zoomLabelElement.nativeElement.textContent = `${this.translationService.translate('Zoom')} ${zoom.toFixed(1)}  ·  ${latitude}  ${longitude}`;
  }

  private scheduleViewportEmit(): void {
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
    }
    this.moveTimer = setTimeout(() => {
      if (!this.leafletMap) {
        return;
      }
      const center = this.leafletMap.getCenter();
      const viewport = {
        lat: center.lat,
        lon: center.lng,
        zoom: this.leafletMap.getZoom(),
        trackingDelta: this.getVisibleBoundsDelta(),
      };
      this.ngZone.run(() => {
        this.mapMoved.emit(viewport);
      });
    }, 500);
  }

  private getVisibleBoundsDelta(): number {
    const bounds = this.leafletMap?.getBounds?.();
    if (!bounds) {
      return this.delta;
    }
    const latDelta = Math.abs(bounds.getNorth() - bounds.getSouth()) / 2;
    const west = bounds.getWest();
    const east = bounds.getEast();
    const lonSpan = east >= west ? east - west : east + 360 - west;
    const lonDelta = Math.min(180, Math.abs(lonSpan) / 2);
    return Math.max(0.05, Math.min(180, Math.max(latDelta, lonDelta)));
  }

  private focusOnFeature(): void {
    this.countryBoundaryRenderer?.setFocusedFeature(this.focusedFeature);
    if (!this.leafletMap || !this.L || !this.focusedFeature) {
      return;
    }
    const [lon, lat] = this.focusedFeature.coordinates;
    const currentZoom = this.leafletMap.getZoom();
    this.leafletMap.flyTo([lat, lon], Math.max(currentZoom, 8));
  }

  private deltaToZoom(d: number): number {
    if (d <= 0.005) {
      return 17;
    } if (d <= 0.01) {
      return 16;
    } if (d <= 0.02) {
      return 15;
    }
    if (d <= 0.04)  {
      return 14;
    } if (d <= 0.08) {
      return 13;
    } if (d <= 0.15) {
      return 12;
    }
    if (d <= 0.3)   {
      return 11;
    } if (d <= 0.6)  {
      return 10;
    } return 9;
  }
}
