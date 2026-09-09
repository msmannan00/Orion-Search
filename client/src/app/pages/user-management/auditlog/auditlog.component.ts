import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, NgClass, NgOptimizedImage } from '@angular/common';
import { PaginationComponent } from '../../../shared/partials/pagination/pagination.component';
import { FiltersComponent } from '../../../shared/partials/filters/filters.component';
import { audit_filters } from '../../../shared/constants/filters';
import { AuditlogListComponent } from './auditlog-list/auditlog-list.component';
import { AuditLogCallbackModel } from './model/auditlog.model';
import { AuditlogService } from './services/auditlog.service';
import { BaseListingComponent } from '../../../shared/directive/base.listing.directive';
import { HelperService } from '../../../shared/services/helper.service';
import { take } from 'rxjs/operators';
import { SidebarService } from '../../../shared/services/sidebar.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { AiToolRoutingService } from '../../../shared/services/ai-tool-routing.service';
import { ExportChoiceModalComponent } from "../../../shared/partials/export-choice-modal/export-choice-modal.component";
import { AUDITLOG_REPORT_EXPORT_OPTIONS } from '../../../shared/model/report/export-choice.model';
import { ReportExportService } from '../../../shared/services/report-export.service';
import { GraphReportPayload } from '../../../shared/model/report/report-export.model';

@Component({
  selector: 'app-auditlog',
  imports: [FormsModule, PaginationComponent, AsyncPipe, AuditlogListComponent, FiltersComponent, NgOptimizedImage, NgClass, TranslatePipe, ExportChoiceModalComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './auditlog.component.html'
})
export class AuditlogComponent extends BaseListingComponent<AuditLogCallbackModel> {
  private auditService = inject(AuditlogService);
  private helperService = inject(HelperService);
  private sidebarService = inject(SidebarService);
  private reportExportService = inject(ReportExportService);
  private translationService = inject(TranslationService);

  protected aiToolRoutingService = inject(AiToolRoutingService);
  protected data$ = this.auditService.auditData$;
  protected service = this.auditService;

  readonly reportExportOptions = AUDITLOG_REPORT_EXPORT_OPTIONS;
  filterModel = audit_filters;
  isFilterOpen$ = this.sidebarService.sidebarState$;
  selectedActor = '';
  sidebarReady = false;
  isExportChoiceOpen=false;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.sidebarReady = true;
    });
  }

  openSidebar() {
    this.sidebarService.openSidebar();
  }

  closeSidebar() {
    this.sidebarService.closeSidebar();
  }

  openExportChoice() {
    this.isExportChoiceOpen = true;
  }

  closeExportChoice() {
    this.isExportChoiceOpen = false;
  }

  selectExport(type: string) {
    this.exportAuditLogs(type);
    this.closeExportChoice();
  }

  onActorChange() {
    this.selectedFilters = { ...this.selectedFilters, actor_id: this.selectedActor || null };
    this.reload();
  }

  exportAuditLogs(type = 'csv') {
    this.auditService.auditData$.pipe(take(1)).subscribe(data => {
      const items = data?.items ?? [];
      if (!items.length) {
        return;
      }
      const page = data?.page ?? 1;
      const rows = items.map((item, index) => ({
        id: index + 1 + (page - 1) * 100,
        timestamp: item.ts,
        actor: item.actor_id,
        tenant: item.tenant_id,
        event: item.event
      }));
      if (type === 'csv') {
        this.helperService.downloadAsCSV(rows);
        return;
      }
      const payload: GraphReportPayload = {
        graphKind: 'cti',
        title: this.translationService.translate('Audit Logs Export'),
        sessionName: 'audit-logs',
        generatedAtIso: new Date().toISOString(),
        nodes: [],
        edges: [],
        summary: {
          total_records: rows.length,
          page
        },
        tables: [
          {
            title: this.translationService.translate('Audit Logs'),
            values: {},
            columns: ['id', 'timestamp', 'actor', 'tenant', 'event'],
            rows: rows.map(row => ({
              id: String(row.id),
              timestamp: String(row.timestamp || ''),
              actor: String(row.actor || ''),
              tenant: String(row.tenant || ''),
              event: String(row.event || '')
            }))
          }
        ]
      };
      this.reportExportService.exportByType(payload, type === 'json' ? 'json' : 'doc_pdf');
    });
  }
}
