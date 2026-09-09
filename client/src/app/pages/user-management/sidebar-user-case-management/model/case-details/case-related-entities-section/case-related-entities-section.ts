import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Case, CaseEntity } from '../../case.model';
import { TooltipDirective } from '../../../../../../shared/directive/tooltip-directive.directive';
import { EntityDetailsComponent } from '../../entity-details/entity-details';
import { caseListItemMotion, caseModeSwapMotion, caseSectionMotion } from '../case-details.animations';
import { formatCaseConfidence, formatCaseLabel, getCaseDisplayLabel, getFormattedCaseDateTime, getLinkableCaseEntities, getLinkedCaseEntityDisplayLabel, getRelatedCaseEntities } from '../case-details-formatters';
import { CaseDetailsStore } from '../case-details.store';
import { CaseEditDrawerComponent } from '../case-edit-drawer/case-edit-drawer';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-case-related-entities-section',
  imports: [CommonModule, EntityDetailsComponent, TooltipDirective, CaseEditDrawerComponent, TranslatePipe],
  animations: [caseListItemMotion, caseModeSwapMotion, caseSectionMotion],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-related-entities-section.html'
})
export class CaseRelatedEntitiesSectionComponent {
  private expandedRelatedEntityIds = new Set<string>();

  editingRelatedEntityId: string | null = null;
  readonly store = inject(CaseDetailsStore);
  $index: unknown;

  get caseData(): Case {
    return this.store.caseData as Case;
  }

  get editedCase(): Case | null {
    return this.store.editedCase;
  }

  get isEditing(): boolean {
    return this.store.activeEditSection === 'relatedEntities';
  }

  get isAddingRelatedEntity(): boolean {
    return this.store.isAddingRelatedEntity;
  }

  get newRelatedEntity(): CaseEntity | null {
    return this.store.newRelatedEntity;
  }

  get selectedEditableRelatedEntity(): CaseEntity | null {
    const relatedEntities = this.getRelatedEntities(this.editedCase);
    return relatedEntities.find(entity => entity.entityId === this.editingRelatedEntityId) ?? null;
  }

  get selectedEditableRelatedEntityIndex(): number {
    return this.getRelatedEntities(this.editedCase)
      .findIndex(entity => entity.entityId === this.editingRelatedEntityId);
  }

  getRelatedEntities(caseItem: Case | null = this.caseData): CaseEntity[] {
    return getRelatedCaseEntities(caseItem);
  }

  getLinkableEntities(currentEntityId?: string, caseItem: Case | null = this.editedCase ?? this.caseData): CaseEntity[] {
    return getLinkableCaseEntities(caseItem, currentEntityId);
  }

  getLinkedEntityDisplayLabel(entityId?: string, caseItem: Case | null = this.caseData || this.editedCase): string {
    return getLinkedCaseEntityDisplayLabel(caseItem, entityId);
  }

  toggleRelatedEntity(entityId: string): void {
    if (this.expandedRelatedEntityIds.has(entityId)) {
      this.expandedRelatedEntityIds.delete(entityId);
      return;
    }
    this.expandedRelatedEntityIds.add(entityId);
  }

  isRelatedEntityExpanded(entityId: string): boolean {
    return this.expandedRelatedEntityIds.has(entityId);
  }

  openEditRelatedEntity(entityId: string): void {
    this.editingRelatedEntityId = entityId;
    this.store.enableEditing('relatedEntities');
  }

  cancelRelatedEntityEditing(): void {
    this.editingRelatedEntityId = null;
    this.store.cancelEditing();
  }

  getDisplayLabel(value?: string | null, otherValue?: string | null): string {
    return getCaseDisplayLabel(value, otherValue);
  }

  formatLabel(value?: string | null): string {
    return formatCaseLabel(value);
  }

  formatConfidence(value?: string | null): string {
    return formatCaseConfidence(value);
  }

  getFormattedDateTime(date?: Date | string | null): string {
    return getFormattedCaseDateTime(date);
  }

  canManageCases(): boolean {
    return this.store.canManageCases();
  }
}
