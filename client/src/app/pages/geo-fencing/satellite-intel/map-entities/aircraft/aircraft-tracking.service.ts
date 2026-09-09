import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../shared/services/api.service';
import { SatelliteLiveAircraft, SatelliteLiveAircraftBBoxResponse } from '../../model/satellite-intel-api.models';
import { SatelliteIntelService } from '../../satellite-intel-service';
import { asUnknownRecord } from '../../../../../shared/utils/type-guards.util';

@Injectable({ providedIn: 'root' })
export class SatelliteAircraftTrackingService {
  constructor(private api: ApiService, private satelliteIntelService: SatelliteIntelService) {}

  fetchInBounds(lat: number, lon: number, delta = 0.05, openskyClientId?: string, openskyClientSecret?: string): Observable<SatelliteLiveAircraftBBoxResponse> {
    return this.api.post<SatelliteLiveAircraftBBoxResponse>('satellite/livetrack/aircraft', this.buildBoundsPayload(lat, lon, delta, openskyClientId, openskyClientSecret));
  }

  pollInBounds(lat: number, lon: number, delta = 0.05, openskyClientId?: string, openskyClientSecret?: string): Observable<SatelliteLiveAircraftBBoxResponse> {
    return this.satelliteIntelService.createPolledRequest(() => this.fetchInBounds(lat, lon, delta, openskyClientId, openskyClientSecret), (res) => this.getPollStatus(res));
  }

  fetchGlobal(openskyClientId?: string, openskyClientSecret?: string): Observable<SatelliteLiveAircraftBBoxResponse> {
    return this.api.post<SatelliteLiveAircraftBBoxResponse>('satellite/livetrack/aircraft', this.buildGlobalPayload(openskyClientId, openskyClientSecret));
  }

  pollGlobal(openskyClientId?: string, openskyClientSecret?: string): Observable<SatelliteLiveAircraftBBoxResponse> {
    return this.satelliteIntelService.createPolledRequest(() => this.fetchGlobal(openskyClientId, openskyClientSecret), (res) => this.getPollStatus(res));
  }

  fetchByICAO(icao: string): Observable<SatelliteLiveAircraftBBoxResponse> {
    return this.api.post<SatelliteLiveAircraftBBoxResponse>('satellite/livetrack/aircraft/icao', { icao24: icao });
  }

  pollByICAO(icao: string): Observable<SatelliteLiveAircraftBBoxResponse> {
    return this.satelliteIntelService.createPolledRequest(() => this.fetchByICAO(icao), (res) => this.getPollStatus(res));
  }

  fetchTrack(icao: string): Observable<unknown> {
    return this.api.post<unknown>('satellite/livetrack/aircraft/track', { icao24: icao });
  }

  pollTrack(icao: string): Observable<unknown> {
    return this.satelliteIntelService.createPolledRequest(() => this.fetchTrack(icao), (res) => this.getPollStatus(res));
  }

  extractItems(payload: unknown): SatelliteLiveAircraft[] | null {
    const record = asUnknownRecord(payload);
    if (Array.isArray(record.aircraft)) {
      return record.aircraft as SatelliteLiveAircraft[];
    }

    const status = String(record.status ?? '').toLowerCase();
    if (status === 'pending' || status === 'busy') {
      return null;
    }

    return record.count === 0 ? [] : null;
  }

  getFeedIssue(payload: unknown): string | null {
    const record = asUnknownRecord(payload);
    const issue = record.error ?? record.error_message ?? record.last_error;
    return issue ? String(issue) : null;
  }

  private buildBoundsPayload(lat: number, lon: number, delta: number, openskyClientId?: string, openskyClientSecret?: string): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      lat_min: lat - delta,
      lat_max: lat + delta,
      lon_min: lon - delta,
      lon_max: lon + delta,
    };

    if (openskyClientId?.trim()) {
      payload.opensky_client_id = openskyClientId.trim();
    }
    if (openskyClientSecret?.trim()) {
      payload.opensky_client_secret = openskyClientSecret.trim();
    }

    return payload;
  }

  private buildGlobalPayload(openskyClientId?: string, openskyClientSecret?: string): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      lat_min: -90,
      lat_max: 90,
      lon_min: -180,
      lon_max: 180,
    };

    if (openskyClientId?.trim()) {
      payload.opensky_client_id = openskyClientId.trim();
    }
    if (openskyClientSecret?.trim()) {
      payload.opensky_client_secret = openskyClientSecret.trim();
    }

    return payload;
  }

  private getPollStatus(res: unknown): string | undefined {
    const response = asUnknownRecord(res);
    const result = asUnknownRecord(response.result);
    const status = result.status ?? response.status;
    return typeof status === 'string' ? status : undefined;
  }
}
