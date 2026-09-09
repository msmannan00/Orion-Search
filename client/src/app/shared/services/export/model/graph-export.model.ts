import { PdfExportFontData } from '../pdf-export-fonts';

export interface PlainTableThemeOptions {
  font?: string;
  fontSize: number;
  cellPadding: number;
  overflow?: 'linebreak';
  valign?: 'middle' | 'top';
  textColor?: [number, number, number];
  rowFillColor?: [number, number, number];
  alternateRowFillColor?: [number, number, number];
  lineColor?: [number, number, number];
}

export interface PlainTableThemeConfig {
  styles: {
    font?: string;
    fontSize: number;
    cellPadding: number;
    overflow?: 'linebreak';
    valign?: 'middle' | 'top';
    textColor: [number, number, number];
    lineWidth: number | { top: number; right: number; bottom: number; left: number; };
    lineColor: [number, number, number];
  };
  bodyStyles: {
    fillColor: [number, number, number];
    textColor?: [number, number, number];
    lineWidth: number | { top: number; right: number; bottom: number; left: number; };
    lineColor: [number, number, number];
  };
  alternateRowStyles: {
    fillColor: [number, number, number];
    lineWidth: number | { top: number; right: number; bottom: number; left: number; };
    lineColor: [number, number, number];
  };
  theme: 'plain';
}

export interface PdfExportLibraries {
  autoTable: typeof import('jspdf-autotable').default;
  fontData: PdfExportFontData | null;
  jsPDF: typeof import('jspdf').default;
}
