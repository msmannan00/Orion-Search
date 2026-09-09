import type jsPDF from 'jspdf';
import { PDF_EXPORT_THEME, PdfRgb } from './pdf-export-theme';
import { normalizePdfText } from './pdf-text.util';
import type { InstitutionalCoverOptions, InstitutionalFooterOptions, InstitutionalHeaderOptions } from './model/pdf-export-layout.model';
export type { InstitutionalCoverOptions, InstitutionalFooterOptions, InstitutionalHeaderOptions } from './model/pdf-export-layout.model';


export const PDF_EXPORT_LAYOUT = {
  margin: 48,
  pageHeaderHeight: 36,
  contentStartY: 82,
  footerLineOffset: 36.5,
  footerTextOffset: 18.7
} as const;







function fitSingleLine(doc: jsPDF, value: string, maxWidth: number, charSpace = 0): string {
  const input = normalizePdfText(value || '-');
  const trackedWidth = (text: string) => doc.getTextWidth(text) + (Math.max(0, text.length - 1) * charSpace);
  if (trackedWidth(input) <= maxWidth) {
    return input;
  }
  let output = input;
  while (output.length > 1 && trackedWidth(`${output}...`) > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}...`;
}

function drawTrackedText(doc: jsPDF, text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right'; charSpace?: number }): void {
  const charSpace = options?.charSpace ?? 0.8;
  const trackedWidth = doc.getTextWidth(text) + (Math.max(0, text.length - 1) * charSpace);
  const textX = options?.align === 'right'
    ? x - trackedWidth
    : (options?.align === 'center' ? x - (trackedWidth / 2) : x);
  doc.setCharSpace(charSpace);
  doc.text(text, textX, y);
  doc.setCharSpace(0);
}

export function drawInstitutionalCover(doc: jsPDF, options: InstitutionalCoverOptions): void {
  const theme = PDF_EXPORT_THEME;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isLandscape = pageWidth > pageHeight;
  const margin = isLandscape ? PDF_EXPORT_LAYOUT.margin : 57;
  const contentWidth = pageWidth - (margin * 2);

  doc.setFillColor(...theme.whiteRgb);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...theme.headerAccentRgb);
  const classification = String(options.classification ?? 'CONFIDENTIAL').toUpperCase();
  drawTrackedText(doc, fitSingleLine(doc, classification, contentWidth, 1.35), pageWidth - margin, 42, { align: 'right', charSpace: 1.35 });

  const eyebrowY = isLandscape ? 82 : 104;
  doc.setFontSize(7.4);
  const reportFamily = String(options.reportFamily || 'INTELLIGENCE REPORT').toUpperCase();
  drawTrackedText(doc, fitSingleLine(doc, reportFamily, contentWidth, 1.1), margin, eyebrowY, { charSpace: 1.1 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 30 : 34);
  doc.setTextColor(...theme.textPrimaryRgb);
  const splitTitleLines = doc.splitTextToSize(normalizePdfText(options.title || 'Intelligence Report'), contentWidth) as string[];
  const titleLines = splitTitleLines.slice(0, 3);
  if (splitTitleLines.length > titleLines.length && titleLines[2]) {
    titleLines[2] = fitSingleLine(doc, `${titleLines[2]}...`, contentWidth);
  }
  const titleY = eyebrowY + 47;
  doc.text(titleLines, margin, titleY, { lineHeightFactor: 1.08 });
  const titleLineHeight = isLandscape ? 32 : 35;
  const titleBottom = titleY + ((titleLines.length - 1) * titleLineHeight);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...theme.coverSubtitleRgb);
  doc.text(fitSingleLine(doc, options.subtitle, contentWidth), margin, titleBottom + 29);
  doc.setDrawColor(...theme.headerAccentRgb);
  doc.setLineWidth(1.55);
  doc.line(margin, titleBottom + 52, margin + 72, titleBottom + 52);

  const leadY = titleBottom + 83;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...theme.textBodyRgb);
  const lead = options.lead ?? `${options.reportFamily} prepared for authorized review and operational decision-making.`;
  const leadLines = (doc.splitTextToSize(normalizePdfText(lead), Math.min(contentWidth, 470)) as string[]).slice(0, 3);
  doc.text(leadLines, margin, leadY, { lineHeightFactor: 1.35 });

  const contentsY = isLandscape ? 292 : 390;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(...theme.headerAccentRgb);
  drawTrackedText(doc, 'REPORT CONTENTS', margin, contentsY, { charSpace: 1.05 });
  doc.setDrawColor(...theme.coverPanelBorderRgb);
  doc.setLineWidth(0.55);
  doc.line(margin, contentsY + 13, pageWidth - margin, contentsY + 13);

  const sectionRows = options.sections.slice(0, 3);
  while (sectionRows.length < 3) {
    sectionRows.push(['Executive Overview', 'Detailed Intelligence', 'Supporting Evidence'][sectionRows.length]);
  }
  sectionRows.forEach((section, index) => {
    const rowTop = contentsY + 14 + (index * 37);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...theme.headerAccentRgb);
    doc.text(String(index + 1).padStart(2, '0'), margin, rowTop + 22);
    doc.setFontSize(10);
    doc.setTextColor(...theme.textPrimaryRgb);
    doc.text(fitSingleLine(doc, section, contentWidth - 44), margin + 42, rowTop + 22);
    doc.setDrawColor(...theme.coverPanelBorderRgb);
    doc.setLineWidth(0.45);
    doc.line(margin, rowTop + 36, pageWidth - margin, rowTop + 36);
  });

  const metadataY = isLandscape ? pageHeight - 90 : pageHeight - 134;
  const columnGap = 24;
  const columnWidth = (contentWidth - (columnGap * 2)) / 3;
  const metadata = [
    ['PREPARED FOR', options.preparedFor],
    ['REPORT CONTEXT', options.context],
    ['GENERATED', options.generatedAt]
  ];
  metadata.forEach(([label, value], index) => {
    const x = margin + (index * (columnWidth + columnGap));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...theme.coverLabelRgb);
    drawTrackedText(doc, label, x, metadataY, { charSpace: 0.8 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...theme.textPrimaryRgb);
    doc.text(fitSingleLine(doc, value || '-', columnWidth), x, metadataY + 20);
  });

  doc.setDrawColor(...theme.coverPanelBorderRgb);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 48, pageWidth - margin, pageHeight - 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...theme.footerTextRgb);
  doc.text('AUTHORIZED RECIPIENTS ONLY', margin, pageHeight - 29);
  doc.text(String(options.classification ?? 'Confidential'), pageWidth - margin, pageHeight - 29, { align: 'right' });
}

export function drawInstitutionalPageHeader(doc: jsPDF, options: InstitutionalHeaderOptions, height: number = PDF_EXPORT_LAYOUT.pageHeaderHeight): void {
  const theme = PDF_EXPORT_THEME;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_EXPORT_LAYOUT.margin;
  doc.setFillColor(...theme.whiteRgb);
  doc.rect(0, 0, pageWidth, height, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.7);
  doc.setTextColor(...theme.textPrimaryRgb);
  drawTrackedText(doc, fitSingleLine(doc, options.tenantName.toUpperCase(), (pageWidth - (margin * 2)) * 0.44, 0.7), margin, 27.7, { charSpace: 0.7 });
  doc.setTextColor(...theme.textPrimaryRgb);
  const rightLabel = [options.reportFamily, options.section].filter(Boolean).join(' / ').toUpperCase();
  drawTrackedText(doc, fitSingleLine(doc, rightLabel, (pageWidth - (margin * 2)) * 0.5, 0.39), pageWidth - margin - 0.6, 27.7, { align: 'right', charSpace: 0.39 });
}

export function drawInstitutionalFooter(doc: jsPDF, options: InstitutionalFooterOptions, lineOffset: number = PDF_EXPORT_LAYOUT.footerLineOffset, textOffset: number = PDF_EXPORT_LAYOUT.footerTextOffset): void {
  const theme = PDF_EXPORT_THEME;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const lineY = pageHeight - lineOffset;
  const textY = pageHeight - textOffset;
  doc.setDrawColor(...theme.coverPanelBorderRgb);
  doc.setLineWidth(0.5);
  doc.line(margin, lineY, pageWidth - margin, lineY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(...theme.footerTextRgb);
  doc.text('CONFIDENTIAL - AUTHORISED RECIPIENTS ONLY', margin, textY);
  doc.text(fitSingleLine(doc, options.section, Math.min(210, pageWidth * 0.34)), pageWidth / 2, textY, { align: 'center' });
  doc.text(`Page ${options.pageNo} of ${options.totalPages}`, pageWidth - margin, textY, { align: 'right' });
}

export function drawInstitutionalSectionHeading(doc: jsPDF, y: number, width: number, label: string, accentRgb: PdfRgb = PDF_EXPORT_THEME.headerAccentRgb): void {
  const x = PDF_EXPORT_LAYOUT.margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...accentRgb);
  drawTrackedText(doc, fitSingleLine(doc, String(label || 'Section').toUpperCase(), width, 0.85), x, y + 5, { charSpace: 0.85 });
  doc.setDrawColor(...PDF_EXPORT_THEME.textPrimaryRgb);
  doc.setLineWidth(0.8);
  doc.line(x, y + 12, x + width, y + 12);
}

export function drawInstitutionalContentTitle(doc: jsPDF, title: string, subtitle: string, eyebrow = 'Report Section'): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_EXPORT_LAYOUT.margin;
  const contentWidth = pageWidth - (margin * 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.7);
  doc.setTextColor(...PDF_EXPORT_THEME.headerAccentRgb);
  drawTrackedText(doc, fitSingleLine(doc, eyebrow.toUpperCase(), contentWidth, 1.05), margin, 58, { charSpace: 1.05 });
  doc.setFontSize(18);
  doc.setTextColor(...PDF_EXPORT_THEME.textPrimaryRgb);
  doc.text(fitSingleLine(doc, title, contentWidth), margin, 89);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.3);
  doc.setTextColor(...PDF_EXPORT_THEME.textBodyRgb);
  doc.text(fitSingleLine(doc, subtitle, contentWidth), margin, 114);
}
