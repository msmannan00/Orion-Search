import type * as Leaflet from 'leaflet';
import type { Nullable } from '../../../../shared/utils/type-guards.util';

export class SearchLocationMapRenderer {
  private marker: Nullable<Leaflet.CircleMarker> = null;

  constructor(private L: typeof Leaflet, private map: Leaflet.Map) {}

  render(lat: number | null, lon: number | null): void {
    this.clear();
    if (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }

    this.marker = this.L.circleMarker([lat, lon], {
      radius: 8,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.25,
      weight: 2,
    }).addTo(this.map);
  }

  destroy(): void {
    this.clear();
  }

  private clear(): void {
    if (this.marker) {
      this.map?.removeLayer(this.marker);
      this.marker = null;
    }
  }
}
