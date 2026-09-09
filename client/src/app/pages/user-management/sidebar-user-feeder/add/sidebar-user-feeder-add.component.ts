import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationPopupComponent } from '../../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { FeederRuleOption, FeederScriptItem } from '../model/feeder.model';
import { MessageNotificationService } from '../../../../services/message_notification/message-notification.service';
import { finalize } from 'rxjs';
import { FeederService } from '../feeder.service';
import { supportsFileUploadForRuleType, supportsValueUploadForRuleType } from '../feeder-rule.utils';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';
import { getOwnProperty } from '../../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-sidebar-user-feeder-add',
  standalone: true,
  imports: [FormsModule, ConfirmationPopupComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './sidebar-user-feeder-add.component.html',
})
export class SidebarUserFeederAddComponent implements OnChanges {
  private readonly maxFileSize = 1024 * 1024;
  private pendingUploadInput: HTMLInputElement | null = null;

  sharedRuleScripts: FeederScriptItem[] = [];
  uploadMode: 'file' | 'values' = 'file';
  selectedFiles: File[] = [];
  selectedSessionFile: File | null = null;
  uploadedSessionFileName = '';
  valuesText = '';
  isSubmitting = false;
  isSelectingFiles = false;
  isSharedScriptStatusLoading = false;
  isValuesLoading = false;
  uploadProgressCurrent = 0;
  uploadProgressTotal = 0;
  isReplaceConfirmationOpen = false;
  formError = '';
  replaceConfirmationMessage = '';

  @Input() rules: FeederRuleOption[] = [];
  @Input() selectedRuleKey = '';
  @Input() isCatalogLoading = false;

  @Output() scriptUploaded = new EventEmitter<FeederScriptItem>();

  constructor(private feederService: FeederService, private messageNotificationService: MessageNotificationService, private translationService: TranslationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.selectedRuleKey || changes.rules) {
      this.syncUploadMode();
      this.loadSharedRuleScripts();
      this.loadCurrentRuleValues();
      this.formError = '';
      this.uploadedSessionFileName = '';
    }
  }

  get selectedRule(): FeederRuleOption | undefined {
    return this.rules.find(rule => rule.key === this.selectedRuleKey);
  }

  get selectedRuleType(): string {
    return this.selectedRule?.rule_type ?? '';
  }

  hasSharedScriptUploaded(): boolean {
    return this.sharedRuleScripts.length > 0;
  }

  get currentSessionFileName(): string {
    return this.selectedSessionFile?.name ?? this.uploadedSessionFileName ?? this.sharedRuleScripts.find(script => script.session_file_name)?.session_file_name ?? '';
  }

  isSharedValueBlocked(): boolean {
    return this.selectedRuleType === 'shared' && !this.hasSharedScriptUploaded();
  }

  get panelTitle(): string {
    if (this.selectedRuleType === 'generic') {
      return 'Add Values';
    }
    if (this.selectedRuleType === 'shared') {
      return 'Shared Rule Setup';
    }
    return 'Upload Parser';
  }

  get panelDescription(): string {
    if (this.selectedRuleType === 'generic') {
      return 'Paste newline-separated URL values for this rule.';
    }
    if (this.selectedRuleType === 'shared') {
      return '';
    }
    return 'Upload a UTF-8 Python parser file for this rule.';
  }

  onFileSelected(event: Event): void {
    this.isSelectingFiles = false;
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    this.selectedFiles = Array.from(input.files ?? []);
  }

  onSessionFileSelected(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const file = input.files?.[0] ?? null;
    if (file && !file.name.toLowerCase().endsWith('.zip')) {
      this.formError = this.translationService.translate('Only ZIP session files are allowed');
      input.value = '';
      this.selectedSessionFile = null;
      return;
    }
    this.formError = '';
    this.selectedSessionFile = file;
  }

  supportsValueUpload(): boolean {
    return supportsValueUploadForRuleType(this.selectedRuleType);
  }

  supportsFileUpload(): boolean {
    return supportsFileUploadForRuleType(this.selectedRuleType);
  }

  uploadSharedFile(fileInput: HTMLInputElement): void {
    this.uploadMode = 'file';
    this.uploadScript(fileInput);
  }

  uploadSharedValues(fileInput: HTMLInputElement): void {
    this.uploadMode = 'values';
    this.uploadScript(fileInput);
  }

  clearFile(input: HTMLInputElement): void {
    input.value = '';
    this.selectedFiles = [];
    this.resetUploadProgress();
  }

  clearSessionFile(input: HTMLInputElement): void {
    input.value = '';
    this.selectedSessionFile = null;
  }

  uploadScript(fileInput: HTMLInputElement): void {
    this.pendingUploadInput = fileInput;
    this.formError = '';

    if (!this.selectedRuleKey) {
      this.formError = this.translationService.translate('Rule is required');
      return;
    }
    if (this.uploadMode === 'file' && !this.supportsFileUpload()) {
      this.formError = this.translationService.translate('This rule does not support Python file uploads');
      return;
    }
    if (this.uploadMode === 'values' && !this.supportsValueUpload()) {
      this.formError = this.translationService.translate('This rule does not support URL value uploads');
      return;
    }
    if (this.uploadMode === 'values' && this.isSharedValueBlocked()) {
      this.formError = this.translationService.translate('Upload the parser file before adding values');
      return;
    }
    if (this.uploadMode === 'values') {
      this.submitUpload(fileInput);
      return;
    }
    if (!this.selectedFiles.length && !this.selectedSessionFile) {
      this.formError = this.translationService.translate('Python file is required');
      return;
    }
    if (this.selectedSessionFile && !this.selectedSessionFile.name.toLowerCase().endsWith('.zip')) {
      this.formError = this.translationService.translate('Only ZIP session files are allowed');
      return;
    }
    for (const file of this.selectedFiles) {
      if (!file.name.toLowerCase().endsWith('.py')) {
        this.formError = this.translationService.translate('Only Python files are allowed');
        return;
      }
      if (file.size > this.maxFileSize) {
        this.formError = this.translationService.translate('File size must be 1 MB or less');
        return;
      }
    }

    this.feederService.getScripts({
      ruleKey: this.selectedRuleKey,
      entryType: 'scripts',
      page: 1,
      limit: 1000,
    })
      .subscribe({
        next: (response) => {
          const existingScripts = this.findExistingScripts(response?.scripts ?? []);
          const existingSessionScripts = this.findExistingSessionScripts(response?.scripts ?? []);
          if (existingScripts.length) {
            this.replaceConfirmationMessage = existingScripts.length === 1
              ? this.translationService.translate('A script named {name} already exists in this destination. Are you sure you want to replace it?')
                .replace('{name}', this.formatReplacementName(existingScripts[0].file_name))
              : this.translationService.translate('{count} selected scripts already exist in this destination. Are you sure you want to replace them?')
                .replace('{count}', String(existingScripts.length));
            this.isReplaceConfirmationOpen = true;
            return;
          }
          if (existingSessionScripts.length) {
            this.replaceConfirmationMessage = this.translationService.translate('A session file named {name} already exists in this destination. Are you sure you want to replace it?')
              .replace('{name}', existingSessionScripts[0].session_file_name ?? '');
            this.isReplaceConfirmationOpen = true;
            return;
          }

          this.submitUpload(fileInput);
        },
        error: (error) => {
          this.formError = error?.error?.detail ?? this.translationService.translate('Failed to check existing feeder scripts');
        }
      });
  }

  confirmReplaceUpload(confirmed: boolean): void {
    this.isReplaceConfirmationOpen = false;
    if (!confirmed) {
      this.pendingUploadInput = null;
      return;
    }

    if (this.pendingUploadInput) {
      this.submitUpload(this.pendingUploadInput);
    }
    this.pendingUploadInput = null;
  }

  private loadCurrentRuleValues(): void {
    if (!this.selectedRuleKey || !this.supportsValueUpload()) {
      this.deferStateUpdate(() => {
        this.valuesText = '';
        this.isValuesLoading = false;
      });
      return;
    }

    this.deferStateUpdate(() => {
      this.isValuesLoading = true;
      const values = (this.selectedRule?.values ?? []).map((value) => value.trim()).filter(Boolean);
      this.valuesText = values.join('\n');
      this.isValuesLoading = false;
    });
  }

  private syncUploadMode(): void {
    if (this.supportsFileUpload() && !this.supportsValueUpload()) {
      this.uploadMode = 'file';
      return;
    }
    if (!this.supportsFileUpload() && this.supportsValueUpload()) {
      this.uploadMode = 'values';
      return;
    }
    if (this.uploadMode === 'file' && !this.supportsFileUpload()) {
      this.uploadMode = 'values';
      return;
    }
    if (this.uploadMode === 'values' && !this.supportsValueUpload()) {
      this.uploadMode = 'file';
    }
  }

  private loadSharedRuleScripts(): void {
    this.deferStateUpdate(() => {
      this.sharedRuleScripts = [];
    });
    if (!this.selectedRuleKey || !this.supportsFileUpload()) {
      this.deferStateUpdate(() => {
        this.isSharedScriptStatusLoading = false;
      });
      return;
    }

    this.deferStateUpdate(() => {
      this.isSharedScriptStatusLoading = true;
    });
    this.feederService.getScripts({
      ruleKey: this.selectedRuleKey,
      entryType: 'scripts',
      page: 1,
      limit: 1000,
    })
      .pipe(finalize(() => {
        this.deferStateUpdate(() => {
          this.isSharedScriptStatusLoading = false;
        });
      }))
      .subscribe({
        next: (response) => {
          this.deferStateUpdate(() => {
            this.sharedRuleScripts = response?.scripts ?? [];
          });
        },
        error: () => {
          this.deferStateUpdate(() => {
            this.sharedRuleScripts = [];
          });
        }
      });
  }

  private submitUpload(fileInput: HTMLInputElement): void {
    if (this.uploadMode === 'file' && !this.selectedFiles.length && !this.selectedSessionFile) {
      return;
    }

    if (this.uploadMode === 'file') {
      if (!this.selectedFiles.length && this.selectedSessionFile) {
        this.submitSessionUpload(fileInput);
        return;
      }
      this.submitFileUploads(fileInput, 0, null);
      return;
    }

    const formData = new FormData();
    formData.append('rule_key', this.selectedRuleKey);
    formData.append('mode', this.uploadMode);
    if (this.uploadMode === 'values') {
      formData.append('values_text', this.valuesText);
    }

    this.isSubmitting = true;
    this.feederService.upload(formData)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.resetUploadProgress();
      }))
      .subscribe({
        next: (response) => {
          this.messageNotificationService.show(response?.message ?? this.translationService.translate('Upload completed successfully'), 'success');
          fileInput.value = '';
        },
        error: (error) => {
          if (error?.status === 409) {
            this.formError = '';
            this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Script owner already exists'));
            return;
          }
          this.formError = error?.error?.detail ?? this.translationService.translate('Failed to upload feeder script');
        }
      });
  }

  private submitSessionUpload(fileInput: HTMLInputElement): void {
    const selectedSessionFile = this.selectedSessionFile;
    if (!selectedSessionFile) {
      return;
    }
    const formData = new FormData();
    formData.append('rule_key', this.selectedRuleKey);
    formData.append('mode', 'file');
    formData.append('session_file', selectedSessionFile);

    this.isSubmitting = true;
    this.feederService.upload(formData)
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: (response) => {
          this.messageNotificationService.show(response?.message ?? this.translationService.translate('Session file uploaded successfully'), 'success');
          this.uploadedSessionFileName = response?.script?.session_file_name ?? this.selectedSessionFile?.name ?? '';
          if (this.selectedRuleType === 'shared' && response?.script) {
            this.sharedRuleScripts = [response.script];
          }
          this.selectedSessionFile = null;
          fileInput.value = '';
        },
        error: (error) => {
          this.formError = error?.error?.detail ?? this.translationService.translate('Failed to upload session file');
        }
      });
  }

  private submitFileUploads(fileInput: HTMLInputElement, index: number, lastUploadedScript: FeederScriptItem | null): void {
    const file = getOwnProperty(this.selectedFiles, index);
    if (!file) {
      this.isSubmitting = false;
      this.resetUploadProgress();
      this.messageNotificationService.show(this.translationService.translate('Upload completed successfully'), 'success');
      this.selectedFiles = [];
      this.selectedSessionFile = null;
      fileInput.value = '';
      if (lastUploadedScript) {
        if (this.selectedRuleType === 'shared') {
          this.sharedRuleScripts = [lastUploadedScript];
        }
        this.scriptUploaded.emit(lastUploadedScript);
      }
      return;
    }

    const formData = new FormData();
    formData.append('rule_key', this.selectedRuleKey);
    formData.append('mode', this.uploadMode);
    formData.append('file', file);
    if (this.selectedSessionFile) {
      formData.append('session_file', this.selectedSessionFile);
    }

    this.isSubmitting = true;
    this.uploadProgressTotal = this.selectedFiles.length;
    this.uploadProgressCurrent = index + 1;
    this.feederService.upload(formData)
      .subscribe({
        next: (response) => {
          this.submitFileUploads(fileInput, index + 1, response?.script ?? lastUploadedScript);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.resetUploadProgress();
          if (error?.status === 409) {
            this.formError = '';
            this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Script owner already exists'));
            return;
          }
          this.formError = error?.error?.detail ?? this.translationService.translate('Failed to upload feeder script');
        }
      });
  }

  private findExistingScripts(existingScripts: FeederScriptItem[]): FeederScriptItem[] {
    if (!this.selectedFiles.length || this.uploadMode !== 'file') {
      return [];
    }

    const normalizedNames = new Set(this.selectedFiles.map((file) => this.sanitizeFileName(file.name)));
    return existingScripts.filter((script) =>
      (script.path ?? '') === (this.selectedRule?.path ?? '')
      && normalizedNames.has(script.file_name));
  }

  private findExistingSessionScripts(existingScripts: FeederScriptItem[]): FeederScriptItem[] {
    if (!this.selectedSessionFile || this.uploadMode !== 'file') {
      return [];
    }

    return existingScripts.filter((script) =>
      (script.path ?? '') === (this.selectedRule?.path ?? '')
      && !!script.session_file_name);
  }

  private sanitizeFileName(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    const suffix = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
    const stem = (dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName)
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '')
      .toLowerCase();
    let safeStem = (stem || 'script').slice(0, 64);
    if (!safeStem.startsWith('_')) {
      safeStem = `_${safeStem}`;
    }
    return `${safeStem}${suffix || '.py'}`;
  }

  private formatReplacementName(fileName: string): string {
    if (fileName.length <= 6) {
      return fileName;
    }
    return `${fileName.slice(0, 6)}...`;
  }

  private resetUploadProgress(): void {
    this.uploadProgressCurrent = 0;
    this.uploadProgressTotal = 0;
  }

  private deferStateUpdate(callback: () => void): void {
    queueMicrotask(callback);
  }
}
