import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { timer } from 'rxjs';
import { exhaustMap } from 'rxjs/operators';
import { Case, CaseCommunication } from '../../case.model';
import { TooltipDirective } from '../../../../../../shared/directive/tooltip-directive.directive';
import { caseListItemMotion, caseModeSwapMotion, caseSectionMotion } from '../case-details.animations';
import { CaseDetailsStore } from '../case-details.store';
import { CaseEditDrawerComponent } from '../case-edit-drawer/case-edit-drawer';
import { ExtensionState } from '../../../../../../shared/model/extension/extension.model';
import { SocialExtensionManagerComponent } from '../../../../../../shared/partials/extension-manager/extension-manager.component';
import { SocialExtensionService } from '../../../../../../shared/services/social-extension.service';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-case-communications-section',
  imports: [CommonModule, FormsModule, TooltipDirective, CaseEditDrawerComponent, SocialExtensionManagerComponent, TranslatePipe],
  animations: [caseListItemMotion, caseModeSwapMotion, caseSectionMotion],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-communications-section.html'
})
export class CaseCommunicationsSectionComponent {
  private readonly extensionService = inject(SocialExtensionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly store = inject(CaseDetailsStore);
  editingCommunicationIndex: number | null = null;
  extensionState: ExtensionState | null = null;

  constructor() {
    timer(0, 3000)
      .pipe(exhaustMap(() => this.extensionService.detect()), takeUntilDestroyed(this.destroyRef))
      .subscribe(state => {
        this.extensionState = state;
      });
  }

  get isExtensionReady(): boolean {
    return this.extensionState === 'ready';
  }

  get showExtensionManager(): boolean {
    return this.extensionState !== null && this.extensionState !== 'ready' && this.extensionState !== 'checking';
  }

  get caseData(): Case {
    return this.store.caseData as Case;
  }

  get editedCase(): Case | null {
    return this.store.editedCase;
  }

  get isEditing(): boolean {
    return this.store.activeEditSection === 'communications';
  }

  get isAddingCommunication(): boolean {
    return this.store.isAddingCommunication;
  }

  get newCommunication(): CaseCommunication | null {
    return this.store.newCommunication;
  }

  get selectedEditableCommunication(): CaseCommunication | null {
    if (this.editingCommunicationIndex === null) {
      return null;
    }

    return this.editedCase?.communications?.[this.editingCommunicationIndex] ?? null;
  }

  openEditCommunication(index: number): void {
    this.editingCommunicationIndex = index;
    this.store.enableEditing('communications');
  }

  cancelCommunicationEditing(): void {
    this.editingCommunicationIndex = null;
    this.store.cancelEditing();
  }

  canManageCases(): boolean {
    return this.store.canManageCases();
  }
}
