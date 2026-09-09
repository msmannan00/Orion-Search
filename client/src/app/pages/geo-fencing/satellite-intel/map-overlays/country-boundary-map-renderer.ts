import { geoContains } from 'd3-geo';
import { feature as topojsonFeature } from 'topojson-client';
import { OrionSatelliteFeature } from '../../models/geo-fencing.models';
import type * as Leaflet from 'leaflet';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from 'geojson';
import type { Topology } from 'topojson-specification';
import type { Augmented, Nullable } from '../../../../shared/utils/type-guards.util';
import { getOwnProperty } from '../../../../shared/utils/type-guards.util';


type CountryFeature = Feature;
type ExtendedGeoJSONOptions = Augmented<Leaflet.GeoJSONOptions, { noClip?: boolean; smoothFactor?: number }>;

export class CountryBoundaryMapRenderer {
  private boundaryLayer: Nullable<Leaflet.GeoJSON> = null;
  private highlightLayer: Nullable<Leaflet.GeoJSON> = null;
  private hoverLayer: Nullable<Leaflet.GeoJSON> = null;
  private countryFeatures: CountryFeature[] = [];
  private highlightedFeature: Nullable<CountryFeature> = null;

  constructor(private L: typeof Leaflet, private map: Leaflet.Map) {}

  async init(): Promise<void> {
    if (!this.map || !this.L || this.boundaryLayer) {
      this.updateHighlight();
      return;
    }

    try {
      const response = await fetch('/assets/data/map/world.json');
      if (!response.ok) {
        console.error('[Country Highlight] Failed to fetch world.json:', response.status);
        return;
      }

      const topology = await response.json() as Topology;
      const countriesObject = topology.objects.countries;
      if (!countriesObject) {
        return;
      }
      const countryCollection = topojsonFeature(topology, countriesObject) as FeatureCollection;
      this.countryFeatures = countryCollection.features;
      const renderableCountryCollection: FeatureCollection = {
        ...countryCollection,
        features: this.countryFeatures.map((feature) => this.normalizeFeature(feature)),
      };

      const highlightOptions: ExtendedGeoJSONOptions = {
        interactive: false,
        noClip: true,
        style: () => this.getHighlightStyle(),
      };
      this.highlightLayer = this.L.geoJSON(null, highlightOptions).addTo(this.map);

      const hoverOptions: ExtendedGeoJSONOptions = {
        interactive: false,
        noClip: true,
        style: () => this.getHoverStyle(),
      };
      this.hoverLayer = this.L.geoJSON(null, hoverOptions).addTo(this.map);

      const boundaryOptions: ExtendedGeoJSONOptions = {
        interactive: true,
        noClip: true,
        smoothFactor: 0,
        style: () => this.getBoundaryStyle(),
        onEachFeature: (feature, layer) => {
          this.bindCountryFeature(feature, layer);
        },
      };
      this.boundaryLayer = this.L.geoJSON(renderableCountryCollection, boundaryOptions).addTo(this.map);

      this.updateHighlight();
    }
    catch (error) {
      console.error('[Country Highlight] Error loading country data:', error);
      this.countryFeatures = [];
    }
  }

  setFocusedFeature(feature: OrionSatelliteFeature | null): void {
    const coordinates = this.getFeatureCoordinates(feature);
    this.highlightedFeature = coordinates
      ? this.countryFeatures.find((countryFeature) => {
        try {
          return geoContains(countryFeature, coordinates);
        }
        catch {
          return false;
        }
      }) ?? null
      : null;
    this.updateHighlight();
  }

  destroy(): void {
    [this.boundaryLayer, this.highlightLayer, this.hoverLayer].forEach(layer => {
      if (layer) {
        this.map?.removeLayer(layer);
      }
    });
    this.boundaryLayer = null;
    this.highlightLayer = null;
    this.hoverLayer = null;
    this.countryFeatures = [];
    this.highlightedFeature = null;
  }

  private bindCountryFeature(feature: CountryFeature, layer: Leaflet.Layer): void {
    const countryName = String(feature.properties?.name ?? 'Country');
    layer.bindTooltip(countryName, {
      direction: 'center',
      sticky: true,
      opacity: 0.95,
      className: 'country-hover-tooltip rounded-[8px] border border-[var(--color-border)] bg-[var(--color-blue-770)] px-[10px] py-[6px] text-[12px] font-semibold text-[var(--color-text1)] shadow-[0_12px_30px_rgb(2_6_23_/_45%)] [backdrop-filter:blur(8px)]',
    });
    layer.on('click', () => {
      this.toggleCountryHighlight(feature);
    });
    layer.on('mouseover', () => {
      this.showCountryHover(feature);
    });
    layer.on('mouseout', () => {
      this.clearCountryHover();
    });
  }

  private toggleCountryHighlight(feature: CountryFeature): void {
    if (this.isSameFeature(feature, this.highlightedFeature)) {
      this.highlightedFeature = null;
      this.updateHighlight();
      return;
    }
    this.highlightedFeature = feature;
    this.updateHighlight();
  }

  private showCountryHover(feature: CountryFeature): void {
    try {
      this.hoverLayer?.clearLayers();
      this.hoverLayer?.addData(feature);
      this.hoverLayer?.bringToFront();
    }
    catch {
      return;
    }
  }

  private clearCountryHover(): void {
    try {
      this.hoverLayer?.clearLayers();
      this.updateHighlight();
    }
    catch {
      return;
    }
  }

  private updateHighlight(): void {
    if (!this.highlightLayer) {
      return;
    }
    this.highlightLayer.clearLayers();
    if (this.highlightedFeature) {
      this.highlightLayer.addData(this.highlightedFeature);
      this.highlightLayer.bringToFront();
    }
  }

  private getBoundaryStyle(): Leaflet.PathOptions {
    return {
      color: 'rgba(0,0,0,0.45)',
      weight: 0.8,
      opacity: 0.55,
      fillColor: 'rgba(0,0,0,0)',
      fillOpacity: 0,
      lineJoin: 'round',
      lineCap: 'round',
    };
  }

  private getHoverStyle(): Leaflet.PathOptions {
    return {
      color: 'rgba(96,165,250,0.98)',
      weight: 2.5,
      opacity: 1,
      fillColor: 'rgba(96,165,250,0.08)',
      fillOpacity: 0.08,
      lineJoin: 'round',
      lineCap: 'round',
    };
  }

  private getHighlightStyle(): Leaflet.PathOptions {
    return {
      color: 'rgba(59,130,246,0.98)',
      weight: 2.2,
      opacity: 0.95,
      fillColor: 'rgba(56,189,248,0)',
      fillOpacity: 0,
      lineJoin: 'round',
      lineCap: 'round',
    };
  }

  private normalizeFeature(feature: CountryFeature): CountryFeature {
    if (!feature.geometry) {
      return feature;
    }
    return {
      ...feature,
      geometry: this.normalizeGeometry(feature.geometry),
    };
  }

  private normalizeGeometry(geometry: Geometry): Geometry {
    if (geometry.type === 'Polygon') {
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((ring) => this.unwrapRing(ring)),
      } satisfies Polygon;
    }

    if (geometry.type === 'MultiPolygon') {
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => this.unwrapRing(ring))),
      } satisfies MultiPolygon;
    }

    return geometry;
  }

  private unwrapRing(ring: Position[]): Position[] {
    if (!Array.isArray(ring) || ring.length < 2) {
      return ring;
    }

    const normalizedRing: Position[] = [];
    let offset = 0;
    const firstPoint = ring[0];
    normalizedRing.push([firstPoint[0], firstPoint[1]]);
    let previousLongitude = firstPoint[0];

    for (let index = 1; index < ring.length; index += 1) {
      const point = getOwnProperty(ring, index);
      if (!Array.isArray(point) || point.length < 2) {
        continue;
      }

      let longitude = point[0] + offset;
      const latitude = point[1];

      while (longitude - previousLongitude > 180) {
        offset -= 360;
        longitude = point[0] + offset;
      }

      while (previousLongitude - longitude > 180) {
        offset += 360;
        longitude = point[0] + offset;
      }

      normalizedRing.push([longitude, latitude]);
      previousLongitude = longitude;
    }

    return normalizedRing;
  }

  private getFeatureCoordinates(feature: OrionSatelliteFeature | null): [number, number] | null {
    const coordinates = feature?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }

    const [lon, lat] = coordinates;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return null;
    }

    return [lon, lat];
  }

  private isSameFeature(left: Nullable<CountryFeature>, right: Nullable<CountryFeature>): boolean {
    if (!left || !right) {
      return false;
    }

    const leftId = left.id ?? left.properties?.name ?? left.properties?.iso_a3 ?? left.properties?.admin;
    const rightId = right.id ?? right.properties?.name ?? right.properties?.iso_a3 ?? right.properties?.admin;
    return String(leftId ?? '').trim() !== '' && String(leftId) === String(rightId);
  }
}
