import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AppService } from '../../../../../services/core/app/app.service';
import type { SharedCaseComment, SharedCaseEntity, SharedCaseReport } from '../case.model';
import { ApiService } from '../../../../../shared/services/api.service';
import { CasePdfExportService } from '../../case-management-service/case-pdf-export.service';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { ExportChoiceModalComponent } from '../../../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { CASE_SHARE_EXPORT_OPTIONS } from '../../../../../shared/model/report/export-choice.model';
import { ReportExportService } from '../../../../../shared/services/report-export.service';
import { GraphReportPayload } from '../../../../../shared/model/report/report-export.model';


@Component({
  selector: 'app-case-share',
  imports: [CommonModule, TranslatePipe, ExportChoiceModalComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-share.component.html',
})
export class CaseShareComponent implements OnInit {
  report: SharedCaseReport | null = null;
  isLoading = true;
  errorMessage = '';
  expandedArtifactIds = new Set<string>();
  expandedRelatedEntityIds = new Set<string>();
  brandingResolved = false;
  isExportChoiceOpen = false;
  readonly reportExportOptions = CASE_SHARE_EXPORT_OPTIONS;

  constructor(private route: ActivatedRoute, private api: ApiService, private casePdfExportService: CasePdfExportService, private reportExportService: ReportExportService, public appService: AppService, private translationService: TranslationService) { }

  ngOnInit(): void {
    this.appService.loadConfig().subscribe(() => {
      this.brandingResolved = true;
    });
    const shareId = this.route.snapshot.paramMap.get('shareId') ?? '';
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!shareId || !token) {
      this.errorMessage = this.translationService.translate('Invalid share link.');
      this.isLoading = false;
      return;
    }
    this.api.get<SharedCaseReport>(`public/case-shares/${shareId}`, {
      params: new HttpParams().set('token', token)
    }).subscribe({
      next: report => {
        report.entities = report.entities ?? [];
        report.artifacts = report.artifacts ?? [];
        report.comments = report.comments ?? [];
        report.tasks = report.tasks ?? [];
        report.linkedCases = report.linkedCases ?? [];

        this.report = report;
        this.isLoading = false;
      },
      error: err => {
        this.errorMessage = err?.error?.detail ?? this.translationService.translate('This share link is unavailable.');
        this.isLoading = false;
      }
    });
  }

  toggleArtifact(artifactId: string): void {
    if (this.expandedArtifactIds.has(artifactId)) {
      this.expandedArtifactIds.delete(artifactId);
      return;
    }
    this.expandedArtifactIds.add(artifactId);
  }

  isArtifactExpanded(artifactId: string): boolean {
    return this.expandedArtifactIds.has(artifactId);
  }

  openExportChoice(): void {
    this.isExportChoiceOpen = true;
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen = false;
  }

  selectExport(type: string): void {
    if (type === 'report') {
      this.exportPdf();
    }
    else if (type === 'json' || type === 'csv') {
      this.exportCaseData(type);
    }
    this.closeExportChoice();
  }

  private exportPdf(): void {
    if (!this.report) {
      return;
    }
    this.casePdfExportService.exportCaseReport(this.report, {
      appName: this.getAppName(),
      filenameSuffix: 'shared-report',
      reportLabel: 'Shared Case Report'
    }).subscribe({
      error: () => {
        this.errorMessage = this.translationService.translate('Unable to export PDF.');
      }
    });
  }

  private exportCaseData(type: 'json' | 'csv'): void {
    if (!this.report) {
      return;
    }
    const payload: GraphReportPayload = {
      graphKind: 'cti',
      title: this.translationService.translate('Shared Case Report'),
      sessionName: this.report.title || this.report.caseId || 'shared-case',
      generatedAtIso: new Date().toISOString(),
      nodes: [],
      edges: [],
      summary: {
        case_id: this.report.caseId || '-',
        title: this.report.title || '-',
        status: this.report.status || '-',
        entities: this.report.entities?.length ?? 0,
        comments: this.report.comments?.length ?? 0
      },
      tables: [
        {
          title: this.translationService.translate('Case Data'),
          values: {
            case_id: this.report.caseId || '-',
            title: this.report.title || '-',
            status: this.report.status || '-',
            description: this.report.description ?? '-'
          }
        }
      ]
    };
    this.reportExportService.exportByType(payload, type);
  }

  getPrimaryEntity(): SharedCaseEntity | null {
    const entities = this.report?.entities ?? [];
    return entities.find(entity => entity.entityId === this.report?.primaryEntityId)
      ?? entities.find(entity => entity.role === 'primary')
      ?? null;
  }

  getRelatedEntities(): SharedCaseEntity[] {
    const entities = this.report?.entities ?? [];
    const primaryEntity = this.getPrimaryEntity();

    return entities.filter(entity =>
      entity.entityId !== primaryEntity?.entityId &&
      entity.role !== 'primary');
  }

  getComments(): SharedCaseComment[] {
    return this.report?.comments ?? [];
  }

  toggleRelatedEntity(entityId: string): void {
    if (this.expandedRelatedEntityIds.has(entityId)) {
      this.expandedRelatedEntityIds.delete(entityId);
      return;
    }

    this.expandedRelatedEntityIds.add(entityId);
  }

  isRelatedEntityExpanded(entityId: string): boolean {
    return this.expandedRelatedEntityIds.has(entityId);
  }

  formatConfidence(value?: string | null): string {
    return this.formatLabel(value ?? 'high');
  }

  formatLabel(value?: string | null, otherValue?: string | null): string {
    if (value === 'other' && otherValue?.trim()) {
      return `${this.translationService.translate('Other')}: ${otherValue}`;
    }
    if (!value) {
      return '-';
    }
    return this.translationService.translate(value.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase()));
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  getLogoSrc(): string {
    if (!this.brandingResolved) {
      return '/assets/images/shared/logo-wide-light.svg';
    }
    const settings = this.appService.getConfig().appSettings;
    const isLightTheme = this.appService.userSessionData()?.user?.theme === 'light-theme';
    return isLightTheme
      ? settings.logo_wide_light || settings.logo_wide_dark || '/assets/images/shared/logo-wide-light.svg'
      : settings.logo_wide_dark || settings.logo_wide_light || '/assets/images/shared/logo-wide-light.svg';
  }

  getAppName(): string {
    if (!this.brandingResolved) {
      return 'Orion Intelligence';
    }
    return this.appService.getConfig().appSettings.app_name || 'Orion Intelligence';
  }
}
