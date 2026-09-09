import { Injectable } from '@angular/core';
import type jsPDF from 'jspdf';
import type { CellHookData, HookData, RowInput } from 'jspdf-autotable';
import { GraphReportMeta, GraphReportPayload, GraphReportTableRow } from '../../model/report/report-export.model';
import { GraphExportService } from './graph-export.service';
import { drawInstitutionalContentTitle, drawInstitutionalCover, drawInstitutionalFooter, drawInstitutionalPageHeader, PDF_EXPORT_LAYOUT } from './pdf-export-layout';
import { PdfExportFontData, registerPdfExportFonts } from './pdf-export-fonts';
import { PdfExportTheme } from './pdf-export-theme';
import { preparePdfValue } from './pdf-text.util';
import { assertAutoTableDocument, AutoTableDocument } from './pdf-autotable.types';
import { getOwnProperty } from '../../utils/type-guards.util';


@Injectable({ providedIn: 'root' })
export class DocumentExportService extends GraphExportService {
  exportDocumentPdf(payload: GraphReportPayload): void {
    this.exportDocumentPdfStream(payload);
  }

  private exportDocumentPdfStream(payload: GraphReportPayload): void {
    this.getPdfLibs().subscribe(libs => {
      const bytes = this.buildDocPdfBytes(this.preparePayloadForPdf(payload), libs.jsPDF, libs.autoTable, null, libs.fontData);
      this.downloadBinary(bytes, 'application/pdf', `${this.buildSafeFilename(payload)}.pdf`);
    });
  }

  private buildDocPdfBytes(payload: GraphReportPayload, JsPdfCtor: typeof import('jspdf').default, autoTable: typeof import('jspdf-autotable').default, tenantLogoDataUrl: string | null, fontData: PdfExportFontData | null = null): Uint8Array {
    const doc = new JsPdfCtor({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    registerPdfExportFonts(doc, fontData);
    const meta = this.makeMeta(payload, tenantLogoDataUrl);
    this.applyPdfDocumentProperties(doc, payload, meta);
    const theme = this.PDF_THEME;
    const tableTheme = this.getTableTheme(theme);
    const hooks = this.makeHeaderFooterHooks(payload, meta, theme);
    const firstSectionY = this.drawCover(doc, payload, meta, 'Document Report', theme);
    const pageW = doc.internal.pageSize.getWidth();
    const margin = PDF_EXPORT_LAYOUT.margin;
    const contentW = pageW - (margin * 2);
    const continuationMarkerY = PDF_EXPORT_LAYOUT.contentStartY;
    const continuationTableY = continuationMarkerY + 13;
    this.drawInfoSectionMarker(doc, firstSectionY, contentW, 'Executive Summary', theme?.sectionHeaderRgb);
    autoTable(doc, {
      startY: firstSectionY + 12,
      margin: { top: 72, left: margin, right: margin, bottom: 58 },
      tableWidth: contentW,
      body: Object.entries(payload.summary ?? {}).map(([k, v]) => [this.toTitle(k), String(v)]),
      ...this.buildPlainTableTheme({ fontSize: 9, cellPadding: 6, ...tableTheme }),
      columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: contentW - 150 } },
      didParseCell: this.makeFirstColumnDidParse(theme?.firstColumnFillRgb),
      didDrawPage: hooks.didDrawPage
    });
    assertAutoTableDocument(doc);
    this.drawRoundedTableContainer(doc, margin, contentW, firstSectionY, doc.lastAutoTable.finalY ?? firstSectionY);
    const graphImageDataUrl = payload.graphImageDataUrl;
    if (this.isJpegDataUrl(graphImageDataUrl)) {
      const snapshotHeight = this.getScreenshotPreviewHeight(doc, graphImageDataUrl, contentW, 260);
      const snapshotMarkerY = this.resolveMarkerY(doc, doc.lastAutoTable.finalY + 14, PDF_EXPORT_LAYOUT.contentStartY, undefined, snapshotHeight + 18);
      this.drawInfoSectionMarker(doc, snapshotMarkerY, contentW, 'Network Snapshot', theme?.sectionHeaderRgb);
      const snapshotBottom = this.drawScreenshotPreview(doc, graphImageDataUrl, margin, snapshotMarkerY + 18, contentW, 260);
      if (doc.lastAutoTable) {
        doc.lastAutoTable.finalY = snapshotBottom;
      }
    }
    if (payload.nodes.length) {
      const requestedNodeY = Math.max(doc.lastAutoTable.finalY ?? 160, 160) + 18;
      const nodeMarkerY = this.resolveMarkerY(doc, requestedNodeY, PDF_EXPORT_LAYOUT.contentStartY, undefined, 70);
      this.drawInfoSectionMarker(doc, nodeMarkerY, contentW, 'Nodes', theme?.sectionHeaderRgb);
      autoTable(doc, {
        startY: nodeMarkerY + 12,
        margin: { top: 72, left: margin, right: margin, bottom: 58 },
        tableWidth: contentW,
        head: [['Node', 'Type', 'ID']] as RowInput[],
        body: payload.nodes.slice(0, 150).map(n => [
          preparePdfValue(n.label || n.id, 34),
          preparePdfValue(n.type, 24),
          preparePdfValue(String(n.id || ''), 34)
        ]),
        showHead: 'everyPage',
        ...this.buildPlainTableTheme({ fontSize: 8, cellPadding: 5, ...tableTheme }),
        columnStyles: { 0: { cellWidth: contentW * 0.46 }, 1: { cellWidth: contentW * 0.18 }, 2: { cellWidth: contentW * 0.36 } },
        didParseCell: this.makeHeaderRowDidParse(theme?.headerRowFillRgb, false),
        didDrawPage: hooks.didDrawPage
      });
      this.drawRoundedTableContainer(doc, margin, contentW, doc.lastAutoTable.startY ?? 0, doc.lastAutoTable.finalY ?? 0);
    }
    if (payload.tables?.length) {
      const hasMultipleRecordGroups = payload.tables.filter(table => Boolean(table.recordBlocks?.length)).length > 1;
      payload.tables.forEach((t, idx) => {
        const sectionTitle = this.getReportSectionTitle(t, idx);
        if (t.recordBlocks?.length) {
          this.drawRecordBlockSection(doc, autoTable, t, sectionTitle, contentW, margin, hooks.didDrawPage, theme, meta.kindLabel, hasMultipleRecordGroups);
          return;
        }
        const structuredRows = this.buildStructuredSectionRows(t);
        const hasStructuredRows = structuredRows.length > 1;
        const tableRows = hasStructuredRows ? structuredRows : this.buildReportSectionRows(t.values ?? {});
        let markerY = (doc.lastAutoTable.finalY ?? 160) + 18;
        markerY = this.resolveMarkerY(doc, markerY, PDF_EXPORT_LAYOUT.contentStartY, undefined, 70);
        this.drawInfoSectionMarker(doc, markerY, contentW, sectionTitle, theme?.sectionHeaderRgb);
        const sectionStartPage = doc.getCurrentPageInfo().pageNumber;
        const reportSectionDidDrawPage = (data: HookData) => {
          hooks.didDrawPage(data);
          const pageNo = data?.doc?.getCurrentPageInfo?.().pageNumber ?? data?.pageNumber ?? sectionStartPage;
          if (pageNo !== sectionStartPage) {
            this.drawInfoSectionMarker(data.doc as jsPDF, continuationMarkerY, contentW, sectionTitle || 'Info', theme?.sectionHeaderRgb);
          }
        };
        autoTable(doc, {
          startY: markerY + 12,
          margin: { top: continuationTableY, left: margin, right: margin, bottom: 58 },
          tableWidth: contentW,
          head: [tableRows[0]] as RowInput[],
          body: tableRows.slice(1),
          showHead: 'everyPage',
          ...this.buildPlainTableTheme({
            fontSize: hasStructuredRows ? 7.4 : 9,
            cellPadding: hasStructuredRows ? 4 : 6,
            overflow: hasStructuredRows ? 'linebreak' : undefined,
            valign: hasStructuredRows ? 'top' : undefined,
            ...tableTheme
          }),
          columnStyles: hasStructuredRows ? this.buildStructuredColumnStyles(t.columns ?? [], contentW) : { 0: { cellWidth: 135 }, 1: { cellWidth: contentW - 135 } },
          didParseCell: hasStructuredRows
            ? this.makeHeaderRowDidParse(theme?.headerRowFillRgb, false)
            : this.makeHeaderAndFirstColumnDidParse(theme?.headerRowFillRgb, theme?.firstColumnFillRgb, false),
          didDrawPage: reportSectionDidDrawPage
        });
        const screenshotDataUrl = this.findTableScreenshotDataUrl(t);
        if (screenshotDataUrl) {
          const lastY = doc.lastAutoTable.finalY ?? (markerY + 12);
          const previewHeight = this.getScreenshotPreviewHeight(doc, screenshotDataUrl, contentW, 180);
          const imageY = this.resolveMarkerY(doc, lastY + 10, 98, () => {
            this.drawInfoSectionMarker(doc, 82, contentW, sectionTitle, theme?.sectionHeaderRgb);
          }, previewHeight);
          const imageBottom = this.drawScreenshotPreview(doc, screenshotDataUrl, margin, imageY, contentW, 180);
          if (doc.lastAutoTable) {
            doc.lastAutoTable.finalY = imageBottom;
          }
        }
        this.drawRoundedTableContainer(doc, margin, contentW, doc.lastAutoTable.startY ?? 0, doc.lastAutoTable.finalY ?? 0);
      });
    }
    if ((payload.edges || []).length > 0) {
      const edgeMarkerY = this.resolveMarkerY(doc, doc.lastAutoTable.finalY + 18, PDF_EXPORT_LAYOUT.contentStartY, undefined, 70);
      this.drawInfoSectionMarker(doc, edgeMarkerY, contentW, 'Connection Matrix', theme?.sectionHeaderRgb);
      autoTable(doc, {
        startY: edgeMarkerY + 12,
        margin: { top: 72, left: margin, right: margin, bottom: 58 },
        tableWidth: contentW,
        head: [['#', 'From', 'To', 'Label']] as RowInput[],
        body: payload.edges.slice(0, 200).map((e, i) => [
          String(i + 1),
          preparePdfValue(e.from, 30),
          preparePdfValue(e.to, 30),
          preparePdfValue(e.label ?? '', 30)
        ]),
        showHead: 'everyPage',
        ...this.buildPlainTableTheme({ fontSize: 7.4, cellPadding: 4, ...tableTheme }),
        columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: (contentW - 38) / 3 }, 2: { cellWidth: (contentW - 38) / 3 }, 3: { cellWidth: (contentW - 38) / 3 } },
        didParseCell: this.makeHeaderRowDidParse(theme?.headerRowFillRgb, false),
        didDrawPage: hooks.didDrawPage
      });
      this.drawRoundedTableContainer(doc, margin, contentW, doc.lastAutoTable.startY ?? 0, doc.lastAutoTable.finalY ?? 0);
    }
    this.finalizeDocumentPages(doc, payload, meta, theme);
    return this.docToBytes(doc);
  }

  private drawRecordBlockSection(doc: jsPDF, autoTable: typeof import('jspdf-autotable').default, table: GraphReportTableRow, sectionTitle: string, contentWidth: number, margin: number, didDrawPage: (data: HookData) => void, theme: PdfExportTheme | null, reportKind: string, showGroupLabel: boolean): void {
    const recordBlocks = table.recordBlocks ?? [];
    const isCredentialRegister = reportKind === 'Credentials';
    const registerTitle = `${recordBlocks.length} ${isCredentialRegister ? 'Source Records' : 'Alert Records'}`;
    const registerSubtitle = isCredentialRegister
      ? `${showGroupLabel ? `${sectionTitle}. ` : ''}Record numbering, field names and values follow the supplied Credentials Export.`
      : `Record numbering, field names and values follow ${sectionTitle || 'the supplied alert evidence'}.`;
    const registerEyebrow = isCredentialRegister ? 'Credential Evidence Register' : 'Alert Evidence Register';
    doc.addPage();
    this.drawReportBackgroundPattern(doc);
    drawInstitutionalContentTitle(doc, registerTitle, registerSubtitle, registerEyebrow);
    let startY = 137;
    const labelColumnWidth = 73.6;
    const valueTextInset = 8.8;
    recordBlocks.forEach((block, index) => {
      const title = String(block?.title || `Record ${index + 1}`).trim() || `Record ${index + 1}`;
      const fieldRows = this.buildReportSectionRows(block?.values ?? {}).slice(1);
      const rows: RowInput[] = [
        [{ content: title, colSpan: 2 }] as RowInput,
        ...((fieldRows.length ? fieldRows : [['Status', 'No details available']]) as RowInput[])
      ];
      autoTable(doc, {
        startY,
        margin: { top: 51.4, left: margin, right: margin, bottom: 48 },
        tableWidth: contentWidth,
        body: rows,
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        theme: 'plain',
        styles: {
          font: 'helvetica',
          fontSize: 7.15,
          cellPadding: { top: 4.2, right: 0, bottom: 3.5, left: 0 },
          overflow: 'linebreak',
          valign: 'top',
          textColor: theme?.textBodyRgb ?? this.PDF_THEME.textBodyRgb,
          fillColor: theme?.whiteRgb ?? this.PDF_THEME.whiteRgb,
          lineColor: theme?.recordDividerRgb ?? this.PDF_THEME.recordDividerRgb,
          lineWidth: { top: 0, right: 0, bottom: 0.35, left: 0 }
        },
        bodyStyles: { fillColor: theme?.whiteRgb ?? this.PDF_THEME.whiteRgb },
        alternateRowStyles: { fillColor: theme?.whiteRgb ?? this.PDF_THEME.whiteRgb },
        columnStyles: {
          0: { cellWidth: labelColumnWidth },
          1: { cellWidth: contentWidth - labelColumnWidth, cellPadding: { top: 4.2, right: 0, bottom: 3.5, left: valueTextInset } }
        },
        didParseCell: this.makeRecordBlockDidParse(new Set([0]), theme),
        didDrawCell: this.makeRecordBlockDidDraw(new Set([0]), theme, labelColumnWidth + valueTextInset),
        didDrawPage
      });
      startY = ((doc as AutoTableDocument).lastAutoTable.finalY ?? startY) + 14.3;
    });
  }

  private makeRecordBlockDidParse(titleRowIndexes: Set<number>, theme: PdfExportTheme | null): (data: CellHookData) => void {
    return (data: CellHookData) => {
      if (titleRowIndexes.has(data?.row?.index)) {
        data.cell.styles.fillColor = theme?.whiteRgb ?? this.PDF_THEME.whiteRgb;
        data.cell.styles.textColor = theme?.whiteRgb ?? this.PDF_THEME.whiteRgb;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 6;
        data.cell.styles.minCellHeight = 22.8;
        data.cell.styles.lineWidth = 0;
        data.cell.styles.cellPadding = { top: 6, right: 0, bottom: 5, left: 0 };
        data.cell.text = [''];
        return;
      }
      if (data?.column?.index === 0) {
        data.cell.styles.fillColor = theme?.firstColumnFillRgb ?? this.PDF_THEME.whiteRgb;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = this.PDF_THEME.textSecondaryRgb;
        data.cell.styles.fontSize = 6.4;
      }
      const rawRow = Array.isArray(data?.row?.raw) ? data.row.raw : [];
      const fieldLabel = String(rawRow[0] ?? '');
      if (data?.column?.index === 1 && this.isMonospaceEvidenceField(fieldLabel)) {
        data.cell.styles.font = 'courier';
        data.cell.styles.fontSize = 6.67;
      }
    };
  }

  private makeRecordBlockDidDraw(titleRowIndexes: Set<number>, theme: PdfExportTheme | null, identityOffset: number): (data: CellHookData) => void {
    return (data: CellHookData) => {
      if (!titleRowIndexes.has(data?.row?.index) || data?.column?.index !== 0) {
        return;
      }
      const raw = data?.cell?.raw;
      const title = String(raw && typeof raw === 'object' && 'content' in raw ? raw.content : '').trim();
      const { recordLabel, identity } = this.splitRecordTitle(title);
      const x = data.cell.x;
      const recordLabelY = data.cell.y + 13.1;
      const identityY = data.cell.y + 14.4;
      const drawDoc = data.doc as jsPDF;
      drawDoc.setDrawColor(...(theme?.coverBandRgb ?? this.PDF_THEME.coverBandRgb));
      drawDoc.setLineWidth(0.8);
      drawDoc.line(x, data.cell.y, x + data.cell.width, data.cell.y);
      drawDoc.setDrawColor(...(theme?.coverPanelBorderRgb ?? this.PDF_THEME.coverPanelBorderRgb));
      drawDoc.setLineWidth(0.45);
      drawDoc.line(x, data.cell.y + data.cell.height, x + data.cell.width, data.cell.y + data.cell.height);
      drawDoc.setFont('helvetica', 'bold');
      drawDoc.setFontSize(6);
      drawDoc.setTextColor(...(theme?.sectionHeaderRgb ?? this.PDF_THEME.sectionHeaderRgb));
      drawDoc.setCharSpace(0.8);
      drawDoc.text(recordLabel.toUpperCase(), x, recordLabelY);
      drawDoc.setCharSpace(0);
      if (identity) {
        drawDoc.setFontSize(8.1);
        drawDoc.setTextColor(...(theme?.coverBandRgb ?? this.PDF_THEME.coverBandRgb));
        drawDoc.text(this.fitSingleLine(drawDoc, identity, data.cell.width - identityOffset), x + identityOffset, identityY);
      }
    };
  }

  private splitRecordTitle(title: string): { recordLabel: string; identity: string } {
    if (!title.toLowerCase().startsWith('record')) {
      return { recordLabel: 'Record', identity: '' };
    }

    let cursor = 'record'.length;
    while (cursor < title.length && /\s/.test(title.charAt(cursor))) {
      cursor += 1;
    }
    if (title.charAt(cursor) === '#') {
      cursor += 1;
    }
    while (cursor < title.length && /\s/.test(title.charAt(cursor))) {
      cursor += 1;
    }
    const numberStart = cursor;
    while (cursor < title.length) {
      const character = title.charAt(cursor);
      if (character < '0' || character > '9') {
        break;
      }
      cursor += 1;
    }
    if (cursor === numberStart) {
      return { recordLabel: 'Record', identity: '' };
    }

    const recordLabel = title.slice(0, cursor).trim();
    let identity = title.slice(cursor).trim();
    if ('|/-:'.includes(identity.charAt(0))) {
      identity = identity.slice(1).trim();
    }
    return { recordLabel, identity };
  }

  private isMonospaceEvidenceField(label: string): boolean {
    return /(password|hash|raw trace|file name|source file|url|link|ioc|identifier|wallet)/i.test(label);
  }

  private drawCover(doc: jsPDF, payload: GraphReportPayload, meta: GraphReportMeta, subtitle: string, theme: PdfExportTheme | null): number {
    this.drawReportBackgroundPattern(doc);
    void theme;
    const tableSections = (payload.tables ?? []).map((table, index) => this.getReportSectionTitle(table, index));
    drawInstitutionalCover(doc, {
      title: payload.title || 'Intelligence Report',
      subtitle: this.getCoverSubtitle(meta),
      reportFamily: meta.kindLabel || subtitle,
      preparedFor: meta.tenantName,
      generatedAt: meta.generatedAt,
      context: this.getReportContext(payload),
      lead: 'An integrated intelligence review prepared for authorized operational and security decision-making.',
      sections: [
        'Executive Summary',
        tableSections[0] || 'Detailed Intelligence',
        tableSections[1] || ((payload.edges || []).length ? 'Connection Matrix' : 'Supporting Evidence')
      ]
    });
    doc.addPage();
    this.drawReportBackgroundPattern(doc);
    return PDF_EXPORT_LAYOUT.contentStartY;
  }

  private getCoverSubtitle(meta: GraphReportMeta): string {
    if (meta.kindLabel === 'Brand Alerts') {
      return 'Brand alert intelligence dossier';
    }
    if (meta.kindLabel === 'CTI Network') {
      return 'CTI intelligence dossier';
    }
    if (meta.kindLabel === 'Social Network') {
      return 'Social intelligence dossier';
    }
    return 'Credential exposure intelligence dossier';
  }

  private makeHeaderFooterHooks(payload: GraphReportPayload, meta: GraphReportMeta, theme: PdfExportTheme | null): {
    didDrawPage: (data: HookData) => void;
  } {
    void payload;
    void meta;
    void theme;
    return { didDrawPage: () => undefined };
  }

  private finalizeDocumentPages(doc: jsPDF, payload: GraphReportPayload, meta: GraphReportMeta, theme: PdfExportTheme | null): void {
    const totalPages = doc.getNumberOfPages();
    const pageWidth = this.getPageW(doc);
    const pageHeight = this.getPageH(doc);
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      if (page === 1) {
        continue;
      }
      if (theme) {
        this.drawCredentialPageHeader(doc, payload.title || 'Network Report', 'Details', meta, theme);
      }
      else {
        this.drawStandardPageHeader(doc, payload.title || 'Network Report', 'Details', 54);
      }
      doc.setFillColor(...(theme?.tableRowBgRgb ?? this.PDF_THEME.whiteRgb));
      doc.rect(0, pageHeight - 43, pageWidth, 43, 'F');
      drawInstitutionalFooter(doc, {
        tenantName: meta.tenantName,
        section: meta.kindLabel === 'Credentials'
          ? 'SECTION II | CREDENTIAL EXPOSURE INTELLIGENCE'
          : `${meta.kindLabel} | Intelligence Details`,
        pageNo: page - 1,
        totalPages: totalPages - 1
      });
    }
  }

  private drawCredentialPageHeader(doc: jsPDF, title: string, section: string, meta: GraphReportMeta, theme: PdfExportTheme): void {
    void theme;
    const isCredentialRegister = meta.kindLabel === 'Credentials';
    const includeKindInSection = title.trim().toLowerCase() !== meta.kindLabel.trim().toLowerCase();
    drawInstitutionalPageHeader(doc, {
      tenantName: meta.tenantName,
      reportFamily: isCredentialRegister ? 'Restricted Credential Evidence' : title,
      section: isCredentialRegister ? '' : (includeKindInSection ? `${meta.kindLabel} / ${section}` : section)
    });
  }

  private getTableTheme(theme: PdfExportTheme | null): {
    rowFillColor?: [number, number, number];
    alternateRowFillColor?: [number, number, number];
    lineColor?: [number, number, number];
  } {
    if (!theme) {
      return {};
    }
    return {
      rowFillColor: theme.tableRowBgRgb,
      alternateRowFillColor: theme.tableRowAltBgRgb,
      lineColor: theme.tableBorderRgb
    };
  }

  private buildStructuredSectionRows(table: GraphReportTableRow): string[][] {
    const columns = table.columns ?? [];
    const rows = table.rows ?? [];
    if (!columns.length || !rows.length) {
      return [];
    }
    return [
      columns,
      ...rows.map(row => columns.map(column => String(getOwnProperty(row, column) ?? '-')))
    ];
  }

  private buildStructuredColumnStyles(columns: string[], contentW: number): Record<number, { cellWidth: number }> {
    const normalized = columns.map(column => column.toLowerCase());
    if (normalized.includes('email / username')) {
      return {
        0: { cellWidth: 28 },
        1: { cellWidth: 112 },
        2: { cellWidth: 98 },
        3: { cellWidth: 154 },
        4: { cellWidth: contentW - 392 }
      };
    }
    if (normalized.includes('title') && normalized.includes('url')) {
      return {
        0: { cellWidth: 28 },
        1: { cellWidth: 142 },
        2: { cellWidth: 154 },
        3: { cellWidth: 46 },
        4: { cellWidth: 72 },
        5: { cellWidth: contentW - 442 }
      };
    }
    const fallbackWidth = contentW / Math.max(columns.length, 1);
    return Object.fromEntries(columns.map((_, index) => [index, { cellWidth: fallbackWidth }]));
  }
}
