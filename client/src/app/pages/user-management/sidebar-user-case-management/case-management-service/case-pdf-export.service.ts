import { Injectable } from '@angular/core';
import type jsPDF from 'jspdf';
import type { RowInput } from 'jspdf-autotable';
import { forkJoin, from, map, Observable } from 'rxjs';
import type { SharedCaseArtifact, SharedCaseComment, SharedCaseEntity, SharedCaseLink, SharedCaseReport, SharedCaseTask } from '../model/case.model';
import { ExportBrandingService } from '../../../../shared/services/export/export-branding.service';
import { buildExportFileStem } from '../../../../shared/services/export/export-filename.util';
import { drawInstitutionalCover, drawInstitutionalFooter, drawInstitutionalPageHeader, drawInstitutionalSectionHeading, PDF_EXPORT_LAYOUT } from '../../../../shared/services/export/pdf-export-layout';
import { loadPdfExportFontData, registerPdfExportFonts } from '../../../../shared/services/export/pdf-export-fonts';
import { PDF_EXPORT_THEME } from '../../../../shared/services/export/pdf-export-theme';
import { normalizePdfText, preparePdfValue } from '../../../../shared/services/export/pdf-text.util';
import type { CasePdfExportOptions } from './model/case-pdf-export.model';
export type { CasePdfExportOptions } from './model/case-pdf-export.model';




@Injectable({ providedIn: 'root' })
export class CasePdfExportService {
  private readonly theme = PDF_EXPORT_THEME;

  constructor(private exportBranding: ExportBrandingService) {
  }

  exportCaseReport(report: SharedCaseReport, options: CasePdfExportOptions = {}): Observable<void> {
    return forkJoin({
      jspdfModule: from(import('jspdf')),
      autoTableModule: from(import('jspdf-autotable')),
      fontData: from(loadPdfExportFontData())
    }).pipe(map(({ jspdfModule, autoTableModule, fontData }) => {
      const doc = new jspdfModule.default({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
      registerPdfExportFonts(doc, fontData);
      this.buildPdf(doc, autoTableModule.default, report, {
        ...options,
        appName: this.exportBranding.getTenantName()
      });
      doc.save(`${buildExportFileStem(report.title, report.updatedAt ?? report.createdAt, 'case-report')}.pdf`);
    }));
  }

  private buildPdf(doc: jsPDF, autoTable: typeof import('jspdf-autotable').default, report: SharedCaseReport, options: CasePdfExportOptions): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (PDF_EXPORT_LAYOUT.margin * 2);
    const appName = normalizePdfText(options.appName ?? this.exportBranding.getTenantName());
    doc.setProperties({
      title: normalizePdfText(report.title ?? options.reportLabel ?? 'Case Report'),
      subject: normalizePdfText(options.reportLabel ?? 'Case intelligence export'),
      author: appName,
      creator: appName
    });
    doc.viewerPreferences({ DisplayDocTitle: true, FitWindow: true });
    this.drawPdfCover(doc, report, options);
    doc.addPage();
    let y: number = PDF_EXPORT_LAYOUT.contentStartY;
    y = this.addPdfSection(doc, autoTable, y, 'Case Summary', [
      ['Case ID', report.caseId],
      ['Title', report.title],
      ['Type', this.formatLabel(report.caseType, report.otherValue)],
      ['Status', this.formatLabel(report.status)],
      ['Severity', this.formatLabel(report.severity)],
      ['Priority', this.formatLabel(report.priority)],
      ['Created', this.formatDate(report.createdAt)],
      ['Updated', this.formatDate(report.updatedAt)],
      ['Expires', this.formatDate(report.expiresAt)],
      ['Tags', (report.tags ?? []).map(tag => this.formatLabel(tag)).join(', ') || '-'],
      ['Description', report.description ?? 'No description provided.'],
    ], contentWidth);

    const primaryEntity = this.getPrimaryEntity(report);
    if (primaryEntity) {
      y = this.addPdfSection(doc, autoTable, y, 'Primary Entity', [
        ['Value', primaryEntity.value],
        ['Display Name', primaryEntity.entityDescription ?? primaryEntity.value],
        ['Type', this.formatLabel(primaryEntity.type, primaryEntity.entityTypeOtherValue)],
        ['Role', this.formatLabel(primaryEntity.role)],
        ['Confidence', this.formatConfidence(primaryEntity.confidence)],
        ['Relationship', this.formatLabel(primaryEntity.relationshipToCase)],
        ['Source', this.formatLabel(primaryEntity.source, primaryEntity.entitySourceOtherValue)],
        ['Created By', primaryEntity.createdBy ?? '-'],
        ['Updated By', primaryEntity.updatedBy ?? '-'],
        ['Created At', this.formatDate(primaryEntity.createdAt)],
        ['Updated At', this.formatDate(primaryEntity.updatedAt)],
        ['Tags', (primaryEntity.tags ?? []).map(tag => this.formatLabel(tag)).join(', ') || '-'],
        ['Social Profiles', (primaryEntity.socialProfiles ?? []).map(profile => `${this.formatLabel(profile.platform, profile.platformOtherValue)}: ${profile.username}${profile.displayName ? ` (${profile.displayName})` : ''}${profile.profileUrl ? ` - ${profile.profileUrl}` : ''}`).join('\n') || '-'],
        ['Identifiers', (primaryEntity.identifiers ?? []).map(identifier => `${this.formatLabel(identifier.type, identifier.identifierTypeOtherValue)}: ${identifier.value}${identifier.issuer ? `, Issuer: ${identifier.issuer}` : ''}${identifier.verified ? ', Verified' : ''}`).join('\n') || '-'],
      ], contentWidth);
    }

    if (Boolean(report.closure) || Boolean(report.closedAt)) {
      y = this.addPdfSection(doc, autoTable, y, 'Closure', [
        ['Reason', this.formatLabel(report.closure?.reason, report.closure?.closureReasonOtherValue)],
        ['Summary', report.closure?.summary ?? 'No closure summary provided.'],
        ['Resolution', report.closure?.resolution ?? '-'],
        ['Closed At', this.formatDate(report.closedAt ?? report.closure?.closedAt)],
      ], contentWidth);
    }

    y = this.addPdfSection(doc, autoTable, y, 'Related Entities', this.buildRelatedEntityRows(this.getRelatedEntities(report)), contentWidth);
    y = this.addPdfSection(doc, autoTable, y, 'Artifacts', this.buildArtifactRows(report.artifacts ?? []), contentWidth);
    y = this.addPdfSection(doc, autoTable, y, 'Comments', this.buildCommentRows(report.comments ?? []), contentWidth);
    y = this.addPdfSection(doc, autoTable, y, 'Tasks', this.buildTaskRows(report.tasks ?? []), contentWidth);
    this.addPdfSection(doc, autoTable, y, 'Linked Cases', this.buildLinkedCaseRows(report.linkedCases ?? []), contentWidth);
    this.addPdfFooters(doc, options.appName ?? this.exportBranding.getTenantName());
  }

  private getPrimaryEntity(report: SharedCaseReport): SharedCaseEntity | null {
    const entities = report.entities ?? [];
    return entities.find(entity => entity.entityId === report.primaryEntityId)
      ?? entities.find(entity => entity.role === 'primary')
      ?? null;
  }

  private getRelatedEntities(report: SharedCaseReport): SharedCaseEntity[] {
    const entities = report.entities ?? [];
    const primaryEntity = this.getPrimaryEntity(report);

    return entities.filter(entity =>
      entity.entityId !== primaryEntity?.entityId &&
      entity.role !== 'primary');
  }

  private buildRelatedEntityRows(entities: SharedCaseEntity[]): RowInput[] {
    if (!entities.length) {
      return [['Related Entities', 'No related entities added.']];
    }

    return entities.flatMap((entity, index) => [
      [`Related Entity ${index + 1}`, entity.entityDescription ?? entity.value],
      ['Value', entity.value],
      ['Type', this.formatLabel(entity.type, entity.entityTypeOtherValue)],
      ['Role', this.formatLabel(entity.role)],
      ['Confidence', this.formatLabel(entity.confidence)],
      ['Source', this.formatLabel(entity.source, entity.entitySourceOtherValue)],
      ['Tags', (entity.tags ?? []).map(tag => this.formatLabel(tag)).join(', ') || '-'],
      ['Social Profiles', (entity.socialProfiles ?? []).map(profile => `${this.formatLabel(profile.platform, profile.platformOtherValue)}: ${profile.username}${profile.displayName ? ` (${profile.displayName})` : ''}${profile.profileUrl ? ` - ${profile.profileUrl}` : ''}`).join('\n') || '-'],
      ['Identifiers', (entity.identifiers ?? []).map(identifier => `${this.formatLabel(identifier.type, identifier.identifierTypeOtherValue)}: ${identifier.value}${identifier.issuer ? `, Issuer: ${identifier.issuer}` : ''}${identifier.verified ? ', Verified' : ''}`).join('\n') || '-'],
    ]);
  }

  private buildCommentRows(comments: SharedCaseComment[]): RowInput[] {
    if (!comments.length) {
      return [['Comments', 'No comments added.']];
    }

    return comments.flatMap((comment, index) => [
      [`Comment ${index + 1}`, comment.body],
      ['Created By / At', `${comment.createdBy ?? '-'} | ${this.formatDate(comment.createdAt)}`],
    ]);
  }

  private drawPdfCover(doc: jsPDF, report: SharedCaseReport, options: CasePdfExportOptions): void {
    const reportLabel = options.reportLabel ?? 'Shared Case Report';
    const appName = options.appName ?? this.exportBranding.getTenantName();
    drawInstitutionalCover(doc, {
      title: normalizePdfText(report.title || reportLabel),
      subtitle: `${reportLabel} | ${report.caseId} | ${this.formatLabel(report.caseType)}`,
      reportFamily: 'Case Intelligence Review',
      preparedFor: appName,
      generatedAt: this.formatDate(new Date().toISOString()),
      context: report.caseId,
      lead: 'A consolidated case record prepared for authorized investigation, review, and decision-making.',
      sections: ['Case Summary', 'Entities and Evidence', 'Tasks and Linked Cases']
    });
  }

  private addPdfSection(doc: jsPDF, autoTable: typeof import('jspdf-autotable').default, y: number, title: string, rows: RowInput[], contentWidth: number): number {
    const startY = this.resolvePdfY(doc, y, 86);
    const margin = PDF_EXPORT_LAYOUT.margin;
    const borderThickness = this.theme.tableBorderWidth;
    drawInstitutionalSectionHeading(doc, startY, contentWidth, normalizePdfText(title));
    autoTable(doc, {
      startY: startY + 16,
      margin: { top: 70, left: margin, right: margin, bottom: 56 },
      tableWidth: contentWidth,
      body: this.preparePdfRows(rows.length ? rows : [['-', 'No data added.']] as RowInput[]),
      rowPageBreak: 'avoid',
      theme: 'plain',
      styles: {
        fontSize: 8.5,
        cellPadding: 6,
        overflow: 'linebreak',
        valign: 'top',
        textColor: this.theme.textBodyRgb,
        lineWidth: { top: 0, right: 0, bottom: borderThickness, left: 0 },
        lineColor: this.theme.tableBorderRgb,
      },
      bodyStyles: {
        fillColor: this.theme.tableRowBgRgb,
        lineWidth: { top: 0, right: 0, bottom: borderThickness, left: 0 },
        lineColor: this.theme.tableBorderRgb,
      },
      alternateRowStyles: {
        fillColor: this.theme.tableRowBgRgb,
        lineWidth: { top: 0, right: 0, bottom: borderThickness, left: 0 },
        lineColor: this.theme.tableBorderRgb,
      },
      columnStyles: { 0: { cellWidth: 130, fontStyle: 'bold' }, 1: { cellWidth: contentWidth - 130 } },
      didParseCell: data => {
        const rawRow = Array.isArray(data?.row?.raw) ? data.row.raw : [];
        const label = String(rawRow[0] ?? '');
        if (data.column.index === 0) {
          data.cell.styles.fillColor = this.theme.firstColumnFillRgb;
          data.cell.styles.textColor = this.theme.textSecondaryRgb;
          data.cell.styles.fontSize = 7.7;
        }
        if (data.column.index === 1 && this.isTechnicalPdfField(label)) {
          data.cell.styles.font = 'courier';
          data.cell.styles.fontSize = 7.2;
        }
      },
    });
    return ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY) + 18;
  }

  private buildArtifactRows(artifacts: SharedCaseArtifact[]): RowInput[] {
    if (!artifacts.length) {
      return [['Artifacts', 'No artifacts added.']];
    }
    return artifacts.flatMap((artifact, index) => [
      [`Artifact ${index + 1}`, artifact.title || 'Untitled artifact'],
      ['Type / Source', `${this.formatLabel(artifact.type, artifact.artifactTypeOtherValue)} | ${this.formatLabel(artifact.source, artifact.artifactSourceOtherValue)}`],
      ['Description', artifact.description ?? '-'],
      ['URL', artifact.url ?? '-'],
      ['File', artifact.fileName ?? '-'],
      ['File Type', artifact.fileType ?? '-'],
      ['Captured At', this.formatDate(artifact.capturedAt)],
      ['Tags', (artifact.tags ?? []).map(tag => this.formatLabel(tag)).join(', ') || '-'],
    ]);
  }

  private buildTaskRows(tasks: SharedCaseTask[]): RowInput[] {
    if (!tasks.length) {
      return [['Tasks', 'No tasks added.']];
    }
    return tasks.flatMap((task, index) => [
      [`Task ${index + 1}`, task.title],
      ['Description', task.description ?? '-'],
      ['Status / Priority', `${this.formatLabel(task.status)} | ${this.formatLabel(task.priority)}`],
      ['Assigned To', task.assignedTo ?? '-'],
      ['Due', this.formatDate(task.dueAt)],
      ['Created / Updated', `${this.formatDate(task.createdAt)} | ${this.formatDate(task.updatedAt)}`],
      ['Completed', this.formatDate(task.completedAt)],
    ]);
  }

  private buildLinkedCaseRows(linkedCases: SharedCaseLink[]): RowInput[] {
    if (!linkedCases.length) {
      return [['Linked Cases', 'No linked cases added.']];
    }
    return linkedCases.flatMap((linkedCase, index) => [
      [`Linked Case ${index + 1}`, linkedCase.targetCaseId],
      ['Relationship', this.formatLabel(linkedCase.relationship)],
      ['Reason', linkedCase.reason ?? '-'],
      ['Created By / At', `${linkedCase.createdBy ?? '-'} | ${this.formatDate(linkedCase.createdAt)}`],
    ]);
  }

  private resolvePdfY(doc: jsPDF, y: number, neededHeight: number): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + neededHeight > pageHeight - 56) {
      doc.addPage();
      return 70;
    }
    return y;
  }

  private addPdfFooters(doc: jsPDF, appName: string): void {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      if (page === 1) {
        continue;
      }
      this.drawCasePageHeader(doc, 'Case Details', appName);
      drawInstitutionalFooter(doc, {
        tenantName: appName,
        section: 'Case Intelligence | Case Details',
        pageNo: page - 1,
        totalPages: pageCount - 1
      });
    }
  }

  private drawCasePageHeader(doc: jsPDF, section: string, appName: string): void {
    drawInstitutionalPageHeader(doc, {
      tenantName: appName,
      reportFamily: 'Case Intelligence Report',
      section
    });
  }

  private preparePdfRows(rows: RowInput[]): RowInput[] {
    return rows.map(row => {
      if (!Array.isArray(row)) {
        return row;
      }
      return row.map(cell => {
        if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') {
          return preparePdfValue(cell);
        }
        if (cell && typeof cell === 'object' && 'content' in cell) {
          return { ...cell, content: preparePdfValue(cell.content) };
        }
        return cell;
      });
    });
  }

  private isTechnicalPdfField(label: string): boolean {
    return /(password|hash|url|link|domain|email|username|ioc|file|identifier|ip|wallet|address)/i.test(label);
  }

  private formatConfidence(value?: string | null): string {
    return this.formatLabel(value ?? 'high');
  }

  private formatLabel(value?: string | null, otherValue?: string | null): string {
    if (value === 'other' && otherValue?.trim()) {
      return normalizePdfText(`Other: ${otherValue}`);
    }
    if (!value) {
      return '-';
    }
    const label = value.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    return normalizePdfText(this.exportBranding.replaceSystemBrand(label));
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

}
