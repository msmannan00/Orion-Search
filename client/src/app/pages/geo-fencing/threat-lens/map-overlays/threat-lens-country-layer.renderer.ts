import { ThreatLensMapUtils } from '../map-utils/threat-lens-map.utils';
import { EsriConstructor, EsriFeatureLayer, EsriGraphicsLayer, EsriLayerView, EsriSceneView, ThreatLensMapGraphic } from '../models/threat-lens-map.types';
import { getOwnProperty } from '../../../../shared/utils/type-guards.util';


export class ThreatLensCountryLayerRenderer {
  private static readonly COUNTRY_LAYER_URL = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Countries_(Generalized)/FeatureServer/0';
  private layerView: EsriLayerView | null = null;
  private fillGraphicsLayer: EsriGraphicsLayer | null = null;
  private highlightHandle: { remove: () => void } | null = null;
  private hoverHighlightHandle: { remove: () => void } | null = null;
  private readonly countryNameFields = ['COUNTRY', 'COUNTRYAFF', 'NAME', 'ADMIN', 'SOVEREIGNT'];
  private readonly countryCodeFields = ['ISO_CC', 'ISO_CC_EH', 'ISO_A2', 'ISO_A2_EH', 'ISO_A3', 'ISO2', 'ISO3', 'WB_A2', 'WB_A3', 'ADM0_A3', 'SOV_A3', 'BRK_A3', 'CNTRY_CODE', 'COUNTRY_CODE', 'FIPS_CNTRY', 'FIPS'];
  private readonly connectedCountryKeys = new Set<string>();
  private selectedCountryKey = '';

  layer: EsriFeatureLayer | null = null;
  featureIndex = new Map<string, ThreatLensMapGraphic>();

  createLayer(FeatureLayer: EsriConstructor<EsriFeatureLayer>): EsriFeatureLayer {
    this.layer = new FeatureLayer({
      url: ThreatLensCountryLayerRenderer.COUNTRY_LAYER_URL,
      outFields: ['*'],
      popupEnabled: false,
      opacity: 1,
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-fill',
          color: [29, 45, 71, 0.01],
          outline: {
            color: [255, 255, 255, 0],
            width: 0.8,
          },
        },
      },
      labelsVisible: true,
    });

    return this.layer;
  }

  setFillGraphicsLayer(fillGraphicsLayer: EsriGraphicsLayer): void {
    this.fillGraphicsLayer = fillGraphicsLayer;
    this.refreshCountryFills();
  }

  async init(view: EsriSceneView, normalizeCountryLabel: (value: string) => string, toCountryKey: (value: string) => string): Promise<void> {
    if (!this.layer) {
      return;
    }

    this.layerView = await view.whenLayerView(this.layer);
    await this.buildFeatureIndex(normalizeCountryLabel, toCountryKey);
  }

  hasCountryKey(countryKey: string): boolean {
    return Boolean(countryKey && this.featureIndex.has(countryKey));
  }

  getFeature(countryKey: string): ThreatLensMapGraphic | null {
    return this.featureIndex.get(countryKey) ?? null;
  }

  getCountryName(countryKey: string): string {
    return this.extractCountryName(this.getFeature(countryKey)?.attributes);
  }

  getCountryIsoCode(countryKey: string): string {
    return this.extractCountryIsoCode(this.getFeature(countryKey)?.attributes);
  }

  getCountryDebugInfo(countryKey: string, feature?: ThreatLensMapGraphic): { key: string; name: string; isoCode: string } {
    const targetFeature = feature ?? this.getFeature(countryKey);
    const attributes = targetFeature?.attributes;
    return {
      key: countryKey,
      name: this.extractCountryName(attributes),
      isoCode: this.extractCountryIsoCode(attributes),
    };
  }

  setSelectedCountryKey(countryKey: string): void {
    const nextKey = String(countryKey || '').trim();
    if (nextKey === this.selectedCountryKey) {
      return;
    }

    this.selectedCountryKey = nextKey;
    this.refreshCountryFills();
  }

  setConnectedCountryKeys(countryKeys: Iterable<string>): void {
    const nextKeys = new Set(Array.from(countryKeys, (countryKey) => String(countryKey || '').trim()).filter(Boolean));
    if (this.areSetsEqual(this.connectedCountryKeys, nextKeys)) {
      return;
    }

    this.connectedCountryKeys.clear();
    for (const countryKey of nextKeys) {
      this.connectedCountryKeys.add(countryKey);
    }
    this.refreshCountryFills();
  }

  extractCountryName(attributes: Record<string, unknown> | undefined): string {
    if (!attributes) {
      return '';
    }

    for (const fieldName of this.countryNameFields) {
      const value = getOwnProperty(attributes, fieldName);
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return '';
  }

  extractCountryIsoCode(attributes: Record<string, unknown> | undefined): string {
    if (!attributes) {
      return '';
    }

    for (const fieldName of this.countryCodeFields) {
      const value = getOwnProperty(attributes, fieldName);
      if (typeof value === 'string') {
        const normalized = value.trim().toUpperCase();
        if (normalized && normalized !== '-99' && normalized !== '99' && normalized !== 'NULL') {
          return normalized;
        }
      }
    }

    return '';
  }

  applyHighlight(graphic: ThreatLensMapGraphic): void {
    if (!this.layerView) {
      return;
    }

    this.clearHighlight();
    this.highlightHandle = this.layerView.highlight(graphic);
  }

  clearHighlight(): void {
    this.highlightHandle?.remove();
    this.highlightHandle = null;
  }

  applyHoverHighlight(graphic: ThreatLensMapGraphic): void {
    if (!this.layerView) {
      return;
    }

    this.clearHoverHighlight();
    this.hoverHighlightHandle = this.layerView.highlight(graphic);
  }

  clearHoverHighlight(): void {
    this.hoverHighlightHandle?.remove();
    this.hoverHighlightHandle = null;
  }

  destroy(): void {
    this.clearHighlight();
    this.clearHoverHighlight();
    this.fillGraphicsLayer?.removeAll();
    this.layerView = null;
    this.fillGraphicsLayer = null;
    this.layer = null;
    this.featureIndex.clear();
    this.connectedCountryKeys.clear();
    this.selectedCountryKey = '';
  }

  private async buildFeatureIndex(normalizeCountryLabel: (value: string) => string, toCountryKey: (value: string) => string): Promise<void> {
    if (!this.layer) {
      return;
    }

    const query = this.layer.createQuery();
    query.where = '1=1';
    query.returnGeometry = true;
    query.outFields = ['*'];

    const response = await this.layer.queryFeatures(query);
    this.featureIndex = ThreatLensMapUtils.buildCountryFeatureIndex(response.features,
      this.countryNameFields,
      normalizeCountryLabel,
      toCountryKey,
      this.countryCodeFields,);
  }

  private refreshCountryFills(): void {
    if (!this.fillGraphicsLayer) {
      return;
    }

    const fillCountryKeys = new Set(this.connectedCountryKeys);
    if (this.selectedCountryKey) {
      fillCountryKeys.add(this.selectedCountryKey);
    }

    const fillGraphics = Array.from(fillCountryKeys)
      .map((countryKey) => this.buildCountryFillGraphic(countryKey, countryKey === this.selectedCountryKey))
      .filter((graphic): graphic is ThreatLensMapGraphic => Boolean(graphic));

    this.fillGraphicsLayer.removeAll();
    if (fillGraphics.length) {
      this.fillGraphicsLayer.addMany(fillGraphics);
    }
  }

  private buildCountryFillGraphic(countryKey: string, selected: boolean): ThreatLensMapGraphic | null {
    const feature = this.getFeature(countryKey);
    if (!feature?.geometry) {
      return null;
    }

    return {
      geometry: feature.geometry,
      attributes: {
        role: selected ? 'selected-country-fill' : 'connected-country-fill',
        country_key: countryKey,
      },
      symbol: {
        type: 'simple-fill',
        color: selected ? [248, 113, 113, 0.28] : [248, 113, 113, 0.12],
        outline: {
          color: selected ? [248, 113, 113, 0.9] : [248, 113, 113, 0.45],
          width: selected ? 1.3 : 0.8,
        },
      },
    };
  }

  private areSetsEqual(first: Set<string>, second: Set<string>): boolean {
    if (first.size !== second.size) {
      return false;
    }

    for (const value of first) {
      if (!second.has(value)) {
        return false;
      }
    }

    return true;
  }
}
