import { NgZone } from '@angular/core';
import { AnimatedArcDescriptor, ArcDrawState, ThreatLensCategoryMapData, ThreatLensCategoryModelKey } from '../../models/geo-fencing.models';
import { ThreatLensMapUtils } from '../map-utils/threat-lens-map.utils';
import { ArcCategoryBatch, EsriGeometry, EsriGeometryEngine, EsriGraphicsLayer, EsriWebMercatorUtils, LngLat, ThreatLensArcBatchStatus, ThreatLensArcRenderResult, ThreatLensMapGraphic } from '../models/threat-lens-map.types';
import { ThreatLensCountryLayerRenderer } from './threat-lens-country-layer.renderer';
import { getOwnProperty } from '../../../../shared/utils/type-guards.util';


export class ThreatLensArcRenderer {
  private animatedArcs: AnimatedArcDescriptor[] = [];
  private arcBatches: ArcCategoryBatch[] = [];
  private arcDrawStates: ArcDrawState<ThreatLensMapGraphic>[] = [];
  private animationFrame: number | null = null;
  private lastAnimationTick = 0;
  private visibleBatchDrawStartTime = 0;
  private animationPauseStartTime = 0;
  private visibleBatchIndex = -1;
  private selectedBatchIndex = 0;
  private animationPaused = false;
  private activeCategoryKey: ThreatLensCategoryModelKey | null = null;
  private movingDotGraphics: ThreatLensMapGraphic[] = [];
  private receiverPulseGraphics: ThreatLensMapGraphic[] = [];
  private endpointHitTargetGraphics: ThreatLensMapGraphic[] = [];
  private startMarkerGraphics: ThreatLensMapGraphic[] = [];
  private endMarkerGraphics: ThreatLensMapGraphic[] = [];
  private hoveredEndpointGraphic: ThreatLensMapGraphic | null = null;
  private loggedCoordinateValidationKeys = new Set<string>();
  private loggedSkippedArcKeys = new Set<string>();
  private readonly maxArcCount = 1000;
  private readonly minArcWeight = 1;
  private arcBatchSize = 10;
  private readonly arcDrawDuration = 1900;
  private readonly arcDrawStaggerMs = 90;
  private readonly maxArcDrawStaggerMs = 900;
  private readonly movingDotBaseSize = 5;
  private readonly endpointBaseSize = 18;
  private readonly endpointHitTargetSize = 46;
  private readonly arcElevationMeters = 98000;

  constructor( private ngZone: NgZone, private countryRenderer: ThreatLensCountryLayerRenderer, private arcGraphicsLayer: EsriGraphicsLayer, private animatedArcGraphicsLayer: EsriGraphicsLayer, private geometryEngine: EsriGeometryEngine, private webMercatorUtils: EsriWebMercatorUtils, private toCountryKey: (value: string) => string, private onVisibleArcCountChange: (count: number) => void, private onBatchStatusChange: (status: ThreatLensArcBatchStatus | null) => void, ) {}

  render(categoryData: ThreatLensCategoryMapData[], activeCountryFilterKey: string): ThreatLensArcRenderResult {
    if (!this.arcGraphicsLayer || !this.animatedArcGraphicsLayer) {
      return { totalArcCount: 0, arcCountByCategory: new Map() };
    }

    this.stop();
    this.arcGraphicsLayer.removeAll();
    this.animatedArcGraphicsLayer.removeAll();
    this.animatedArcs = [];
    this.arcBatches = [];
    this.arcDrawStates = [];
    this.visibleBatchIndex = -1;
    this.selectedBatchIndex = 0;
    this.visibleBatchDrawStartTime = 0;
    this.animationPauseStartTime = 0;
    this.loggedCoordinateValidationKeys.clear();
    this.loggedSkippedArcKeys.clear();

    const arcCountByCategory = new Map();
    let totalArcCount = 0;

    for (const category of categoryData) {
      const pairs = ThreatLensMapUtils.collectArcPairs(category.documentCountryGroups,
        this.toCountryKey,
        this.countryRenderer.featureIndex,
        this.maxArcCount,
        this.minArcWeight,);
      const visiblePairs = activeCountryFilterKey
        ? pairs.filter((pair) => pair.countryAKey === activeCountryFilterKey || pair.countryBKey === activeCountryFilterKey)
        : pairs;

      let renderedArcCount = 0;

      for (const pair of visiblePairs) {
        const featureA = this.countryRenderer.getFeature(pair.countryAKey);
        const featureB = this.countryRenderer.getFeature(pair.countryBKey);
        const start = ThreatLensMapUtils.getFeatureAnchor(featureA, this.geometryEngine, this.webMercatorUtils);
        const end = ThreatLensMapUtils.getFeatureAnchor(featureB, this.geometryEngine, this.webMercatorUtils);

        if (!ThreatLensMapUtils.isValidLngLat(start)) {
          this.logSkippedArc(category, pair, pair.countryAKey, 'missing or invalid start coordinates');
          continue;
        }

        if (!ThreatLensMapUtils.isValidLngLat(end)) {
          this.logSkippedArc(category, pair, pair.countryBKey, 'missing or invalid end coordinates');
          continue;
        }

        this.logCountryCoordinateValidation(pair.countryAKey, start);
        this.logCountryCoordinateValidation(pair.countryBKey, end);

        const arcPoints = ThreatLensMapUtils.buildSurfacePathPoints(start, end);
        const surfacePaths = ThreatLensMapUtils.buildSurfacePath(start, end);
        if (!surfacePaths.length || arcPoints.length < 2) {
          continue;
        }

        this.animatedArcs.push({
          categoryKey: category.categoryKey,
          categoryLabel: category.categoryLabel,
          color: category.color,
          weight: pair.weight,
          arcPoints,
          surfacePaths,
          countryAKey: pair.countryAKey,
          countryBKey: pair.countryBKey,
          countryAName: this.countryRenderer.extractCountryName(featureA?.attributes),
          countryBName: this.countryRenderer.extractCountryName(featureB?.attributes),
          animationOffset: renderedArcCount * 0.11,
          animationDuration: Math.max(1800, 3300 - Math.min(1200, pair.weight * 110)),
        });

        renderedArcCount += 1;
      }

      arcCountByCategory.set(category.categoryKey, renderedArcCount);
      totalArcCount += renderedArcCount;
    }

    this.rebuildBatches();
    this.renderSelectedBatch();
    this.start();

    const firstVisibleBatch = this.getVisibleBatchSequence()[0];
    return {
      totalArcCount: firstVisibleBatch?.items.length ?? Math.min(totalArcCount, this.arcBatchSize),
      arcCountByCategory,
    };
  }

  setBatchSize(size: number): void {
    const nextSize = Math.max(1, Math.min(this.maxArcCount, Math.round(Number(size) || this.arcBatchSize)));
    if (nextSize === this.arcBatchSize) {
      return;
    }

    this.arcBatchSize = nextSize;
    this.selectedBatchIndex = 0;
    this.rebuildBatches();
    this.resetRangeAnimation();
    this.renderSelectedBatch();
  }

  setActiveCategory(categoryKey: ThreatLensCategoryModelKey | null): void {
    if (categoryKey === this.activeCategoryKey) {
      return;
    }

    this.activeCategoryKey = categoryKey;
    this.selectedBatchIndex = 0;
    this.resetRangeAnimation();
    this.renderSelectedBatch();
  }

  setSelectedRangeIndex(index: number): void {
    const nextIndex = Math.max(0, Math.round(Number(index) || 0));
    if (nextIndex === this.selectedBatchIndex) {
      return;
    }

    this.selectedBatchIndex = nextIndex;
    this.resetRangeAnimation();
    this.renderSelectedBatch();
  }

  stop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.animatedArcGraphicsLayer?.removeAll();
    this.lastAnimationTick = 0;
    this.visibleBatchDrawStartTime = 0;
    this.animationPauseStartTime = 0;
    this.visibleBatchIndex = -1;
    this.arcDrawStates = [];
    this.hoveredEndpointGraphic = null;
    this.movingDotGraphics = [];
    this.receiverPulseGraphics = [];
    this.endpointHitTargetGraphics = [];
    this.startMarkerGraphics = [];
    this.endMarkerGraphics = [];
    this.countryRenderer.setConnectedCountryKeys([]);
    this.onBatchStatusChange(null);
  }

  destroy(): void {
    this.stop();
    this.arcGraphicsLayer?.removeAll();
    this.animatedArcGraphicsLayer?.removeAll();
    this.animatedArcs = [];
    this.arcBatches = [];
    this.arcDrawStates = [];
    this.movingDotGraphics = [];
    this.receiverPulseGraphics = [];
    this.endpointHitTargetGraphics = [];
    this.hoveredEndpointGraphic = null;
  }

  isTooltipGraphic(graphic: ThreatLensMapGraphic | null | undefined): boolean {
    const role = graphic?.attributes?.role;
    return role === 'arc' || role === 'arc-surface' || role === 'arc-start' || role === 'arc-end' || role === 'arc-start-hit' || role === 'arc-end-hit' || role === 'arc-traveler';
  }

  isEndpointGraphic(graphic: ThreatLensMapGraphic | null | undefined): boolean {
    const role = graphic?.attributes?.role;
    return role === 'arc-start' || role === 'arc-end' || role === 'arc-start-hit' || role === 'arc-end-hit';
  }

  setHoveredEndpointGraphic(graphic: ThreatLensMapGraphic | null): void {
    const nextGraphic = this.resolveEndpointIconGraphic(graphic);
    if (this.hoveredEndpointGraphic === nextGraphic) {
      return;
    }

    if (this.hoveredEndpointGraphic) {
      this.setEndpointHoverState(this.hoveredEndpointGraphic, false);
    }

    this.hoveredEndpointGraphic = nextGraphic;

    if (this.hoveredEndpointGraphic) {
      this.setEndpointHoverState(this.hoveredEndpointGraphic, true);
    }
  }

  clearEndpointHover(): void {
    this.setHoveredEndpointGraphic(null);
  }

  setAnimationPaused(paused: boolean): void {
    this.animationPaused = paused;
  }

  private start(): void {
    if (!this.animatedArcGraphicsLayer || !this.animatedArcs.length) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      const animate = (timestamp: number) => {
        if (!this.animatedArcGraphicsLayer) {
          this.animationFrame = null;
          return;
        }

        if (this.animationPaused) {
          if (!this.animationPauseStartTime) {
            this.animationPauseStartTime = timestamp;
          }

          this.animationFrame = requestAnimationFrame(animate);
          return;
        }

        if (this.animationPauseStartTime) {
          const pausedDuration = timestamp - this.animationPauseStartTime;
          if (this.visibleBatchDrawStartTime) {
            this.visibleBatchDrawStartTime += pausedDuration;
          }
          this.animationPauseStartTime = 0;
          this.lastAnimationTick = timestamp;
        }

        if (this.lastAnimationTick && (timestamp - this.lastAnimationTick) < 40) {
          this.animationFrame = requestAnimationFrame(animate);
          return;
        }

        this.lastAnimationTick = timestamp;
        const batch = this.getSelectedBatch();

        if (batch.index !== this.visibleBatchIndex) {
          this.renderBatch(batch.index, batch.batch, timestamp);
        }

        this.updateArcDrawGraphics(timestamp);

        let index = 0;
        for (const arc of batch.batch?.items ?? []) {
          const progress = ((timestamp + (arc.animationOffset * arc.animationDuration)) % arc.animationDuration) / arc.animationDuration;
          const point = ThreatLensMapUtils.getSurfacePointAtProgress(arc.arcPoints, progress);
          const graphic = getOwnProperty(this.movingDotGraphics, index);
          const receiverGraphic = getOwnProperty(this.receiverPulseGraphics, index);

          if (point && graphic) {
            const [lon, lat] = point;
            graphic.geometry = this.buildPointGeometry([lon, lat]);
            this.updateDataPacketSymbol(graphic, arc, progress);
          }

          if (receiverGraphic) {
            this.updateReceiverPulseSymbol(receiverGraphic, arc, progress);
          }

          index += 1;
        }

        this.animationFrame = requestAnimationFrame(animate);
      };

      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  private getSelectedBatch(): { index: number; batch: ArcCategoryBatch | null } {
    const batches = this.getVisibleBatchSequence();
    if (!batches.length) {
      return { index: -1, batch: null };
    }

    const index = this.getClampedBatchIndex(batches);
    return {
      index,
      batch: getOwnProperty(batches, index),
    };
  }

  private renderBatch(index: number, batchOverride?: ArcCategoryBatch | null, renderedAt = 0): void {
    if (!this.arcGraphicsLayer) {
      return;
    }

    this.startMarkerGraphics = [];
    this.endMarkerGraphics = [];
    this.arcDrawStates = [];
    this.visibleBatchDrawStartTime = renderedAt;
    this.hoveredEndpointGraphic = null;
    const batches = this.getVisibleBatchSequence();
    const batch = batchOverride ?? (index >= 0 ? getOwnProperty(batches, index) ?? null : null);
    const items = batch?.items ?? [];
    this.visibleBatchIndex = index;
    this.arcGraphicsLayer.removeAll();
    this.animatedArcGraphicsLayer.removeAll();

    if (!items.length) {
      this.countryRenderer.setConnectedCountryKeys([]);
      this.ngZone.run(() => {
        this.onVisibleArcCountChange(0);
      });
      this.emitBatchStatus(null);
      return;
    }

    this.countryRenderer.setConnectedCountryKeys(this.getBatchCountryKeys(items));
    this.arcGraphicsLayer.addMany(items.flatMap((arc) => [this.buildSurfaceGraphic(arc), this.buildArcGraphic(arc, 0)]));
    const arcLayerGraphics = this.arcGraphicsLayer.graphics?.toArray?.() ?? [];
    this.arcDrawStates = arcLayerGraphics
      .filter((graphic) => graphic?.attributes?.role === 'arc')
      .reduce((states: ArcDrawState<ThreatLensMapGraphic>[], graphic, drawIndex: number) => {
        const arc = getOwnProperty(items, drawIndex);
        if (arc) {
          states.push({ arc, graphic, completed: false });
        }
        return states;
      }, []);
    this.ngZone.run(() => {
      this.onVisibleArcCountChange(items.length);
    });
    this.emitBatchStatus(batch);
    this.movingDotGraphics = [];
    this.receiverPulseGraphics = [];
    this.endpointHitTargetGraphics = [];

    for (const arc of items) {
      const startPoint = arc.arcPoints[0];
      const endPoint = arc.arcPoints[arc.arcPoints.length - 1];
      this.endpointHitTargetGraphics.push(this.buildEndpointHitTargetGraphic(arc, startPoint, 'arc-start-hit', 'arc-start'));
      this.endpointHitTargetGraphics.push(this.buildEndpointHitTargetGraphic(arc, endPoint, 'arc-end-hit', 'arc-end'));
      this.startMarkerGraphics.push(this.buildEndpointGraphic(arc, startPoint, 'arc-start', 98000, 1));
      this.endMarkerGraphics.push(this.buildEndpointGraphic(arc, endPoint, 'arc-end', 98000, 0.88));
      this.receiverPulseGraphics.push(this.buildReceiverPulseGraphic(arc, arc.arcPoints[arc.arcPoints.length - 1]));
      this.movingDotGraphics.push(this.buildMovingDotGraphic(arc, arc.arcPoints[0]));
    }

    this.animatedArcGraphicsLayer.addMany([
      ...this.startMarkerGraphics,
      ...this.endMarkerGraphics,
      ...this.receiverPulseGraphics,
      ...this.movingDotGraphics,
      ...this.endpointHitTargetGraphics,
    ]);

    const layerGraphics = this.animatedArcGraphicsLayer.graphics?.toArray?.() ?? [];
    this.endpointHitTargetGraphics = layerGraphics.filter((graphic) => graphic?.attributes?.role === 'arc-start-hit' || graphic?.attributes?.role === 'arc-end-hit');
    this.startMarkerGraphics = layerGraphics.filter((graphic) => graphic?.attributes?.role === 'arc-start');
    this.endMarkerGraphics = layerGraphics.filter((graphic) => graphic?.attributes?.role === 'arc-end');
    this.receiverPulseGraphics = layerGraphics.filter((graphic) => graphic?.attributes?.role === 'arc-receiver-pulse');
    this.movingDotGraphics = layerGraphics.filter((graphic) => graphic?.attributes?.role === 'arc-traveler');
  }

  private rebuildBatches(): void {
    const categoryGroups = new Map<ThreatLensCategoryModelKey, AnimatedArcDescriptor[]>();

    for (const arc of this.animatedArcs) {
      const existing = categoryGroups.get(arc.categoryKey) ?? [];
      existing.push(arc);
      categoryGroups.set(arc.categoryKey, existing);
    }

    const nextBatches: ArcCategoryBatch[] = [];
    for (const items of categoryGroups.values()) {
      const firstArc = items[0];
      if (!firstArc) {
        continue;
      }

      const categoryBatchCount = Math.ceil(items.length / this.arcBatchSize);
      for (let index = 0; index < categoryBatchCount; index += 1) {
        const start = index * this.arcBatchSize;
        nextBatches.push({
          categoryKey: firstArc.categoryKey,
          categoryLabel: firstArc.categoryLabel,
          categoryArcCount: items.length,
          categoryStartIndex: start,
          categoryBatchIndex: index,
          categoryBatchCount,
          items: items.slice(start, start + this.arcBatchSize),
        });
      }
    }

    this.arcBatches = nextBatches;
  }

  private getVisibleBatchSequence(): ArcCategoryBatch[] {
    if (!this.activeCategoryKey) {
      return this.arcBatches;
    }

    return this.arcBatches.filter((batch) => batch.categoryKey === this.activeCategoryKey);
  }

  private renderSelectedBatch(renderedAt = 0): void {
    const batches = this.getVisibleBatchSequence();
    this.selectedBatchIndex = this.getClampedBatchIndex(batches);
    this.renderBatch(this.selectedBatchIndex, batches[this.selectedBatchIndex] ?? null, renderedAt);
  }

  private getClampedBatchIndex(batches: ArcCategoryBatch[]): number {
    if (!batches.length) {
      return -1;
    }

    return Math.max(0, Math.min(this.selectedBatchIndex, batches.length - 1));
  }

  private resetRangeAnimation(): void {
    this.visibleBatchDrawStartTime = 0;
    this.animationPauseStartTime = 0;
    this.visibleBatchIndex = -1;
    this.lastAnimationTick = 0;
  }

  private emitBatchStatus(batch: ArcCategoryBatch | null): void {
    const status = batch
      ? {
        categoryKey: batch.categoryKey,
        categoryLabel: batch.categoryLabel,
        visibleCount: batch.items.length,
        categoryArcCount: batch.categoryArcCount,
        start: batch.categoryStartIndex + 1,
        end: batch.categoryStartIndex + batch.items.length,
        batchIndex: batch.categoryBatchIndex + 1,
        batchCount: batch.categoryBatchCount,
        isCategoryLocked: Boolean(this.activeCategoryKey),
      }
      : null;

    this.ngZone.run(() => {
      this.onBatchStatusChange(status);
    });
  }

  private logCountryCoordinateValidation(countryKey: string, coordinates: LngLat): void {
    const logKey = `${countryKey}:${coordinates[0].toFixed(6)}:${coordinates[1].toFixed(6)}`;
    if (this.loggedCoordinateValidationKeys.has(logKey)) {
      return;
    }
    this.loggedCoordinateValidationKeys.add(logKey);
  }

  private logSkippedArc(category: ThreatLensCategoryMapData, pair: { countryAKey: string; countryBKey: string; weight: number }, countryKey: string, reason: string): void {
    const logKey = `${category.categoryKey}:${pair.countryAKey}:${pair.countryBKey}:${countryKey}:${reason}`;
    if (this.loggedSkippedArcKeys.has(logKey)) {
      return;
    }
    this.loggedSkippedArcKeys.add(logKey);
  }

  private updateArcDrawGraphics(timestamp: number): void {
    if (!this.arcDrawStates.length) {
      return;
    }

    if (!this.visibleBatchDrawStartTime) {
      this.visibleBatchDrawStartTime = timestamp;
    }

    for (let index = 0; index < this.arcDrawStates.length; index += 1) {
      const state = getOwnProperty(this.arcDrawStates, index);
      if (state.completed) {
        continue;
      }

      const stagger = Math.min(this.maxArcDrawStaggerMs, index * this.arcDrawStaggerMs);
      const elapsed = timestamp - this.visibleBatchDrawStartTime - stagger;
      const linearProgress = Math.max(0, Math.min(1, elapsed / this.arcDrawDuration));
      const progress = this.easeOutCubic(linearProgress);

      state.graphic.geometry = this.buildPolylineGeometry(this.getArcDrawPaths(state.arc, progress));

      if (linearProgress >= 1) {
        state.graphic.geometry = this.buildPolylineGeometry(state.arc.surfacePaths);
        state.completed = true;
      }
    }
  }

  private buildArcGraphic(arc: AnimatedArcDescriptor, drawProgress = 1): ThreatLensMapGraphic {
    return {
      geometry: this.buildPolylineGeometry(this.getArcDrawPaths(arc, drawProgress)),
      attributes: this.buildArcAttributes(arc, 'arc'),
      symbol: {
        type: 'simple-line',
        color: [...arc.color, 0.96],
        width: Math.min(3.8, 1.25 + (arc.weight * 0.2)),
        cap: 'round',
        join: 'round',
      },
    };
  }

  private getArcDrawPaths(arc: AnimatedArcDescriptor, progress: number): [number, number][][] {
    if (progress >= 1) {
      return arc.surfacePaths;
    }

    return ThreatLensMapUtils.extractSurfaceSegment(arc.arcPoints, 0, Math.max(0.001, progress));
  }

  private buildPolylineGeometry(paths: [number, number][][]): EsriGeometry {
    return {
      type: 'polyline',
      hasZ: true,
      paths: paths.map((path) => path.map(([lon, lat]) => [lon, lat, this.arcElevationMeters])),
      spatialReference: { wkid: 4326 },
    };
  }

  private buildPointGeometry(point: [number, number], elevation = this.arcElevationMeters): EsriGeometry {
    return {
      type: 'point',
      longitude: point[0],
      latitude: point[1],
      z: elevation,
      spatialReference: { wkid: 4326 },
    };
  }

  private easeOutCubic(value: number): number {
    const progress = Math.max(0, Math.min(1, value));
    return 1 - Math.pow(1 - progress, 3);
  }

  private buildSurfaceGraphic(arc: AnimatedArcDescriptor): ThreatLensMapGraphic {
    return {
      geometry: this.buildPolylineGeometry(arc.surfacePaths),
      attributes: this.buildArcAttributes(arc, 'arc-surface'),
      symbol: {
        type: 'simple-line',
        color: [...arc.color, 0.22],
        width: Math.min(4.8, 2.2 + (arc.weight * 0.22)),
        cap: 'round',
        join: 'round',
      },
    };
  }

  private buildEndpointGraphic(arc: AnimatedArcDescriptor, point: [number, number], role: string, elevation: number, opacity: number): ThreatLensMapGraphic {
    return {
      geometry: this.buildPointGeometry(point, elevation),
      attributes: {
        ...this.buildArcAttributes(arc, role),
        endpoint_color: arc.color,
        endpoint_id: this.getEndpointId(arc, role),
        endpoint_opacity: opacity,
      },
      symbol: {
        type: 'picture-marker',
        url:'/assets/images/shared/location.svg',
        width: `${this.endpointBaseSize}px`,
        height: `${this.endpointBaseSize}px`,
        outline: {
          color: [255, 255, 255, 0.84],
          width: 1.2,
        },
      },
    };
  }

  private buildEndpointHitTargetGraphic(arc: AnimatedArcDescriptor, point: [number, number], role: string, endpointRole: 'arc-start' | 'arc-end'): ThreatLensMapGraphic {
    return {
      geometry: this.buildPointGeometry(point),
      attributes: {
        ...this.buildArcAttributes(arc, role),
        endpoint_color: arc.color,
        endpoint_id: this.getEndpointId(arc, endpointRole),
        endpoint_role: endpointRole,
        hit_target: true,
      },
      symbol: {
        type: 'simple-marker',
        style: 'circle',
        size: this.endpointHitTargetSize,
        color: [...arc.color, 0.012],
        outline: {
          color: [255, 255, 255, 0],
          width: 0,
        },
      },
    };
  }

  private buildMovingDotGraphic(arc: AnimatedArcDescriptor, point: [number, number]): ThreatLensMapGraphic {
    return {
      geometry: this.buildPointGeometry(point),
      attributes: this.buildArcAttributes(arc, 'arc-traveler'),
      symbol: {
        type: 'simple-marker',
        style: 'circle',
        size: this.getDataPacketSize(0, arc.weight),
        color: [255, 255, 255, 0.5],
        outline: {
          color: [...arc.color, 0.38],
          width: 0.8,
        },
      },
    };
  }

  private buildReceiverPulseGraphic(arc: AnimatedArcDescriptor, point: [number, number]): ThreatLensMapGraphic {
    return {
      geometry: this.buildPointGeometry(point),
      attributes: this.buildArcAttributes(arc, 'arc-receiver-pulse'),
      symbol: {
        type: 'simple-marker',
        style: 'circle',
        size: 1,
        color: [...arc.color, 0],
        outline: {
          color: [...arc.color, 0],
          width: 1,
        },
      },
    };
  }

  private buildArcAttributes(arc: AnimatedArcDescriptor, role: string): Record<string, unknown> {
    return {
      role,
      category: arc.categoryKey,
      category_label: arc.categoryLabel,
      country_a: arc.countryAKey,
      country_b: arc.countryBKey,
      start_country: arc.countryAName,
      end_country: arc.countryBName,
      weight: arc.weight,
    };
  }

  private setEndpointHoverState(graphic: ThreatLensMapGraphic, hovered: boolean): void {
    if (!this.isEndpointGraphic(graphic) || !graphic.symbol) {
      return;
    }

    const symbol = graphic.symbol.clone?.() ?? { ...graphic.symbol, outline: graphic.symbol.outline ? { ...graphic.symbol.outline } : undefined };
    const baseColor = Array.isArray(graphic.attributes?.endpoint_color) ? graphic.attributes.endpoint_color : [255, 255, 255];
    const baseOpacity = Number(graphic.attributes?.endpoint_opacity);
    const opacity = Number.isFinite(baseOpacity) ? baseOpacity : 1;
    const endpointId = String(graphic.attributes?.endpoint_id ?? '');

    delete symbol.color;
    symbol.opacity = hovered ? 1 : opacity;
    symbol.width = `${this.endpointBaseSize}px`;
    symbol.height = `${this.endpointBaseSize}px`;
    symbol.outline = { ...(symbol.outline ?? {}), color: [255, 255, 255, 0.84], width: 1.2, };

    graphic.symbol = symbol;
    this.setEndpointHitTargetHoverState(endpointId, baseColor, hovered);
  }

  private resolveEndpointIconGraphic(graphic: ThreatLensMapGraphic | null): ThreatLensMapGraphic | null {
    if (!this.isEndpointGraphic(graphic)) {
      return null;
    }

    const role = graphic?.attributes?.role;
    if (role === 'arc-start' || role === 'arc-end') {
      return graphic;
    }

    const endpointId = String(graphic?.attributes?.endpoint_id ?? '');
    if (!endpointId) {
      return null;
    }

    const endpointGraphics = [
      ...this.startMarkerGraphics,
      ...this.endMarkerGraphics,
    ];
    return endpointGraphics.find((endpointGraphic) => endpointGraphic?.attributes?.endpoint_id === endpointId) ?? null;
  }

  private getEndpointId(arc: AnimatedArcDescriptor, role: string): string {
    return `${arc.categoryKey}:${arc.countryAKey}:${arc.countryBKey}:${role}`;
  }

  private setEndpointHitTargetHoverState(endpointId: string, color: number[], hovered: boolean): void {
    if (!endpointId) {
      return;
    }

    for (const hitTargetGraphic of this.endpointHitTargetGraphics) {
      if (hitTargetGraphic?.attributes?.endpoint_id !== endpointId) {
        continue;
      }

      hitTargetGraphic.symbol = {
        type: 'simple-marker',
        style: 'circle',
        size: this.endpointHitTargetSize,
        color: hovered ? [...color, 0.14] : [...color, 0.012],
        outline: {
          color: hovered ? [255, 255, 255, 0.92] : [255, 255, 255, 0],
          width: hovered ? 1.8 : 0,
        },
      };
    }
  }

  private updateDataPacketSymbol(graphic: ThreatLensMapGraphic, arc: AnimatedArcDescriptor, progress: number): void {
    const currentSymbol = graphic.symbol ?? {};
    const symbol = currentSymbol.clone?.() ?? { ...currentSymbol, outline: currentSymbol.outline ? { ...currentSymbol.outline } : undefined };
    const arrivalLift = progress > 0.88 ? (progress - 0.88) / 0.12 : 0;

    symbol.size = this.getDataPacketSize(progress, arc.weight);
    symbol.color = [255, 255, 255, 0.5 - (arrivalLift * 0.14)];
    symbol.outline = {
      ...(symbol.outline ?? {}),
      color: [...arc.color, 0.38 + (arrivalLift * 0.18)],
      width: 0.8 + (arrivalLift * 0.5),
    };
    graphic.symbol = symbol;
  }

  private updateReceiverPulseSymbol(graphic: ThreatLensMapGraphic, arc: AnimatedArcDescriptor, progress: number): void {
    const arrivalProgress = progress > 0.82 ? (progress - 0.82) / 0.18 : 0;
    const pulse = this.easeOutCubic(arrivalProgress);
    const opacity = arrivalProgress > 0 ? 0.78 * (1 - pulse) : 0;

    graphic.symbol = {
      type: 'simple-marker',
      style: 'circle',
      size: 4 + (pulse * Math.min(12, 7 + (arc.weight * 0.25))),
      color: [...arc.color, opacity * 0.16],
      outline: {
        color: [...arc.color, opacity],
        width: 1.3 + (pulse * 1.6),
      },
    };
  }

  private getDataPacketSize(progress: number, weight: number): number {
    const baseSize = Math.min(8, this.movingDotBaseSize - 0.5 + (weight * 0.1));
    const intakePulse = progress > 0.82 ? Math.sin(((progress - 0.82) / 0.18) * Math.PI) * 1.2 : 0;
    return baseSize + intakePulse;
  }

  private getBatchCountryKeys(items: AnimatedArcDescriptor[]): string[] {
    return Array.from(new Set(items.flatMap((arc) => [arc.countryAKey, arc.countryBKey]).filter(Boolean)));
  }
}
