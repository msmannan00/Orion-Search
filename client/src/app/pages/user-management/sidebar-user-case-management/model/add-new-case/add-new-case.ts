import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { Case, CaseEntity, CaseEntityRequest, CaseRequest, CaseTag } from '../case.model';
import { CASE_STATUS_OPTIONS, CASE_TAG_OPTIONS, CASE_TYPE_OPTIONS, DEFAULT_CASE_REQUEST_TEMPLATE, DEFAULT_PRIMARY_CASE_ENTITY_REQUEST_TEMPLATE, DEFAULT_PRIMARY_CASE_ENTITY_TEMPLATE, INTAKE_SOURCE_OPTIONS, PRIORITY_OPTIONS, SEVERITY_OPTIONS } from '../case-management.defaults';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EntityDetailsComponent } from '../entity-details/entity-details';
import { CaseManagement } from '../../case-management-service/case-management';
import { MessageNotificationService } from '../../../../../services/message_notification/message-notification.service';
import { CaseEditDrawerComponent } from '../case-details/case-edit-drawer/case-edit-drawer';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { setOwnProperty } from '../../../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-add-new-case',
  imports: [CommonModule, FormsModule, EntityDetailsComponent, CaseEditDrawerComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './add-new-case.html'
})
export class AddNewCase {
  validationErrors: Record<string, string> = {};
  caseTypeOptions = CASE_TYPE_OPTIONS;
  intakeSourceOptions = INTAKE_SOURCE_OPTIONS;
  statusOptions = CASE_STATUS_OPTIONS;
  severityOptions = SEVERITY_OPTIONS;
  priorityOptions = PRIORITY_OPTIONS;
  tagOptions: { value: CaseTag; label: string }[] = CASE_TAG_OPTIONS;
  primaryEntity: CaseEntity = structuredClone(DEFAULT_PRIMARY_CASE_ENTITY_TEMPLATE);
  caseForm: CaseRequest = structuredClone(DEFAULT_CASE_REQUEST_TEMPLATE);

  @Output() close = new EventEmitter<void>();
  @Output() caseAdded = new EventEmitter<Case>();

  constructor(private cdr: ChangeDetectorRef, private caseService: CaseManagement, private host: ElementRef<HTMLElement>, private messageNotificationService: MessageNotificationService, private translationService: TranslationService) { }

  ngOnInit(): void {
    this.generateCaseId();
  }

  generateCaseId(): void {
    this.caseService.getNextCaseId().subscribe({
      next: (res) => {
        this.caseForm.caseId = res.nextCaseId;
        delete this.validationErrors.caseId;
        this.cdr.detectChanges();
      },
      error: () => {
        this.validationErrors.caseId = 'Unable to generate Case ID. Please retry.';
        this.cdr.detectChanges();
      }
    });
  }

  closePopup(): void {
    this.close.emit();
  }

  toggleTag(tag: CaseTag): void {
    if (this.caseForm.tags.includes(tag)) {
      this.caseForm.tags = this.caseForm.tags.filter(item => item !== tag);
      return;
    }
    this.caseForm.tags = [...this.caseForm.tags, tag];
  }

  isTagSelected(tag: CaseTag): boolean {
    return this.caseForm.tags.includes(tag);
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector('.case-form-error')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    });
  }

  private validateOther(value: string | undefined | null, otherValue: string | undefined | null, key: string, message: string): void {
    if (value === 'other' && !otherValue?.trim()) {
      setOwnProperty(this.validationErrors, key, message);
    }
  }

  private cleanPrimaryEntity(): CaseEntityRequest {
    const entityId = this.primaryEntity.entityId || this.createId();
    const value = this.primaryEntity.value.trim();

    return {
      ...structuredClone(DEFAULT_PRIMARY_CASE_ENTITY_REQUEST_TEMPLATE),
      entityId,
      type: this.primaryEntity.type,
      value,
      entityDescription: this.primaryEntity.entityDescription?.trim() ?? value,
      confidence: this.primaryEntity.confidence,
      source: this.primaryEntity.source,
      entityTypeOtherValue: this.primaryEntity.entityTypeOtherValue?.trim() ?? '',
      entitySourceOtherValue: this.primaryEntity.entitySourceOtherValue?.trim() ?? '',
      identifiers: this.primaryEntity.identifiers
        .filter(identifier => identifier.type && identifier.value.trim())
        .map(identifier => ({
          ...identifier,
          value: identifier.value.trim(),
          issuer: identifier.issuer?.trim() ?? '',
          identifierTypeOtherValue: identifier.identifierTypeOtherValue?.trim() ?? ''
        })),
      socialProfiles: this.primaryEntity.socialProfiles
        .filter(profile => profile.platform && profile.username.trim())
        .map(profile => ({
          ...profile,
          username: profile.username.trim(),
          displayName: profile.displayName?.trim() ?? '',
          profileUrl: profile.profileUrl?.trim() ?? '',
          platformOtherValue: profile.platformOtherValue?.trim() ?? ''
        })),
      tags: this.primaryEntity.tags || []
    };
  }

  onSubmit(): void {
    this.validationErrors = {};

    if (!this.caseForm.title.trim()) {
      this.validationErrors.title = 'Case title is required';
    }

    if (!this.caseForm.caseId.trim()) {
      this.validationErrors.caseId = 'Case ID is required';
    }

    if (!this.primaryEntity.value.trim()) {
      this.validationErrors.entityValue = 'Primary entity value is required';
    }

    this.validateOther(this.caseForm.caseType, this.caseForm.caseTypeOtherValue, 'caseTypeOther', 'Other case type is required');
    this.validateOther(this.caseForm.intakeSource, this.caseForm.intakeSourceOtherValue, 'intakeSourceOther', 'Other intake source is required');
    this.validateOther(this.primaryEntity.type, this.primaryEntity.entityTypeOtherValue, 'entityTypeOther', 'Other entity type is required');
    this.validateOther(this.primaryEntity.source, this.primaryEntity.entitySourceOtherValue, 'entitySourceOther', 'Other entity source is required');

    const invalidIdentifier = this.primaryEntity.identifiers.find(identifier => {
      return (identifier.type && !identifier.value.trim())
        || (!identifier.type && identifier.value.trim())
        || (identifier.type === 'other' && !identifier.identifierTypeOtherValue?.trim());
    });

    if (invalidIdentifier) {
      this.validationErrors.identifier = 'Identifiers require type, value, and other value when type is Other';
    }

    const invalidSocialProfile = this.primaryEntity.socialProfiles.find(profile => {
      return (profile.platform && !profile.username.trim())
        || (!profile.platform && profile.username.trim())
        || (profile.platform === 'other' && !profile.platformOtherValue?.trim());
    });

    if (invalidSocialProfile) {
      this.validationErrors.socialProfile = 'Social profiles require platform, username, and other value when platform is Other';
    }

    if (Object.keys(this.validationErrors).length > 0) {
      this.scrollToFirstError();
      return;
    }

    const primaryEntity = this.cleanPrimaryEntity();

    const request: CaseRequest = {
      caseId: this.caseForm.caseId,
      title: this.caseForm.title.trim(),
      description: this.caseForm.description.trim(),
      caseType: this.caseForm.caseType,
      status: this.caseForm.status,
      severity: this.caseForm.severity,
      priority: this.caseForm.priority,
      intakeSource: this.caseForm.intakeSource,
      caseTypeOtherValue: this.caseForm.caseTypeOtherValue?.trim() ?? '',
      intakeSourceOtherValue: this.caseForm.intakeSourceOtherValue?.trim() ?? '',
      tags: this.caseForm.tags,
      primaryEntityId: primaryEntity.entityId,
      assignedAnalystIds: [],
      entities: [primaryEntity],
      artifacts: [],
      comments: [],
      tasks: [],
      linkedCases: []
    };

    this.caseService.createCase(request).subscribe({
      next: (savedCase) => {
        this.messageNotificationService.show(this.translationService.translate('Case added successfully'), 'success');
        this.caseAdded.emit(savedCase);
        this.closePopup();
      },
      error: (err) => {
        console.error('Failed to save case:', err);
        this.messageNotificationService.show(err?.error?.detail ?? err?.message ?? this.translationService.translate('Failed to save case'));
      }
    });
  }
}
