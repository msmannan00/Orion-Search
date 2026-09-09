import { ThreatLensGeoUtils } from '../map-utils/threat-lens-geo.utils';
import { EsriGeometry, EsriGraphicsLayer, EsriSceneView, EsriSymbol, ThreatLensCoordinates, ThreatLensCountryBoundary, ThreatLensIpDistributionCell, ThreatLensIpDistributionCellRef, ThreatLensIpGroupStats, ThreatLensIpPointGroup, ThreatLensIpRecord, ThreatLensIpScreenGroup, ThreatLensMapGraphic, ThreatLensScreenPoint } from '../models/threat-lens-map.types';
import { getOwnProperty, setOwnProperty } from '../../../../shared/utils/type-guards.util';


export class ThreatLensIpMarkerRenderer {
  private markerGraphics: ThreatLensMapGraphic[] = [];
  private visibleMarkerGraphics: ThreatLensMapGraphic[] = [];
  private scanRadiusGraphic: ThreatLensMapGraphic | null = null;
  private accuracyRadiusGraphic: ThreatLensMapGraphic | null = null;
  private accuracyRadiusKey = '';
  private renderKey = '';
  private readonly minimumVisibleMarkers = 20;
  private readonly maximumVisibleMarkers = 500;
  private readonly centerDensityBias = 0.18;
  private readonly earthRadiusKm = 6371.0088;

  constructor(private view: EsriSceneView, private graphicsLayer: EsriGraphicsLayer) {}

  render(records: ThreatLensIpRecord[], _center: ThreatLensCoordinates, _radiusKm: number, boundary: ThreatLensCountryBoundary | null = null): boolean {
    if (!this.graphicsLayer) {
      return false;
    }

    const pointGroups = new Map<string, ThreatLensIpPointGroup>();
    records.forEach((record) => {
      const point = this.resolveMarkerPoint(record);
      if (!point) {
        return;
      }
      if (!ThreatLensGeoUtils.isThreatLensPointInBoundary(point, boundary)) {
        return;
      }

      const key = `${point.lat.toFixed(5)}:${point.lon.toFixed(5)}`;
      const group = pointGroups.get(key) ?? { point, records: [] };
      group.records.push({ ...record, lat: point.lat, lon: point.lon });
      pointGroups.set(key, group);
    });
    const markerGraphics = Array.from(pointGroups.values()).map((group) => this.buildPointGraphic(group));

    if (!markerGraphics.length) {
      return false;
    }

    this.clear();

    this.scanRadiusGraphic = boundary ? null : this.buildScanRadiusGraphic(_center, _radiusKm);
    this.markerGraphics = markerGraphics;
    this.updateSymbols(true);
    return true;
  }

  clear(): void {
    this.graphicsLayer?.removeAll();
    this.markerGraphics = [];
    this.visibleMarkerGraphics = [];
    this.scanRadiusGraphic = null;
    this.accuracyRadiusGraphic = null;
    this.accuracyRadiusKey = '';
    this.renderKey = '';
  }

  updateSymbols(force = false): void {
    if (!this.markerGraphics.length) {
      return;
    }

    const size = this.getMarkerSizeForView();
    const nextMarkers = this.getVisibleMarkerGraphics();
    const nextKey = `${size}:${nextMarkers.map((graphic) => this.getGraphicRenderKey(graphic)).join('|')}`;

    if (!force && nextKey === this.renderKey) {
      for (const graphic of this.visibleMarkerGraphics) {
        graphic.symbol = this.buildGraphicSymbol(graphic, size);
      }
      return;
    }

    for (const graphic of nextMarkers) {
      graphic.symbol = this.buildGraphicSymbol(graphic, size);
    }

    this.graphicsLayer.removeAll();
    if (this.scanRadiusGraphic) {
      this.graphicsLayer.add(this.scanRadiusGraphic);
    }
    if (nextMarkers.length) {
      this.graphicsLayer.addMany(nextMarkers);
    }
    if (this.accuracyRadiusGraphic) {
      this.graphicsLayer.add(this.accuracyRadiusGraphic);
    }

    this.visibleMarkerGraphics = nextMarkers;
    this.renderKey = nextKey;
  }

  isMarkerGraphic(graphic: ThreatLensMapGraphic | null | undefined): boolean {
    return graphic?.attributes?.role === 'ip-scan-marker';
  }

  isClusterGraphic(graphic: ThreatLensMapGraphic | null | undefined): boolean {
    return graphic?.attributes?.role === 'ip-scan-cluster';
  }

  showAccuracyRadius(markerGraphic: ThreatLensMapGraphic): void {
    const center = this.resolveMarkerPoint({
      ip: String(markerGraphic?.attributes?.ip ?? ''),
      lat: markerGraphic?.geometry?.latitude,
      lon: markerGraphic?.geometry?.longitude,
    });
    const radiusKm = Number(markerGraphic?.attributes?.accuracyRadius);
    if (!center || !Number.isFinite(radiusKm) || radiusKm <= 0) {
      this.clearAccuracyRadius();
      return;
    }

    const radiusKey = `${center.lat.toFixed(5)}:${center.lon.toFixed(5)}:${Math.round(radiusKm * 10) / 10}`;
    if (radiusKey === this.accuracyRadiusKey) {
      this.removeAccuracyRadiusGraphics(false, true);
      return;
    }

    this.clearAccuracyRadius();
    this.accuracyRadiusKey = radiusKey;
    this.accuracyRadiusGraphic = {
      geometry: {
        type: 'polygon',
        rings: [this.buildAccuracyRadiusRing(center, radiusKm)],
        spatialReference: { wkid: 4326 },
      },
      attributes: { role: 'ip-scan-accuracy-radius' },
      symbol: {
        type: 'simple-fill',
        color: [34, 197, 94, 0.045],
        outline: {
          color: [34, 197, 94, 0.42],
          width: 1,
        },
      },
    };
    this.graphicsLayer?.add(this.accuracyRadiusGraphic);
  }

  clearAccuracyRadius(): void {
    this.removeAccuracyRadiusGraphics(true);
  }

  private removeAccuracyRadiusGraphics(resetKey: boolean, keepCurrent = false): void {
    if (this.accuracyRadiusGraphic && !keepCurrent) {
      this.graphicsLayer?.remove(this.accuracyRadiusGraphic);
      this.accuracyRadiusGraphic = null;
    }
    const graphics = this.graphicsLayer?.graphics?.toArray?.() ?? [];
    graphics
      .filter((graphic: ThreatLensMapGraphic) => graphic?.attributes?.role === 'ip-scan-accuracy-radius' && (!keepCurrent || graphic !== this.accuracyRadiusGraphic))
      .forEach((graphic: ThreatLensMapGraphic) => this.graphicsLayer?.remove(graphic));
    if (resetKey) {
      this.accuracyRadiusKey = '';
    }
  }

  private buildPointGraphic(group: ThreatLensIpPointGroup): ThreatLensMapGraphic {
    if (group.records.length > 1) {
      const stats = this.getGroupStats(group.records);
      return {
        geometry: this.buildPointGeometry(group.point),
        attributes: {
          role: 'ip-scan-cluster',
          count: group.records.length,
          networkCount: stats.networkCount,
          ip: `${group.records.length} IPs`,
          records: group.records,
          stackReason: 'Same MaxMind coordinate',
          accuracyRadius: stats.accuracyMax,
          accuracyMin: stats.accuracyMin,
          accuracyMax: stats.accuracyMax,
        },
        symbol: this.buildClusterSymbol(group.records.length),
      };
    }

    const record = group.records[0];
    return {
      geometry: this.buildPointGeometry(group.point),
      attributes: {
        role: 'ip-scan-marker',
        ip: record.ip,
        network: record.network ?? '',
        accuracyRadius: record.accuracyRadius,
        distanceKm: record.distanceKm,
      },
      symbol: this.buildMarkerSymbol(this.getMarkerSizeForView()),
    };
  }

  private buildPointGeometry(point: ThreatLensCoordinates): EsriGeometry {
    return {
      type: 'point',
      longitude: point.lon,
      latitude: point.lat,
      spatialReference: { wkid: 4326 },
    };
  }

  private getGroupStats(records: ThreatLensIpRecord[]): ThreatLensIpGroupStats {
    const networks = new Set(records.map((record) => String(record.network ?? record.ip ?? '').trim()).filter(Boolean));
    const radii = records
      .map((record) => Number(record.accuracyRadius))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (!radii.length) {
      return { networkCount: networks.size };
    }
    return {
      networkCount: networks.size,
      accuracyMin: Math.min(...radii),
      accuracyMax: Math.max(...radii),
    };
  }

  private resolveMarkerPoint(record: ThreatLensIpRecord): ThreatLensCoordinates | null {
    const lat = Number(record.lat);
    const lon = Number(record.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90) {
      return null;
    }

    return {
      lat,
      lon: ThreatLensGeoUtils.normalizeThreatLensLongitude(lon),
    };
  }

  private buildAccuracyRadiusRing(center: ThreatLensCoordinates, radiusKm: number): [number, number][] {
    const angularDistance = radiusKm / this.earthRadiusKm;
    const centerLat = center.lat * Math.PI / 180;
    const centerLon = center.lon * Math.PI / 180;
    const ring: [number, number][] = [];

    for (let bearingDegrees = 0; bearingDegrees <= 360; bearingDegrees += 6) {
      const bearing = bearingDegrees * Math.PI / 180;
      const lat = Math.asin((Math.sin(centerLat) * Math.cos(angularDistance)) + (Math.cos(centerLat) * Math.sin(angularDistance) * Math.cos(bearing)));
      const lon = centerLon + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLat),
        Math.cos(angularDistance) - (Math.sin(centerLat) * Math.sin(lat)),);

      ring.push([
        ThreatLensGeoUtils.normalizeThreatLensLongitude(lon * 180 / Math.PI),
        lat * 180 / Math.PI,
      ]);
    }

    return ring;
  }

  private buildScanRadiusGraphic(center: ThreatLensCoordinates, radiusKm: number): ThreatLensMapGraphic | null {
    if (!Number.isFinite(center.lat) || !Number.isFinite(center.lon) || !Number.isFinite(radiusKm) || radiusKm <= 0) {
      return null;
    }

    return {
      geometry: {
        type: 'polygon',
        rings: [this.buildAccuracyRadiusRing(center, radiusKm)],
        spatialReference: { wkid: 4326 },
      },
      attributes: { role: 'ip-scan-radius' },
      symbol: {
        type: 'simple-fill',
        color: [87, 165, 235, 0.035],
        outline: {
          color: [87, 165, 235, 0.38],
          width: 1,
        },
      },
    };
  }

  private getVisibleMarkerGraphics(): ThreatLensMapGraphic[] {
    const markers = this.getScreenClusteredMarkerGraphics();
    const limit = this.getVisibleMarkerLimit();
    if (markers.length <= limit) {
      return markers;
    }

    return this.takeSpatiallyDistributedMarkers(markers, limit);
  }

  private getScreenClusteredMarkerGraphics(): ThreatLensMapGraphic[] {
    const zoom = Number(this.view?.zoom);
    if (!Number.isFinite(zoom) || zoom >= 5.5) {
      return this.markerGraphics.slice();
    }

    const groups = new Map<string, ThreatLensIpScreenGroup>();
    const passthrough: ThreatLensMapGraphic[] = [];
    const gridSize = this.getLowZoomClusterGridSize();

    for (const marker of this.markerGraphics) {
      const point = this.getScreenPoint(marker);
      if (!point) {
        passthrough.push(marker);
        continue;
      }

      const row = Math.floor(point.y / gridSize);
      const col = Math.floor(point.x / gridSize);
      const key = `${row}:${col}`;
      const records = this.getGraphicRecords(marker);
      const group = groups.get(key) ?? { point: this.getGraphicPoint(marker), records: [], items: [] };
      group.records.push(...records);
      group.items.push(marker);
      group.point = this.getAverageGroupPoint(group.items);
      groups.set(key, group);
    }

    return [
      ...passthrough,
      ...Array.from(groups.values()).map((group) => group.items.length > 1 ? this.buildScreenClusterGraphic(group) : group.items[0]),
    ];
  }

  private getLowZoomClusterGridSize(): number {
    const zoom = Number(this.view?.zoom || 0);
    if (zoom >= 4.5) {
      return 46;
    }
    if (zoom >= 3.5) {
      return 54;
    }
    return 64;
  }

  private buildScreenClusterGraphic(group: ThreatLensIpScreenGroup): ThreatLensMapGraphic {
    const stats = this.getGroupStats(group.records);
    return {
      geometry: this.buildPointGeometry(group.point),
      attributes: {
        role: 'ip-scan-cluster',
        count: group.records.length,
        networkCount: stats.networkCount,
        ip: `${group.records.length} IPs`,
        records: group.records,
        stackReason: 'Same map area at this zoom',
        accuracyRadius: stats.accuracyMax,
        accuracyMin: stats.accuracyMin,
        accuracyMax: stats.accuracyMax,
      },
      symbol: this.buildClusterSymbol(group.records.length),
    };
  }

  private getGraphicRecords(graphic: ThreatLensMapGraphic): ThreatLensIpRecord[] {
    const records = graphic.attributes?.records;
    if (this.isClusterGraphic(graphic) && Array.isArray(records)) {
      return records.filter((record) => Boolean(record?.ip));
    }

    const ip = String(graphic?.attributes?.ip ?? '').trim();
    if (!ip) {
      return [];
    }

    return [{
      ip,
      lat: Number(graphic?.geometry?.latitude),
      lon: Number(graphic?.geometry?.longitude),
      network: String(graphic?.attributes?.network ?? ''),
      accuracyRadius: Number(graphic?.attributes?.accuracyRadius),
      distanceKm: Number(graphic?.attributes?.distanceKm),
    }];
  }

  private getGraphicPoint(graphic: ThreatLensMapGraphic): ThreatLensCoordinates {
    return {
      lat: Number(graphic?.geometry?.latitude ?? 0),
      lon: ThreatLensGeoUtils.normalizeThreatLensLongitude(Number(graphic?.geometry?.longitude ?? 0)),
    };
  }

  private getAverageGroupPoint(items: ThreatLensMapGraphic[]): ThreatLensCoordinates {
    if (!items.length) {
      return { lat: 0, lon: 0 };
    }

    const total = items.reduce<ThreatLensCoordinates>((sum, item) => {
      const point = this.getGraphicPoint(item);
      return {
        lat: sum.lat + point.lat,
        lon: sum.lon + point.lon,
      };
    }, { lat: 0, lon: 0 });

    return {
      lat: total.lat / items.length,
      lon: ThreatLensGeoUtils.normalizeThreatLensLongitude(total.lon / items.length),
    };
  }

  private getGraphicRenderKey(graphic: ThreatLensMapGraphic): string {
    return [
      graphic?.attributes?.role ?? '',
      graphic?.attributes?.ip ?? graphic?.attributes?.count ?? '',
      Number(graphic?.geometry?.latitude ?? 0).toFixed(5),
      Number(graphic?.geometry?.longitude ?? 0).toFixed(5),
    ].join(':');
  }

  private getVisibleMarkerLimit(): number {
    const total = this.markerGraphics.length;
    if (total <= this.minimumVisibleMarkers) {
      return total;
    }

    const zoom = Number(this.view?.zoom);
    const zoomFactor = Number.isFinite(zoom)
      ? Math.max(0, Math.min(1, (zoom - 3) / 6))
      : this.getScaleZoomFactor();
    const limit = Math.round(this.minimumVisibleMarkers + (zoomFactor * (this.maximumVisibleMarkers - this.minimumVisibleMarkers)));

    return Math.min(total, Math.max(this.minimumVisibleMarkers, Math.min(this.maximumVisibleMarkers, limit)));
  }

  private getScaleZoomFactor(): number {
    const scale = Number(this.view?.scale || 50000000);
    const logScale = Math.log10(Math.max(1, scale));
    return Math.max(0, Math.min(1, (7.45 - logScale) / 2.1));
  }

  private takeSpatiallyDistributedMarkers(markers: ThreatLensMapGraphic[], limit: number): ThreatLensMapGraphic[] {
    if (limit <= 0) {
      return [];
    }
    if (markers.length <= limit) {
      return markers.slice();
    }

    const cells = new Map<string, ThreatLensIpDistributionCell>();
    markers.forEach((marker) => {
      const cellRef = this.getDistributionCell(marker);
      const cell = cells.get(cellRef.key) ?? { ...cellRef, items: [] };
      cell.items.push(marker);
      cell.centerScore = Math.max(cell.centerScore, cellRef.centerScore);
      cells.set(cellRef.key, cell);
    });

    const orderedCells = this.orderDistributionCells(Array.from(cells.values()).map((cell) => ({
      ...cell,
      items: cell.items.slice().sort((left, right) => ThreatLensGeoUtils.hashThreatLensString(String(left.attributes?.ip ?? '')) - ThreatLensGeoUtils.hashThreatLensString(String(right.attributes?.ip ?? ''))),
    })), limit);
    const selected: ThreatLensMapGraphic[] = [];
    let round = 0;

    while (selected.length < limit) {
      let addedThisRound = false;
      for (const cell of orderedCells) {
        const marker = getOwnProperty(cell.items, round);
        if (!marker) {
          continue;
        }
        selected.push(marker);
        addedThisRound = true;
        if (selected.length >= limit) {
          break;
        }
      }
      if (!addedThisRound) {
        break;
      }
      round += 1;
    }

    return selected;
  }

  private getDistributionCell(marker: ThreatLensMapGraphic): ThreatLensIpDistributionCellRef {
    const screenCell = this.getScreenDistributionCell(marker, this.getDistributionScreenGridSize());
    if (screenCell) {
      return screenCell;
    }

    const latitude = Number(marker.geometry?.latitude);
    const longitude = Number(marker.geometry?.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const gridSize = this.getDistributionGeoGridSize();
      const row = Math.floor((latitude + 90) / gridSize);
      const col = Math.floor((longitude + 180) / gridSize);
      return { key: `geo:${gridSize}:${row}:${col}`, row, col, centerScore: this.getGeoCenterScore({ lat: latitude, lon: longitude }) };
    }

    return { key: 'unknown:0:0', row: 0, col: 0, centerScore: 0 };
  }

  private getScreenDistributionCell(marker: ThreatLensMapGraphic, gridSize: number): ThreatLensIpDistributionCellRef | null {
    const point = this.getScreenPoint(marker);
    if (!point) {
      return null;
    }

    const row = Math.floor(point.y / gridSize);
    const col = Math.floor(point.x / gridSize);
    return { key: `screen:${gridSize}:${row}:${col}`, row, col, centerScore: this.getScreenCenterScore(point) };
  }

  private getScreenPoint(marker: ThreatLensMapGraphic): ThreatLensScreenPoint | null {
    if (!this.view?.toScreen || !marker.geometry) {
      return null;
    }

    let point: Partial<ThreatLensScreenPoint> | null;
    try {
      point = this.view.toScreen(marker.geometry);
    }
    catch {
      return null;
    }
    const x = Number(point?.x);
    const y = Number(point?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    const width = Number(this.view?.width || 0);
    const height = Number(this.view?.height || 0);
    if (width > 0 && height > 0 && (x < -80 || y < -80 || x > width + 80 || y > height + 80)) {
      return null;
    }

    return { x, y };
  }

  private getDistributionScreenGridSize(): number {
    const zoom = Number(this.view?.zoom || 0);
    if (zoom >= 8) {
      return 72;
    }
    if (zoom >= 6) {
      return 88;
    }
    if (zoom >= 4) {
      return 108;
    }
    return 128;
  }

  private getDistributionGeoGridSize(): number {
    const zoom = Number(this.view?.zoom || 0);
    if (zoom >= 8) {
      return 0.35;
    }
    if (zoom >= 6) {
      return 0.65;
    }
    if (zoom >= 4) {
      return 1.1;
    }
    return 2;
  }

  private orderDistributionCells(cells: ThreatLensIpDistributionCell[], limit: number): ThreatLensIpDistributionCell[] {
    if (cells.length <= limit) {
      return cells.slice().sort((left, right) => this.compareCenterBiasedCells(left, right));
    }

    const totalWeight = cells.reduce((total, cell) => total + this.getCellSelectionWeight(cell), 0) || cells.length;
    const rowGroups = new Map<number, ThreatLensIpDistributionCell[]>();
    cells.forEach((cell) => {
      const rowCells = rowGroups.get(cell.row) ?? [];
      rowCells.push(cell);
      rowGroups.set(cell.row, rowCells);
    });

    const quotas = Array.from(rowGroups.entries())
      .map(([row, rowCells]) => {
        const sortedCells = rowCells.slice().sort((left, right) => left.col - right.col);
        const rowWeight = sortedCells.reduce((total, cell) => total + this.getCellSelectionWeight(cell), 0);
        const rawQuota = (limit * rowWeight) / totalWeight;
        return {
          row,
          cells: sortedCells,
          quota: Math.min(sortedCells.length, Math.floor(rawQuota)),
          remainder: rawQuota % 1,
        };
      })
      .sort((left, right) => left.row - right.row);
    let used = quotas.reduce((total, quota) => total + quota.quota, 0);

    quotas
      .slice()
      .sort((left, right) => right.remainder - left.remainder || right.cells.length - left.cells.length)
      .forEach((quota) => {
        if (used >= limit || quota.quota >= quota.cells.length) {
          return;
        }
        quota.quota += 1;
        used += 1;
      });

    while (used < limit) {
      const nextQuota = quotas.find((quota) => quota.quota < quota.cells.length);
      if (!nextQuota) {
        break;
      }
      nextQuota.quota += 1;
      used += 1;
    }

    return quotas.flatMap((quota) => this.takeCenterBiasedCells(quota.cells, quota.quota));
  }

  private takeCenterBiasedCells(cells: ThreatLensIpDistributionCell[], count: number): ThreatLensIpDistributionCell[] {
    const selected = this.takeEvenlySpacedCells(cells, count);
    const swapCount = Math.floor(count * this.centerDensityBias);
    if (swapCount <= 0 || selected.length >= cells.length) {
      return selected.sort((left, right) => this.compareCenterBiasedCells(left, right));
    }

    const selectedKeys = new Set(selected.map((cell) => cell.key));
    const candidates = cells
      .filter((cell) => !selectedKeys.has(cell.key))
      .sort((left, right) => this.compareCenterBiasedCells(left, right));

    for (let index = 0; index < swapCount; index += 1) {
      const candidate = getOwnProperty(candidates, index);
      if (!candidate) {
        break;
      }

      let weakestIndex = -1;
      let weakestScore = Number.POSITIVE_INFINITY;
      selected.forEach((cell, selectedIndex) => {
        if (cell.centerScore < weakestScore) {
          weakestScore = cell.centerScore;
          weakestIndex = selectedIndex;
        }
      });

      if (weakestIndex < 0 || candidate.centerScore <= weakestScore + 0.2) {
        continue;
      }

      setOwnProperty(selected, weakestIndex, candidate);
    }

    return selected.sort((left, right) => this.compareCenterBiasedCells(left, right));
  }

  private takeEvenlySpacedCells(cells: ThreatLensIpDistributionCell[], count: number): ThreatLensIpDistributionCell[] {
    if (count <= 0) {
      return [];
    }
    if (count >= cells.length) {
      return cells;
    }

    const selected: ThreatLensIpDistributionCell[] = [];
    const step = cells.length / count;
    for (let index = 0; index < count; index += 1) {
      selected.push(cells[Math.min(cells.length - 1, Math.floor((index + 0.5) * step))]);
    }
    return selected;
  }

  private getCellSelectionWeight(cell: ThreatLensIpDistributionCell): number {
    return 1 + (Math.max(0, Math.min(1, cell.centerScore)) * this.centerDensityBias);
  }

  private compareCenterBiasedCells(left: ThreatLensIpDistributionCell, right: ThreatLensIpDistributionCell): number {
    return right.centerScore - left.centerScore
      || left.row - right.row
      || left.col - right.col;
  }

  private getScreenCenterScore(point: ThreatLensScreenPoint): number {
    const width = Number(this.view?.width || 0);
    const height = Number(this.view?.height || 0);
    if (width <= 0 || height <= 0) {
      return 0;
    }

    const dx = (point.x - (width / 2)) / (width / 2);
    const dy = (point.y - (height / 2)) / (height / 2);
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    return Math.max(0, Math.min(1, 1 - (distance / 1.35)));
  }

  private getGeoCenterScore(point: ThreatLensCoordinates): number {
    const center = this.view?.center;
    const centerLat = Number(center?.latitude);
    const centerLon = Number(center?.longitude);
    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLon)) {
      return 0;
    }

    const distanceKm = ThreatLensGeoUtils.getThreatLensDistanceKm(point, {
      lat: centerLat,
      lon: ThreatLensGeoUtils.normalizeThreatLensLongitude(centerLon),
    });
    return Math.max(0, Math.min(1, 1 - (distanceKm / 3500)));
  }

  private buildMarkerSymbol(size: number): EsriSymbol {
    return {
      type: 'simple-marker',
      style: 'circle',
      size,
      color: [56, 189, 248, 0.88],
      outline: {
        color: [255, 255, 255, 0.92],
        width: Math.max(1, Math.min(2.5, size * 0.16)),
      },
    };
  }

  private buildClusterSymbol(count: number): EsriSymbol {
    const size = this.getClusterSymbolSize(count);
    return {
      type: 'text',
      text: this.formatClusterCount(count),
      color: [255, 255, 255, 1],
      haloColor: [15, 23, 42, 0],
      haloSize: 0,
      backgroundColor: [20, 111, 82, 0.96],
      borderLineColor: [74, 222, 128, 0.92],
      borderLineSize: 1,
      horizontalAlignment: 'center',
      verticalAlignment: 'middle',
      yoffset: -2,
      font: {
        family: 'Inter, sans-serif',
        size,
        weight: 'bold',
      },
    };
  }

  private getClusterSymbolSize(count: number): number {
    if (count >= 100) {
      return 12;
    }
    if (count >= 25) {
      return 11;
    }
    return 10;
  }

  private formatClusterCount(count: number): string {
    return count > 99 ? '99+' : String(count);
  }

  private buildGraphicSymbol(graphic: ThreatLensMapGraphic, markerSize: number): EsriSymbol {
    if (this.isClusterGraphic(graphic)) {
      return this.buildClusterSymbol(Number(graphic?.attributes?.count ?? 0));
    }
    return this.buildMarkerSymbol(markerSize);
  }

  private getMarkerSizeForView(): number {
    const scale = Number(this.view?.scale || 50000000);
    const logScale = Math.log10(Math.max(1, scale));
    const zoomFactor = Math.max(0, Math.min(1, (8.25 - logScale) / 4.5));
    return Math.round((6 + (zoomFactor * 9)) * 10) / 10;
  }

}
