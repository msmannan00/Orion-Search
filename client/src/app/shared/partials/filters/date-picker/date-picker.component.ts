import { CommonModule } from '@angular/common';
import { Component, HostListener, OnChanges, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CalendarCell } from './model/calendar-cell.model';
import { FilterModel } from '../../../model/filter/filter.model';
import { TranslatePipe } from '../../../pipes/translate.pipe';

type DatePickerSelectionMode = 'range' | 'single';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './date-picker.component.html',
})
export class DatePickerComponent implements OnChanges {
  readonly weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  isOpen = false;
  viewYear = 0;
  viewMonth = 0;
  cells: CalendarCell[] = [];
  fromDate: Date | null = null;
  toDate: Date | null = null;
  readonly key = input('');
  readonly filterModel = input<FilterModel | undefined>(undefined);
  readonly selectedFilters = input<Record<string, string | null> | undefined>(undefined, { alias: 'mSelectedFilters' });
  readonly value = input<string | null>('');
  readonly selectionMode = input<DatePickerSelectionMode>('range');
  readonly disabled = input(false);
  readonly allowFutureDates = input(false);
  readonly toggleTestId = input('side-filter-date-toggle');
  readonly dateSelected = output<{
      key: string;
      value: string;
  }>();

  get displayValue(): string {
    if (this.selectionMode() === 'single') {
      return this.fromDate ? this.toIso(this.fromDate) : '';
    }

    if (this.fromDate && this.toDate) {
      return `${this.toIso(this.fromDate)},${this.toIso(this.toDate)}`;
    }
    if (this.fromDate) {
      return this.toIso(this.fromDate);
    }
    return '';
  }

  get monthLabel(): string {
    return new Date(this.viewYear, this.viewMonth, 1).toLocaleString(undefined, {
      month: 'long',
      year: 'numeric'
    });
  }

  ngOnChanges(): void {
    const raw = this.selectionMode() === 'single'
      ? this.value()
      : this.selectedFilters()?.[this.key()];

    if (!raw) {
      this.fromDate = null;
      this.toDate = null;
      const maxDate = this.getMaxSelectableDate();
      this.viewYear = maxDate.getFullYear();
      this.viewMonth = maxDate.getMonth();
      this.buildCalendar();
      return;
    }

    const [start, end] = String(raw).split(',');
    this.fromDate = this.clampDate(this.parseIso(start));
    this.toDate = this.selectionMode() === 'single'
      ? null
      : this.clampDate(this.parseIso(end));

    if (this.fromDate && this.toDate && this.toDate.getTime() < this.fromDate.getTime()) {
      this.toDate = this.fromDate;
    }

    const pivot = this.fromDate ?? this.getMaxSelectableDate();
    this.viewYear = pivot.getFullYear();
    this.viewMonth = pivot.getMonth();
    this.buildCalendar();
  }

  togglePicker(): void {
    if (this.disabled()) {
      return;
    }
    this.isOpen = !this.isOpen;
  }

  closePicker(): void {
    this.isOpen = false;
  }

  prevMonth(): void {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear -= 1;
    }
    else {
      this.viewMonth -= 1;
    }
    this.buildCalendar();
  }

  nextMonth(): void {
    if (this.isNextMonthDisabled()) {
      return;
    }

    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear += 1;
    }
    else {
      this.viewMonth += 1;
    }
    this.buildCalendar();
  }

  onSelect(cell: CalendarCell): void {
    if (this.isDateDisabled(cell)) {
      return;
    }

    const picked = new Date(cell.date.getFullYear(), cell.date.getMonth(), cell.date.getDate());
    if (this.selectionMode() === 'single') {
      this.fromDate = picked;
      this.toDate = null;
      this.emitValue(this.toIso(picked));
      this.closePicker();
      return;
    }

    if (!this.fromDate || (this.fromDate && this.toDate)) {
      this.fromDate = picked;
      this.toDate = null;
      return;
    }

    if (picked.getTime() >= this.fromDate.getTime()) {
      this.toDate = picked;
      const value = `${this.toIso(this.fromDate)},${this.toIso(this.toDate)}`;
      this.emitValue(value);
      this.closePicker();
      return;
    }

    this.fromDate = picked;
    this.toDate = null;
  }

  isStart(cell: CalendarCell): boolean {
    return !!this.fromDate && this.sameDay(cell.date, this.fromDate);
  }

  isEnd(cell: CalendarCell): boolean {
    return !!this.toDate && this.sameDay(cell.date, this.toDate);
  }

  isInRange(cell: CalendarCell): boolean {
    if (!this.fromDate || !this.toDate) {
      return false;
    }
    const t = cell.date.getTime();
    return t > this.fromDate.getTime() && t < this.toDate.getTime();
  }

  isDateDisabled(cell: CalendarCell): boolean {
    if (this.allowFutureDates()) {
      return false;
    }

    return this.toDateOnly(cell.date).getTime() > this.getMaxSelectableDate().getTime();
  }

  isNextMonthDisabled(): boolean {
    if (this.allowFutureDates()) {
      return false;
    }

    const nextMonth = new Date(this.viewYear, this.viewMonth + 1, 1);
    const maxDate = this.getMaxSelectableDate();
    const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    return nextMonth.getTime() > maxMonth.getTime();
  }

  clearSelection(event: MouseEvent): void {
    event.stopPropagation();
    this.fromDate = null;
    this.toDate = null;
    this.emitValue('');
    this.closePicker();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.closePicker();
  }

  private buildCalendar(): void {
    const first = new Date(this.viewYear, this.viewMonth, 1);
    const startOffset = first.getDay();
    const start = new Date(this.viewYear, this.viewMonth, 1 - startOffset);

    const next: CalendarCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      next.push({
        date: d,
        inCurrentMonth: d.getMonth() === this.viewMonth,
        iso: this.toIso(d)
      });
    }
    this.cells = next;
  }

  private parseIso(value?: string): Date | null {
    const v = (value ?? '').trim();
    if (!v) {
      return null;
    }
    const [y, m, d] = v.split('-').map(Number);
    if (!y || !m || !d) {
      return null;
    }
    return new Date(y, m - 1, d);
  }

  private emitValue(value: string): void {
    this.dateSelected.emit({ key: this.key(), value });
  }

  private clampDate(date: Date | null): Date | null {
    if (!date) {
      return null;
    }

    if (this.allowFutureDates()) {
      return date;
    }

    const maxDate = this.getMaxSelectableDate();
    return date.getTime() > maxDate.getTime() ? maxDate : date;
  }

  private getMaxSelectableDate(): Date {
    return this.toDateOnly(new Date());
  }

  private toDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private toIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }
}
