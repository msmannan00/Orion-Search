import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Case, CaseAnalyst, CaseTask, TaskStatus } from '../../case.model';
import { PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '../../case-management.defaults';
import { TooltipDirective } from '../../../../../../shared/directive/tooltip-directive.directive';
import { caseListItemMotion, caseModeSwapMotion, caseSectionMotion } from '../case-details.animations';
import { CaseDateField, CaseDateTarget, formatCaseLabel, getAssignedCaseAnalysts, getCaseAnalystLabel, getCaseDateInputValue, getFormattedCaseDateOnly, getFormattedCaseDateTime, setCaseDateInputValue } from '../case-details-formatters';
import { CaseDetailsStore } from '../case-details.store';
import { CaseEditDrawerComponent } from '../case-edit-drawer/case-edit-drawer';
import { TranslatePipe } from '../../../../../../shared/pipes/translate.pipe';
import { DatePickerComponent } from '../../../../../../shared/partials/filters/date-picker/date-picker.component';
import { getOwnProperty } from '../../../../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-case-tasks-section',
  imports: [CommonModule, FormsModule, TooltipDirective, CaseEditDrawerComponent, TranslatePipe, DatePickerComponent],
  animations: [caseListItemMotion, caseModeSwapMotion, caseSectionMotion],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-tasks-section.html'
})
export class CaseTasksSectionComponent {
  readonly store = inject(CaseDetailsStore);
  taskStatusOptions = TASK_STATUS_OPTIONS;
  priorityOptions = PRIORITY_OPTIONS;
  editingTaskIndex: number | null = null;
  analystTaskStatusOptions: { value: TaskStatus; label: string }[] = [ { value: 'in_progress', label: 'In Progress' }, { value: 'under_review', label: 'Under Review' } ];

  get caseData(): Case {
    return this.store.caseData as Case;
  }

  get editedCase(): Case | null {
    return this.store.editedCase;
  }

  get isEditing(): boolean {
    return this.store.activeEditSection === 'tasks';
  }

  get isAddingTask(): boolean {
    return this.store.isAddingTask;
  }

  get newTask(): CaseTask | null {
    return this.store.newTask;
  }

  get analysts(): CaseAnalyst[] {
    return this.store.analysts;
  }

  get selectedEditableTask(): CaseTask | null {
    if (this.editingTaskIndex === null) {
      return null;
    }

    return this.editedCase?.tasks?.[this.editingTaskIndex] ?? null;
  }

  openEditTask(index: number): void {
    const task = getOwnProperty(this.caseData.tasks, index);

    if (!this.canEditTask(task)) {
      return;
    }

    this.editingTaskIndex = index;
    this.store.enableEditing('tasks');
  }

  cancelTaskEditing(): void {
    this.editingTaskIndex = null;
    this.store.cancelEditing();
  }

  hasTasksChanged(): boolean {
    return (this.editedCase?.tasks?.length ?? 0) !== (this.caseData?.tasks?.length || 0);
  }

  getCaseAnalysts(caseItem: Case | null = this.caseData): CaseAnalyst[] {
    return getAssignedCaseAnalysts(this.analysts, caseItem);
  }

  getAnalystLabel(userId?: string): string {
    return getCaseAnalystLabel(this.analysts, userId);
  }

  getFormattedDateTime(date?: Date | string | null): string {
    return getFormattedCaseDateTime(date);
  }

  getDateInputValue(date?: Date | string | null): string {
    return getCaseDateInputValue(date);
  }

  getFormattedDateOnly(date?: Date | string | null): string {
    return getFormattedCaseDateOnly(date);
  }

  setDateInputValue(target: CaseDateTarget, field: CaseDateField, value: string): void {
    setCaseDateInputValue(target, field, value);
  }

  formatLabel(value?: string | null): string {
    return formatCaseLabel(value);
  }

  canEditTasksAndComments(): boolean {
    return this.store.canEditTasksAndComments();
  }

  canAddTasks(): boolean {
    return this.store.canAddTasks();
  }

  canEditTask(task?: CaseTask | null): boolean {
    return this.store.canEditTask(task);
  }

  canEditFullTask(): boolean {
    return this.store.canEditFullTask();
  }

  getTaskStatusOptions(task: CaseTask): { value: TaskStatus; label: string }[] {
    if (this.canEditFullTask()) {
      return this.taskStatusOptions;
    }

    const allowedOptions = this.analystTaskStatusOptions;

    if (task.status && !allowedOptions.some(option => option.value === task.status)) {
      return [
        { value: task.status, label: this.formatLabel(task.status) },
        ...allowedOptions
      ];
    }

    return allowedOptions;
  }

  isReadonlyTaskStatusOption(status: TaskStatus): boolean {
    return !this.canEditFullTask()
      && status !== 'in_progress'
      && status !== 'under_review';
  }
}
