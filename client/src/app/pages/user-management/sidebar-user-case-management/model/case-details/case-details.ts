import { ChangeDetectorRef, Component, forwardRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReportFeedbackModel } from '../../../../../shared/partials/report-interactions/models/report-feedback.model';
import { ArtifactReportOption, Case, CaseAnalyst, CaseArtifact, CaseArtifactFile, CaseClosure, CaseCommentRequest, CaseEntity, CaseLink, CaseTask, CaseUpdateRequest, TaskStatus } from '../case.model';
import { DEFAULT_CASE_ARTIFACT_TEMPLATE, DEFAULT_CASE_TASK_TEMPLATE, DEFAULT_RELATED_CASE_ENTITY_TEMPLATE } from '../case-management.defaults';
import { CaseManagement } from '../../case-management-service/case-management';
import { MessageNotificationService } from '../../../../../services/message_notification/message-notification.service';
import { ConfirmationPopupComponent } from '../../../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { HttpClient } from '@angular/common/http';
import { CaseArtifactsSectionComponent } from './case-artifacts-section/case-artifacts-section';
import { CaseClosureSectionComponent } from './case-closure-section/case-closure-section';
import { CaseLinkedCasesSectionComponent } from './case-linked-cases-section/case-linked-cases-section';
import { CaseRelatedEntitiesSectionComponent } from './case-related-entities-section/case-related-entities-section';
import { CaseTasksSectionComponent } from './case-tasks-section/case-tasks-section';
import { CaseCommentsSectionComponent } from './case-comments-section/case-comments-section';
import { CaseDetailsEditSection, CaseDetailsStore } from './case-details.store';
import { caseSectionMotion } from './case-details.animations';
import { CaseDetailsSkeletonComponent } from './case-details-skeleton/case-details-skeleton';
import { CaseHeaderActionsComponent } from './case-header-actions/case-header-actions';
import { CasePrimaryEntitySectionComponent } from './case-primary-entity-section/case-primary-entity-section';
import { CaseSummarySectionComponent } from './case-summary-section/case-summary-section';
import { CasePdfExportService } from '../../case-management-service/case-pdf-export.service';
import { buildCaseCommentsFeedback } from './case-details-feedback.mapper';
import { buildCasePdfReport } from './case-details-pdf.mapper';
import { cleanCaseForSave, cleanComment, createCaseId, ensureArtifactDefaults, ensureEntityDefaults, ensurePrimaryEntity, ensureTaskDefaults } from './case-details-payload.mapper';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { LicenseService } from '../../../../../services/licenses/licenses.service';
import { AppService } from '../../../../../services/core/app/app.service';
import { ChatWidgetComponent } from '../../../../root-searches/ai-workspace/chat-widget/chat-widget.component';
import { getOwnProperty } from '../../../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-case-details',
  imports: [
    CommonModule,
    ConfirmationPopupComponent,
    CaseArtifactsSectionComponent,
    CaseClosureSectionComponent,
    CaseCommentsSectionComponent,
    CaseDetailsSkeletonComponent,
    CaseHeaderActionsComponent,
    CaseLinkedCasesSectionComponent,
    CasePrimaryEntitySectionComponent,
    CaseRelatedEntitiesSectionComponent,
    CaseSummarySectionComponent,
    CaseTasksSectionComponent, TranslatePipe, ChatWidgetComponent],
  providers: [
    { provide: CaseDetailsStore, useExisting: forwardRef(() => CaseDetails) }
  ],
  animations: [caseSectionMotion],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-details.html',
})
export class CaseDetails extends CaseDetailsStore implements OnInit {
  private artifactReportSearchTimer: ReturnType<typeof setTimeout> | null = null;

  caseData: Case | null = null;
  isLoading = true;
  caseMotionDisabled = false;
  isEditing = false;
  activeEditSection: CaseDetailsEditSection | null = null;
  editedCase: Case | null = null;
  isAddingRelatedEntity = false;
  isAddingArtifact = false;
  isAddingTask = false;
  isAddingLinkedCase = false;
  isClosingCase = false;
  newRelatedEntity: CaseEntity | null = null;
  newArtifact: CaseArtifact | null = null;
  newTask: CaseTask | null = null;
  newLinkedCase: CaseLink | null = null;
  newClosure: CaseClosure | null = null;
  analysts: CaseAnalyst[] = [];
  accessibleCases: Case[] = [];
  isCommentSaving = false;
  isShareCreating = false;
  isShareRevoking = false;
  isPdfExporting = false;
  pendingShareAction: 'create' | 'revoke' | null = null;
  commentErrorMessage = '';
  readonly artifactAllowedFileTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  readonly maxArtifactFiles = 5;
  pendingNewArtifactFiles: File[] = [];
  pendingNewArtifactFileInput: HTMLInputElement | null = null;
  artifactReports: ArtifactReportOption[] = [];
  isArtifactReportsLoading = false;
  artifactReportSearchText = '';
  isArtifactReportDropdownOpen = false;
  isArchiveConfirmationOpen = false;
  isUnarchiveConfirmationOpen = false;
  isArchivingCase = false;

  constructor(private route: ActivatedRoute, private router: Router, private caseService: CaseManagement, private casePdfExportService: CasePdfExportService, private messageNotificationService: MessageNotificationService, private http: HttpClient, private cdr: ChangeDetectorRef, public appService: AppService, private licenseService: LicenseService, private translationService: TranslationService) {
    super();
  }

  private translate(key: string): string {
    this.translationService.version();
    return this.translationService.translate(key);
  }

  ngOnInit(): void {
    this.loadCaseDetails();

    if (this.canManageCases()) {
      this.loadAnalysts();
      this.loadAccessibleCases();
    }
  }

  canManageCases(): boolean {
    return this.licenseService.isMaintainer() || this.licenseService.isAdmin();
  }

  canUnarchiveCases(): boolean {
    return this.licenseService.isAdmin();
  }

  canEditTasksAndComments(): boolean {
    return !!this.caseData && !this.caseData.closure && !this.caseData.isArchived;
  }

  canAddTasks(): boolean {
    return this.canManageCases() && this.canEditTasksAndComments();
  }

  canEditFullTask(): boolean {
    return this.canManageCases();
  }

  canEditTask(task?: CaseTask | null): boolean {
    if (!task || !this.canEditTasksAndComments()) {
      return false;
    }

    if (this.canManageCases()) {
      return true;
    }

    return !!this.caseData?.viewerId && task.assignedTo === this.caseData.viewerId;
  }

  private isAnalystAllowedTaskStatus(status: TaskStatus): boolean {
    return status === 'in_progress' || status === 'under_review';
  }

  loadAnalysts(): void {
    this.caseService.getAnalysts().subscribe({
      next: analysts => {
        this.analysts = analysts || [];
      },
      error: () => {
        this.analysts = [];
      }
    });
  }

  loadCaseDetails(): void {
    this.isLoading = true;
    const caseId = this.route.snapshot.queryParamMap.get('caseId');

    if (!caseId) {
      this.isLoading = false;
      this.messageNotificationService.show(this.translate('No case ID provided'));
      void this.router.navigate(['/dashboard/profile/case-management']);
      return;
    }

    this.caseService.getCaseById(caseId).subscribe({
      next: (caseData) => {
        caseData.artifacts = caseData.artifacts || [];
        caseData.tasks = caseData.tasks || [];
        caseData.comments = caseData.comments || [];
        caseData.linkedCases = caseData.linkedCases || [];
        caseData.closure = caseData.closure ?? null;
        caseData.assignedAnalystIds = caseData.assignedAnalystIds || [];
        caseData.assignedAnalysts = caseData.assignedAnalysts ?? [];

        if (!this.canManageCases()) {
          this.analysts = caseData.assignedAnalysts;
        }

        this.caseData = caseData;
        this.caseMotionDisabled = true;
        this.isLoading = false;

        setTimeout(() => {
          this.caseMotionDisabled = false;
        });
      },
      error: () => {
        this.messageNotificationService.show(this.translate('Case not found'));
        void this.router.navigate(['/dashboard/profile/case-management']);
        this.isLoading = false;
      }
    });
  }

  loadAccessibleCases(): void {
    this.caseService.getCases().subscribe({
      next: cases => {
        this.accessibleCases = cases || [];
      },
      error: () => {
        this.accessibleCases = [];
      }
    });
  }

  enableEditing(section: CaseDetailsEditSection = 'caseDetails'): void {
    if (!this.caseData) {
      return;
    }
    if (!this.canManageCases() && section !== 'tasks') {
      this.messageNotificationService.show(this.translate('Analysts can only edit tasks and comments'));
      return;
    }
    if (this.caseData.closure) {
      this.messageNotificationService.show(this.translate('Closed cases cannot be edited'));
      return;
    }
    const editedCase: Case = JSON.parse(JSON.stringify(this.caseData));
    editedCase.tags = editedCase.tags || [];
    editedCase.assignedAnalystIds = editedCase.assignedAnalystIds || [];
    editedCase.comments = editedCase.comments || [];
    editedCase.linkedCases = editedCase.linkedCases || [];
    editedCase.closure = editedCase.closure ?? null;
    editedCase.entities = (editedCase.entities || []).map(entity => ensureEntityDefaults(entity));
    editedCase.artifacts = (editedCase.artifacts || []).map(artifact => ensureArtifactDefaults(artifact));
    editedCase.tasks = (editedCase.tasks || []).map(task => ensureTaskDefaults(task));
    ensurePrimaryEntity(editedCase);
    this.editedCase = editedCase;
    this.activeEditSection = section;
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.activeEditSection = null;
    this.editedCase = null;
    this.cancelAllSectionModes();
  }

  private patchArtifactFiles(artifactId: string, files: CaseArtifact['files']): void {
    if (this.editedCase?.artifacts) {
      this.editedCase = {
        ...this.editedCase,
        artifacts: this.editedCase.artifacts.map(artifact =>
          artifact.artifactId === artifactId
            ? { ...artifact, files }
            : artifact)
      };
    }

    if (this.caseData?.artifacts) {
      this.caseData = {
        ...this.caseData,
        artifacts: this.caseData.artifacts.map(artifact =>
          artifact.artifactId === artifactId
            ? { ...artifact, files }
            : artifact)
      };
    }

    this.cdr.detectChanges();
  }

  uploadArtifactFiles(artifact: CaseArtifact, fileInput: HTMLInputElement): void {
    if (!this.canManageCases()) {
      this.messageNotificationService.show(this.translate('Analysts cannot upload artifact files'));
      return;
    }
    if (!this.caseData || !artifact.artifactId) {
      return;
    }

    const files = Array.from(fileInput.files ?? []);

    if (!this.validateArtifactFiles(artifact, files, artifact.files?.length || 0)) {
      fileInput.value = '';
      return;
    }

    this.caseService.uploadArtifactFiles(this.caseData.caseId, artifact.artifactId, files).subscribe({
      next: uploaded => {
        const nextFiles = [
          ...(artifact.files || []),
          ...(uploaded.files || [])
        ];

        this.patchArtifactFiles(artifact.artifactId, nextFiles);

        fileInput.value = '';
        this.messageNotificationService.show(this.translate('Files uploaded successfully'), 'success');
      },
      error: err => {
        fileInput.value = '';
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('Failed to upload files'));
      }
    });
  }

  loadArtifactReports(source: string, q = ''): void {
    this.artifactReports = [];

    if (!source) {
      return;
    }

    this.isArtifactReportsLoading = true;

    this.caseService.getArtifactReports(source, q, 10).subscribe({
      next: reports => {
        this.artifactReports = reports || [];
        this.isArtifactReportsLoading = false;
      },
      error: err => {
        this.artifactReports = [];
        this.isArtifactReportsLoading = false;
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('Failed to load reports'));
      }
    });
  }

  searchArtifactReports(source: string, q: string): void {
    this.artifactReportSearchText = q;

    if (this.artifactReportSearchTimer) {
      clearTimeout(this.artifactReportSearchTimer);
    }

    if (!source) {
      this.artifactReports = [];
      return;
    }

    this.artifactReportSearchTimer = setTimeout(() => {
      this.loadArtifactReports(source, q);
    }, 500);
  }

  scheduleArtifactReportSearch(artifact: CaseArtifact): void {
    if (artifact?.type !== 'report' || !artifact.linkedReportSource) {
      return;
    }

    this.searchArtifactReports(artifact.linkedReportSource, artifact.title || '');
  }

  selectArtifactReport(artifact: CaseArtifact, report: ArtifactReportOption): void {
    artifact.linkedReportId = report.id;
    artifact.linkedReportTitle = report.title;

    this.artifactReportSearchText = report.title;
    this.isArtifactReportDropdownOpen = false;
  }

  clearArtifactReportSelection(artifact: CaseArtifact): void {
    artifact.linkedReportId = '';
    artifact.linkedReportTitle = '';

    this.artifactReportSearchText = '';
    this.isArtifactReportDropdownOpen = true;

    if (artifact.linkedReportSource) {
      this.loadArtifactReports(artifact.linkedReportSource, '');
    }
  }

  viewArtifactReport(artifact: CaseArtifact): void {
    const url = this.getArtifactReportViewUrl(artifact);

    if (!url) {
      this.messageNotificationService.show(this.translate('Report link is not available'));
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  private getArtifactReportViewUrl(artifact: CaseArtifact): string {
    if (!artifact.linkedReportSource || !artifact.linkedReportId) {
      return '';
    }

    const source = artifact.linkedReportSource;
    const reportId = encodeURIComponent(artifact.linkedReportId);

    const sourcePathMap: Record<string, { base: string; category: string }> = {
      strategic: { base: 'strategic', category: 'all' },
      breach: { base: 'breach', category: 'all' },
      defacement: { base: 'defacement', category: 'all' },
      social: { base: 'social', category: 'all' },
      feed: { base: 'feed', category: 'news' },
      exploit: { base: 'exploit', category: 'all' }
    };

    const config = getOwnProperty(sourcePathMap, source);

    if (!config) {
      return '';
    }

    const tree = this.router.createUrlTree([
      '/dashboard',
      config.base,
      config.category,
      reportId
    ]);

    return this.router.serializeUrl(tree);
  }

  downloadArtifactFile(artifact: CaseArtifact, fileId: string): void {
    if (!this.caseData || !artifact.artifactId) {
      return;
    }

    const artifactFile = (artifact.files || []).find(file => file.fileId === fileId);

    if (artifactFile && this.isArtifactFileIntegrityFailed(artifactFile)) {
      this.messageNotificationService.show(this.translate('File integrity check failed'));
      return;
    }

    this.http.get(`/api/profile/cases/${this.caseData.caseId}/artifacts/${artifact.artifactId}/files/${fileId}/download`,
      { responseType: 'blob' }).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = artifactFile?.fileName ?? 'artifact-file';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: err => {
        if (artifactFile) {
          artifactFile.integrityStatus = 'failed';
        }

        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('File integrity check failed'));
      }
    });
  }

  deleteArtifactFile(artifact: CaseArtifact, fileId: string): void {
    if (!this.canManageCases()) {
      this.messageNotificationService.show(this.translate('Analysts cannot delete artifact files'));
      return;
    }
    if (!this.caseData || !artifact.artifactId) {
      return;
    }

    this.caseService.deleteArtifactFile(this.caseData.caseId, artifact.artifactId, fileId).subscribe({
      next: () => {
        const nextFiles = (artifact.files || []).filter(file => file.fileId !== fileId);

        this.patchArtifactFiles(artifact.artifactId, nextFiles);

        this.messageNotificationService.show(this.translate('File deleted successfully'), 'success');
      },
      error: err => {
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('Failed to delete file'));
      }
    });
  }

  setPendingNewArtifactFiles(fileInput: HTMLInputElement): void {
    if (!this.newArtifact) {
      return;
    }

    const files = Array.from(fileInput.files ?? []);

    if (!files.length) {
      this.pendingNewArtifactFiles = [];
      this.pendingNewArtifactFileInput = null;
      return;
    }

    if (!this.validateArtifactFiles(this.newArtifact, files)) {
      fileInput.value = '';
      this.pendingNewArtifactFiles = [];
      this.pendingNewArtifactFileInput = null;
      return;
    }

    this.pendingNewArtifactFiles = files;
    this.pendingNewArtifactFileInput = fileInput;
  }

  getPendingNewArtifactFileNameRows(): string[] {
    return this.pendingNewArtifactFiles.map(file => file.name);
  }

  exportPdf(): void {
    if (!this.caseData || this.isPdfExporting) {
      return;
    }
    this.isPdfExporting = true;
    this.casePdfExportService.exportCaseReport(buildCasePdfReport(this.caseData, userId => this.getAnalystLabel(userId)), {
      filenameSuffix: 'case-report',
      reportLabel: 'Case Report'
    }).subscribe({
      next: () => {
        this.isPdfExporting = false;
      },
      error: err => {
        this.isPdfExporting = false;
        this.messageNotificationService.show(err?.message ?? this.translate('Failed to export PDF'));
      }
    });
  }

  openArchiveConfirmation(): void {
    if (!this.canManageCases()) {
      return;
    }
    if (!this.caseData?.closure || Boolean(this.caseData.isArchived) || this.isArchivingCase) {
      return;
    }

    this.isArchiveConfirmationOpen = true;
  }

  openUnarchiveConfirmation(): void {
    if (!this.canUnarchiveCases()) {
      return;
    }
    if (!this.caseData?.isArchived || this.isArchivingCase) {
      return;
    }

    this.isUnarchiveConfirmationOpen = true;
  }

  openShareConfirmation(): void {
    if (!this.canManageCases()) {
      return;
    }
    if (!this.caseData || this.isShareCreating) {
      return;
    }
    this.pendingShareAction = 'create';
  }

  openRevokeShareConfirmation(): void {
    if (!this.canManageCases()) {
      return;
    }
    if (!this.caseData || this.isShareRevoking) {
      return;
    }
    this.pendingShareAction = 'revoke';
  }

  handleShareConfirmation(confirmed: boolean): void {
    const action = this.pendingShareAction;
    this.pendingShareAction = null;
    if (!confirmed || !action) {
      return;
    }
    if (action === 'create') {
      this.shareCase();
      return;
    }
    this.revokeShareLinks();
  }

  getCaseDetailsJson(): string {
    return JSON.stringify(this.caseData);
  }

  getShareConfirmationMessage(): string {
    if (this.pendingShareAction === 'create') {
      return this.translate('Creating a share link will allow anyone with the link to access this case report until the link expires. Do you want to continue?');
    }
    if (this.pendingShareAction === 'revoke') {
      return this.translate('Revoking share links will expire all previously shared links for this case. Do you want to continue?');
    }
    return '';
  }

  archiveCase(confirmed: boolean): void {
    this.isArchiveConfirmationOpen = false;

    if (!confirmed || !this.caseData || this.isArchivingCase) {
      return;
    }

    this.isArchivingCase = true;

    this.caseService.archiveCase(this.caseData.caseId).subscribe({
      next: () => {
        this.isArchivingCase = false;
        if (this.caseData) {
          this.caseData.isArchived = true;
        }
        this.messageNotificationService.show(this.translate('Case archived successfully'), 'success');
      },
      error: err => {
        this.isArchivingCase = false;
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('Failed to archive case'));
      }
    });
  }

  unarchiveCase(confirmed: boolean): void {
    this.isUnarchiveConfirmationOpen = false;

    if (!confirmed || !this.caseData || this.isArchivingCase) {
      return;
    }

    this.isArchivingCase = true;

    this.caseService.unarchiveCase(this.caseData.caseId).subscribe({
      next: () => {
        this.isArchivingCase = false;
        if (this.caseData) {
          this.caseData.isArchived = false;
          this.caseData.archivedAt = undefined;
          this.caseData.archivedBy = '';
        }
        this.messageNotificationService.show(this.translate('Case unarchived successfully'), 'success');
      },
      error: err => {
        this.isArchivingCase = false;
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('Failed to unarchive case'));
      }
    });
  }

  private shareCase(): void {
    if (!this.caseData || this.isShareCreating) {
      return;
    }
    this.isShareCreating = true;
    this.caseService.createCaseShare(this.caseData.caseId, {
      expiresInHours: 168
    }).subscribe({
      next: share => {
        let shareUrl: string;
        try {
          shareUrl = new URL(share.path, window.location.origin).toString();
        }
        catch {
          shareUrl = share.path;
        }
        window.open(shareUrl, '_blank', 'noopener');
        this.isShareCreating = false;
      },
      error: err => {
        this.isShareCreating = false;
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('Failed to create share link'));
      }
    });
  }

  private revokeShareLinks(): void {
    if (!this.caseData || this.isShareRevoking) {
      return;
    }
    this.isShareRevoking = true;
    this.caseService.revokeCaseShares(this.caseData.caseId).subscribe({
      next: result => {
        this.isShareRevoking = false;
        this.messageNotificationService.show(this.translate('{count} share links revoked.').replace('{count}', String(result.revokedCount || 0)), 'success');
      },
      error: err => {
        this.isShareRevoking = false;
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('Failed to revoke share links'));
      }
    });
  }

  private cancelAllSectionModes(): void {
    this.isAddingRelatedEntity = false;
    this.isAddingArtifact = false;
    this.isAddingTask = false;
    this.isAddingLinkedCase = false;
    this.isClosingCase = false;

    this.newRelatedEntity = null;
    this.newArtifact = null;
    this.pendingNewArtifactFiles = [];
    this.pendingNewArtifactFileInput = null;
    this.newTask = null;
    this.newLinkedCase = null;
    this.newClosure = null;
  }

  get editablePrimaryEntity(): CaseEntity | null {
    if (!this.editedCase) {
      return null;
    }
    return ensurePrimaryEntity(this.editedCase);
  }

  getPrimaryEntity(caseItem: Case | null = this.caseData): CaseEntity | null {
    if (!caseItem?.entities?.length) {
      return null;
    }
    return caseItem.entities.find(entity => entity.entityId === caseItem.primaryEntityId)
      ?? caseItem.entities.find(entity => entity.role === 'primary')
      ?? caseItem.entities[0];
  }

  getRelatedEntities(caseItem: Case | null = this.caseData): CaseEntity[] {
    const primaryEntity = this.getPrimaryEntity(caseItem);
    return caseItem?.entities?.filter(entity => entity.entityId !== primaryEntity?.entityId) ?? [];
  }

  removeRelatedEntity(index: number): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.editedCase) {
      return;
    }

    const relatedEntity = getOwnProperty(this.getRelatedEntities(this.editedCase), index);

    if (!relatedEntity) {
      return;
    }

    this.editedCase.entities = this.editedCase.entities.filter(entity => entity.entityId !== relatedEntity.entityId);

    this.saveCasePayload(cleanCaseForSave(this.editedCase),
      'Related entity removed successfully');
  }

  removeArtifact(index: number): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.editedCase?.artifacts) {
      return;
    }

    this.editedCase.artifacts = this.editedCase.artifacts.filter((_, i) => i !== index);

    this.saveCasePayload(cleanCaseForSave(this.editedCase),
      'Artifact removed successfully');
  }

  removeTask(index: number): void {
    if (!this.editedCase?.tasks) {
      return;
    }

    this.editedCase.tasks = this.editedCase.tasks.filter((_, i) => i !== index);

    this.saveCasePayload(cleanCaseForSave(this.editedCase),
      'Task removed successfully');
  }

  removeLinkedCase(index: number): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.editedCase?.linkedCases) {
      return;
    }

    this.editedCase.linkedCases = this.editedCase.linkedCases.filter((_, i) => i !== index);

    this.saveCasePayload(cleanCaseForSave(this.editedCase),
      'Linked case removed successfully');
  }

  hasCaseChanged(): boolean {
    if (!this.editedCase || !this.caseData) {
      return false;
    }
    return this.getCaseSaveSignature(this.editedCase) !== this.getCaseSaveSignature(this.caseData);
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

  getCaseCommentsFeedback(): ReportFeedbackModel {
    return buildCaseCommentsFeedback(this.caseData, userId => this.getAnalystLabel(userId));
  }

  openAddRelatedEntity(): void {
    if (!this.canManageCases()) {
      return;
    }
    if (!this.caseData || this.isEditing) {
      return;
    }

    this.cancelAllSectionModes();
    this.isAddingRelatedEntity = true;
    this.newRelatedEntity = {
      ...structuredClone(DEFAULT_RELATED_CASE_ENTITY_TEMPLATE),
      entityId: createCaseId()
    };
  }

  openAddArtifact(): void {
    if (!this.canManageCases()) {
      return;
    }
    if (!this.caseData || this.isEditing) {
      return;
    }

    this.cancelAllSectionModes();
    this.isAddingArtifact = true;
    this.newArtifact = {
      ...structuredClone(DEFAULT_CASE_ARTIFACT_TEMPLATE),
      artifactId: createCaseId()
    };
  }

  openAddTask(): void {
    if (!this.canAddTasks()) {
      return;
    }

    if (!this.caseData || this.isEditing) {
      return;
    }

    this.cancelAllSectionModes();
    this.isAddingTask = true;
    this.newTask = {
      ...structuredClone(DEFAULT_CASE_TASK_TEMPLATE),
      taskId: createCaseId()
    };
  }

  openAddLinkedCase(): void {
    if (!this.canManageCases()) {
      return;
    }
    if (!this.caseData || this.isEditing || !this.hasLinkableCases(this.caseData)) {
      return;
    }

    this.cancelAllSectionModes();
    this.isAddingLinkedCase = true;
    this.newLinkedCase = {
      targetCaseId: '',
      relationship: 'related',
      reason: ''
    };
  }

  canCloseCase(): boolean {
    return this.caseData?.status === 'resolved';
  }

  getCloseCaseTooltip(): string {
    if (this.canCloseCase()) {
      return this.translate('Close case');
    }

    return this.translate('Case cannot be closed until it reaches Resolved status');
  }

  openCloseCase(): void {
    if (!this.canManageCases()) {
      return;
    }
    if (!this.caseData || this.isEditing || this.caseData.closure) {
      return;
    }

    if (!this.canCloseCase()) {
      this.messageNotificationService.show(this.translate('Case cannot be closed until it reaches Resolved status'));
      return;
    }

    this.cancelAllSectionModes();
    this.isClosingCase = true;
    this.newClosure = {
      reason: 'remediated',
      summary: '',
      resolution: ''
    };
  }

  openEditClosure(): void {
    if (!this.canManageCases()) {
      return;
    }
    if (!this.caseData || this.isEditing || !this.caseData.closure) {
      return;
    }

    this.cancelAllSectionModes();
    this.isClosingCase = true;
    this.newClosure = JSON.parse(JSON.stringify(this.caseData.closure));
  }

  cancelSectionMode(): void {
    this.cancelAllSectionModes();
  }

  private normalizeCaseCollections(updated: Case): void {
    updated.artifacts = updated.artifacts || [];
    updated.tasks = updated.tasks || [];
    updated.comments = updated.comments || [];
    updated.linkedCases = updated.linkedCases || [];
    updated.assignedAnalystIds = updated.assignedAnalystIds || [];
    updated.closure = updated.closure ?? null;
  }

  private saveCasePayload(payload: CaseUpdateRequest, successMessage: string): void {
    if (!this.caseData) {
      return;
    }

    this.caseService.updateCase(this.caseData.caseId, payload).subscribe({
      next: updated => {
        this.normalizeCaseCollections(updated);

        this.caseData = updated;
        this.isEditing = false;
        this.activeEditSection = null;
        this.editedCase = null;
        this.cancelAllSectionModes();

        this.messageNotificationService.show(this.translate(successMessage), 'success');
      },
      error: err => {
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('Failed to save changes'));
      }
    });
  }

  saveCaseDetails(): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.editedCase) {
      return;
    }

    if (!this.editedCase.title.trim()) {
      this.messageNotificationService.show(this.translate('Case title is required'));
      return;
    }

    if (!this.validateOtherValue(this.editedCase.caseType, this.editedCase.caseTypeOtherValue, 'Other case type is required')) {
      return;
    }
    if (!this.validateOtherValue(this.editedCase.intakeSource, this.editedCase.intakeSourceOtherValue, 'Other intake source is required')) {
      return;
    }

    this.saveCasePayload(cleanCaseForSave(this.editedCase), 'Case details updated successfully');
  }

  savePrimaryEntity(): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.editedCase) {
      return;
    }

    const primaryEntity = ensurePrimaryEntity(this.editedCase);

    if (!primaryEntity.value.trim()) {
      this.messageNotificationService.show(this.translate('Primary entity value is required'));
      return;
    }

    if (!this.validateOtherValue(primaryEntity.type, primaryEntity.entityTypeOtherValue, 'Other primary entity type is required')) {
      return;
    }
    if (!this.validateOtherValue(primaryEntity.source, primaryEntity.entitySourceOtherValue, 'Other primary entity source is required')) {
      return;
    }

    this.saveCasePayload(cleanCaseForSave(this.editedCase), 'Primary entity updated successfully');
  }

  saveRelatedEntities(): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.editedCase) {
      return;
    }

    const invalidIndex = this.getRelatedEntities(this.editedCase).findIndex(entity =>
      !entity.value.trim()
      || (entity.type === 'other' && !entity.entityTypeOtherValue?.trim())
      || (entity.source === 'other' && !entity.entitySourceOtherValue?.trim()));

    if (invalidIndex >= 0) {
      this.messageNotificationService.show(this.translate('Related entity {index} is invalid').replace('{index}', String(invalidIndex + 1)));
      return;
    }

    this.saveCasePayload(cleanCaseForSave(this.editedCase), 'Related entities updated successfully');
  }

  saveNewRelatedEntity(): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.caseData || !this.newRelatedEntity) {
      return;
    }

    if (!this.newRelatedEntity.value.trim()) {
      this.messageNotificationService.show(this.translate('Related entity value is required'));
      return;
    }

    if (!this.validateOtherValue(this.newRelatedEntity.type, this.newRelatedEntity.entityTypeOtherValue, 'Other related entity type is required')) {
      return;
    }
    if (!this.validateOtherValue(this.newRelatedEntity.source, this.newRelatedEntity.entitySourceOtherValue, 'Other related entity source is required')) {
      return;
    }

    const draft: Case = JSON.parse(JSON.stringify(this.caseData));
    draft.entities = draft.entities || [];
    draft.entities.push(ensureEntityDefaults(this.newRelatedEntity));

    this.saveCasePayload(cleanCaseForSave(draft), 'Related entity added successfully');
  }

  saveArtifacts(): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.editedCase) {
      return;
    }

    const invalidIndex = (this.editedCase.artifacts || []).findIndex(artifact =>
      !artifact.title.trim()
      || (artifact.type === 'other' && !artifact.artifactTypeOtherValue?.trim())
      || (artifact.source === 'other' && !artifact.artifactSourceOtherValue?.trim())
      || (artifact.type === 'report' && (!artifact.linkedReportSource || !artifact.linkedReportId)));

    if (invalidIndex >= 0) {
      this.messageNotificationService.show(this.translate('Artifact {index} is invalid').replace('{index}', String(invalidIndex + 1)));
      return;
    }

    this.saveCasePayload(cleanCaseForSave(this.editedCase), 'Artifacts updated successfully');
  }

  saveNewArtifact(): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.caseData || !this.newArtifact) {
      return;
    }

    if (!this.newArtifact.title.trim()) {
      this.messageNotificationService.show(this.translate('Artifact title is required'));
      return;
    }

    if (!this.validateOtherValue(this.newArtifact.type, this.newArtifact.artifactTypeOtherValue, 'Other artifact type is required')) {
      return;
    }

    if (!this.validateOtherValue(this.newArtifact.source, this.newArtifact.artifactSourceOtherValue, 'Other artifact source is required')) {
      return;
    }

    if (this.newArtifact.type === 'url_capture' && !this.newArtifact.url?.trim()) {
      this.messageNotificationService.show(this.translate('URL is required'));
      return;
    }

    if (this.newArtifact.type === 'report' && (!this.newArtifact.linkedReportSource || !this.newArtifact.linkedReportId)) {
      this.messageNotificationService.show(this.translate('Please select a report'));
      return;
    }

    if ((this.newArtifact.type === 'screenshot' || this.newArtifact.type === 'file') && !this.pendingNewArtifactFiles.length) {
      this.messageNotificationService.show(this.translate('Please select at least one file'));
      return;
    }

    const artifactToSave = ensureArtifactDefaults(this.newArtifact);
    const draft: Case = JSON.parse(JSON.stringify(this.caseData));
    draft.artifacts = [...(draft.artifacts || []), artifactToSave];

    const payload = cleanCaseForSave(draft);

    this.caseService.updateCase(this.caseData.caseId, payload).subscribe({
      next: updated => {
        this.normalizeCaseCollections(updated);

        this.caseData = updated;

        const savedArtifact = updated.artifacts.find(item => item.artifactId === artifactToSave.artifactId);

        if (savedArtifact && this.pendingNewArtifactFiles.length && (savedArtifact.type === 'screenshot' || savedArtifact.type === 'file')) {
          this.caseService.uploadArtifactFiles(updated.caseId, savedArtifact.artifactId, this.pendingNewArtifactFiles).subscribe({
            next: uploaded => {
              savedArtifact.files = uploaded.files || [];
              this.pendingNewArtifactFiles = [];

              if (this.pendingNewArtifactFileInput) {
                this.pendingNewArtifactFileInput.value = '';
              }

              this.pendingNewArtifactFileInput = null;
              this.cancelAllSectionModes();

              this.messageNotificationService.show(this.translate('Artifact added successfully'), 'success');
            },
            error: err => {
              this.pendingNewArtifactFiles = [];
              this.pendingNewArtifactFileInput = null;
              this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('Artifact saved, but file upload failed'));
            }
          });

          return;
        }

        this.pendingNewArtifactFiles = [];
        this.pendingNewArtifactFileInput = null;
        this.cancelAllSectionModes();

        this.messageNotificationService.show(this.translate('Artifact added successfully'), 'success');
      },
      error: err => {
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('Failed to add artifact'));
      }
    });
  }

  saveTasks(): void {
    if (!this.editedCase) {
      return;
    }

    const invalidIndex = (this.editedCase.tasks || []).findIndex(task => !task.title.trim());

    if (invalidIndex >= 0) {
      this.messageNotificationService.show(this.translate('Task {index} title is required').replace('{index}', String(invalidIndex + 1)));
      return;
    }

    if (!this.canManageCases()) {
      const originalTasks = new Map((this.caseData?.tasks ?? []).map(task => [task.taskId, task]));

      const invalidTask = (this.editedCase.tasks || []).find(task => {
        const originalTask = originalTasks.get(task.taskId);

        if (!originalTask) {
          return true;
        }

        const statusChanged = originalTask.status !== task.status;

        if (!statusChanged) {
          return false;
        }

        return !this.canEditTask(originalTask) || !this.isAnalystAllowedTaskStatus(task.status);
      });

      if (invalidTask) {
        this.messageNotificationService.show(this.translate('Analysts can only update their assigned task status to In Progress or Under Review'));
        return;
      }
    }

    this.saveCasePayload(cleanCaseForSave(this.editedCase), 'Tasks updated successfully');
  }

  saveNewTask(): void {
    if (!this.caseData || !this.newTask) {
      return;
    }

    if (!this.newTask.title.trim()) {
      this.messageNotificationService.show(this.translate('Task title is required'));
      return;
    }

    const draft: Case = JSON.parse(JSON.stringify(this.caseData));
    draft.tasks = [...(draft.tasks || []), ensureTaskDefaults(this.newTask)];

    this.saveCasePayload(cleanCaseForSave(draft), 'Task added successfully');
  }

  saveLinkedCases(): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.editedCase) {
      return;
    }

    const linkedCases = this.editedCase.linkedCases || [];

    const invalidIndex = linkedCases.findIndex(link => !link.targetCaseId);

    if (invalidIndex >= 0) {
      this.messageNotificationService.show(this.translate('Linked case {index} target case is required').replace('{index}', String(invalidIndex + 1)));
      return;
    }

    if (this.hasDuplicateLinkedCases(linkedCases)) {
      this.messageNotificationService.show(this.translate('Same case cannot be linked more than once'));
      return;
    }

    this.saveCasePayload(cleanCaseForSave(this.editedCase), 'Linked cases updated successfully');
  }

  saveNewLinkedCase(): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.caseData || !this.newLinkedCase) {
      return;
    }

    if (!this.newLinkedCase.targetCaseId) {
      this.messageNotificationService.show(this.translate('Target case is required'));
      return;
    }

    const alreadyLinked = (this.caseData.linkedCases || [])
      .some(link => link.targetCaseId === this.newLinkedCase?.targetCaseId);

    if (alreadyLinked) {
      this.messageNotificationService.show(this.translate('This case is already linked'));
      return;
    }

    const draft: Case = JSON.parse(JSON.stringify(this.caseData));
    draft.linkedCases = [...(draft.linkedCases || []), this.newLinkedCase];

    this.saveCasePayload(cleanCaseForSave(draft), 'Linked case added successfully');
  }

  saveClosure(): void {
    if (!this.requireManageCases()) {
      return;
    }
    if (!this.caseData || !this.newClosure) {
      return;
    }

    if (this.newClosure.reason === 'other' && !this.newClosure.closureReasonOtherValue?.trim()) {
      this.messageNotificationService.show(this.translate('Other closure reason is required'));
      return;
    }

    const draft: Case = JSON.parse(JSON.stringify(this.caseData));
    draft.status = 'closed';
    draft.closure = this.newClosure;

    this.saveCasePayload(cleanCaseForSave(draft), 'Case closed successfully');
  }

  saveCaseComment(body: string): void {
    if (!this.caseData || !body.trim()) {
      return;
    }
    this.isCommentSaving = true;
    this.commentErrorMessage = '';
    const comments: CaseCommentRequest[] = [
      ...(this.caseData.comments || []).map(comment => cleanComment(comment)),
      {
        commentId: createCaseId(),
        body: body.trim(),
        entityIds: [],
        artifactIds: []
      }
    ];
    const payload = {
      ...cleanCaseForSave(this.caseData),
      comments
    };
    this.caseService.updateCase(this.caseData.caseId, payload).subscribe({
      next: updated => {
        updated.comments = updated.comments || [];
        updated.linkedCases = updated.linkedCases || [];
        this.caseData = updated;
        this.isCommentSaving = false;
      },
      error: err => {
        this.isCommentSaving = false;
        this.commentErrorMessage = err?.error?.detail ?? err?.message ?? this.translate('Unable to save comment.');
      }
    });
  }

  getAnalystLabel(userId?: string): string {
    if (!userId) {
      return this.translate('Unassigned');
    }

    const analyst = [
      ...(this.analysts || []),
      ...(this.caseData?.assignedAnalysts ?? [])
    ].find(item => item.id === userId);

    if (!analyst) {
      return userId;
    }

    return analyst.username ?? analyst.email ?? analyst.id;
  }

  getCaseAnalysts(caseItem: Case | null = this.caseData): CaseAnalyst[] {
    if (caseItem?.assignedAnalysts?.length) {
      return caseItem.assignedAnalysts;
    }

    const assignedIds = new Set(caseItem?.assignedAnalystIds ?? []);
    return this.analysts.filter(analyst => assignedIds.has(analyst.id));
  }

  getFormattedDateTime(date?: Date | string | null): string {
    if (!date) {
      return '-';
    }
    return new Date(date).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  formatLabel(value?: string | null): string {
    if (!value) {
      return '-';
    }
    return value
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  goToLinkedCase(caseId: string): void {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { caseId },
      queryParamsHandling: 'merge'
    });

    window.open(this.router.serializeUrl(tree), '_blank', 'noopener');
  }

  formatConfidence(value?: string | null): string {
    return this.formatLabel(value ?? 'high');
  }

  private getCaseSaveSignature(caseItem: Case): string {
    return JSON.stringify(cleanCaseForSave(JSON.parse(JSON.stringify(caseItem))));
  }

  private setArtifactFileStatus(artifact: CaseArtifact, fileId: string, status: 'verified' | 'failed'): void {
    const file = artifact.files?.find(item => item.fileId === fileId);
    if (file) {
      file.integrityStatus = status;
    }
  }

  verifyArtifactFile(artifact: CaseArtifact, fileId: string): void {
    if (!this.canManageCases()) {
      this.messageNotificationService.show(this.translate('Analysts cannot verify artifact files'));
      return;
    }
    if (!this.caseData || !artifact.artifactId) {
      return;
    }

    this.caseService.verifyArtifactFile(this.caseData.caseId, artifact.artifactId, fileId).subscribe({
      next: result => {
        this.setArtifactFileStatus(artifact, fileId, result.status);
        this.messageNotificationService.show(this.translate(result.success ? 'File integrity verified' : 'File integrity check failed'),
          result.success ? 'success' : undefined);
      },
      error: err => {
        this.setArtifactFileStatus(artifact, fileId, 'failed');
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translate('File integrity check failed'));
      }
    });
  }

  isArtifactFileIntegrityFailed(artifactFile: CaseArtifactFile): boolean {
    return artifactFile.integrityStatus === 'failed';
  }

  getDisplayLabel(value?: string | null, otherValue?: string | null): string {
    if (value === 'other' && otherValue?.trim()) {
      return `Other: ${otherValue}`;
    }
    return this.formatLabel(value);
  }

  private validateOtherValue(value: string | undefined | null, otherValue: string | undefined | null, message: string): boolean {
    if (value === 'other' && !otherValue?.trim()) {
      this.messageNotificationService.show(this.translate(message));
      return false;
    }
    return true;
  }

  private hasDuplicateLinkedCases(linkedCases: { targetCaseId: string }[] = []): boolean {
    const selectedCaseIds = linkedCases
      .map(link => link.targetCaseId)
      .filter(Boolean);

    return new Set(selectedCaseIds).size !== selectedCaseIds.length;
  }

  private validateArtifactFiles(artifact: CaseArtifact, files: File[], existingFileCount = 0): boolean {
    if (!files.length) {
      return false;
    }

    if (existingFileCount + files.length > this.maxArtifactFiles) {
      this.messageNotificationService.show(this.translate('Maximum {count} files can be attached to an artifact').replace('{count}', String(this.maxArtifactFiles)));
      return false;
    }

    for (const file of files) {
      if (artifact.type === 'screenshot' && file.type !== 'image/png') {
        this.messageNotificationService.show(this.translate('Screenshots must be PNG images'));
        return false;
      }

      if (artifact.type === 'file' && !this.artifactAllowedFileTypes.includes(file.type)) {
        this.messageNotificationService.show(this.translate('Allowed file types: PDF, JPG, PNG, TXT, DOCX'));
        return false;
      }
    }

    return true;
  }

  private requireManageCases(): boolean {
    if (this.canManageCases()) {
      return true;
    }

    this.messageNotificationService.show(this.translate('Analysts can only edit tasks and comments'));
    return false;
  }
}
