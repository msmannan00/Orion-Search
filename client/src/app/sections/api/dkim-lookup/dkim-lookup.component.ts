import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, ViewRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, from, Observable, timer } from 'rxjs';
import { catchError, concatMap, expand, finalize, map, switchMap, takeWhile, tap } from 'rxjs/operators';
import { EmptyQueryComponent } from '../../../shared/partials/empty-query/empty-query.component';
import { ExportChoiceModalComponent } from '../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { TooltipDirective } from '../../../shared/directive/tooltip-directive.directive';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiService } from '../../../shared/services/api.service';
import { ReportExportService } from '../../../shared/services/report-export.service';
import { DASHBOARD_API_EXPORT_OPTIONS } from '../../../shared/model/report/export-choice.model';
import type { GraphReportPayload, GraphReportTableRow } from '../../../shared/model/report/report-export.model';
import type { DkimDomainInfo, DkimLookupResponse, DkimSelectorEntry, DkimValidation } from './model/dkim-lookup.model';
export type { DkimLookupResponse, DkimSelectorEntry, DkimValidation } from './model/dkim-lookup.model';

@Component({
  selector: 'app-dkim-lookup',
  standalone: true,
  imports: [FormsModule, NgClass, TranslatePipe, EmptyQueryComponent, ExportChoiceModalComponent, TooltipDirective],
  styleUrls: ['./dkim-lookup.component.css'],
  templateUrl: './dkim-lookup.component.html'
})
export class DkimLookupComponent implements OnInit {
  domain = '';
  manualSelector = '';
  initialSelector = '';
  loading = false;
  queryTriggered = false;
  discoveryError = '';
  needsSelector = false;
  noSelectorMessage = '';
  progress = 0;
  currentStep = '';
  selectors: DkimSelectorEntry[] = [];
  domainInfo: DkimDomainInfo | null = null;
  isExportChoiceOpen = false;
  readonly reportExportOptions = DASHBOARD_API_EXPORT_OPTIONS;

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router, private reportExport: ReportExportService, private zone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q')?.trim();
    const s = this.route.snapshot.queryParamMap.get('s')?.trim();
    if (s) {
      this.initialSelector = s;
    }
    if (q) {
      this.domain = q;
      this.searchDomain(null);
    }
  }

  pct(value: number): number {
    const progress = Number(value);
    return Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
  }

  parsedEntries(validation: DkimValidation | null): { key: string; value: string }[] {
    const parsed = validation?.parsed_data;
    if (!parsed) {
      return [];
    }
    return Object.entries(parsed)
      .filter(([key]) => key !== 'public_key (p)')
      .map(([key, value]) => ({ key, value: String(value ?? '') }));
  }

  keyLabel(validation: DkimValidation | null): string {
    if (!validation?.key_type) {
      return '';
    }
    const type = validation.key_type.toUpperCase();
    return validation.key_size_bits ? `${type} ${validation.key_size_bits}-bit` : type;
  }

  badge(entry: DkimSelectorEntry): { label: string; classes: string } {
    if (entry.loading) {
      return { label: 'Checking', classes: 'border-sky-400/30 bg-sky-400/10 text-sky-300' };
    }
    if (entry.error) {
      return { label: 'Error', classes: 'border-rose-400/30 bg-rose-400/10 text-rose-300' };
    }
    if (entry.validation?.found === false) {
      return { label: 'Not Found', classes: 'border-slate-400/30 bg-slate-400/10 text-slate-300' };
    }
    if (entry.validation?.is_valid) {
      return { label: 'Valid', classes: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' };
    }
    return { label: 'Invalid', classes: 'border-amber-400/30 bg-amber-400/10 text-amber-300' };
  }

  checkIcon(status: string): string {
    if (status === 'ok') {
      return 'bi-check-circle-fill';
    }
    if (status === 'warning') {
      return 'bi-exclamation-triangle-fill';
    }
    return 'bi-x-circle-fill';
  }

  checkColor(status: string): string {
    if (status === 'ok') {
      return 'text-emerald-400';
    }
    if (status === 'warning') {
      return 'text-amber-400';
    }
    return 'text-rose-400';
  }

  searchDomain(event: Event | null): void {
    if (event) {
      event.preventDefault();
    }
    const value = this.domain.trim();
    if (!value) {
      return;
    }
    const selector = this.initialSelector.trim();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: value, s: selector || null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    }).then();

    this.queryTriggered = true;
    this.discoveryError = '';
    this.needsSelector = false;
    this.noSelectorMessage = '';
    this.manualSelector = '';
    this.domainInfo = null;
    this.progress = 5;
    this.currentStep = 'Discovering selectors...';

    if (selector) {
      this.loading = false;
      this.selectors = [this.newEntry(selector)];
      this.validateSelector(value, selector);
      return;
    }

    this.loading = true;
    this.selectors = [];
    this.runJob(value, '').pipe(finalize(() => {
      this.loading = false;
    })).subscribe({
      next: res => {
        this.handleDiscovery(value, res);
      },
      error: err => {
        this.loading = false;
        this.discoveryError = this.readError(err);
      }
    });
  }

  addSelector(event: Event | null): void {
    if (event) {
      event.preventDefault();
    }
    const selector = this.manualSelector.trim();
    const domain = this.domain.trim();
    if (!selector || !domain) {
      return;
    }
    if (this.selectors.some(entry => entry.selector.toLowerCase() === selector.toLowerCase())) {
      this.manualSelector = '';
      return;
    }
    this.selectors = [...this.selectors, this.newEntry(selector)];
    this.manualSelector = '';
    this.validateSelector(domain, selector);
  }

  openExportChoice(): void {
    this.isExportChoiceOpen = true;
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen = false;
  }

  selectExport(type: string): void {
    if (type === 'report' || type === 'json' || type === 'csv') {
      this.reportExport.exportByType(this.buildReportPayload(), type === 'report' ? 'doc_pdf' : type);
    }
    this.closeExportChoice();
  }

  get canExport(): boolean {
    return !!this.domainInfo || this.selectors.some(entry => !!entry.validation);
  }

  private runJob(domain: string, selector: string): Observable<DkimLookupResponse> {
    const payload = { text: { domain, selector } };
    const scanReq = () => this.api.post<DkimLookupResponse>('dkim/check', payload);
    return scanReq().pipe(expand(res => (this.isPending(res) ? timer(3000).pipe(switchMap(() => scanReq())) : EMPTY)), takeWhile(res => this.isPending(res), true), source => new Observable<DkimLookupResponse>(subscriber => source.subscribe({
      next: value => {
        this.zone.run(() => {
          subscriber.next(value); this.render(); 
        }); 
      },
      error: err => {
        this.zone.run(() => {
          subscriber.error(err); this.render(); 
        }); 
      },
      complete: () => {
        this.zone.run(() => {
          subscriber.complete(); this.render(); 
        }); 
      }
    })));
  }

  private render(): void {
    if (!(this.cdr as ViewRef).destroyed) {
      this.cdr.detectChanges();
    }
  }

  private handleDiscovery(domain: string, res: DkimLookupResponse): void {
    if (this.isPending(res)) {
      this.progress = res.progress ?? 15;
      this.currentStep = this.humanize(res.step) || 'Discovering selectors...';
      return;
    }

    this.loading = false;
    if (res.status === 'error' && !res.result) {
      this.discoveryError = res.message ?? res.error_message ?? 'DKIM discovery failed.';
      return;
    }

    const result = res.result ?? {};
    this.setDomainInfo(domain, result);
    this.progress = 100;

    const found = result.selectors ?? [];
    if (!found.length) {
      this.needsSelector = true;
      this.noSelectorMessage = 'No DKIM selectors found for this domain in public archives or common selectors. Add a selector to check it manually.';
      return;
    }

    this.selectors = found.map(selector => this.newEntry(selector));
    from(found).pipe(concatMap(selector => this.runValidation(domain, selector))).subscribe();
  }

  private validateSelector(domain: string, selector: string): void {
    this.runValidation(domain, selector).subscribe();
  }

  private runValidation(domain: string, selector: string): Observable<void> {
    const entry = this.selectors.find(item => item.selector === selector);
    if (!entry) {
      return EMPTY;
    }
    entry.loading = true;
    entry.error = '';
    entry.validation = null;
    entry.progress = 10;
    entry.step = 'Validating...';

    return this.runJob(domain, selector).pipe(tap(res => {
      if (this.isPending(res)) {
        entry.progress = res.progress ?? 30;
        entry.step = this.humanize(res.step) || 'Validating...';
        return;
      }
      entry.loading = false;
      if (res.status === 'error' && !res.result) {
        entry.error = res.message ?? res.error_message ?? 'DKIM validation failed.';
        return;
      }
      entry.progress = 100;
      entry.validation = res.result ?? null;
      if (!this.domainInfo && res.result) {
        this.setDomainInfo(domain, res.result);
      }
    }),
    catchError(err => {
      entry.error = this.readError(err);
      return EMPTY;
    }),
    finalize(() => {
      entry.loading = false;
    }),
    map(() => undefined));
  }

  private setDomainInfo(domain: string, result: DkimValidation): void {
    this.domainInfo = {
      domain,
      dmarc: result.dmarc ?? null,
      spf: result.spf ?? null,
      related: result.related ?? []
    };
  }

  private newEntry(selector: string): DkimSelectorEntry {
    return { selector, loading: true, progress: 5, step: 'Queued...', error: '', validation: null };
  }

  private isPending(res: DkimLookupResponse): boolean {
    return res?.status === 'pending' || res?.status === 'processing';
  }

  private humanize(step: string | undefined): string {
    return step ? String(step).replace(/[:_]/g, ' ').trim() : '';
  }

  private readError(err: { error?: { detail?: string }; message?: string } | null): string {
    return err?.error?.detail ?? err?.message ?? 'DKIM lookup failed.';
  }

  private buildReportPayload(): GraphReportPayload {
    const domain = this.domainInfo?.domain ?? this.domain.trim();
    const now = new Date().toISOString();
    const tables: GraphReportTableRow[] = [];

    if (this.domainInfo?.related?.length) {
      const values: Record<string, string> = {};
      this.domainInfo.related.forEach(check => {
        values[check.test] = check.response;
      });
      if (this.domainInfo.dmarc?.raw_record) {
        values['DMARC Record'] = this.domainInfo.dmarc.raw_record;
      }
      if (this.domainInfo.spf?.raw_record) {
        values['SPF Record'] = this.domainInfo.spf.raw_record;
      }
      tables.push({ title: 'Domain Security (Related Tests)', values });
    }

    let validCount = 0;
    this.selectors.forEach(entry => {
      const validation = entry.validation;
      if (!validation) {
        return;
      }
      if (validation.is_valid) {
        validCount += 1;
      }
      const values: Record<string, string> = {};
      (validation.checks ?? []).forEach(check => {
        values[check.test] = check.response;
      });
      values['DNS Query'] = validation.dns_query ?? '';
      values.Source = validation.source === 'archive' ? 'Archive (not in live DNS)' : 'Live DNS';
      values.Valid = validation.is_valid ? 'Yes' : 'No';
      if (this.keyLabel(validation)) {
        values.Key = this.keyLabel(validation);
      }
      if (validation.first_seen) {
        values['First Seen'] = validation.first_seen;
      }
      if (validation.last_seen) {
        values['Last Seen'] = validation.last_seen;
      }
      this.parsedEntries(validation).forEach(field => {
        values[field.key] = field.value;
      });
      if (validation.parsed_data?.['public_key (p)']) {
        values['public_key (p)'] = validation.parsed_data['public_key (p)'];
      }
      if (validation.warnings?.length) {
        values.Warnings = validation.warnings.join(' | ');
      }
      if (validation.raw_record) {
        values['Raw Record'] = validation.raw_record;
      }
      tables.push({ title: `Selector: ${entry.selector}._domainkey`, values });
    });

    const summary: Record<string, string | number> = {
      'Domain': domain,
      'Selectors Checked': this.selectors.length,
      'Valid Selectors': validCount,
      'DMARC Policy': this.domainInfo?.dmarc?.policy ?? (this.domainInfo?.dmarc?.published ? 'published' : 'not published'),
      'SPF': this.domainInfo?.spf?.published ? 'published' : 'not published',
      'Exported At': now
    };

    return {
      graphKind: 'cti',
      title: `DKIM Lookup Report - ${domain}`,
      sessionName: `dkim-${domain}`.slice(0, 80),
      generatedAtIso: now,
      nodes: [],
      edges: [],
      summary,
      tables
    };
  }
}
