import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Case, CaseArtifact } from '../../case.model';
import { ARTIFACT_REPORT_SOURCE_OPTIONS, ARTIFACT_TYPE_OPTIONS, SOURCE_TYPE_OPTIONS } from '../../case-management.defaults';
import { TooltipDirective } from '../../../../../../shared/directive/tooltip-directive.directive';
import { caseInlineMotion, caseListItemMotion, caseModeSwapMotion, caseSectionMotion } from '../case-details.animations';
import { CaseDateField, CaseDateTarget, formatCaseLabel, getCaseDateInputValue, getCaseDisplayLabel, getFormattedCaseDateOnly, getFormattedCaseDateTime, setCaseDateInputValue } from '../case-details-formatters';
import { CaseDetailsStore } from '../case-details.store';
import { CaseEditDrawerComponent } from '../case-edit-drawer/case-edit-drawer';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';
import { DatePickerComponent } from '../../../../../../shared/partials/filters/date-picker/date-picker.component';

@Component({
  selector: 'app-case-artifacts-section',
  imports: [CommonModule, FormsModule, TooltipDirective, CaseEditDrawerComponent, TranslatePipe, DatePickerComponent],
  animations: [caseInlineMotion, caseListItemMotion, caseModeSwapMotion, caseSectionMotion],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-artifacts-section.html'
})
export class CaseArtifactsSectionComponent {
  readonly store = inject(CaseDetailsStore);
  artifactTypeOptions = ARTIFACT_TYPE_OPTIONS;
  sourceTypeOptions = SOURCE_TYPE_OPTIONS;
  editingArtifactIndex: number | null = null;
  reportSourceOptions = ARTIFACT_REPORT_SOURCE_OPTIONS;

  get caseData(): Case {
    return this.store.caseData as Case;
  }

  get editedCase(): Case | null {
    return this.store.editedCase;
  }

  get isEditing(): boolean {
    return this.store.activeEditSection === 'artifacts';
  }

  get isAddingArtifact(): boolean {
    return this.store.isAddingArtifact;
  }

  get newArtifact(): CaseArtifact | null {
    return this.store.newArtifact;
  }

  get pendingNewArtifactFileNameRows(): string[] {
    return this.store.getPendingNewArtifactFileNameRows();
  }

  get selectedEditableArtifact(): CaseArtifact | null {
    if (this.editingArtifactIndex === null) {
      return null;
    }

    return this.editedCase?.artifacts?.[this.editingArtifactIndex] ?? null;
  }

  get artifactReports() {
    return this.store.artifactReports;
  }

  get isArtifactReportsLoading() {
    return this.store.isArtifactReportsLoading;
  }

  openEditArtifact(index: number): void {
    this.editingArtifactIndex = index;
    this.store.enableEditing('artifacts');
  }

  cancelArtifactEditing(): void {
    this.editingArtifactIndex = null;
    this.store.cancelEditing();
  }

  hasArtifactsChanged(): boolean {
    return (this.editedCase?.artifacts?.length ?? 0) !== (this.caseData?.artifacts?.length || 0);
  }

  getArtifactAccept(artifact: CaseArtifact): string {
    if (artifact.type === 'screenshot') {
      return '.png,image/png';
    }

    if (artifact.type === 'file') {
      return '.pdf,.jpg,.jpeg,.png,.txt,.docx';
    }

    return '';
  }

  getDisplayLabel(value?: string | null, otherValue?: string | null): string {
    return getCaseDisplayLabel(value, otherValue);
  }

  getFormattedDateTime(date?: Date | string | null): string {
    return getFormattedCaseDateTime(date);
  }

  getDateInputValue(date?: Date | string | null): string {
    return getCaseDateInputValue(date);
  }

  setDateInputValue(target: CaseDateTarget, field: CaseDateField, value: string): void {
    setCaseDateInputValue(target, field, value);
  }

  getFormattedDateOnly(date?: Date | string | null): string {
    return getFormattedCaseDateOnly(date);
  }

  formatLabel(value?: string | null): string {
    return formatCaseLabel(value);
  }

  canManageCases(): boolean {
    return this.store.canManageCases();
  }
}
