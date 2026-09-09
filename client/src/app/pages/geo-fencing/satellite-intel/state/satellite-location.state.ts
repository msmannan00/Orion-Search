import { SatelliteTrackingViewport } from '../../models/geo-fencing.models';
import { SatelliteIntelViewport } from '../../enums/geo-fencing.enums';
import { ParsedCoordinates } from '../../../../shared/utils/model/geo-coordinates.model';


export class SatelliteLocationState {
  private readonly compareNarrowDelta = 0.015;
  private shipTrackingViewport: SatelliteTrackingViewport | null = null;
  private scopedViewport: SatelliteTrackingViewport | null = null;
  private compareViewport: SatelliteIntelViewport | null = null;
  private geocodeTarget: 'map' | 'compare' = 'map';
  private pendingCompareImageType: string | null = null;
  private pendingCompareMonth: string | null = null;

  showGeocodeModal = false;
  isLocationScoped = false;
  coordsForm = { value: '', delta: 0.05 };
  compareCoordsForm = { value: '', delta: 0.015 };
  inputLat = 50.0;
  inputLon = 8.5;
  inputDelta = 2.5;
  lat: number | null = null;
  lon: number | null = null;
  delta = 0.05;

  get geocodeAllowCoverage(): boolean {
    return this.geocodeTarget === 'map';
  }

  get geocodeTitle(): string {
    return this.geocodeTarget === 'compare' ? 'Comparison Location' : 'Satellite Location';
  }

  get geocodeCoordinates(): string {
    return this.geocodeTarget === 'compare' ? this.compareCoordsForm.value : this.coordsForm.value;
  }

  get geocodeDelta(): number {
    return this.geocodeTarget === 'compare' ? this.compareCoordsForm.delta : this.coordsForm.delta;
  }

  get compareLocationLabel(): string {
    const viewport = this.getCompareViewport();
    return viewport ? `${viewport.lat.toFixed(5)}, ${viewport.lon.toFixed(5)}` : '';
  }

  setInitialQuery(query: string, parsed: ParsedCoordinates | null): void {
    this.coordsForm.value = query;
    if (parsed) {
      this.inputLat = parsed.lat;
      this.inputLon = parsed.lon;
    }
  }

  openMapGeocode(): void {
    this.geocodeTarget = 'map';
    this.showGeocodeModal = true;
  }

  openCompareGeocode(): void {
    this.geocodeTarget = 'compare';
    if (!this.compareCoordsForm.value) {
      const viewport = this.getCompareViewport();
      if (viewport) {
        this.compareCoordsForm.value = `${viewport.lat}, ${viewport.lon}`;
      }
    }
    this.compareCoordsForm.delta = this.compareNarrowDelta;
    this.showGeocodeModal = true;
  }

  closeGeocodeModal(): void {
    if (this.geocodeTarget !== 'map') {
      this.clearPendingCompare();
    }
    this.showGeocodeModal = false;
  }

  updateFromMapMove(center: { lat: number; lon: number; zoom: number; trackingDelta?: number }): void {
    this.inputLat = center.lat;
    this.inputLon = center.lon;
    this.inputDelta = this.zoomToDelta(center.zoom);
    this.coordsForm.value = `${center.lat.toFixed(5)}, ${center.lon.toFixed(5)}`;
    this.coordsForm.delta = this.inputDelta;
    this.shipTrackingViewport = {
      lat: center.lat,
      lon: center.lon,
      delta: center.trackingDelta ?? this.inputDelta,
    };
  }

  setPendingCompare(imageType: string, month: string): void {
    this.pendingCompareImageType = imageType;
    this.pendingCompareMonth = month;
  }

  clearPendingCompare(): void {
    this.pendingCompareImageType = null;
    this.pendingCompareMonth = null;
  }

  setCoordinates(coords: string, parsed: ParsedCoordinates | null): void {
    if (this.geocodeTarget === 'compare') {
      this.compareCoordsForm.value = coords;
      return;
    }

    this.coordsForm.value = coords;
    if (parsed) {
      this.inputLat = parsed.lat;
      this.inputLon = parsed.lon;
    }
  }

  setDelta(delta: number): void {
    if (this.geocodeTarget === 'compare') {
      this.compareCoordsForm.delta = this.compareNarrowDelta;
      return;
    }

    this.coordsForm.delta = delta;
    this.inputDelta = delta;
    this.delta = delta;
  }

  applyGeocode(parsed: ParsedCoordinates): { viewport: SatelliteTrackingViewport | SatelliteIntelViewport; isCompare: boolean; pendingCompare?: { imageType: string; month: string } } {
    this.showGeocodeModal = false;
    if (this.geocodeTarget === 'compare') {
      return { viewport: this.applyCompareLocation(parsed), isCompare: true, pendingCompare: this.takePendingCompare() };
    }
    return { viewport: this.applyMapLocation(parsed), isCompare: false };
  }

  focusSelectedLocation(): SatelliteTrackingViewport | null {
    const viewport = this.scopedViewport;
    if (!viewport) {
      return null;
    }

    this.inputLat = viewport.lat;
    this.inputLon = viewport.lon;
    this.inputDelta = viewport.delta;
    this.lat = viewport.lat;
    this.lon = viewport.lon;
    this.delta = viewport.delta;
    this.coordsForm.value = `${viewport.lat}, ${viewport.lon}`;
    this.coordsForm.delta = viewport.delta;
    return viewport;
  }

  clearSelectedLocation(): void {
    this.isLocationScoped = false;
    this.scopedViewport = null;
    this.compareViewport = null;
    this.shipTrackingViewport = null;
    this.lat = null;
    this.lon = null;
  }

  syncAppliedViewport(): void {
    this.lat = this.inputLat;
    this.lon = this.inputLon;
    this.delta = this.inputDelta;
    this.coordsForm.value = `${this.inputLat}, ${this.inputLon}`;
    this.coordsForm.delta = this.inputDelta;
  }

  getTrackingViewport(): SatelliteTrackingViewport {
    if (this.scopedViewport) {
      return this.scopedViewport;
    }
    return {
      lat: this.inputLat,
      lon: this.inputLon,
      delta: this.inputDelta,
    };
  }

  getShipTrackingViewport(): SatelliteTrackingViewport {
    if (this.isLocationScoped) {
      return this.getTrackingViewport();
    }
    return this.shipTrackingViewport ?? this.getTrackingViewport();
  }

  getCompareViewport(): SatelliteIntelViewport | null {
    if (this.compareViewport) {
      return this.compareViewport;
    }
    if (this.scopedViewport) {
      return {
        lat: this.scopedViewport.lat,
        lon: this.scopedViewport.lon,
        delta: this.compareNarrowDelta,
      };
    }
    return null;
  }

  private applyCompareLocation(parsed: ParsedCoordinates): SatelliteIntelViewport {
    const viewport = {
      lat: parsed.lat,
      lon: parsed.lon,
      delta: this.compareNarrowDelta,
    };
    this.compareViewport = viewport;
    this.compareCoordsForm.value = `${parsed.lat}, ${parsed.lon}`;
    this.compareCoordsForm.delta = this.compareNarrowDelta;
    return viewport;
  }

  private applyMapLocation(parsed: ParsedCoordinates): SatelliteTrackingViewport {
    this.inputLat = parsed.lat;
    this.inputLon = parsed.lon;
    this.lat = parsed.lat;
    this.lon = parsed.lon;
    this.delta = this.coordsForm.delta;
    this.inputDelta = this.coordsForm.delta;

    const viewport = {
      lat: parsed.lat,
      lon: parsed.lon,
      delta: this.coordsForm.delta,
    };
    this.scopedViewport = viewport;
    this.shipTrackingViewport = viewport;
    this.isLocationScoped = true;
    return viewport;
  }

  private takePendingCompare(): { imageType: string; month: string } | undefined {
    if (!this.pendingCompareImageType) {
      return undefined;
    }
    const pendingCompare = {
      imageType: this.pendingCompareImageType,
      month: this.pendingCompareMonth ?? '',
    };
    this.clearPendingCompare();
    return pendingCompare;
  }

  private zoomToDelta(zoom: number): number {
    if (zoom >= 17) {
      return 0.005;
    }
    if (zoom >= 16) {
      return 0.01;
    }
    if (zoom >= 15) {
      return 0.02;
    }
    if (zoom >= 14) {
      return 0.04;
    }
    if (zoom >= 13) {
      return 0.08;
    }
    if (zoom >= 12) {
      return 0.15;
    }
    if (zoom >= 11) {
      return 0.3;
    }
    if (zoom >= 10) {
      return 0.6;
    }
    return 1.2;
  }
}
