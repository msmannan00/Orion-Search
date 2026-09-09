import { Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppSettingsModel, ConfigSettings, LocalSettingsModel } from '../../../shared/model/app/config';
import { AppStorageService } from './app-storage.service';
import { ApiService } from '../../../shared/services/api.service';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { license_rules, search_filter_labels } from '../../../shared/constants/shared-enums';
import { userSessionData } from '../../../shared/model/company-profile/node.model';
import { TenantModel } from '../../../shared/model/tenant/tenant.model';
import { Title } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import entitiesData from '../../../../assets/data/entities_data/entities.json';
import licenseRulesData from '../../../../assets/data/licenses/license_rules.json';
import { firstValueFrom } from 'rxjs';
import { DemoTourConfig } from '../../../shared/model/demo-tour/demo.tour.model';
import { LicenseRule } from '../../../shared/model/licenses/license.rules';
import type { EntityOption } from './model/app.model';
import { getOwnProperty, setOwnProperty } from '../../../shared/utils/type-guards.util';

export type { EntityOption } from './model/app.model';




@Injectable({
  providedIn: 'root'
})
export class AppService {
  private sessionLoad$: Observable<void> | null = null;
  private configLoad$: Observable<void> | null = null;
  private demoTourLoadPromise: Promise<void> | null = null;

  public configData = signal<ConfigSettings>(new ConfigSettings());
  public page = signal<number>(1);
  public entities = signal<EntityOption[]>([]);
  public worldJson = signal<unknown>(null);
  public backendWarmingUp = signal<boolean>(false);
  public demoTourConfig = signal<DemoTourConfig>({});
  public userSessionData = signal<userSessionData>(this.createEmptyUserSessionData());
  public tenantData = signal<TenantModel>({
    name: '',
    iocs: []
  });
  public userImageUrl = signal<string | null>(null);

  private createEmptyUserSessionData(): userSessionData {
    return {
      user: {
        email: '',
        twofa_enabled: false,
        username: '',
        role: '',
        status: '',
        subscription: false,
        verificationDate: '',
        password_reset_required: false,
        password_reset_token: null,
        license: [],
        permissions: [],
        demo_tour:false,
      },
      tenant: {
        id: '',
        name: '',
        phone: '',
        isDefault: false,
        hasOnboarding: false,
        country: '',
        city: '',
        postalCode: '',
        taxId: '',
        userId: '',
        licenses: [],
        assignedQuota: '0',
        quotaExceeded: false,
        profileVisibilityEnabled: true,
        eventManagementEnabled: false,
        alertsVisibleToAdmin: true,
        privilegedIoc: false,
        alertRunTime: null,
        allowedAlertCategories: null,
        accountsMailPassword: '',
        accountsMail: '',
        accountsSmtpServer: '',
        accountsSmtpPort: ''
      },
      alerts: [],
      alert_summary: {
        unseen_total: 0,
        counts_by_type: {},
        counts_by_risk: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      }
    };
  }

  constructor(private title: Title, private apiService: ApiService, private activatedRoute: ActivatedRoute, private router: Router, private appStorageService: AppStorageService, private http: HttpClient) {
    this.initializeEntities();
    this.initializeLicenseRules();
    this.loadEntities();
    this.loadLicenseRules();
    this.loadWorldJson();
    void this.loadDemoTourConfig();
    this.activatedRoute.queryParams.subscribe(params => {
      const pageParam = +params.page;
      if (!isNaN(pageParam)) {
        this.updatePage(pageParam);
      }
    });
    this.loadStaticConfig();
    this.appStorageService.setupWatcher(this.configData);
  }

  loadSession(forced = false): Observable<void> {
    if (this.sessionLoad$) {
      return this.sessionLoad$;
    }

    if (!forced && !this.appStorageService.hasActiveSession()) {
      this.userSessionData.set(this.createEmptyUserSessionData());
      return of(void 0);
    }

    this.sessionLoad$ = this.apiService.post<userSessionData>('get/tenant/node', {}).pipe(tap((session) => {
      if (session) {
        this.userSessionData.set(session);
      }
    }), catchError(() => {
      this.userSessionData.set(this.createEmptyUserSessionData());
      return of(null);
    }), map(() => void 0), finalize(() => {
      this.sessionLoad$ = null;
    }), shareReplay(1));

    return this.sessionLoad$;
  }

  loadConfig(): Observable<void> {
    if (this.configLoad$) {
      return this.configLoad$;
    }

    this.configLoad$ = this.apiService.get<{ settings?: Partial<AppSettingsModel> }>('public').pipe(tap((response) => {
      if (response?.settings) {
        const current = this.configData();
        this.configData.set(new ConfigSettings(response.settings, current.localSettings));
        this.updateFavicon(this.configData().appSettings.logo_url);
        this.preloadImage(this.configData().appSettings.logo_wide_dark);
        this.title.setTitle(this.configData().appSettings.app_name || 'Orion Intelligence');
      }
    }), catchError(() => of(null)), map(() => void 0), finalize(() => {
      this.configLoad$ = null;
    }), shareReplay(1));

    return this.configLoad$;
  }

  loadStaticConfig(): void {
    const current = this.configData();
    const newConfig = this.appStorageService.getStaticConfig(current.appSettings);
    this.configData.set(newConfig);
  }

  getConfig(): ConfigSettings {
    return this.configData();
  }

  set<T extends keyof (AppSettingsModel & LocalSettingsModel)>(key: T, value: (AppSettingsModel & LocalSettingsModel)[T]): void {
    this.configData.update(current => {
      const isAppSetting = key in current.appSettings;
      const updatedAppSettings = isAppSetting ? { ...current.appSettings, [key]: value } : current.appSettings;
      const updatedLocalSettings = !isAppSetting ? { ...current.localSettings, [key]: value } : current.localSettings;
      this.updateFavicon(current.appSettings.logo_url);
      return new ConfigSettings(updatedAppSettings, updatedLocalSettings);
    });
  }

  public updateFavicon(url = '/api/s/static/system/logo.png'): void {
    (document.querySelector<HTMLLinkElement>('link[rel="icon"]') ??
            document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }))).href = url;
  }

  private preloadImage(url?: string): void {
    if (!url || document.head.querySelector(`link[rel="preload"][as="image"][href="${url}"]`)) {
      return;
    }
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  }

  updatePage(newPage: number): void {
    this.page.set(newPage);
    this.router
      .navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { ...this.activatedRoute.snapshot.queryParams, page: newPage },
        replaceUrl: true
      })
      .then();
  }

  private initializeEntities(): void {
    const bundledEntities = entitiesData as EntityOption[];
    const visibleEntities = bundledEntities.filter(e => e.alert !== false);
    this.entities.set(visibleEntities);
    for (const e of visibleEntities) {
      const key = e.key.replace(/[A-Z]/g, (c: string) => `_${c.toLowerCase()}`);
      setOwnProperty(search_filter_labels, key, e.title);
    }
  }

  loadEntities(): Observable<void> {
    this.initializeEntities();
    return of(void 0);
  }

  private initializeLicenseRules(): void {
    const bundledRules = licenseRulesData as Record<string, LicenseRule>;
    for (const key in bundledRules) {
      setOwnProperty(license_rules, key, getOwnProperty(bundledRules, key));
    }
  }

  loadLicenseRules(): Observable<void> {
    this.initializeLicenseRules();
    return of(void 0);
  }

  loadWorldJson(): void {
    this.http
      .get<unknown>('assets/data/map/world.json')
      .pipe(tap(data => {
        this.worldJson.set(data);
      }))
      .subscribe();
  }

  loadDemoTourConfig(): Promise<void> {
    if (this.demoTourLoadPromise) {
      return this.demoTourLoadPromise;
    }

    this.demoTourLoadPromise = firstValueFrom(this.http.get<DemoTourConfig>('assets/data/demo_tour/demo_tour.json'))
      .then(data => {
        this.demoTourConfig.set(data || {});
      })
      .catch(() => {
        this.demoTourConfig.set({});
      })
      .finally(() => {
        this.demoTourLoadPromise = null;
      });

    return this.demoTourLoadPromise;
  }

  clearAll(): void {
    this.appStorageService.clearStorage();
    this.configData.set(new ConfigSettings());
    this.userImageUrl.set(null);
    this.userSessionData.set(this.createEmptyUserSessionData());
  }

  isMobileMode(): boolean {
    return localStorage.getItem('mobileDemo') === 'true';
  }

  setOnboardingStatus(value: boolean) {
    this.userSessionData.update(state => {
      if (!state) {
        return state;
      }
      localStorage.setItem('onboarding', String(value));
      return {
        ...state,
        tenant: {
          ...state.tenant,
          hasOnboarding: value
        }
      };
    });
  }
}
