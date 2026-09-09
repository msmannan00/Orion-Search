import { SatelliteFacilitiesResponse, SatelliteLiveAircraft, SatelliteLiveShip } from '../model/satellite-intel-api.models';
import { OrionSatelliteFeature, SatelliteTrackingViewport } from '../../models/geo-fencing.models';
import { SatelliteAircraftTrackingController } from './aircraft/aircraft-tracking.controller';
import { SatelliteFacilitiesController } from './facilities/facilities.controller';
import { SatelliteShipTrackingController } from './ships/ship-tracking.controller';
import { EntityLoaderConfig } from '../model/satellite-intel.model';


export class EntityLoader {
  private aircraftTracker: SatelliteAircraftTrackingController;
  private shipTracker: SatelliteShipTrackingController;
  private facilitiesController: SatelliteFacilitiesController;

  constructor(config: EntityLoaderConfig) {
    this.aircraftTracker = new SatelliteAircraftTrackingController(config.aircraftService, config.loading);
    this.shipTracker = new SatelliteShipTrackingController(config.shipService, config.loading);
    this.facilitiesController = new SatelliteFacilitiesController(config.facilitiesService, config.loading);
  }

  get aircraftEnabled(): boolean {
    return this.aircraftTracker.enabled;
  }

  get shipsEnabled(): boolean {
    return this.shipTracker.enabled;
  }

  get aircraftError(): string | null {
    return this.aircraftTracker.error;
  }

  get shipsError(): string | null {
    return this.shipTracker.error;
  }

  get aircraftData(): SatelliteLiveAircraft[] {
    return this.aircraftTracker.data;
  }

  get shipsData(): SatelliteLiveShip[] {
    return this.shipTracker.data;
  }

  get aircraftLoading(): boolean {
    return this.aircraftTracker.isLoading;
  }

  get shipsLoading(): boolean {
    return this.shipTracker.isLoading;
  }

  get facilitiesVisible(): boolean {
    return this.facilitiesController.visible;
  }

  get facilitiesData(): SatelliteFacilitiesResponse['result'] | null {
    return this.facilitiesController.data;
  }

  get facilitiesMapData(): OrionSatelliteFeature[] {
    return this.facilitiesController.mapData;
  }

  get facilitiesLoading(): boolean {
    return this.facilitiesController.isLoading;
  }

  toggleAircraft(viewport: SatelliteTrackingViewport, scoped = false): void {
    this.aircraftTracker.toggle(viewport, scoped);
  }

  toggleShips(viewport: SatelliteTrackingViewport, scoped = false): void {
    this.shipTracker.toggle(viewport, scoped);
  }

  loadFacilities(viewport: SatelliteTrackingViewport, onMapDataChanged: () => void, showLoading = true): void {
    this.facilitiesController.load(viewport, onMapDataChanged, showLoading);
  }

  clearFacilities(onMapDataChanged: () => void): void {
    this.facilitiesController.clear(onMapDataChanged);
  }

  clearTracking(): void {
    this.aircraftTracker.clear();
    this.shipTracker.clear();
  }

  refreshTracking(viewport: SatelliteTrackingViewport): void {
    this.aircraftTracker.refresh(viewport, false, true);
    this.shipTracker.refresh(viewport, false, true, true);
  }

  refreshGlobalAircraft(): void {
    this.aircraftTracker.refreshGlobalTracking(true);
  }

  scheduleShipViewportRefresh(viewport: SatelliteTrackingViewport): void {
    this.shipTracker.scheduleViewportRefresh(viewport);
  }

  facilityEntries(): [string, number][] {
    return this.facilitiesController.entries();
  }

  destroy(): void {
    this.aircraftTracker.destroy();
    this.shipTracker.destroy();
    this.facilitiesController.destroy();
  }
}
