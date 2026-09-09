import { inject, Injectable } from '@angular/core';
import type jsPDF from 'jspdf';
import type { CellHookData, HookData, RowInput } from 'jspdf-autotable';
import { from, Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { GraphReportExportType, GraphReportMeta, GraphReportNode, GraphReportPayload, GraphReportTableRow } from '../../model/report/report-export.model';
import { ExportBrandingService } from './export-branding.service';
import { buildExportFileStem } from './export-filename.util';
import { drawInstitutionalContentTitle, drawInstitutionalCover, drawInstitutionalFooter, drawInstitutionalPageHeader, drawInstitutionalSectionHeading, PDF_EXPORT_LAYOUT } from './pdf-export-layout';
import { loadPdfExportFontData, PdfExportFontData, registerPdfExportFonts } from './pdf-export-fonts';
import { PDF_EXPORT_THEME } from './pdf-export-theme';
import { normalizePdfText, preparePdfValue } from './pdf-text.util';
import { assertAutoTableDocument } from './pdf-autotable.types';
import type { PdfExportLibraries, PlainTableThemeConfig, PlainTableThemeOptions } from './model/graph-export.model';
import { getOwnProperty, setOwnProperty } from '../../utils/type-guards.util';

export type { PdfExportLibraries, PlainTableThemeConfig, PlainTableThemeOptions } from './model/graph-export.model';








@Injectable({ providedIn: 'root' })
export class GraphExportService {
  private pdfLibs$: Observable<PdfExportLibraries> | null = null;
  private loadedAutoTable: unknown = null;

  protected readonly exportBranding = inject(ExportBrandingService);
  protected readonly PDF_THEME = PDF_EXPORT_THEME;
  protected readonly INTERNAL_HEADER_RGB = PDF_EXPORT_THEME.sectionHeaderRgb;
  protected readonly TABLE_ROW_BG_RGB = PDF_EXPORT_THEME.tableRowBgRgb;
  protected readonly TABLE_ROW_ALT_BG_RGB = PDF_EXPORT_THEME.tableRowAltBgRgb;
  protected readonly TABLE_BORDER_RGB = PDF_EXPORT_THEME.tableBorderRgb;
  protected readonly TABLE_BORDER_WIDTH = PDF_EXPORT_THEME.tableBorderWidth;

  exportByType(payload: GraphReportPayload, type: GraphReportExportType): void {
    if (type === 'json') {
      this.exportGraphJson(payload);
      return;
    }
    if (type === 'csv') {
      this.exportGraphCsv(payload);
      return;
    }
    if (type !== 'graph_pdf') {
      throw new Error(`GraphExportService only supports graph exports. Received: ${type}`);
    }
    this.exportGraphPdf(payload);
  }

  protected getPdfLibs(): Observable<PdfExportLibraries> {
    this.pdfLibs$ ??= from(Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
      loadPdfExportFontData()
    ])).pipe(tap(([, autoTableModule, fontData]) => {
      this.loadedAutoTable = autoTableModule.default;
      if (!fontData) {
        this.pdfLibs$ = null;
      }
    }), map(([jspdfModule, autoTableModule, fontData]) => ({
      jsPDF: jspdfModule.default,
      autoTable: autoTableModule.default,
      fontData
    })), shareReplay(1));
    return this.pdfLibs$;
  }

  protected requireAutoTable(): typeof import('jspdf-autotable').default {
    if (!this.loadedAutoTable) {
      throw new Error('PDF export library not loaded');
    }
    return this.loadedAutoTable as typeof import('jspdf-autotable').default;
  }

  private exportGraphPdf(payload: GraphReportPayload): void {
    this.getPdfLibs().subscribe(libs => {
      const bytes = this.buildGraphPdfBytes(this.preparePayloadForPdf(payload), libs.jsPDF, libs.autoTable, null, libs.fontData);
      this.downloadBinary(bytes, 'application/pdf', `${this.buildSafeFilename(payload)}-graph-report.pdf`);
    });
  }

  private exportGraphJson(payload: GraphReportPayload): void {
    const jsonString = JSON.stringify(this.exportBranding.addTenantJsonMetadata(payload), null, 2);
    this.downloadText(jsonString, 'application/json', `${this.buildSafeFilename(payload)}-graph.json`);
  }

  private exportGraphCsv(payload: GraphReportPayload): void {
    const rows = [
      ['type', 'id', 'label', 'from', 'to'],
      ...(payload.nodes || []).map(node => ['node', node.id, node.label, '', '']),
      ...(payload.edges || []).map(edge => ['edge', edge.id, edge.label ?? '', edge.from, edge.to])
    ];
    const csv = rows.map(row => row.map(value => this.escapeCsvValue(value)).join(',')).join('\n');
    this.downloadText(csv, 'text/csv;charset=utf-8;', `${this.buildSafeFilename(payload)}-graph.csv`);
  }

  private escapeCsvValue(value: unknown): string {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  protected buildGraphPdfBytes(payload: GraphReportPayload, JsPdfCtor: typeof import('jspdf').default, autoTable: typeof import('jspdf-autotable').default, tenantLogoDataUrl: string | null = null, fontData: PdfExportFontData | null = null): Uint8Array {
    const doc = new JsPdfCtor({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    registerPdfExportFonts(doc, fontData);
    const meta = this.makeMeta(payload, tenantLogoDataUrl);
    this.applyPdfDocumentProperties(doc, payload, meta);
    const sectionsByPage: Record<number, string> = { 1: 'Cover', 2: 'Document Control and Contents' };
    this.drawGraphCover(doc, payload, meta);
    doc.addPage();
    let graphPageNo: number | null = null;
    if (this.isJpegDataUrl(payload.graphImageDataUrl)) {
      doc.addPage();
      graphPageNo = doc.getCurrentPageInfo().pageNumber;
      setOwnProperty(sectionsByPage, graphPageNo, 'Graph Snapshot');
      this.drawGraphSnapshot(doc, payload);
    }
    doc.addPage();
    const analysisPageNo = doc.getCurrentPageInfo().pageNumber;
    setOwnProperty(sectionsByPage, analysisPageNo, 'Graph Analysis');
    this.drawGraphAnalysisHeader(doc, payload, meta);
    const pageW = doc.internal.pageSize.getWidth();
    const margin = PDF_EXPORT_LAYOUT.margin;
    const contentW = pageW - (margin * 2);
    const composition = this.buildTypeComposition(payload.nodes);
    const kpiTop = 122;
    const kpiH = 78;
    const gap = 0;
    const kpiW = contentW / 4;
    const kpis = [
      { label: 'Nodes', value: String(payload.nodes.length) },
      { label: 'Edges', value: String(payload.edges.length) },
      { label: 'Node Types', value: String(composition.length) },
      { label: 'Context', value: this.truncateWithEllipsis(this.getReportContext(payload), 15) }
    ];
    kpis.forEach((kpi, idx) => {
      this.drawKpiCard(doc, margin + idx * (kpiW + gap), kpiTop, kpiW, kpiH, kpi.label, kpi.value, idx === 0, idx === kpis.length - 1);
    });
    const analysisDidDrawPage = (data: HookData) => {
      const pageNo = (data.doc as jsPDF).getCurrentPageInfo().pageNumber;
      setOwnProperty(sectionsByPage, pageNo, 'Graph Analysis');
    };
    const analysisTableBase = {
      margin: { left: margin, right: margin, bottom: 58 },
      tableWidth: contentW,
      ...this.buildPlainTableTheme({ fontSize: 9, cellPadding: 6 }),
      didDrawPage: analysisDidDrawPage
    };
    this.drawInfoSectionMarker(doc, 220, contentW, 'Graph Summary');
    this.requireAutoTable()(doc, {
      startY: 232,
      body: Object.entries(payload.summary ?? {}).map(([k, v]) => [this.toTitle(k), String(v)]),
      columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: contentW - 150 } },
      didParseCell: this.makeFirstColumnDidParse(),
      ...analysisTableBase
    });
    assertAutoTableDocument(doc);
    this.drawRoundedTableContainer(doc, margin, contentW, 220, doc.lastAutoTable.finalY ?? 220);
    const compositionMarkerY = this.resolveMarkerY(doc, doc.lastAutoTable.finalY + 12, 126, () => {
      const pageNo = doc.getCurrentPageInfo().pageNumber;
      setOwnProperty(sectionsByPage, pageNo, 'Graph Analysis');
      this.drawGraphAnalysisHeader(doc, payload, meta);
    }, 70);
    this.drawInfoSectionMarker(doc, compositionMarkerY, contentW, 'Node Type Distribution');
    this.requireAutoTable()(doc, {
      startY: compositionMarkerY + 12,
      body: composition.map(x => [x.type, String(x.count)]),
      ...analysisTableBase
    });
    this.drawRoundedTableContainer(doc, margin, contentW, doc.lastAutoTable.startY ?? 232, doc.lastAutoTable.finalY ?? 232);
    const socialPlatformCounts = this.extractSocialPlatformCounts(payload);
    let platformPageNo: number | null = null;
    if (payload.graphKind === 'social' && socialPlatformCounts.length > 0) {
      doc.addPage();
      platformPageNo = doc.getCurrentPageInfo().pageNumber;
      setOwnProperty(sectionsByPage, platformPageNo, 'Platform Inventory');
      this.drawConnectionMatrixHeader(doc, 'Platform Inventory', 'Detected social platforms in current graph');
      this.drawInfoSectionMarker(doc, 126, contentW, 'Platform Inventory');
      this.requireAutoTable()(doc, {
        startY: 138,
        margin: { top: 126, left: margin, right: margin, bottom: 58 },
        tableWidth: contentW,
        head: [['#', 'Platform', 'Node Count']] as RowInput[],
        body: socialPlatformCounts.map((item, i) => [String(i + 1), item.name, String(item.count)]),
        showHead: 'everyPage',
        ...this.buildPlainTableTheme({ fontSize: 9, cellPadding: 6, valign: 'top' }),
        didParseCell: this.makeHeaderRowDidParse(this.PDF_THEME.defaultHeaderRowFillRgb, false),
        didDrawPage: this.makeSectionHeaderCallback(sectionsByPage, 'Platform Inventory', 'Detected social platforms in current graph', platformPageNo)
      });
      this.drawRoundedTableContainer(doc, margin, contentW, 126, doc.lastAutoTable.finalY ?? 126);
    }
    let reportsPageNo: number | null = null;
    if (payload.tables?.length) {
      doc.addPage();
      reportsPageNo = doc.getCurrentPageInfo().pageNumber;
      setOwnProperty(sectionsByPage, reportsPageNo, 'Report Sections');
      this.drawConnectionMatrixHeader(doc, 'Report Sections', 'Metadata, screenshot, and related reports');
      payload.tables.forEach((t, idx) => {
        const sectionTitle = this.getReportSectionTitle(t, idx);
        const tableRows = this.buildReportSectionRows(t.values ?? {});
        let markerY = idx === 0 ? 126 : (doc.lastAutoTable.finalY ?? 126) + 18;
        markerY = this.resolveMarkerY(doc, markerY, 126, () => {
          const pageNo = doc.getCurrentPageInfo().pageNumber;
          setOwnProperty(sectionsByPage, pageNo, 'Report Sections');
          this.drawConnectionMatrixHeader(doc, 'Report Sections', 'Metadata, screenshot, and related reports');
        });
        this.drawInfoSectionMarker(doc, markerY, contentW, sectionTitle);
        const sectionStartPage = doc.getCurrentPageInfo().pageNumber;
        const reportSectionDidDrawPage = (data: HookData) => {
          const drawDoc = data.doc as jsPDF;
          const pageNo = drawDoc.getCurrentPageInfo().pageNumber;
          setOwnProperty(sectionsByPage, pageNo, 'Report Sections');
          if (pageNo !== sectionStartPage) {
            this.drawConnectionMatrixHeader(drawDoc, 'Report Sections', 'Metadata, screenshot, and related reports');
            this.drawInfoSectionMarker(drawDoc, 126, contentW, sectionTitle || 'Info');
          }
        };
        autoTable(doc, {
          startY: markerY + 12,
          margin: { top: 139, left: margin, right: margin, bottom: 58 },
          tableWidth: contentW,
          head: [tableRows[0]] as RowInput[],
          body: tableRows.slice(1),
          showHead: 'everyPage',
          ...this.buildPlainTableTheme({ fontSize: 9, cellPadding: 6 }),
          columnStyles: { 0: { cellWidth: 170 }, 1: { cellWidth: contentW - 170 } },
          didParseCell: this.makeHeaderAndFirstColumnDidParse(this.PDF_THEME.defaultHeaderRowFillRgb, this.PDF_THEME.defaultFirstColumnFillRgb, false),
          didDrawPage: reportSectionDidDrawPage
        });
        const screenshotDataUrl = this.findTableScreenshotDataUrl(t);
        if (screenshotDataUrl) {
          const lastY = doc.lastAutoTable.finalY ?? (markerY + 12);
          const previewHeight = this.getScreenshotPreviewHeight(doc, screenshotDataUrl, contentW, 190);
          const imageY = this.resolveMarkerY(doc, lastY + 10, 142, () => {
            const pageNo = doc.getCurrentPageInfo().pageNumber;
            setOwnProperty(sectionsByPage, pageNo, 'Report Sections');
            this.drawConnectionMatrixHeader(doc, 'Report Sections', 'Metadata, screenshot, and related reports');
            this.drawInfoSectionMarker(doc, 126, contentW, sectionTitle);
          }, previewHeight);
          const imageBottom = this.drawScreenshotPreview(doc, screenshotDataUrl, margin, imageY, contentW, 190);
          if (doc.lastAutoTable) {
            doc.lastAutoTable.finalY = imageBottom;
          }
        }
      });
    }
    doc.addPage();
    const edgesPageNo = doc.getCurrentPageInfo().pageNumber;
    setOwnProperty(sectionsByPage, edgesPageNo, 'Connection Matrix');
    this.drawConnectionMatrixHeader(doc, 'Connection Matrix', 'Relationship listing from current graph state');
    this.drawInfoSectionMarker(doc, 126, contentW, 'Connection Matrix');
    this.requireAutoTable()(doc, {
      startY: 138,
      margin: { top: 126, left: margin, right: margin, bottom: 58 },
      tableWidth: contentW,
      head: [['#', 'From', 'To', 'Label']] as RowInput[],
      body: payload.edges.slice(0, 240).map((e, i) => [
        String(i + 1),
        preparePdfValue(e.from),
        preparePdfValue(e.to),
        preparePdfValue(e.label ?? '')
      ]),
      showHead: 'everyPage',
      ...this.buildPlainTableTheme({ fontSize: 8, cellPadding: 5 }),
      didParseCell: this.makeHeaderRowDidParse(this.PDF_THEME.defaultHeaderRowFillRgb, false),
      didDrawPage: this.makeSectionHeaderCallback(sectionsByPage, 'Connection Matrix', 'Relationship listing from current graph state', edgesPageNo)
    });
    const totalPages = doc.getNumberOfPages();
    this.drawGraphToc(doc, payload, meta, {
      graphPage: graphPageNo,
      analysisPage: this.isJpegDataUrl(payload.graphImageDataUrl) ? 4 : 3,
      platformPage: platformPageNo,
      reportsPage: reportsPageNo,
      edgesPage: edgesPageNo
    });
    for (let page = 1; page <= totalPages; page++) {
      doc.setPage(page);
      if (page !== 1) {
        this.drawGraphChrome(doc, payload, meta, getOwnProperty(sectionsByPage, page) ?? 'Details');
        this.drawGraphFooter(doc, payload, meta, page - 1, totalPages - 1, getOwnProperty(sectionsByPage, page) ?? 'Details');
      }
    }
    return this.docToBytes(doc);
  }

  private drawGraphCover(doc: jsPDF, payload: GraphReportPayload, meta: GraphReportMeta): void {
    this.drawReportBackgroundPattern(doc);
    drawInstitutionalCover(doc, {
      title: payload.title || 'Graph Intelligence Report',
      subtitle: `${meta.kindLabel} relationship and structural analysis`,
      reportFamily: 'Graph Intelligence Review',
      preparedFor: meta.tenantName,
      generatedAt: meta.generatedAt,
      context: this.getReportContext(payload),
      lead: 'A structured view of entities, relationships, evidence, and supporting network intelligence.',
      sections: [
        this.isJpegDataUrl(payload.graphImageDataUrl) ? 'Graph Snapshot' : 'Document Control and Contents',
        'Graph Analysis',
        'Connection Matrix'
      ]
    });
  }

  private drawGraphToc( doc: jsPDF, payload: GraphReportPayload, meta: GraphReportMeta, pages: { graphPage: number | null; analysisPage: number; platformPage: number | null; reportsPage: number | null; edgesPage: number; } ): void {
    doc.setPage(2);
    this.drawReportBackgroundPattern(doc);
    const W = this.getPageW(doc);
    const margin = PDF_EXPORT_LAYOUT.margin;
    const contentW = W - (margin * 2);
    drawInstitutionalContentTitle(doc, 'Document Control and Contents', 'Report governance and navigation');

    const metadata = [
      ['PREPARED FOR', meta.tenantName],
      ['REPORT TYPE', meta.kindLabel],
      ['CONTEXT', this.getReportContext(payload)],
      ['GENERATED', meta.generatedAt]
    ];
    const metadataTop = 136;
    const metadataColumnWidth = (contentW - 28) / 2;
    metadata.forEach(([label, value], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + (column * (metadataColumnWidth + 28));
      const y = metadataTop + (row * 48);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...this.PDF_THEME.textMutedRgb);
      doc.text(label, x, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...this.PDF_THEME.textPrimaryRgb);
      doc.text(this.fitSingleLine(doc, value, metadataColumnWidth), x, y + 18);
      doc.setDrawColor(...this.PDF_THEME.coverPanelBorderRgb);
      doc.setLineWidth(0.45);
      doc.line(x, y + 28, x + metadataColumnWidth, y + 28);
    });

    const sectionItems: {
            label: string;
            page: number;
        }[] = [];
    if (pages.graphPage) {
      sectionItems.push({ label: 'Graph Snapshot', page: pages.graphPage });
    }
    sectionItems.push({ label: 'Graph Analysis', page: pages.analysisPage });
    if (pages.platformPage) {
      sectionItems.push({ label: 'Platform Inventory', page: pages.platformPage });
    }
    if (pages.reportsPage) {
      sectionItems.push({ label: 'Report Sections', page: pages.reportsPage });
    }
    sectionItems.push({ label: 'Connection Matrix', page: pages.edgesPage });

    const tocX = margin;
    const tocY = 259;
    const tocW = contentW;
    const rowH = 26;
    const pageColW = 64;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...this.PDF_THEME.headerAccentRgb);
    doc.text('REPORT CONTENTS', tocX, tocY - 12);
    doc.setDrawColor(...this.PDF_THEME.textPrimaryRgb);
    doc.setLineWidth(0.8);
    doc.line(tocX, tocY - 3, tocX + tocW, tocY - 3);
    sectionItems.forEach((item, index) => {
      const rowTop = tocY + (index * rowH);
      const baselineY = rowTop + 17;
      const rowLabel = item.label;
      const labelX = tocX + 40;
      const pageX = tocX + tocW - pageColW;
      doc.setDrawColor(...this.PDF_THEME.coverPanelBorderRgb);
      doc.line(tocX, rowTop + rowH, tocX + tocW, rowTop + rowH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...this.PDF_THEME.headerAccentRgb);
      doc.text(String(index + 1).padStart(2, '0'), tocX, baselineY);
      doc.setFontSize(9.5);
      doc.setTextColor(...this.PDF_THEME.textBodyRgb);
      const labelText = this.fitSingleLine(doc, rowLabel, tocW - pageColW - 52);
      doc.text(labelText, labelX, baselineY);
      doc.link(tocX, rowTop + 2, tocW - pageColW, rowH - 4, { pageNumber: item.page });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...this.PDF_THEME.headerAccentRgb);
      const pageText = `Page ${String(item.page - 1).padStart(2, '0')}`;
      doc.text(pageText, pageX + pageColW, baselineY, { align: 'right' });
      doc.link(pageX, rowTop + 2, pageColW, rowH - 4, { pageNumber: item.page });
    });

    const treatmentY = tocY + (sectionItems.length * rowH) + 34;
    doc.setDrawColor(...this.PDF_THEME.headerAccentRgb);
    doc.setLineWidth(2);
    doc.line(tocX, treatmentY, tocX, treatmentY + 37);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...this.PDF_THEME.textPrimaryRgb);
    doc.text('Source treatment.', tocX + 14, treatmentY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...this.PDF_THEME.textBodyRgb);
    const treatment = 'This report preserves the supplied graph context and separates observed evidence from generated analysis.';
    doc.text(doc.splitTextToSize(treatment, contentW - 14), tocX + 14, treatmentY + 25, { lineHeightFactor: 1.25 });
  }

  private drawGraphSnapshot(doc: jsPDF, payload: GraphReportPayload): void {
    const graphImageDataUrl = payload.graphImageDataUrl;
    if (!this.isJpegDataUrl(graphImageDataUrl)) {
      return;
    }
    this.drawReportBackgroundPattern(doc);
    drawInstitutionalContentTitle(doc, 'Expanded Graph View', 'Rendered graph snapshot at export time');
    const margin = PDF_EXPORT_LAYOUT.margin;
    const fit = this.fitRectToPage(doc, margin, 136, margin, 80);
    const img = doc.getImageProperties(graphImageDataUrl);
    let imgW = fit.w;
    let imgH = (imgW * img.height) / img.width;
    if (imgH > fit.h) {
      const ratio = fit.h / imgH;
      imgH = fit.h;
      imgW = imgW * ratio;
    }
    const safeScale = 0.94;
    imgW = imgW * safeScale;
    imgH = imgH * safeScale;
    const drawX = fit.x + (fit.w - imgW) / 2;
    const drawY = fit.y + (fit.h - imgH) / 2;
    doc.setDrawColor(...this.PDF_THEME.mediumBorderRgb);
    doc.setLineWidth(1);
    doc.rect(fit.x, fit.y, fit.w, fit.h);
    doc.addImage(graphImageDataUrl, 'JPEG', drawX, drawY, imgW, imgH, undefined, 'FAST');
    doc.setFontSize(8);
    doc.setTextColor(...this.PDF_THEME.textMutedRgb);
    doc.text(`Nodes: ${payload.nodes.length}   Edges: ${payload.edges.length}`, margin, this.getPageH(doc) - 56);
  }

  private drawGraphAnalysisHeader(doc: jsPDF, payload: GraphReportPayload, meta: GraphReportMeta): void {
    this.drawReportBackgroundPattern(doc);
    const compactContext = this.truncateWithEllipsis(this.compactSession(this.getReportContext(payload)), 15);
    drawInstitutionalContentTitle(doc, 'Graph Analysis', `${meta.kindLabel} / Context: ${compactContext}`);
  }

  private drawConnectionMatrixHeader(doc: jsPDF, title: string, subtitle: string): void {
    drawInstitutionalContentTitle(doc, title, subtitle);
  }

  private drawGraphChrome(doc: jsPDF, payload: GraphReportPayload, meta: GraphReportMeta, section: string): void {
    drawInstitutionalPageHeader(doc, {
      tenantName: meta.tenantName,
      reportFamily: payload.title || meta.kindLabel,
      section
    });
  }

  private drawGraphFooter(doc: jsPDF, _payload: GraphReportPayload, meta: GraphReportMeta, pageNo: number, totalPages: number, section: string): void {
    drawInstitutionalFooter(doc, { tenantName: meta.tenantName, section, pageNo, totalPages });
  }

  protected buildPlainTableTheme(options: PlainTableThemeOptions): PlainTableThemeConfig {
    const borderLine = this.TABLE_BORDER_WIDTH;
    const styles: PlainTableThemeConfig['styles'] = {
      fontSize: options.fontSize,
      cellPadding: options.cellPadding,
      textColor: options.textColor ?? this.PDF_THEME.textBodyRgb,
      lineWidth: { top: 0, right: 0, bottom: borderLine, left: 0 },
      lineColor: options.lineColor ?? this.TABLE_BORDER_RGB
    };
    if (options.font) {
      styles.font = options.font;
    }
    if (options.overflow) {
      styles.overflow = options.overflow;
    }
    if (options.valign) {
      styles.valign = options.valign;
    }

    const bodyStyles: PlainTableThemeConfig['bodyStyles'] = {
      fillColor: options.rowFillColor ?? this.TABLE_ROW_BG_RGB,
      lineWidth: { top: 0, right: 0, bottom: borderLine, left: 0 },
      lineColor: options.lineColor ?? this.TABLE_BORDER_RGB
    };
    if (options.textColor) {
      bodyStyles.textColor = options.textColor;
    }

    return {
      styles,
      bodyStyles,
      alternateRowStyles: {
        fillColor: options.alternateRowFillColor ?? this.TABLE_ROW_ALT_BG_RGB,
        lineWidth: { top: 0, right: 0, bottom: borderLine, left: 0 },
        lineColor: options.lineColor ?? this.TABLE_BORDER_RGB
      },
      theme: 'plain'
    };
  }

  protected makeHeaderRowDidParse(fillColor: [number, number, number] = PDF_EXPORT_THEME.defaultHeaderRowFillRgb, headerInBody = true): (data: CellHookData) => void {
    return (data: CellHookData) => {
      if (data.section === 'head' || (headerInBody && data.row.index === 0)) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = fillColor;
        data.cell.styles.textColor = this.PDF_THEME.textPrimaryRgb;
        data.cell.styles.lineColor = this.PDF_THEME.textPrimaryRgb;
        data.cell.styles.lineWidth = { top: 0, right: 0, bottom: 0.8, left: 0 };
      }
    };
  }

  protected makeFirstColumnDidParse(fillColor: [number, number, number] = PDF_EXPORT_THEME.defaultFirstColumnFillRgb): (data: CellHookData) => void {
    return (data: CellHookData) => {
      if (data.column.index === 0) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = fillColor;
        data.cell.styles.textColor = this.PDF_THEME.textSecondaryRgb;
      }
    };
  }

  protected makeHeaderAndFirstColumnDidParse(headerFillColor: [number, number, number] = PDF_EXPORT_THEME.defaultHeaderRowFillRgb, firstColumnFillColor: [number, number, number] = PDF_EXPORT_THEME.defaultFirstColumnFillRgb, headerInBody = true): (data: CellHookData) => void {
    return (data: CellHookData) => {
      if (data.section === 'head' || (headerInBody && data.row.index === 0)) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = headerFillColor;
        data.cell.styles.textColor = this.PDF_THEME.textPrimaryRgb;
        data.cell.styles.lineColor = this.PDF_THEME.textPrimaryRgb;
        data.cell.styles.lineWidth = { top: 0, right: 0, bottom: 0.8, left: 0 };
        return;
      }
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = firstColumnFillColor;
        data.cell.styles.textColor = this.PDF_THEME.textSecondaryRgb;
      }
    };
  }

  protected drawSessionBlock(doc: jsPDF, sessionName: string, generatedAt: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    doc.setFontSize(10);
    doc.setTextColor(...this.PDF_THEME.softTextRgb);
    const sessionLines = this.getSessionLines(doc, sessionName, maxWidth);
    doc.text(sessionLines, x, y);
    const generatedY = y + (sessionLines.length * lineHeight);
    doc.text(this.fitSingleLine(doc, `Generated: ${generatedAt}`, maxWidth), x, generatedY);
    return generatedY;
  }

  protected getSessionLines(doc: jsPDF, sessionName: string, maxWidth: number): string[] {
    const sessionText = this.compactSession(sessionName || '-');
    return doc.splitTextToSize(`Session: ${sessionText}`, maxWidth) as string[];
  }

  protected drawStandardFooter(doc: jsPDF, sessionName: string, meta: GraphReportMeta, pageNo: number, totalPages: number, lineOffset: number, textOffset: number): void {
    void lineOffset;
    void textOffset;
    drawInstitutionalFooter(doc, {
      tenantName: meta.tenantName,
      section: normalizePdfText(`${meta.kindLabel} | ${sessionName || '-'}`),
      pageNo,
      totalPages
    });
  }

  private drawKpiCard(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, isFirst: boolean, isLast: boolean): void {
    doc.setDrawColor(...this.PDF_THEME.coverPanelBorderRgb);
    doc.setLineWidth(0.5);
    doc.line(x, y, x + w, y);
    doc.line(x, y + h, x + w, y + h);
    if (!isFirst) {
      doc.line(x, y + 10, x, y + h - 10);
    }
    if (isLast) {
      doc.line(x + w, y + 10, x + w, y + h - 10);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...this.PDF_THEME.textSecondaryRgb);
    doc.text(String(label || '').toUpperCase(), x + 12, y + 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...this.PDF_THEME.textPrimaryRgb);
    doc.text(this.fitSingleLine(doc, value, w - 24), x + 12, y + 52);
  }

  protected toTitle(input: string): string {
    return input.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private buildTypeComposition(nodes: GraphReportNode[]): {
        type: string;
        count: number;
    }[] {
    const counts: Record<string, number> = {};
    nodes.forEach(n => {
      const key = this.normalizeNodeType(n.type || 'unknown');
      setOwnProperty(counts, key, (getOwnProperty(counts, key) ?? 0) + 1);
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }

  private normalizeNodeType(type: string): string {
    const normalized = String(type || '').trim().toLowerCase();
    if (!normalized) {
      return 'unknown';
    }
    if (normalized === 'circularimage' || normalized === 'icon') {
      return 'entity';
    }
    if (normalized === 'dot') {
      return 'property';
    }
    return normalized;
  }

  private extractSocialPlatformCounts(payload: GraphReportPayload): {
        name: string;
        count: number;
    }[] {
    if (payload.graphKind !== 'social') {
      return [];
    }
    const counts = new Map<string, number>();
    payload.nodes.forEach(node => {
      const id = String(node.id ?? '');
      const match = /^platform-[^|]+\|([^|]+)\|/i.exec(id);
      if (match?.[1]) {
        const name = match[1].toLowerCase();
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  protected makeMeta(payload: GraphReportPayload, tenantLogoDataUrl: string | null = null): GraphReportMeta {
    const generatedAt = new Date(payload.generatedAtIso).toLocaleString();
    const title = String(payload.title || '').trim().toLowerCase();
    const isCredentialReport = title.includes('credential');
    const isAlertReport = /\balerts?$/.test(title) || (payload.nodes.length > 0 && payload.nodes.every(node => String(node.type || '').toLowerCase() === 'alert'));
    const kindLabel = isCredentialReport ? 'Credentials' : (isAlertReport ? 'Brand Alerts' : (payload.graphKind === 'cti' ? 'CTI Network' : 'Social Network'));
    return {
      generatedAt,
      kindLabel,
      tenantName: normalizePdfText(this.exportBranding.getTenantName()),
      tenantLogoDataUrl
    };
  }

  protected preparePayloadForPdf(payload: GraphReportPayload): GraphReportPayload {
    const normalizeValues = (values: Record<string, string>): Record<string, string> => {
      const normalizedEntries = Object.entries(values ?? {})
        .map(([key, value]) => {
          const normalizedKey = normalizePdfText(key);
          const normalizedValue = preparePdfValue(this.redactSensitivePdfValue(normalizedKey, value));
          return [normalizedKey, normalizedValue] as const;
        })
        .filter(([, value]) => !this.isEmptyPdfTableValue(value));
      return Object.fromEntries(normalizedEntries);
    };
    const normalizeRecordValues = (values: Record<string, string>): Record<string, string> => Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [normalizePdfText(key), normalizePdfText(value)]));
    const tables = payload.tables
      ?.filter(table => !table.excludeFromPdf)
      .map(table => ({
        ...table,
        title: normalizePdfText(table.title),
        values: normalizeValues(table.values ?? {}),
        columns: table.columns?.map(column => normalizePdfText(column)),
        rows: table.rows?.map(row => normalizeValues(row)),
        recordBlocks: table.recordBlocks?.map(block => ({
          ...block,
          title: normalizePdfText(block.title),
          values: normalizeRecordValues(block.values ?? {})
        }))
      }))
      .filter(table => [Object.keys(table.values).length, table.rows?.length, table.recordBlocks?.length].some(Boolean));
    return {
      ...payload,
      title: normalizePdfText(payload.title),
      sessionName: normalizePdfText(payload.sessionName),
      nodes: (payload.nodes ?? []).map(node => ({
        ...node,
        id: normalizePdfText(node.id),
        label: normalizePdfText(node.label),
        type: normalizePdfText(node.type)
      })),
      edges: (payload.edges ?? []).map(edge => ({
        ...edge,
        id: normalizePdfText(edge.id),
        from: normalizePdfText(edge.from),
        to: normalizePdfText(edge.to),
        label: edge.label ? normalizePdfText(edge.label) : edge.label
      })),
      summary: Object.fromEntries(Object.entries(payload.summary ?? {}).map(([key, value]) => [
        normalizePdfText(key),
        typeof value === 'number' ? value : preparePdfValue(value)
      ])),
      tables
    };
  }

  private isEmptyPdfTableValue(value: string): boolean {
    return !value.trim() || /^[-\u2013\u2014]$/.test(value.trim());
  }

  private redactSensitivePdfValue(key: string, value: unknown): string {
    const text = String(value ?? '');
    if (!text.trim()) {
      return text;
    }
    const sensitiveHeader = /^(?:set[-_ ]?cookie|cookie|authorization|proxy[-_ ]?authorization|x[-_ ]?api[-_ ]?key)$/i;
    if (sensitiveHeader.test(key.trim())) {
      return 'Present (value omitted from PDF)';
    }
    if (!/banner|headers?|response|request/i.test(key)) {
      return text;
    }
    return text.replace(/^(\s*(?:set-cookie|cookie|authorization|proxy-authorization|x-api-key)\s*:).*$/gim, '$1 [value omitted from PDF]');
  }

  protected drawTenantBrand(doc: jsPDF, meta: GraphReportMeta, rightX: number, topY: number, maxWidth: number, maxHeight: number, textRgb: [number, number, number]): void {
    let textY = topY + 10;
    if (meta.tenantLogoDataUrl) {
      try {
        const image = doc.getImageProperties(meta.tenantLogoDataUrl);
        const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
        const width = image.width * ratio;
        const height = image.height * ratio;
        doc.addImage(meta.tenantLogoDataUrl, this.getImageTypeFromDataUrl(meta.tenantLogoDataUrl), rightX - width, topY, width, height, undefined, 'FAST');
        textY = topY + height + 11;
      }
      catch {
        textY = topY + 10;
      }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...textRgb);
    doc.text(this.fitSingleLine(doc, meta.tenantName, maxWidth), rightX, textY, { align: 'right' });
  }

  protected applyPdfDocumentProperties(doc: jsPDF, payload: GraphReportPayload, meta: GraphReportMeta): void {
    doc.setProperties({
      title: normalizePdfText(payload.title || 'Intelligence Report'),
      subject: normalizePdfText(`${meta.kindLabel} intelligence export`),
      author: meta.tenantName,
      creator: meta.tenantName
    });
    doc.viewerPreferences({ DisplayDocTitle: true, FitWindow: true });
  }

  protected isJpegDataUrl(dataUrl?: string): dataUrl is string {
    return typeof dataUrl === 'string' && dataUrl.startsWith('data:image/jpeg;base64,');
  }

  private fitRectToPage(doc: jsPDF, left: number, top: number, right: number, bottom: number): {
        x: number;
        y: number;
        w: number;
        h: number;
    } {
    const W = this.getPageW(doc);
    const H = this.getPageH(doc);
    return { x: left, y: top, w: W - left - right, h: H - top - bottom };
  }

  protected fitRect(_: jsPDF, maxW: number, maxH: number, x: number, y: number): {
        x: number;
        y: number;
        w: number;
        h: number;
    } {
    return { x, y, w: maxW, h: maxH };
  }

  protected drawStandardPageHeader(doc: jsPDF, title: string, section: string, barBottom: number, accentRgb: [number, number, number] = PDF_EXPORT_THEME.headerAccentRgb): void {
    void accentRgb;
    drawInstitutionalPageHeader(doc, {
      tenantName: title,
      reportFamily: 'Intelligence Report',
      section
    }, barBottom);
  }

  protected fitSingleLine(doc: jsPDF, text: string, maxWidth: number): string {
    const input = normalizePdfText(text);
    if (!input) {
      return '';
    }
    if (doc.getTextWidth(input) <= maxWidth) {
      return input;
    }
    const ellipsis = '...';
    let out = input;
    while (out.length > 1 && doc.getTextWidth(out + ellipsis) > maxWidth) {
      out = out.slice(0, -1);
    }
    return out + ellipsis;
  }

  protected truncateWithEllipsis(value: string, maxChars: number): string {
    const input = String(value || '');
    if (input.length <= maxChars) {
      return input;
    }
    return `${input.slice(0, Math.max(0, maxChars))}...`;
  }

  protected drawReportBackgroundPattern(doc: jsPDF): void {
    const W = this.getPageW(doc);
    const H = this.getPageH(doc);
    doc.setFillColor(...this.PDF_THEME.whiteRgb);
    doc.rect(0, 0, W, H, 'F');
  }

  protected drawRoundedTableContainer(doc: jsPDF, x: number, width: number, startY: number, endY: number): void {

    void doc;
    void x;
    void width;
    void startY;
    void endY;
  }

  protected drawInfoSectionMarker(doc: jsPDF, y: number, width: number, label: string, fillRgb: [number, number, number] = this.INTERNAL_HEADER_RGB): void {
    drawInstitutionalSectionHeading(doc, y, width, label, fillRgb);
  }

  protected getReportSectionTitle(table: GraphReportTableRow, index: number): string {
    const fromTitle = this.cleanReportFieldLabel(table?.title ?? '');
    if (fromTitle) {
      return fromTitle;
    }
    const keys = Object.keys(table?.values ?? {});
    const hasMetadataPrefix = keys.some(key => /^\s*m\s+/i.test(String(key)));
    const cleanedKeys = keys.map(k => this.cleanReportFieldLabel(k).toLowerCase());
    const hasMetadataLikeKeys = cleanedKeys.some(k => /(scrap file|organization|domain|language|hash|update date|creation date|company|leak date|data size|revenue|location)/i.test(k));
    if (hasMetadataPrefix || hasMetadataLikeKeys) {
      return 'Metadata';
    }
    return `Section ${index + 1}`;
  }

  protected buildReportSectionRows(values: Record<string, string>): [string, string][] {
    const rows: [string, string][] = [['Field', 'Value']];
    Object.entries(values ?? {}).forEach(([rawKey, rawValue]) => {
      if (this.isImageDataUrl(rawValue)) {
        return;
      }
      const key = this.cleanReportFieldLabel(rawKey);
      const value = this.cleanReportFieldValue(rawValue, key);
      if (!key && !value) {
        return;
      }
      rows.push([key || 'Field', value || '-']);
    });
    return rows;
  }

  private cleanReportFieldLabel(input: string): string {
    const compact = String(input || '')
      .replace(/^\s*m\s+/i, '')
      .replace(/[:\s]+$/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!compact) {
      return '';
    }
    if (/^[a-z0-9\s]+$/i.test(compact)) {
      return compact.replace(/\b\w/g, c => c.toUpperCase());
    }
    return compact;
  }

  private cleanReportFieldValue(input: string, key: string): string {
    const raw = String(input ?? '').trim();
    if (!raw) {
      return '';
    }
    if (key.trim().toLowerCase() === 'json') {
      return String(input ?? '');
    }
    const normalizedKey = key.toLowerCase();
    if (raw.includes('\n')) {
      return raw
        .split('\n')
        .map(line => {
          const trimmed = line.trim().replace(/\s+/g, ' ');
          const numberedUrl = /^(\d+\.\s*)(https?:\/\/.*)$/i.exec(trimmed);
          if (numberedUrl) {
            return `${numberedUrl[1]}${numberedUrl[2].replace(/\s+/g, '')}`;
          }
          return /^https?:\/\//i.test(trimmed)
            ? trimmed.replace(/\s+/g, '')
            : trimmed;
        })
        .filter(Boolean)
        .join('\n');
    }
    if (normalizedKey.includes('date')) {
      const asDate = new Date(raw);
      if (!Number.isNaN(asDate.getTime())) {
        return asDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
      }
    }
    if (normalizedKey.includes('url') || normalizedKey.includes('link')) {
      return raw.replace(/\s+/g, '');
    }
    return raw.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
  }

  protected resolveMarkerY(doc: jsPDF, requestedY: number, resetY: number, onNewPage?: () => void, minBlockHeight = 26): number {
    const pageBottom = this.getPageH(doc) - 58;
    if (requestedY + minBlockHeight <= pageBottom) {
      return requestedY;
    }
    doc.addPage();
    onNewPage?.();
    return resetY;
  }

  protected findTableScreenshotDataUrl(table: GraphReportTableRow): string | null {
    const title = String(table?.title || '').toLowerCase();
    const values = table?.values ?? {};

    for (const [key, value] of Object.entries(values)) {
      if (key.toLowerCase().includes('screenshot') && this.isImageDataUrl(value)) {
        return this.normalizeDataUrl(value);
      }
    }
    for (const value of Object.values(values)) {
      if (this.isImageDataUrl(value)) {
        return this.normalizeDataUrl(value);
      }
    }
    if (title.includes('screenshot')) {

      for (const value of Object.values(values)) {
        const normalized = this.normalizeDataUrl(value);
        if (normalized.startsWith('data:image/')) {
          return normalized;
        }
      }
    }
    return null;
  }

  private isImageDataUrl(value: string): boolean {
    return /^data:image\/(png|jpe?g|webp);base64,/i.test(this.normalizeDataUrl(value));
  }

  protected normalizeDataUrl(value: string): string {
    return String(value || '').replace(/\s+/g, '').trim();
  }

  protected getImageTypeFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
    const normalized = this.normalizeDataUrl(dataUrl).toLowerCase();
    if (normalized.startsWith('data:image/png')) {
      return 'PNG';
    }
    if (normalized.startsWith('data:image/webp')) {
      return 'WEBP';
    }
    return 'JPEG';
  }

  protected getScreenshotPreviewHeight(doc: jsPDF, dataUrl: string, width: number, maxH: number): number {
    const normalizedDataUrl = this.normalizeDataUrl(dataUrl);
    const img = doc.getImageProperties(normalizedDataUrl);
    return Math.min((width * img.height) / img.width, maxH) + 8;
  }

  protected drawScreenshotPreview(doc: jsPDF, dataUrl: string, x: number, y: number, width: number, maxH: number): number {
    const normalizedDataUrl = this.normalizeDataUrl(dataUrl);
    const fit = this.fitRect(doc, width, maxH, x, y);
    const img = doc.getImageProperties(normalizedDataUrl);
    const imgType = this.getImageTypeFromDataUrl(normalizedDataUrl);
    let drawW = fit.w;
    let drawH = (drawW * img.height) / img.width;
    if (drawH > fit.h) {
      const ratio = fit.h / drawH;
      drawH = fit.h;
      drawW *= ratio;
    }
    doc.setDrawColor(...this.PDF_THEME.mediumBorderRgb);
    doc.setLineWidth(0.8);
    doc.rect(fit.x, fit.y, fit.w, drawH + 8);
    doc.addImage(normalizedDataUrl, imgType, fit.x + ((fit.w - drawW) / 2), fit.y + 4, drawW, drawH, undefined, 'FAST');
    return fit.y + drawH + 8;
  }

  protected compactSession(session: string): string {
    const value = String(session || '').trim();
    if (!value || value.length <= 26) {
      return value || '-';
    }
    const start = value.slice(0, 11);
    const end = value.slice(-8);
    return `${start}...${end}`;
  }

  protected getReportContext(payload: GraphReportPayload): string {
    const sessionName = String(payload.sessionName || '').trim();
    const machineId = sessionName
      .replace(/^id[-_:]?/i, '')
      .replace(/[-_:]/g, '');
    if (!sessionName || /^[a-f0-9]{40,}$/i.test(machineId)) {
      return String(payload.title || 'Intelligence Report').trim();
    }
    return sessionName;
  }

  private makeSectionHeaderCallback(sectionsByPage: Record<number, string>, section: string, subtitle: string, firstPage: number): (data: HookData) => void {
    return (data: HookData) => {
      const doc = data.doc as jsPDF;
      const pageNo = doc.getCurrentPageInfo().pageNumber;
      setOwnProperty(sectionsByPage, pageNo, section);
      if (pageNo !== firstPage) {
        this.drawConnectionMatrixHeader(doc, section, subtitle);
      }
    };
  }

  protected getPageW(doc: jsPDF): number {
    return doc.internal.pageSize.getWidth();
  }

  protected getPageH(doc: jsPDF): number {
    return doc.internal.pageSize.getHeight();
  }

  protected docToBytes(doc: jsPDF): Uint8Array {
    const buf = doc.output('arraybuffer');
    return new Uint8Array(buf);
  }

  protected buildSafeFilename(payload: GraphReportPayload): string {
    return buildExportFileStem(payload.title, payload.generatedAtIso, `${payload.graphKind}-report`);
  }

  protected downloadText(content: string, mimeType: string, filename: string): void {
    this.downloadBlobFromParts([content], mimeType, filename);
  }

  protected downloadBinary(content: Uint8Array, mimeType: string, filename: string): void {
    const binary = new Uint8Array(content);
    this.downloadBlobFromParts([binary], mimeType, filename);
  }

  private downloadBlobFromParts(content: BlobPart[], mimeType: string, filename: string): void {
    const blob = new Blob(content, { type: mimeType });
    this.downloadBlob(blob, filename);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
