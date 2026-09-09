import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Case, CaseAnalyst, CaseTag } from '../../case.model';
import { CASE_TAG_OPTIONS, CASE_TYPE_OPTIONS, INTAKE_SOURCE_OPTIONS, PRIORITY_OPTIONS, SEVERITY_OPTIONS } from '../../case-management.defaults';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';
import { caseInlineMotion, caseModeSwapMotion } from '../case-details.animations';
import { formatCaseLabel, getAssignedCaseAnalysts, getCaseDisplayLabel, getFormattedCaseDateTime } from '../case-details-formatters';
import { CaseDetailsStore } from '../case-details.store';
import { CaseEditDrawerComponent } from '../case-edit-drawer/case-edit-drawer';

@Component({
  selector: 'app-case-summary-section',
  imports: [CommonModule, FormsModule, CaseEditDrawerComponent, TranslatePipe],
  animations: [caseInlineMotion, caseModeSwapMotion],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-summary-section.html'
})
export class CaseSummarySectionComponent {
  readonly store = inject(CaseDetailsStore);
  caseTypeOptions = CASE_TYPE_OPTIONS;
  intakeSourceOptions = INTAKE_SOURCE_OPTIONS;
  severityOptions = SEVERITY_OPTIONS;
  priorityOptions = PRIORITY_OPTIONS;
  tagOptions: { value: CaseTag; label: string }[] = CASE_TAG_OPTIONS;

  get caseData(): Case {
    return this.store.caseData as Case;
  }

  get editedCase(): Case | null {
    return this.store.editedCase;
  }

  get activeEditSection() {
    return this.store.activeEditSection;
  }

  canManageCases(): boolean {
    return this.store.canManageCases();
  }

  getCaseAnalysts(caseItem: Case | null = this.caseData): CaseAnalyst[] {
    if (caseItem?.assignedAnalysts?.length) {
      return caseItem.assignedAnalysts;
    }
    return getAssignedCaseAnalysts(this.store.analysts, caseItem);
  }

  toggleTag(tag: CaseTag): void {
    if (!this.store.editedCase) {
      return;
    }
    this.store.editedCase.tags = this.store.editedCase.tags || [];
    if (this.store.editedCase.tags.includes(tag)) {
      this.store.editedCase.tags = this.store.editedCase.tags.filter(item => item !== tag);
      return;
    }
    this.store.editedCase.tags = [...this.store.editedCase.tags, tag];
  }

  isTagSelected(tag: CaseTag): boolean {
    return this.store.editedCase?.tags?.includes(tag) ?? false;
  }

  toggleAssignedAnalyst(userId: string): void {
    if (!this.store.editedCase) {
      return;
    }
    this.store.editedCase.assignedAnalystIds = this.store.editedCase.assignedAnalystIds || [];
    if (this.store.editedCase.assignedAnalystIds.includes(userId)) {
      this.store.editedCase.assignedAnalystIds = this.store.editedCase.assignedAnalystIds.filter(id => id !== userId);
      this.store.editedCase.tasks = (this.store.editedCase.tasks || []).map(task => task.assignedTo === userId ? { ...task, assignedTo: '' } : task);
      return;
    }
    this.store.editedCase.assignedAnalystIds = [...this.store.editedCase.assignedAnalystIds, userId];
  }

  isAnalystAssignedToCase(userId: string): boolean {
    return this.store.editedCase?.assignedAnalystIds?.includes(userId) ?? false;
  }

  getDisplayLabel(value?: string | null, otherValue?: string | null): string {
    return getCaseDisplayLabel(value, otherValue);
  }

  getFormattedDateTime(date?: Date | string | null): string {
    return getFormattedCaseDateTime(date);
  }

  formatLabel(value?: string | null): string {
    return formatCaseLabel(value);
  }
}
