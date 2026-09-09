import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Case, CaseAnalyst, Priority, Severity } from './model/case.model';
import { AddNewCase } from './model/add-new-case/add-new-case';
import { CaseManagement } from './case-management-service/case-management';
import { ConfirmationPopupComponent } from '../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { CaseDialog } from './model/case-dialog/case-dialog';
import { MessageNotificationService } from '../../../services/message_notification/message-notification.service';
import { finalize } from 'rxjs';
import { CaseFilterRowComponent, CaseListFilters, DEFAULT_CASE_LIST_FILTERS } from './model/case-filter-row/case-filter-row';
import { CaseAnalyticsPanel } from './model/case-analytics-panel/case-analytics-panel';
import { AdminTenantAlerts } from './model/admin-tenant-alerts/admin-tenant-alerts';

@Component({
  selector: 'app-sidebar-user-case-management',
  imports: [CommonModule, FormsModule, AddNewCase, ConfirmationPopupComponent, TranslatePipe, CaseDialog, CaseFilterRowComponent, CaseAnalyticsPanel, AdminTenantAlerts],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './sidebar-user-case-management.html'
})
export class SidebarUserCaseManagement implements OnInit {
  cases: Case[] = [];
  isLoading = false;
  showAddCasePopup = false;
  isDeleteConfirmationOpen = false;
  selectedDeleteCaseId = '';
  showArchivedCases = false;
  isAssignAnalystDialogOpen = false;
  selectedAssignCase: Case | null = null;
  analysts: CaseAnalyst[] = [];
  isAnalystsLoading = false;
  isAssignAnalystSaving = false;
  caseFilters: CaseListFilters = { ...DEFAULT_CASE_LIST_FILTERS };
  caseManagementMode: 'list' | 'analytics' | 'alerts' = 'list';

  constructor(private router: Router, private route: ActivatedRoute, private caseService: CaseManagement, private licenseService: LicenseService, private messageNotificationService: MessageNotificationService, private translationService: TranslationService) { }

  ngOnInit(): void {
    this.restoreModeFromRoute();
    this.loadCases();
  }

  loadCases(): void {
    this.isLoading = true;
    this.caseService.getCases(this.showArchivedCases).subscribe({
      next: (cases) => {
        this.cases = cases;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  addCase(): void {
    if (!this.canManageCases()) {
      return;
    }
    this.showAddCasePopup = true;
  }

  closeAddCasePopup(): void {
    this.showAddCasePopup = false;
  }

  onCaseAdded(newCase: Case): void {
    this.cases.push(newCase);
    this.closeAddCasePopup();
  }

  get filteredCases(): Case[] {
    const search = this.caseFilters.searchText.trim().toLowerCase();

    return this.cases
      .filter(caseItem => !search || [
        caseItem.caseId,
        caseItem.title,
        caseItem.description,
        this.formatLabel(caseItem.caseType),
        caseItem.caseTypeOtherValue
      ].some(value => String(value ?? '').toLowerCase().includes(search)))
      .filter(caseItem => this.caseFilters.status === 'all' || caseItem.status === this.caseFilters.status)
      .filter(caseItem => this.caseFilters.severity === 'all' || caseItem.severity === this.caseFilters.severity)
      .filter(caseItem => this.caseFilters.priority === 'all' || caseItem.priority === this.caseFilters.priority)
      .filter(caseItem => this.caseFilters.caseType === 'all' || caseItem.caseType === this.caseFilters.caseType)
      .sort((first, second) => this.compareCases(first, second));
  }

  setArchivedCases(showArchived: boolean): void {
    if (!this.canManageCases()) {
      return;
    }

    if (this.showArchivedCases === showArchived) {
      return;
    }

    this.showArchivedCases = showArchived;
    this.loadCases();
  }

  onCaseFiltersChange(filters: CaseListFilters): void {
    this.caseFilters = filters;
  }

  setCaseManagementMode(mode: 'list' | 'analytics' | 'alerts'): void {
    if (mode === 'alerts' && !this.canViewAdminAlerts()) {
      return;
    }
    this.caseManagementMode = mode;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: mode === 'list' ? null : mode },
      queryParamsHandling: 'merge',
      replaceUrl: true
    }).then();
  }

  viewCase(caseId: string): void {
    const url = this.router.createUrlTree(['/dashboard/profile/case-management/case-details'], {
      queryParams: { caseId: caseId }
    }).toString();
    window.open(url, '_blank');
  }

  canDeleteCases(): boolean {
    return this.licenseService.isMaintainer();
  }

  canManageCases(): boolean {
    return this.licenseService.isMaintainer() || this.licenseService.isAdmin();
  }

  canViewAdminAlerts(): boolean {
    return this.licenseService.canViewTenantAlerts();
  }

  openDeleteConfirmation(caseId: string): void {
    if (!this.canDeleteCases()) {
      return;
    }
    this.selectedDeleteCaseId = caseId;
    this.isDeleteConfirmationOpen = true;
  }

  deleteCase(confirmed: boolean): void {
    this.isDeleteConfirmationOpen = false;
    if (!confirmed || !this.selectedDeleteCaseId || !this.canDeleteCases()) {
      this.selectedDeleteCaseId = '';
      return;
    }
    this.caseService.deleteCase(this.selectedDeleteCaseId).subscribe({
      next: () => {
        this.cases = this.cases.filter(item => item.caseId !== this.selectedDeleteCaseId);
        this.selectedDeleteCaseId = '';
      }
    });
  }

  getFormattedDate(date?: Date | string | null): string {
    if (!date) {
      return '-';
    }

    const utcDate = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+')
      ? date + 'Z'
      : date;

    return new Date(utcDate).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getFormattedTime(date?: Date | string | null): string {
    if (!date) {
      return '';
    }

    const utcDate = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+')
      ? date + 'Z'
      : date;

    return new Date(utcDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatLabel(value?: string | null): string {
    if (!value) {
      return '-';
    }
    return this.translationService.translate(value
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase()));
  }

  openTrackingBoard(): void {
    if (!this.canManageCases()) {
      return;
    }

    const url = this.router.createUrlTree([
      '/dashboard/profile/case-management/tracking-board'
    ]).toString();

    window.open(url, '_blank');
  }

  private restoreModeFromRoute(): void {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'alerts' && this.canViewAdminAlerts()) {
      this.caseManagementMode = 'alerts';
      return;
    }
    if (mode === 'analytics') {
      this.caseManagementMode = 'analytics';
    }
  }

  loadAnalysts(): void {
    this.isAnalystsLoading = true;

    this.caseService.getAnalysts()
      .pipe(finalize(() => this.isAnalystsLoading = false))
      .subscribe({
        next: (analysts) => {
          this.analysts = analysts || [];
        },
        error: (error) => {
          this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Failed to load analysts'));
          this.closeAssignAnalystDialog();
        }
      });
  }

  openAssignAnalystDialog(caseItem: Case): void {
    if (!this.canManageCases()) {
      return;
    }

    this.selectedAssignCase = caseItem;
    this.isAssignAnalystDialogOpen = true;
    this.loadAnalysts();
  }

  closeAssignAnalystDialog(): void {
    this.isAssignAnalystDialogOpen = false;
    this.selectedAssignCase = null;
    this.analysts = [];
  }

  onAnalystAssigned(selectedAnalystId: string): void {
    if (!this.selectedAssignCase) {
      return;
    }

    this.isAssignAnalystSaving = true;

    this.caseService.assignCaseAnalyst(this.selectedAssignCase.caseId, {
      analystId: selectedAnalystId
    })
      .pipe(finalize(() => this.isAssignAnalystSaving = false))
      .subscribe({
        next: (updatedCase) => {
          this.messageNotificationService.show(this.translationService.translate('Case analyst assigned successfully'), 'success');
          this.cases = this.cases.map(item =>
            item.caseId === updatedCase.caseId ? updatedCase : item);
          this.closeAssignAnalystDialog();
        },
        error: (error) => {
          this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Failed to assign analyst'));
        }
      });
  }

  private compareCases(first: Case, second: Case): number {
    if (this.caseFilters.sort === 'updated_asc') {
      return this.getCaseTimestamp(first) - this.getCaseTimestamp(second);
    }

    if (this.caseFilters.sort === 'priority_desc') {
      return this.getPriorityWeight(second.priority) - this.getPriorityWeight(first.priority);
    }

    if (this.caseFilters.sort === 'severity_desc') {
      return this.getSeverityWeight(second.severity) - this.getSeverityWeight(first.severity);
    }

    return this.getCaseTimestamp(second) - this.getCaseTimestamp(first);
  }

  private getCaseTimestamp(caseItem: Case): number {
    const value = caseItem.updatedAt ?? caseItem.createdAt;

    if (!value) {
      return 0;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private getPriorityWeight(priority?: Priority | null): number {
    return { low: 1, medium: 2, high: 3, critical: 4 }[priority ?? 'low'] || 0;
  }

  private getSeverityWeight(severity?: Severity | null): number {
    return { info: 1, low: 2, medium: 3, high: 4, critical: 5 }[severity ?? 'info'] || 0;
  }
}
