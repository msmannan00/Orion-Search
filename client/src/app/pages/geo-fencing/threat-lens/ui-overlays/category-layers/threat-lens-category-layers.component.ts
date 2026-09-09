import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThreatLensCategoryModelKey, ThreatLensLegendItem } from '../../../models/geo-fencing.models';
import { ThreatLensArcRangeOption } from '../../models/threat-lens-map.types';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-threat-lens-category-layers',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './threat-lens-category-layers.component.html',
})
export class ThreatLensCategoryLayersComponent {
  private arcRangeOptionsValue: ThreatLensArcRangeOption[] = [];
  private selectedArcRangeIndexValue = 0;

  rangeSearchTerm = '';
  isRangePickerOpen = false;

  @Input() categoryLegend: ThreatLensLegendItem[] = [];
  @Input() selectedArcCategoryKey: ThreatLensCategoryModelKey = 'news_model';

  @Output() arcRangeChange = new EventEmitter<number>();
  @Output() arcCategorySelect = new EventEmitter<ThreatLensCategoryModelKey>();

  @Input() set selectedArcRangeIndex(value: number) {
    this.selectedArcRangeIndexValue = Math.max(0, Math.round(Number(value) || 0));
    this.syncRangeSearchTerm();
  }

  get selectedArcRangeIndex(): number {
    return this.selectedArcRangeIndexValue;
  }

  @Input() set arcRangeOptions(value: ThreatLensArcRangeOption[]) {
    this.arcRangeOptionsValue = Array.isArray(value) ? value : [];
    this.syncRangeSearchTerm();
  }

  get arcRangeOptions(): ThreatLensArcRangeOption[] {
    return this.arcRangeOptionsValue;
  }

  get filteredArcRangeOptions(): ThreatLensArcRangeOption[] {
    const query = this.normalizeRangeSearch(this.rangeSearchTerm);
    if (!query) {
      return this.arcRangeOptions;
    }

    const numericQuery = Number(query);
    return this.arcRangeOptions.filter((option) => option.label.includes(query)
      || (Number.isFinite(numericQuery) && numericQuery >= option.start && numericQuery <= option.end));
  }

  onRangeSearchChange(value: string): void {
    this.rangeSearchTerm = this.normalizeRangeSearch(value);
    this.isRangePickerOpen = true;
  }

  onRangeSearchCommit(): void {
    const query = this.normalizeRangeSearch(this.rangeSearchTerm);
    const numericQuery = Number(query);
    const match = this.arcRangeOptions.find((option) => Number.isFinite(numericQuery)
      && numericQuery >= option.start
      && numericQuery <= option.end)
      ?? this.filteredArcRangeOptions[0];

    if (match) {
      this.selectRange(match);
      return;
    }

    this.syncRangeSearchTerm();
    this.isRangePickerOpen = false;
  }

  onRangeOptionMouseDown(event: MouseEvent, option: ThreatLensArcRangeOption): void {
    event.preventDefault();
    this.selectRange(option);
  }

  openRangePicker(): void {
    if (!this.isRangePickerOpen) {
      this.rangeSearchTerm = '';
    }

    this.isRangePickerOpen = true;
  }

  closeRangePicker(): void {
    this.isRangePickerOpen = false;
    this.syncRangeSearchTerm();
  }

  private selectRange(option: ThreatLensArcRangeOption): void {
    this.selectedArcRangeIndexValue = option.index;
    this.rangeSearchTerm = option.label;
    this.isRangePickerOpen = false;
    this.arcRangeChange.emit(option.index);
    this.blurActiveRangeInput();
  }

  private syncRangeSearchTerm(): void {
    const option = this.arcRangeOptionsValue.find((range) => range.index === this.selectedArcRangeIndexValue)
      ?? this.arcRangeOptionsValue[0];
    this.rangeSearchTerm = option?.label || '';
  }

  private normalizeRangeSearch(value: string): string {
    return String(value || '').replace(/\D/g, '');
  }

  private blurActiveRangeInput(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }
}
