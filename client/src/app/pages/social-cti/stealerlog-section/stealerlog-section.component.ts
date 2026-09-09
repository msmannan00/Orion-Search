import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { social_exposure_signals, social_profile, social_stealer_log } from '../models/social.models';
import { SocialFetchService } from '../services/social-fetch.service';
import { SocialStorageService } from '../services/social-storage.service';
import { ExportBrandingService } from '../../../shared/services/export/export-branding.service';
import { ExportChoiceModalComponent } from '../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { STEALERLOG_EXPORT_OPTIONS } from '../../../shared/model/report/export-choice.model';
import { ReportExportService } from '../../../shared/services/report-export.service';
import { GraphReportPayload } from '../../../shared/model/report/report-export.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';

@Component({
  selector: 'app-social-stealerlog-section',
  standalone: true,
  imports: [ExportChoiceModalComponent, TranslatePipe],
  templateUrl: './stealerlog-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StealerlogSectionComponent implements OnDestroy {
  private readonly exportCsvColumns = [ 'tenant_name', 'recordType', 'recordIndex', 'searchQuery', 'email', 'username', 'domain', 'source', 'hash', 'title', 'url', 'rank', 'date', 'team', 'summary' ] as const;
  private readonly fetchService = inject(SocialFetchService);
  private readonly storageService = inject(SocialStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly exportBranding = inject(ExportBrandingService);
  private readonly reportExportService = inject(ReportExportService);
  private readonly translationService = inject(TranslationService);
  private requestId = 0;
  private activeProfileKey = '';
  private subscription: Subscription | null = null;

  username = input.required<string>();
  platforms = input<social_profile[]>([]);
  records = signal<social_stealer_log[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  isExportChoiceOpen = signal(false);
  readonly reportExportOptions = STEALERLOG_EXPORT_OPTIONS;
  searchIdentity = computed(() => this.username());
  hasRecords = computed(() => this.records().length > 0);
  visibleRecords = computed(() => this.records().slice(0, 3));
  storedExposureSignals = computed<social_exposure_signals | null>(() => {
    const identity = this.searchIdentity().toLowerCase();
    return this.platforms()
      .map(platform => platform.exposure_signals)
      .find(signals => signals?.query?.toLowerCase() === identity) ?? null;
  });
  darkwebPresence = computed<social_profile[]>(() => []);
  hasDarkwebPresence = computed(() => this.darkwebPresence().length > 0);
  displayIdentity = computed(() => {
    const identity = this.searchIdentity();
    return identity ? `@${identity}` : 'No username';
  });

  constructor() {
    effect(() => {
      const identity = this.searchIdentity();
      const storedSignals = this.storedExposureSignals();
      if (identity === this.activeProfileKey) {
        return;
      }

      this.activeProfileKey = identity;
      const currentRequestId = ++this.requestId;
      this.subscription?.unsubscribe();

      this.records.set(storedSignals?.records ?? []);
      this.errorMessage.set('');

      if (!identity) {
        this.isLoading.set(false);
        return;
      }

      this.isLoading.set(true);
      this.subscription = this.fetchService.fetchStealerLogsByIdentity(identity).subscribe({
        next: (records) => {
          if (currentRequestId !== this.requestId) {
            return;
          }
          const savedRecords = Array.isArray(records) ? records : [];
          this.records.set(savedRecords);
          this.isLoading.set(false);
          this.storageService.saveExposureSignals(identity, { query: identity, records: savedRecords }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            error: () => {
              if (currentRequestId === this.requestId) {
                this.errorMessage.set('Exposure signals loaded but could not be saved.');
              }
            }
          });
        },
        error: () => {
          if (currentRequestId !== this.requestId) {
            return;
          }
          this.records.set([]);
          this.errorMessage.set('Could not check stealer logs.');
          this.isLoading.set(false);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  openExportChoice(event: Event): void {
    event.stopPropagation();
    this.isExportChoiceOpen.set(true);
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen.set(false);
  }

  selectExport(type: string): void {
    if (type === 'csv' || type === 'json' || type === 'report') {
      this.exportRecords(type);
    }
    this.closeExportChoice();
  }

  private buildExportRows(): Record<string, string>[] {
    return this.records().map((item, index) => ({
      tenant_name: this.exportBranding.getTenantName(),
      recordType: 'stealer',
      recordIndex: String(index + 1),
      searchQuery: this.searchIdentity() || '-',
      email: String(item?.email ?? item?.m_email ?? '-'),
      username: String(item?.username ?? item?.m_username ?? '-'),
      domain: String(item?.domain ?? item?.m_domain ?? '-'),
      source: String(this.exportBranding.replaceSystemBrand(String(item?.channel ?? item?.filename ?? item?.file ?? item?.m_source ?? item?.m_scrap_file ?? '-'))),
      hash: String(item?.m_hash ?? '-'),
      title: '-',
      url: String(item?.url ?? item?.m_url ?? '-'),
      rank: '-',
      date: String(item?.date ?? item?.m_date ?? '-'),
      team: '-',
      summary: '-'
    }));
  }

  private exportRecords(type: 'csv' | 'json' | 'report'): void {
    const rows = this.buildExportRows();
    const payload: GraphReportPayload = {
      graphKind: 'social',
      title: this.translationService.translate('Stealer Logs Export'),
      sessionName: this.searchIdentity() || 'stealerlogs',
      generatedAtIso: new Date().toISOString(),
      nodes: [],
      edges: [],
      summary: {
        search_query: this.searchIdentity() || '-',
        total_records: rows.length
      },
      tables: [{ title: this.translationService.translate('Stealer Logs'), values: {}, columns: [...this.exportCsvColumns], rows }]
    };
    this.reportExportService.exportByType(payload, type === 'report' ? 'doc_pdf' : type);
  }

  getRecordTrackKey(index: number, record: social_stealer_log): string {
    return `${this.getRecordHost(record)}|${this.getRecordIdentity(record)}|${this.getRecordDate(record)}|${index}`;
  }

  getRecordHost(record: social_stealer_log): string {
    return String(record.source_domain ?? record.m_source_domain ?? record.domain ?? record.m_domain ?? record.ip ?? record.m_ip ?? record.url ?? record.m_url ?? record.host ?? record.m_host ?? record.raw ?? '-');
  }

  getRecordIdentity(record: social_stealer_log): string {
    return String(record.email ?? record.m_email ?? record.username ?? record.m_username ?? record.user ?? record.m_user ?? record.login ?? record.m_login ?? record.credential ?? record.m_credential ?? record.raw ?? '-');
  }

  getRecordDate(record: social_stealer_log): string {
    return String(record.date ?? record.m_date ?? record.timestamp ?? record.m_timestamp ?? record.created_at ?? record.m_created_at ?? record.updated_at ?? record.m_updated_at ?? '');
  }
}
