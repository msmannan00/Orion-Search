import { Component, HostListener, ViewChild, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgClass, NgOptimizedImage } from '@angular/common';
import { HelperService } from '../../services/helper.service';
import { TooltipDirective } from '../../directive/tooltip-directive.directive';
import { ApiService } from '../../services/api.service';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { HttpParams } from '@angular/common/http';
import { AppService } from '../../../services/core/app/app.service';
import { Router } from '@angular/router';
import { ReportExportService } from '../../services/report-export.service';
import { ExportChoiceModalComponent } from '../export-choice-modal/export-choice-modal.component';
import { RESULT_REPORT_EXPORT_OPTIONS } from '../../model/report/export-choice.model';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { ProxyController } from '../../services/proxy-controller';
import { AiSummaryComponent } from '../../../pages/root-searches/ai-workspace/ai-summary/ai-summary.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LANGUAGE_OPTIONS } from '../../constants/shared-enums';
import { LanguageOption } from '../../constants/model/shared-enums.model';
import { TranslationService } from '../../services/translation.service';
import { ReportRouteUtil } from '../../utils/report-route.util';

@Component({
  selector: 'app-report-header',
  standalone: true,
  imports: [NgOptimizedImage, NgClass, TooltipDirective, ExportChoiceModalComponent, AiSummaryComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './report-header.component.html',
})
export class ReportHeaderComponent {
  private readonly proxied_resource = inject(ProxyController);
  @ViewChild(AiSummaryComponent) private aiSummary?: AiSummaryComponent;

  isExportChoiceOpen = false;
  isLanguageDropdownOpen = signal(false);
  selectedLanguage = signal('');
  readonly languageOptions: LanguageOption[] = LANGUAGE_OPTIONS;
  readonly reportExportOptions = RESULT_REPORT_EXPORT_OPTIONS;
  readonly csv_object = input<string | object | null | undefined>(null);
  readonly url = input<string | null | undefined>(null);
  readonly lang = input<string>("");
  readonly content = input<string | null | undefined>(null);
  readonly lang_detected = input<string>("");
  readonly languageUpdated = output<unknown>();

  constructor(private helperService: HelperService, private api: ApiService, protected appService: AppService, private dashboardService: DashboardService, protected route: Router, protected licenseServise: LicenseService, private reportExportService: ReportExportService, private translationService: TranslationService) {
  }

  downloadJSON() {
    const endpoint = this.getStixExportEndpoint();
    if (!endpoint) {
      this.helperService.downloadstixJson(this.buildJsonExportPayload(), 'report_export.json');
      return;
    }
    this.api.get<unknown>(endpoint).subscribe((res) => {
      this.helperService.downloadstixJson(res, 'stix_report.json');
    });
  }

  openExportChoice() {
    this.isExportChoiceOpen = true;
  }

  closeExportChoice() {
    this.isExportChoiceOpen = false;
  }

  selectExport(type: string) {
    if (type === 'json') {
      this.downloadJSON();
    }
    else if (type === 'csv') {
      this.helperService.downloadAsCSV([this.buildJsonExportPayload()], 'report_export.csv');
    }
    else if (type === 'report') {
      this.printPage();
    }
    this.closeExportChoice();
  }

  private getStixExportEndpoint(): string | null {
    const tree = this.route.parseUrl(this.route.url);
    const id = tree.root.children.primary?.segments.slice(-1)[0]?.path || '';
    let ci = String(tree.queryParams.ci ?? '').trim().toLowerCase();
    if (!id || !ci) {
      return null;
    }
    if (ci === 'general') {
      ci = 'strategic';
    }
    if (ci === 'leak' || ci === 'feed') {
      ci = 'breach';
    }
    return `search/${ci}/stix/${id}`;
  }

  private buildJsonExportPayload(): Record<string, unknown> {
    const source = this.csv_object();
    const row: Record<string, unknown> = {};
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      Object.assign(row, source);
    }
    else if (source !== null && source !== undefined) {
      row.value = source;
    }
    if (this.url()) {
      row.url = this.url();
    }
    if (this.lang() || this.lang_detected()) {
      row.language = this.lang() || this.lang_detected();
    }
    if (this.content()) {
      row.content = this.content();
    }
    return row;
  }

  printPage() {
    try {
      const payload = this.reportExportService.buildUnifiedGraphPayload({
        currentRouteUrl: this.route.url,
        csvObject: this.csv_object(),
        url: this.url(),
        content: this.content(),
        lang: this.lang(),
        langDetected: this.lang_detected()
      });
      this.reportExportService.exportByType(payload, 'doc_pdf');
    }
    catch {
      this.helperService.printPage();
    }
  }

  shareResult() {
    this.helperService.shareResult(this.url() ?? '');
  }

  redirectToUrl() {
    const urlValue = this.url();
    if (urlValue) {
      let url = urlValue.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      this.proxied_resource.open(url);
    }
  }

  open_graph() {
    if (!this.licenseServise.canUseCtiGraph()) {
      this.dashboardService.showSubscription.set(true);
      return;
    }
    const baseUrl = `${window.location.origin}/dashboard/ctigraph`;
    const parts = window.location.pathname.split('/');
    const singleInput = parts[parts.length - 1];
    const params = new URLSearchParams({
      selectedType: 'document',
      singleInput
    });
    const fullUrl = `${baseUrl}?${params.toString()}`;
    this.proxied_resource.open(fullUrl);
  }

  showCtiGraph(): boolean {
    if (!this.route.url.toLowerCase().includes('/strategic/')) {
      return true;
    }
    const cleanUrl = (this.url() ?? '').trim().split(/[?#]/)[0].replace(/\/+$/, '');
    return cleanUrl.endsWith('.onion');
  }

  aiSuggest() {
    this.aiSummary?.summarize();
  }

  toggleLanguageDropdown(event: Event) {
    event.stopPropagation();
    this.isLanguageDropdownOpen.update(open => !open);
  }

  @HostListener('document:click', ['$event'])
  closeLanguageDropdown(event: Event) {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.report-language-picker')) {
      this.isLanguageDropdownOpen.set(false);
    }
  }

  getActiveLanguage(): string {
    const selectedLanguage = this.selectedLanguage();
    if (this.translationService.isSupportedLanguage(selectedLanguage)) {
      return selectedLanguage;
    }
    const currentLanguage = this.lang();
    if (this.translationService.isSupportedLanguage(currentLanguage)) {
      return currentLanguage;
    }
    const systemLanguage = this.appService.getConfig()?.appSettings?.language_allowed;
    return this.translationService.isSupportedLanguage(systemLanguage) ? systemLanguage : 'en';
  }

  langUpdate(language: string) {
    const selectedLanguage = this.translationService.getSupportedLanguage(language);
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('lang', selectedLanguage);
    const apiUrl = ReportRouteUtil.getReportDetailEndpointFromUrl(currentUrl);
    this.selectedLanguage.set(selectedLanguage);
    this.isLanguageDropdownOpen.set(false);
    window.history.pushState({}, '', currentUrl.toString());
    this.api.get<unknown>(apiUrl, {
      params: new HttpParams().set('lang', selectedLanguage)
    }).subscribe({
      next: (result) => {
        this.languageUpdated.emit(result);
      }
    });
  }
}
