import type jsPDF from 'jspdf';
import type { PdfExportFontData } from './model/pdf-export-fonts.model';
export type { PdfExportFontData } from './model/pdf-export-fonts.model';




let fontDataPromise: Promise<PdfExportFontData | null> | null = null;

export function loadPdfExportFontData(): Promise<PdfExportFontData | null> {
  fontDataPromise ??= Promise.all([
    fetchFont('assets/fonts/Pdf/Inter-Regular.ttf'),
    fetchFont('assets/fonts/Pdf/Inter-Bold.ttf'),
    fetchFont('assets/fonts/Pdf/DejaVuSansMono.ttf')
  ]).then(([interRegular, interBold, monoRegular]) => ({
    interRegular,
    interBold,
    monoRegular
  })).catch(() => {
    fontDataPromise = null;
    return null;
  });
  return fontDataPromise;
}

export function registerPdfExportFonts(doc: jsPDF, fontData: PdfExportFontData | null | undefined): void {
  if (!fontData) {
    return;
  }
  try {
    doc.addFileToVFS('Inter-Regular.ttf', fontData.interRegular);
    doc.addFont('Inter-Regular.ttf', 'helvetica', 'normal');
    doc.addFileToVFS('Inter-Bold.ttf', fontData.interBold);
    doc.addFont('Inter-Bold.ttf', 'helvetica', 'bold');
    doc.addFileToVFS('DejaVuSansMono.ttf', fontData.monoRegular);
    doc.addFont('DejaVuSansMono.ttf', 'courier', 'normal');
  }
  catch {
    return;
  }
}

function fetchFont(url: string): Promise<string> {
  return fetch(url, { credentials: 'same-origin', cache: 'force-cache' })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Unable to load PDF font (${response.status})`);
      }
      return response.arrayBuffer();
    })
    .then(arrayBufferToBase64);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
