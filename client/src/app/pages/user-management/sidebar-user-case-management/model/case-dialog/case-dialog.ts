import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';

import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { Case, CaseAnalyst } from '../case.model';
import { UiDropdownComponent, UiDropdownOption } from '../../../../../shared/partials/ui-dropdown/ui-dropdown.component';

@Component({
  selector: 'app-case-dialog',
  standalone: true,
  imports: [UiDropdownComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-dialog.html',
})
export class CaseDialog implements OnChanges {
  selectedAnalystId = '';

  @Input() caseItem: Case | null = null;
  @Input() analysts: CaseAnalyst[] = [];
  @Input() isLoading = false;
  @Input() isSaving = false;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.caseItem && this.caseItem) {
      this.selectedAnalystId = this.caseItem.assignedAnalystIds?.[0] || '';
    }
  }

  get analystOptions(): UiDropdownOption[] {
    return this.analysts.map(analyst => ({
      key: analyst.id,
      label: `${analyst.username}${analyst.email ? ' (' + analyst.email + ')' : ''}`,
    }));
  }

  get analystPlaceholder(): string {
    if (this.isLoading) {
      return 'Loading analysts...';
    }
    return this.analystOptions.length ? 'Select analyst' : 'No eligible analysts';
  }

  get canAssignAnalyst(): boolean {
    return this.analystOptions.some(option => option.key === this.selectedAnalystId);
  }

  setAnalyst(value: string | null): void {
    this.selectedAnalystId = value ?? '';
  }

  confirmAssignAnalyst(): void {
    if (!this.selectedAnalystId) {
      return;
    }

    this.saved.emit(this.selectedAnalystId);
  }
}
