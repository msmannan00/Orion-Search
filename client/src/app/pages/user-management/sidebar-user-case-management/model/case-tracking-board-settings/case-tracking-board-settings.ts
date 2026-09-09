import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CaseManagement } from '../../case-management-service/case-management';
import { MessageNotificationService } from '../../../../../services/message_notification/message-notification.service';
import { AppService } from '../../../../../services/core/app/app.service';
import { CaseStatusBoardConfig, CaseStatusBoardItem, DEFAULT_CASE_STATUS_BOARD_CONFIG } from '../status-board-config.model';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../../shared/services/translation.service';

@Component({
  selector: 'app-case-tracking-board-settings',
  imports: [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-tracking-board-settings.html'
})
export class CaseTrackingBoardSettings implements OnInit {
  config: CaseStatusBoardConfig = structuredClone(DEFAULT_CASE_STATUS_BOARD_CONFIG);
  isLoading = false;
  isSaving = false;
  errorText = '';

  constructor( private router: Router, private caseService: CaseManagement, private appService: AppService, private messageNotificationService: MessageNotificationService, private translationService: TranslationService ) { }

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    this.isLoading = true;
    this.caseService.getStatusBoardConfig().subscribe({
      next: config => {
        this.config = this.normalizeConfig(config);
        this.isLoading = false;
      },
      error: err => {
        this.isLoading = false;
        this.messageNotificationService.show(err?.error?.detail ?? this.translationService.translate('Failed to load status board settings'));
      }
    });
  }

  save(): void {
    this.errorText = this.validate();
    if (this.errorText || this.isSaving) {
      return;
    }

    this.isSaving = true;
    const request = this.caseService.updateStatusBoardConfig(this.config);

    request.subscribe({
      next: config => {
        this.config = this.normalizeConfig(config);
        this.isSaving = false;
        this.messageNotificationService.show(this.translationService.translate('Status board settings saved'), 'success');
      },
      error: err => {
        this.isSaving = false;
        this.errorText = err?.error?.detail ?? this.translationService.translate('Failed to save status board settings');
      }
    });
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/profile/case-management/tracking-board']);
  }

  isRequiredStatus(status: CaseStatusBoardItem): boolean {
    return status.value === 'new' || status.value === 'closed';
  }

  get scopeLabel(): string {
    return this.appService.userSessionData()?.tenant?.isDefault ? 'System configuration' : 'Tenant configuration';
  }

  private normalizeConfig(config?: CaseStatusBoardConfig | null): CaseStatusBoardConfig {
    const source = config?.statuses?.length ? config : DEFAULT_CASE_STATUS_BOARD_CONFIG;

    return {
      statuses: source.statuses.map(status => ({
        ...status,
        label: status.label || this.formatLabel(status.value),
      })),
    };
  }

  validate(): string {
    const names = this.config.statuses.map(status => (status.label || '').trim().toLowerCase());
    const values = this.config.statuses.map(status => status.value.trim().toLowerCase());
    if (this.config.statuses.some(status => !status.label.trim())) {
      return this.translationService.translate('Every status needs a display name');
    }
    if (new Set(names).size !== names.length) {
      return this.translationService.translate('Duplicate status display names are not allowed');
    }
    if (new Set(values).size !== values.length) {
      return this.translationService.translate('Duplicate status keys are not allowed');
    }
    if (!this.config.statuses.some(status => status.value === 'new') || !this.config.statuses.some(status => status.value === 'closed')) {
      return this.translationService.translate('New and Closed statuses are required');
    }
    return '';
  }

  private formatLabel(value: string): string {
    return value.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }
}
