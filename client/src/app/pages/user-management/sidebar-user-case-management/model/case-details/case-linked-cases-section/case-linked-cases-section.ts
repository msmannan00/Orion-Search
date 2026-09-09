import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Case, CaseLink } from '../../case.model';
import { CASE_LINK_RELATIONSHIP_OPTIONS } from '../../case-management.defaults';
import { TooltipDirective } from '../../../../../../shared/directive/tooltip-directive.directive';
import { caseListItemMotion, caseModeSwapMotion, caseSectionMotion } from '../case-details.animations';
import { formatCaseLabel } from '../case-details-formatters';
import { CaseDetailsStore } from '../case-details.store';
import { CaseEditDrawerComponent } from '../case-edit-drawer/case-edit-drawer';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-case-linked-cases-section',
  imports: [CommonModule, FormsModule, TooltipDirective, CaseEditDrawerComponent, TranslatePipe],
  animations: [caseListItemMotion, caseModeSwapMotion, caseSectionMotion],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-linked-cases-section.html'
})
export class CaseLinkedCasesSectionComponent {
  readonly store = inject(CaseDetailsStore);
  caseLinkRelationshipOptions = CASE_LINK_RELATIONSHIP_OPTIONS;
  editingLinkedCaseIndex: number | null = null;

  get caseData(): Case {
    return this.store.caseData as Case;
  }

  get editedCase(): Case | null {
    return this.store.editedCase;
  }

  get isEditing(): boolean {
    return this.store.activeEditSection === 'linkedCases';
  }

  get isAddingLinkedCase(): boolean {
    return this.store.isAddingLinkedCase;
  }

  get newLinkedCase(): CaseLink | null {
    return this.store.newLinkedCase;
  }

  get accessibleCases(): Case[] {
    return this.store.accessibleCases;
  }

  get selectedEditableLinkedCase(): CaseLink | null {
    if (this.editingLinkedCaseIndex === null) {
      return null;
    }

    return this.editedCase?.linkedCases?.[this.editingLinkedCaseIndex] ?? null;
  }

  openEditLinkedCase(index: number): void {
    this.editingLinkedCaseIndex = index;
    this.store.enableEditing('linkedCases');
  }

  cancelLinkedCaseEditing(): void {
    this.editingLinkedCaseIndex = null;
    this.store.cancelEditing();
  }

  hasLinkedCasesChanged(): boolean {
    return (this.editedCase?.linkedCases?.length ?? 0) !== (this.caseData?.linkedCases?.length || 0);
  }

  getLinkableCases(caseItem: Case | null = this.editedCase ?? this.caseData, currentSelectedCaseId = ''): Case[] {
    const currentCaseId = caseItem?.caseId;

    const alreadyLinkedCaseIds = new Set((caseItem?.linkedCases ?? [])
      .map(linkedCase => linkedCase.targetCaseId)
      .filter(caseId => caseId && caseId !== currentSelectedCaseId));

    return this.accessibleCases.filter(item =>
      item.caseId !== currentCaseId &&
      !alreadyLinkedCaseIds.has(item.caseId));
  }

  hasLinkableCases(caseItem: Case | null = this.editedCase ?? this.caseData, currentSelectedCaseId = ''): boolean {
    return this.getLinkableCases(caseItem, currentSelectedCaseId).length > 0;
  }

  formatLabel(value?: string | null): string {
    return formatCaseLabel(value);
  }

  canManageCases(): boolean {
    return this.store.canManageCases();
  }
}
