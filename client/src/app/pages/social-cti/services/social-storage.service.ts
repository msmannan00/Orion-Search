import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api.service';
import { Job, db_social_model, social_exposure_signals, social_phone_lookup, social_profile, social_profile_config, social_wanted } from '../models/social.models';
import { ApiEnvelope, social_state } from '../models/social-usability.models';
const SOCIAL_GRAPH_TYPE = 'social-users';

@Injectable({ providedIn: 'root' })
export class SocialStorageService {
  private readonly api = inject(ApiService);

  readonly state: social_state = { scanResults: signal(new Map<string, social_profile[]>()), profileConfigs: signal(new Map<string, social_profile_config>()), jobs: signal<Job[]>([]), homeMenuSearchTerm: signal(''), isHomeMenuCollapsed: signal(false), activeUsername: signal<string | null>(null), loadingUsernames: signal<Set<string>>(new Set<string>()) };
  readonly activeUsername = computed(() => {
    const usernames = Array.from(this.state.scanResults().keys());
    const selectedUsername = this.state.activeUsername();
    return usernames.find(username => username.toLowerCase() === selectedUsername?.toLowerCase())
      ?? usernames[0]
      ?? null;
  });

  isSelected(ownerUsername: string, platform: social_profile): boolean {
    if (!platform.id) {
      return true;
    }
    const config = this.getProfileConfig(ownerUsername);
    return !config.disallowed.includes(platform.id);
  }

  getProfileConfig(ownerUsername: string): social_profile_config {
    const configs = this.state.profileConfigs();
    return configs.get(ownerUsername)
      ?? Array.from(configs.entries()).find(([username]) => username.toLowerCase() === ownerUsername.toLowerCase())?.[1]
      ?? { disallowed: [] };
  }

  setSelection(ownerUsername: string, selectedProfiles: social_profile[]): social_profile_config {
    const selectedIds = new Set(selectedProfiles.map(platform => platform.id));
    const allProfiles = this.state.scanResults().get(ownerUsername)
      ?? Array.from(this.state.scanResults().entries()).find(([username]) => username.toLowerCase() === ownerUsername.toLowerCase())?.[1]
      ?? [];
    const previous = { ...this.getProfileConfig(ownerUsername) };
    delete previous.allowed;
    const config: social_profile_config = {
      ...previous,
      disallowed: allProfiles.filter(platform => !selectedIds.has(platform.id)).map(platform => platform.id),
    };
    this.state.profileConfigs.update(current => {
      const next = new Map(current);
      const storedUsername = Array.from(next.keys()).find(username => username.toLowerCase() === ownerUsername.toLowerCase()) ?? ownerUsername;
      next.set(storedUsername, config);
      return next;
    });
    return config;
  }

  setScanProfiles(username: string, profiles: social_profile[]): void {
    this.state.scanResults.update(results => new Map(results).set(username, profiles));
    this.state.profileConfigs.update(configs => {
      const next = new Map(configs);
      next.set(username, { disallowed: [] });
      return next;
    });
  }

  loadProfiles(): Observable<void> {
    return this.api.get<ApiEnvelope<db_social_model[]>>('social/data').pipe(map(response => Array.isArray(response?.result) ? response.result : []),
      tap(documents => {
        this.setStoredSocialProfiles(documents);
      }),
      map(() => undefined),);
  }

  saveProfileConfig(username: string, config: social_profile_config): Observable<unknown> {
    return this.api.post('social/data', { profile_username: username, config });
  }

  saveProfiles(username: string, profiles: social_profile[], replace = false): Observable<unknown> {
    return this.api.post('social/data', { profile_username: username, profiles, config: this.getProfileConfig(username), replace });
  }

  savePhoneLookup(username: string, phoneLookup: social_phone_lookup): Observable<unknown> {
    return this.saveProfileData(username, profile => !!profile.phone_lookup, profile => ({ ...profile, phone_lookup: phoneLookup }));
  }

  saveExposureSignals(username: string, exposureSignals: social_exposure_signals): Observable<unknown> {
    return this.saveProfileData(username, profile => !!profile.exposure_signals, profile => ({ ...profile, exposure_signals: exposureSignals }));
  }

  saveWantedList(username: string, query: string, records: social_wanted[]): Observable<unknown> {
    return this.saveProfileData(username, profile => profile.wanted_query !== null && profile.wanted_query !== undefined, profile => ({ ...profile, wanted_query: query, wanted: records }));
  }

  clearPhoneLookup(username: string): Observable<unknown> {
    return this.saveProfileData(username, profile => !!profile.phone_lookup, profile => ({ ...profile, phone_lookup: null }));
  }

  clearWantedList(username: string): Observable<unknown> {
    return this.saveProfileData(username, profile => (profile.wanted_query !== null && profile.wanted_query !== undefined) || !!profile.wanted?.length, profile => ({ ...profile, wanted_query: null, wanted: [] }));
  }

  private saveProfileData(username: string, matches: (profile: social_profile) => boolean, update: (profile: social_profile) => social_profile): Observable<unknown> {
    const storedUsername = Array.from(this.state.scanResults().keys()).find(key => key.toLowerCase() === username.toLowerCase()) ?? username;
    const profiles = this.state.scanResults().get(storedUsername) ?? [];
    if (!profiles.length) {
      return throwError(() => new Error('No social profile is available to save this data.'));
    }
    const matchingIndex = profiles.findIndex(matches);
    const targetIndex = matchingIndex >= 0 ? matchingIndex : 0;
    const updatedProfiles = profiles.map((profile, index) => index === targetIndex ? update(profile) : profile);
    this.state.scanResults.update(results => new Map(results).set(storedUsername, updatedProfiles));
    return this.saveProfiles(storedUsername, updatedProfiles, true).pipe(catchError(error => {
      this.state.scanResults.update(results => results.get(storedUsername) === updatedProfiles
        ? new Map(results).set(storedUsername, profiles)
        : results);
      return throwError(() => error);
    }));
  }

  deleteProfiles(username: string): Observable<unknown> {
    return this.api.delete(`social/data/${encodeURIComponent(username)}`);
  }

  loadGraphUsers(): Observable<string[]> {
    return this.api.get<{ extra?: { usernames?: unknown } }>(`graph/session/tabs?graph_type=${SOCIAL_GRAPH_TYPE}`).pipe(map(response => {
      const usernames = response?.extra?.usernames;
      return Array.isArray(usernames) ? usernames.filter((value): value is string => typeof value === 'string' && !!value.trim()) : [];
    }), catchError(() => of<string[]>([])));
  }

  saveGraphUsers(usernames: string[]): Observable<unknown> {
    return this.api.post(`graph/session/upsert?graph_type=${SOCIAL_GRAPH_TYPE}`, { graph_type: SOCIAL_GRAPH_TYPE, extra: { usernames } }).pipe(catchError(() => of(undefined)));
  }

  private setStoredSocialProfiles(documents: db_social_model[]): void {
    const storedDocuments = documents.filter(document => !!document.profile_username);
    this.state.jobs.update(currentJobs => {
      const runningJobs = currentJobs.filter(job => job.status === 'queued' || job.status === 'in_progress');
      const runningIds = new Set(runningJobs.map(job => job.id));
      return [
        ...runningJobs,
        ...storedDocuments
          .filter(document => !runningIds.has(document.profile_username ?? ''))
          .map(document => this.createStoredJob(document)),
      ];
    });
    this.state.scanResults.set(new Map(storedDocuments.map(document => [document.profile_username ?? '', document.profiles || []])));
    this.state.profileConfigs.set(new Map(storedDocuments.map(document => [document.profile_username ?? '', document.config ?? {
      disallowed: [],
    }])));

    const selectedUsername = this.state.activeUsername();
    if (!selectedUsername || !this.state.scanResults().has(selectedUsername)) {
      this.state.activeUsername.set(storedDocuments[0]?.profile_username ?? null);
    }
  }

  private createStoredJob(document: db_social_model): Job {
    const id = document.profile_username ?? '';
    const status = document.scan?.status;
    if (status === 'pending') {
      return { id, status: 'in_progress', progress: document.scan?.progress ?? 5, step: document.scan?.step ?? 'Resuming' };
    }
    if (status === 'failed' || status === 'cancelled') {
      return { id, status: 'failed', progress: 0, step: status === 'cancelled' ? 'Scan cancelled' : 'Scan failed' };
    }
    return { id, status: 'completed', progress: 100, step: `${document.profiles.length} profiles` };
  }
}
