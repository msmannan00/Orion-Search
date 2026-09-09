import { Injectable } from '@angular/core';
import { AlertAllIoc, AlertModel } from '../../../model/company-profile/node.model';
import { GraphReportPayload, GraphReportRecordBlock, GraphReportTableRow } from '../../../model/report/report-export.model';
import { ExportBrandingService } from '../../../services/export/export-branding.service';
import { ReportExportService } from '../../../services/export/report-export.service';
import { setOwnProperty } from '../../../utils/type-guards.util';


@Injectable({ providedIn: 'root' })
export class AlertExportService {
  constructor(private exportBranding: ExportBrandingService, private reportExport: ReportExportService) {
  }

  exportPdf(alerts: AlertModel[] | null | undefined, title = 'Brand Alerts'): void {
    this.exportByType(alerts, 'report', title);
  }

  exportByType(alerts: AlertModel[] | null | undefined, type: string, title = 'Brand Alerts'): void {
    const payload = this.buildPayload(alerts, title);
    this.reportExport.exportByType(payload, type === 'json' || type === 'csv' ? type : 'doc_pdf');
  }

  private buildPayload(alerts: AlertModel[] | null | undefined, title: string): GraphReportPayload {
    const exportAtIso = new Date().toISOString();
    const safeAlerts = (Array.isArray(alerts) ? alerts : []).filter(Boolean);
    const baseSummary: Record<string, string | number> = {
      total_alerts: safeAlerts.length,
      categories: new Set(safeAlerts.map(alert => this.getText(alert.type)).filter(value => value !== '-')).size,
      exported_at: exportAtIso
    };

    if (safeAlerts.length === 1) {
      const first = safeAlerts[0];
      baseSummary.type = this.getText(first.type);
      baseSummary.title = this.getText(first.title);
      baseSummary.ioc_type = this.getText(first.ioc_type);
      baseSummary.ioc_value = this.getText(first.ioc_value);
      baseSummary.source = this.getText(this.exportBranding.replaceSystemBrand(first.source));
      baseSummary.url = this.getText(first.url);
      baseSummary.result_date = this.getDateText(this.extractAlertResultDate(first.all_ioc ?? []));
      baseSummary.first_seen = this.getDateText(first.first_seen);
      baseSummary.last_seen = this.getDateText(first.last_seen);
    }

    return {
      graphKind: 'cti',
      title,
      sessionName: `Alert Session (${safeAlerts.length})`,
      generatedAtIso: exportAtIso,
      nodes: [],
      edges: [],
      summary: baseSummary,
      tables: this.buildAlertSections(safeAlerts)
    };
  }

  private buildAlertSections(alerts: AlertModel[]): GraphReportTableRow[] {
    const grouped = new Map<string, AlertModel[]>();
    let recordOffset = 0;
    alerts.forEach(alert => {
      const key = this.getText(alert.type).toLowerCase();
      const type = key && key !== '-' ? key : 'unknown';
      grouped.set(type, [...(grouped.get(type) ?? []), alert]);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, records]) => {
        const recordBlocks = records.map((alert, index) => this.buildAlertRecordBlock(alert, recordOffset + index));
        recordOffset += records.length;
        return {
          title: `${this.toTitle(type)} Alerts (${records.length})`,
          values: { records: String(records.length) },
          recordBlocks
        };
      });
  }

  private buildAlertRecordBlock(alert: AlertModel, index: number): GraphReportRecordBlock {
    const title = this.firstText(alert.title, alert.ioc_value, alert.type, `Alert ${index + 1}`);
    const values: Record<string, string> = {};
    this.addField(values, 'Risk', this.getRiskLevel(alert.type ?? '', alert.risk));
    this.addField(values, 'Category', alert.type);
    this.addField(values, 'Title', alert.title, 260);
    this.addField(values, 'Description', alert.description, 700);
    this.addField(values, 'Entity', alert.ioc_value, 240);
    this.addField(values, 'IOC Type', alert.ioc_type, 160);
    this.addField(values, 'Source', this.exportBranding.replaceSystemBrand(alert.source), 220);
    this.addField(values, 'URL', alert.url, 320);
    this.addField(values, 'Result Date', this.getDateText(this.extractAlertResultDate(alert.all_ioc ?? [])));
    this.addField(values, 'Alert First Seen', this.getDateText(alert.first_seen));
    this.addField(values, 'Alert Last Seen', this.getDateText(alert.last_seen));
    this.addField(values, 'Password', this.extractAlertPassword(alert), 220);
    this.addField(values, 'Hash', alert.data_hash, 220);
    this.appendIocFields(values, alert.all_ioc ?? []);

    return {
      title: `Record ${index + 1} | ${title}`,
      values
    };
  }

  private appendIocFields(values: Record<string, string>, allIoc: AlertAllIoc[]): void {
    (allIoc || [])
      .filter(ioc => !this.isHiddenIocKey(ioc?.name || ''))
      .forEach(ioc => {
        const formatted = this.formatIocField(ioc);
        if (!formatted) {
          return;
        }
        values[formatted.label] = formatted.value;
      });
  }

  private formatIocField(ioc: AlertAllIoc): { label: string; value: string } | null {
    const items = this.getUniqueIocValues(ioc.values || []);
    if (!items.length) {
      return null;
    }

    const labelBase = this.toTitle(ioc.name);
    const label = items.length > 1 ? `${labelBase} (${items.length})` : labelBase;
    const isLongField = this.isLongIocField(ioc.name);
    if (items.length === 1) {
      const singleMax = isLongField ? 260 : 520;
      return { label, value: this.formatIocValue(items[0], singleMax, isLongField) };
    }

    const maxVisible = isLongField ? 4 : 8;
    const visibleItems = items.slice(0, maxVisible);
    const lines = visibleItems.map((item, index) => {
      const itemMax = isLongField ? 220 : 140;
      return `${index + 1}. ${this.formatIocValue(item, itemMax, isLongField)}`;
    });
    if (items.length > maxVisible) {
      lines.push(`+ ${items.length - maxVisible} more values not shown`);
    }
    return { label, value: lines.join('\n') };
  }

  private formatIocValue(value: unknown, maxLength: number, compactWhitespace: boolean): string {
    const text = this.getText(value, maxLength * 2);
    if (text === '-') {
      return text;
    }
    const normalized = compactWhitespace ? text.replace(/\s+/g, '') : text;
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
  }

  private getUniqueIocValues(values: unknown[]): string[] {
    const seen = new Set<string>();
    const output: string[] = [];
    values.forEach(value => {
      const text = this.cleanValue(value);
      if (!text) {
        return;
      }
      const key = text.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      output.push(text);
    });
    return output;
  }

  private isLongIocField(key: string): boolean {
    const normalized = String(key || '').toLowerCase();
    return /(image|images|screenshot|url|urls|link|links|href|src|asset|media)/i.test(normalized);
  }

  private isHiddenIocKey(key: string): boolean {
    const normalized = key.toLowerCase();
    return [
      'm_embedding',
      'embedding',
      'vector',
      'm_title',
      'title',
      'm_url',
      'url',
      'm_base_url',
      'm_content',
      'content',
      'm_important_content',
      'm_hash',
      'hash',
      'm_network',
      'source',
      'm_content_type',
      'content_type',
      'content_types',
      'password',
      'm_password',
      'm_date',
      'date',
      'timestamp',
      'created_at',
      'm_creation_date',
      'm_published_date',
      'm_first_seen'
    ].includes(normalized);
  }

  private extractAlertPassword(alert: AlertModel): string {
    const fromIoc = this.getFirstAlertIocValue(alert.all_ioc ?? [], ['password', 'm_password']);
    if (fromIoc) {
      return fromIoc;
    }
    if ((alert.type ?? '').toLowerCase() !== 'stealerlogs') {
      return '';
    }
    const description = String(alert.description ?? '');
    const labelledPassword = (/\bpassword\s*:\s*([\s\S]*?)(?=\s+(?:links?|filelist|files?|https?:\/\/)\b|$)/i.exec(description))?.[1];
    if (labelledPassword?.trim()) {
      return this.getText(labelledPassword, 360);
    }
    const compact = description.trim();
    return compact && !/\s/.test(compact) && compact.length <= 240 ? this.getText(compact, 240) : '';
  }

  private extractAlertResultDate(allIoc: AlertAllIoc[]): Date | null {
    const rawDate = this.getFirstAlertIocValue(allIoc, [
      'm_date',
      'date',
      'timestamp',
      'created_at',
      'm_creation_date',
      'm_published_date',
      'm_first_seen'
    ]);
    if (!rawDate) {
      return null;
    }
    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getFirstAlertIocValue(allIoc: AlertAllIoc[], keys: string[]): string {
    const wanted = new Set(keys.map(key => key.toLowerCase()));
    const match = (allIoc || []).find(ioc => wanted.has(String(ioc?.name || '').toLowerCase()));
    const value = match?.values?.find(item => this.cleanValue(item));
    return this.cleanValue(value ?? '');
  }

  private addField(fields: Record<string, string>, label: string, value: unknown, maxLength = 240): void {
    const text = this.getText(value, maxLength);
    if (text === '-') {
      return;
    }
    setOwnProperty(fields, label, text);
  }

  private firstText(...values: unknown[]): string {
    for (const value of values) {
      const text = this.getText(value, 180);
      if (text !== '-') {
        return text;
      }
    }
    return '-';
  }

  private getText(value: unknown, maxLength = 240): string {
    if (value === null || value === undefined) {
      return '-';
    }
    const text = String(value)
      .normalize('NFKC')
      .replace(/[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
      .replace(/\u034F|\uFE0E|\uFE0F/g, '')
      .replace(/[\uD800-\uDFFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text || ['-', 'n/a', 'none', 'null', 'undefined'].includes(text.toLowerCase())) {
      return '-';
    }
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  private cleanValue(value: unknown): string {
    const text = this.getText(value, 240);
    return text === '-' ? '' : text;
  }

  private getDateText(value: Date | string | null | undefined): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }
    return parsed.toLocaleString();
  }

  private toTitle(input: string): string {
    return this.getText(input)
      .replace(/^m\s+/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private getRiskLevel(type: string, risk?: string): string {
    const alertRisk = this.formatRisk(risk);
    if (alertRisk) {
      return alertRisk;
    }
    const normalized = (type || '').toLowerCase().trim();
    if (normalized === 'vulnerability-scanning') {
      return 'Not Found';
    }
    switch (normalized) {
      case 'breach':
      case 'exploit':
      case 'malware':
      case 'feed':
      case 'playstore-scanning':
      case 'social-scanner':
      case 'email-breach':
      case 'stealerlogs':
      case 'software-scanning':
        return 'Critical';
      case 'defacement':
      case 'advanced scanning':
      case 'repo scanning':
        return 'High';
      case 'social':
      case 'discussion':
        return 'Medium';
      case 'general':
      case 'seo scanning':
        return 'Low';
      default:
        return 'Unknown';
    }
  }

  private formatRisk(value?: string): string {
    const normalized = (value ?? '').trim().toLowerCase();
    if (!normalized) {
      return '';
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}
