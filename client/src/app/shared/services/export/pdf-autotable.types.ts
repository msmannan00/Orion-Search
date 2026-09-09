import type jsPDF from 'jspdf';
import type { Augmented } from '../../utils/type-guards.util';


export type AutoTableDocument = Augmented<jsPDF, {
  lastAutoTable: {
    finalY: number;
    startY?: number;
  };
}>;

export function assertAutoTableDocument(document: jsPDF): asserts document is AutoTableDocument {
  if (!('lastAutoTable' in document)) {
    throw new Error('PDF table layout metadata is unavailable');
  }
}
