export type PdfRgb = [number, number, number];

export interface PdfExportTheme {
  whiteRgb: PdfRgb;
  coverBandRgb: PdfRgb;
  coverSubtitleRgb: PdfRgb;
  coverPanelRgb: PdfRgb;
  coverMetricRgb: PdfRgb;
  coverPanelBorderRgb: PdfRgb;
  coverLabelRgb: PdfRgb;
  dividerRgb: PdfRgb;
  headerAccentRgb: PdfRgb;
  sectionHeaderRgb: PdfRgb;
  headerBackgroundRgb: PdfRgb;
  textPrimaryRgb: PdfRgb;
  textBodyRgb: PdfRgb;
  textSecondaryRgb: PdfRgb;
  textMutedRgb: PdfRgb;
  footerTextRgb: PdfRgb;
  softTextRgb: PdfRgb;
  tableRowBgRgb: PdfRgb;
  tableRowAltBgRgb: PdfRgb;
  tableBorderRgb: PdfRgb;
  recordDividerRgb: PdfRgb;
  headerRowFillRgb: PdfRgb;
  firstColumnFillRgb: PdfRgb;
  defaultHeaderRowFillRgb: PdfRgb;
  defaultFirstColumnFillRgb: PdfRgb;
  mediumBorderRgb: PdfRgb;
  backgroundPatternRgb: PdfRgb;
  sectionRadius: number;
  tableBorderWidth: number;
}
