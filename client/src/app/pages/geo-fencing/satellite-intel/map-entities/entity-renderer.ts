import { SatelliteAnomalyResponse } from '../model/satellite-intel-api.models';
import { OrionSatelliteFeature } from '../../models/geo-fencing.models';
import { AnomalyMapRenderer } from '../map-overlays/anomaly/anomaly-map-renderer';
import { AircraftMapRenderer } from './aircraft/aircraft-map-renderer';
import { FacilitiesMapRenderer } from './facilities/facilities-map-renderer';
import { OrionFacilitiesMapRenderer } from './facilities/orion-facilities-map-renderer';
import { LeafletComponentRenderer } from '../map-utils/leaflet-component-renderer';
import { ShipMapRenderer } from './ships/ship-map-renderer';
import { EntityRendererConfig } from '../model/satellite-intel.model';


export class EntityRenderer {
  private readonly componentRenderer: LeafletComponentRenderer;
  private readonly aircraftRenderer: AircraftMapRenderer;
  private readonly shipRenderer: ShipMapRenderer;
  private readonly facilitiesRenderer: FacilitiesMapRenderer;
  private readonly orionFacilitiesRenderer: OrionFacilitiesMapRenderer;
  private readonly anomalyRenderer: AnomalyMapRenderer;

  constructor(config: EntityRendererConfig) {
    this.componentRenderer = new LeafletComponentRenderer(config.environmentInjector);
    this.facilitiesRenderer = new FacilitiesMapRenderer(config.L, config.map, this.componentRenderer);
    this.orionFacilitiesRenderer = new OrionFacilitiesMapRenderer({
      L: config.L,
      map: config.map,
      componentRenderer: this.componentRenderer,
      getData: config.getOrionData,
      getFocusedFeature: config.getFocusedFeature,
      onFeatureSelected: config.onFeatureSelected,
    });
    this.anomalyRenderer = new AnomalyMapRenderer(config.L, config.map, this.componentRenderer);
    this.aircraftRenderer = new AircraftMapRenderer({
      L: config.L,
      map: config.map,
      service: config.aircraftService,
      sidebar: config.sidebar,
      componentRenderer: this.componentRenderer,
      getData: config.getAircraftData,
    });
    this.shipRenderer = new ShipMapRenderer({
      L: config.L,
      map: config.map,
      service: config.shipService,
      sidebar: config.sidebar,
      componentRenderer: this.componentRenderer,
      getData: config.getShipsData,
    });
  }

  init(facilitiesVisible: boolean): void {
    this.facilitiesRenderer.init();
    this.facilitiesRenderer.setVisible(facilitiesVisible);
    this.orionFacilitiesRenderer.init();
    this.anomalyRenderer.init();
    this.aircraftRenderer.init();
    this.shipRenderer.init();
  }

  renderFacilities(features: OrionSatelliteFeature[]): void {
    this.facilitiesRenderer.renderFeatures(features);
  }

  setFacilitiesVisible(visible: boolean): void {
    this.facilitiesRenderer.setVisible(visible);
  }

  renderAircraft(resetRenderKey = false): void {
    if (resetRenderKey) {
      this.aircraftRenderer.resetRenderKey();
    }
    this.aircraftRenderer.render();
  }

  renderShips(resetRenderKey = false): void {
    if (resetRenderKey) {
      this.shipRenderer.resetRenderKey();
    }
    this.shipRenderer.render();
  }

  renderOrionFacilities(resetRenderKey = false): void {
    this.orionFacilitiesRenderer.render(resetRenderKey);
  }

  renderAnomaly(anomalyResult: SatelliteAnomalyResponse['result'] | null): void {
    this.anomalyRenderer.render(anomalyResult);
  }

  renderViewport(): void {
    this.aircraftRenderer.render();
    this.shipRenderer.render();
    this.orionFacilitiesRenderer.scheduleRender();
  }

  clearAircraftTrack(): void {
    this.aircraftRenderer.clearTrack();
  }

  refreshSelectionState(): void {
    this.aircraftRenderer.refreshSelectionState();
    this.shipRenderer.refreshSelectionState();
  }

  setMarkerZoomBucket(bucket: number): void {
    this.aircraftRenderer.setMarkerZoomBucket(bucket);
    this.shipRenderer.setMarkerZoomBucket(bucket);
    this.orionFacilitiesRenderer.resetRenderKey();
  }

  destroy(): void {
    this.aircraftRenderer.destroy();
    this.shipRenderer.destroy();
    this.facilitiesRenderer.destroy();
    this.orionFacilitiesRenderer.destroy();
    this.anomalyRenderer.destroy();
    this.componentRenderer.destroyAll();
  }
}
