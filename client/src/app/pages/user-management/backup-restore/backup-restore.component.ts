import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { MessageNotificationService } from '../../../services/message_notification/message-notification.service';
import { fadeInDashboardItem } from '../../../shared/animations/dashboard.item.animation';
import { ConfirmationPopupComponent } from '../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { ApiService } from '../../../shared/services/api.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import type { BackupJob, BackupRecord } from './model/backup-restore.model';

@Component({
  selector: 'app-backup-restore',
  standalone: true,
  imports: [CommonModule, ConfirmationPopupComponent, TranslatePipe],
  animations: [fadeInDashboardItem],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './backup-restore.component.html',
})
export class BackupRestoreComponent implements OnInit, OnDestroy {
  private jobTimer: ReturnType<typeof setTimeout> | null = null;
  private jobWasRunning = false;

  backups: BackupRecord[] = [];
  isLoading = true;
  backupToDelete: BackupRecord | null = null;
  backupToRestore: BackupRecord | null = null;
  isInstantConfirmationOpen = signal<boolean>(false);
  isDeleteConfirmationOpen = signal<boolean>(false);
  isRestoreConfirmationOpen = signal<boolean>(false);
  isRestoring = false;
  isCreating = false;
  job: BackupJob | null = null;
  readonly MAX_BACKUPS = 2;
  instantConfirmationMessage = 'Start instant backup now?';

  constructor(private apiService: ApiService, private messageNotificationService: MessageNotificationService, private translationService: TranslationService) {
  }

  ngOnInit(): void {
    this.loadBackups();
    this.pollJob();
  }

  ngOnDestroy(): void {
    if (this.jobTimer !== null) {
      clearTimeout(this.jobTimer);
    }
  }

  private schedulePoll(delay: number): void {
    if (this.jobTimer !== null) {
      clearTimeout(this.jobTimer);
    }
    this.jobTimer = setTimeout(() => {
      this.jobTimer = null;
      this.pollJob();
    }, delay);
  }

  private applyJob(job: BackupJob): void {
    this.job = job;
    this.isCreating = job.status === 'running' && job.operation === 'backup';
    this.isRestoring = job.status === 'running' && job.operation === 'restore';
    if (job.status === 'running') {
      this.jobWasRunning = true;
    }
  }

  private pollJob(): void {
    this.apiService.get<BackupJob>('admin/backups/status').subscribe({
      next: (job) => {
        this.applyJob(job);
        if (job.status === 'running') {
          this.schedulePoll(2000);
          return;
        }
        if (this.jobWasRunning) {
          this.jobWasRunning = false;
          this.backupToRestore = null;
          this.messageNotificationService.show(this.translationService.translate(job.message), job.status === 'done' ? 'success' : 'fail');
          this.loadBackups();
        }
      },
      error: () => {
        this.schedulePoll(5000);
      }
    });
  }

  loadBackups(): void {
    this.isLoading = true;
    this.apiService.get<BackupRecord[]>('admin/backups')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (backups) => this.backups = backups || [],
        error: () => {
          this.messageNotificationService.show(this.translationService.translate('Failed to load backups'));
        }
      });
  }

  openInstantConfirmation(): void {
    this.instantConfirmationMessage = this.backups.length >= this.MAX_BACKUPS
      ? `You already have ${this.MAX_BACKUPS} backups. The oldest backup will be deleted if you proceed.`
      : 'Start instant backup now?';
    this.isInstantConfirmationOpen.set(true);
  }

  confirmInstantBackup(value: boolean): void {
    this.isInstantConfirmationOpen.set(false);
    if (!value) {
      return;
    }
    this.isCreating = true;
    this.apiService.post<BackupJob>('admin/backups/instant', {}).subscribe({
      next: (job) => {
        this.applyJob(job);
        this.schedulePoll(1000);
      },
      error: () => {
        this.isCreating = false;
        this.messageNotificationService.show(this.translationService.translate('Failed to create backup'));
      }
    });
  }

  openDeleteConfirmation(backup: BackupRecord): void {
    this.backupToDelete = backup;
    this.isDeleteConfirmationOpen.set(true);
  }

  confirmDeleteBackup(value: boolean): void {
    this.isDeleteConfirmationOpen.set(false);
    if (!value || !this.backupToDelete) {
      this.backupToDelete = null;
      return;
    }
    const backup = this.backupToDelete;
    this.isLoading = true;
    this.apiService.delete(`admin/backups/${backup.id}`)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.backupToDelete = null;
      }))
      .subscribe({
        next: () => {
          this.backups = this.backups.filter(item => item.id !== backup.id);
          this.messageNotificationService.show(this.translationService.translate('Backup deleted successfully'));
        },
        error: () => {
          this.messageNotificationService.show(this.translationService.translate('Failed to delete backup'));
        }
      });
  }

  openRestoreConfirmation(backup: BackupRecord): void {
    this.backupToRestore = backup;
    this.isRestoreConfirmationOpen.set(true);
  }

  confirmRestoreBackup(value: boolean): void {
    this.isRestoreConfirmationOpen.set(false);
    if (!value || !this.backupToRestore) {
      this.backupToRestore = null;
      return;
    }
    const backup = this.backupToRestore;
    this.isRestoring = true;
    this.apiService.post<BackupJob>(`admin/backups/${backup.id}/restore`, {}).subscribe({
      next: (job) => {
        this.applyJob(job);
        this.schedulePoll(1000);
      },
      error: () => {
        this.isRestoring = false;
        this.backupToRestore = null;
        this.messageNotificationService.show(this.translationService.translate('Failed to restore backup'));
      }
    });
  }

  formatDate(value: string): string {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleString();
  }
}
