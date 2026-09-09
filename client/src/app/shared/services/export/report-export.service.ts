import { Injectable } from '@angular/core';
import { ExportSharedService } from './export-shared.service';
import { GraphExportService } from './graph-export.service';
import { DocumentExportService } from './document-export.service';
import { GraphReportExportType, GraphReportPayload, UnifiedReportPayloadInput } from '../../model/report/report-export.model';
import { getOwnProperty } from '../../utils/type-guards.util';


@Injectable({ providedIn: 'root' })
export class ReportExportService extends ExportSharedService {
  constructor(private graphExport: GraphExportService, private documentExport: DocumentExportService) {
    super();
  }

  exportByType(payload: GraphReportPayload, type: GraphReportExportType): void {
    if (type === 'doc_pdf') {
      this.documentExport.exportDocumentPdf(payload);
      return;
    }
    if (type === 'csv') {
      this.exportCsv(payload);
      return;
    }
    this.graphExport.exportByType(payload, type);
  }

  buildUnifiedGraphPayload(input: UnifiedReportPayloadInput): GraphReportPayload {
    const routeUrl = input.currentRouteUrl || '/';
    const urlObj = new URL(routeUrl, window.location.origin);
    const pathSegs = urlObj.pathname.split('/').filter(Boolean);
    const queryType = (urlObj.searchParams.get('ci') ?? '').toLowerCase();
    const reportId = pathSegs[pathSegs.length - 1] || 'report';
    const nowIso = new Date().toISOString();

    const normalizedType = queryType === 'feed' ? 'chat' : (queryType || 'report');
    const title = `${this.toTitle(normalizedType)} Report`;
    const sessionName = `ID-${reportId}`;

    const normalizedUrl = this.normalizeUrl(input.url ?? '');
    const source = this.toRecord(input.csvObject);
    const sourceEntries = Object.entries(source);
    const contentText = this.cleanText(input.content ?? '');
    const screenshotRef = this.cleanText(source.m_screenshot || '');
    const reportIdShort = this.compactMiddle(reportId, 14, 12);
    const sourceUrlShort = this.compactMiddle(normalizedUrl, 48, 18);

    const summary: Record<string, string | number> = {
      report_type: this.toTitle(normalizedType),
      report_id: reportIdShort || '-',
      report_id_full: reportId || '-',
      source_url: sourceUrlShort || '-',
      source_url_full: normalizedUrl || '-',
      language: input.lang || input.langDetected || '-',
      screenshot: screenshotRef ? 'Available' : 'Not Available',
      fields_count: sourceEntries.length,
      content_length: contentText.length
    };

    const detailValues: Record<string, string> = {};
    sourceEntries.slice(0, 40).forEach(([k, v]) => {
      detailValues[this.toTitle(k)] = this.cleanText(v).slice(0, 500) || '-';
    });
    if (!sourceEntries.length) {
      detailValues.Details = '-';
    }

    const tables = [{ title: 'Metadata', values: this.buildMetadataValues(source) }];
    if (contentText) {
      tables.push({ title: 'Content Preview', values: { Content: contentText.slice(0, 3000) } });
    }
    tables.push({ title: 'Report Details', values: detailValues });
    tables.push({ title: 'Leak Screenshot', values: this.buildScreenshotValues(source) });
    tables.push({ title: 'Related Reports', values: this.buildRelatedReportsValues(source) });

    const nodes = [
      { id: `report-${reportId}`, label: `${this.toTitle(normalizedType)} Report`, type: 'report' },
      { id: `url-${reportId}`, label: normalizedUrl || 'Unknown URL', type: 'url' }
    ];
    const edges = [{ id: `edge-${reportId}`, from: nodes[0].id, to: nodes[1].id, label: 'source' }];

    return {
      graphKind: 'cti',
      title,
      sessionName,
      generatedAtIso: nowIso,
      nodes,
      edges,
      summary,
      tables
    };
  }

  private exportCsv(payload: GraphReportPayload): void {
    const rows = [
      ['section', 'field', 'value'],
      ...Object.entries(payload.summary || {}).map(([key, value]) => ['Summary', key, value]),
      ...(payload.tables ?? []).flatMap(table => {
        const valueRows = Object.entries(table.values || {}).map(([key, value]) => [table.title, key, value]);
        const tableRows = (table.rows ?? []).flatMap((row, index) =>
          Object.entries(row).map(([key, value]) => [`${table.title} #${index + 1}`, key, value]));
        const blockRows = (table.recordBlocks ?? []).flatMap(block =>
          Object.entries(block.values || {}).map(([key, value]) => [`${table.title} - ${block.title}`, key, value]));
        return [...valueRows, ...tableRows, ...blockRows];
      })
    ];
    const csv = rows.map(row => row.map(value => this.escapeCsvValue(value)).join(',')).join('\n');
    this.downloadText(csv, 'text/csv;charset=utf-8;', `${this.buildSafeFilename(payload)}.csv`);
  }

  private escapeCsvValue(value: unknown): string {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private downloadText(content: string, type: string, filename: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private buildSafeFilename(payload: GraphReportPayload): string {
    return (payload.sessionName || payload.title || 'report')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'report';
  }

  private buildMetadataValues(source: Record<string, string>): Record<string, string> {
    const pick = (...keys: string[]): string => {
      for (const key of keys) {
        const value = this.cleanText(getOwnProperty(source, key) || '');
        if (value) {
          return value;
        }
      }
      return '-';
    };
    return {
      Country: pick('m_location', 'm_country', 'location', 'country'),
      'Scrap File': pick('m_scrap_file', 'scrap_file'),
      Domain: pick('m_domain', 'domain'),
      Language: pick('m_language', 'language'),
      Currencies: pick('m_currencies', 'currencies'),
      Hash: pick('m_hash', 'hash'),
      'Update Date': pick('m_update_date', 'update_date'),
      'Creation Date': pick('m_creation_date', 'creation_date')
    };
  }

  private buildScreenshotValues(source: Record<string, string>): Record<string, string> {
    const screenshot = this.cleanText(source.m_screenshot || '');
    return {
      Description: 'Screenshot Preview',
      Available: screenshot ? 'Yes' : 'No',
      Reference: screenshot || 'No screenshot available'
    };
  }

  private buildRelatedReportsValues(source: Record<string, string>): Record<string, string> {
    const relatedKeys = Object.keys(source).filter(k => /related|mapping|edge|graph/i.test(k));
    const joined = relatedKeys
      .slice(0, 12)
      .map(k => `${this.toTitle(k)}: ${this.cleanText(getOwnProperty(source, k)).slice(0, 180)}`)
      .join(' | ');
    return {
      Description: 'Reports linked directly or indirectly through mapped entities.',
      Status: joined ? 'Found' : 'No related report fields in payload',
      Links: joined || '-'
    };
  }
}
