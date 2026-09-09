import { CommonModule, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, input } from '@angular/core';
import { UrlScanMeta, UrlScanThreatItem } from '../../../../../shared/model/security-scan/security.scan.results.model';
import { FindingRow } from '../model/finding-row.model';
import { HelperService } from '../../../../../shared/services/helper.service';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { getOwnProperty } from '../../../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-security-scan-export-component',
  standalone: true,
  imports: [CommonModule, NgClass, TranslatePipe],
  templateUrl: './security-scan-export-component.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecurityScanExportComponentComponent implements OnChanges {
  viewFindings: FindingRow[] = [];
  readonly meta = input.required<UrlScanMeta>();
  readonly categories = input.required<{
      name: string;
      total: number;
      items: UrlScanThreatItem[];
  }[]>();

  constructor(private helperService: HelperService) {
  }

  ngOnChanges(): void {
    this.viewFindings = this.buildRows();
  }

  get printedNow(): string {
    return new Date().toLocaleString();
  }

  riskClass(risk: string | null | undefined) {
    return this.helperService.riskClass(risk);
  }

  trimProof(p?: string | null): string {
    const text = String(p ?? '');
    if (!text) {
      return '';
    }
    const lines = text.split(/\r?\n/);
    return lines.length <= 15 ? text : lines.slice(0, 15).join('\n') + '\n…';
  }

  private buildRows(): FindingRow[] {
    const rows: FindingRow[] = [];
    const cats = this.categories() || [];
    for (const cat of cats) {
      const items = cat.items || [];
      for (let i = 0; i < items.length; i++) {
        const it = getOwnProperty(items, i);
        rows.push({
          n: i + 1,
          category: cat.name,
          header: it.header || '',
          description: it.description || '',
          risk: it.risk || '',
          confidence: it.confidence || '',
          proof: it.proof ?? undefined
        });
      }
    }
    return rows;
  }
}
