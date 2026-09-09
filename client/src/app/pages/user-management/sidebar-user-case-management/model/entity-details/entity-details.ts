import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdditionalIdentifier, CaseEntity, CaseTag, SocialMediaProfile } from '../case.model';
import { CASE_TAG_OPTIONS, ENTITY_ROLE_OPTIONS, ENTITY_TYPE_OPTIONS, IDENTIFIER_TYPE_OPTIONS, SOCIAL_PLATFORM_OPTIONS, SOURCE_TYPE_OPTIONS, ENTITY_CONFIDENCE_OPTIONS } from '../case-management.defaults';
import { TooltipDirective } from '../../../../../shared/directive/tooltip-directive.directive';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-entity-details',
  imports: [CommonModule, FormsModule, TooltipDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './entity-details.html'
})
export class EntityDetailsComponent implements OnChanges {
  private initialSocialProfileCount = 0;
  private initialIdentifierCount = 0;

  entityTypes = ENTITY_TYPE_OPTIONS;
  entityRoles = ENTITY_ROLE_OPTIONS;
  sourceTypes = SOURCE_TYPE_OPTIONS;
  socialMediaPlatforms = SOCIAL_PLATFORM_OPTIONS;
  identifierTypes = IDENTIFIER_TYPE_OPTIONS;
  tagOptions = CASE_TAG_OPTIONS;
  confidenceOptions = ENTITY_CONFIDENCE_OPTIONS;

  @Input() entity!: CaseEntity;
  @Input() isMainEntity = false;
  @Input() entityIndex = 0;
  @Input() entityValueError = '';
  @Input() showTitle = true;
  @Input() showTopDivider = true;
  @Input() showRoleRelationshipFields = true;
  @Input() linkableEntities: CaseEntity[] = [];
  @Input() allCaseEntities: CaseEntity[] = [];
  @Input() showInlineSaveButtons = true;

  @Output() remove = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.entity && this.entity) {
      this.entity.identifiers = this.entity.identifiers || [];
      this.entity.socialProfiles = this.entity.socialProfiles || [];
      this.entity.tags = this.entity.tags || [];

      this.initialSocialProfileCount = this.entity.socialProfiles.length;
      this.initialIdentifierCount = this.entity.identifiers.length;
    }
  }

  get controlPrefix(): string {
    return `${this.isMainEntity ? 'primary' : 'related'}-${this.entityIndex}`;
  }

  requiresOther(value?: string | null): boolean {
    return value === 'other';
  }

  getOtherError(value?: string | null, otherValue?: string | null): string | null {
    if (this.requiresOther(value) && !otherValue?.trim()) {
      return 'Other value is required';
    }
    return null;
  }

  getIdentifierError(identifier: AdditionalIdentifier): string | null {
    if (identifier.type && !identifier.value?.trim()) {
      return 'Value required';
    }

    if (!identifier.type && identifier.value?.trim()) {
      return 'Type required';
    }

    if (identifier.type === 'other' && !identifier.identifierTypeOtherValue?.trim()) {
      return 'Other identifier type is required';
    }

    if (identifier.type === 'email' && identifier.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.value)) {
      return 'Invalid email format';
    }

    if (identifier.type === 'url' && identifier.value) {
      try {
        new URL(identifier.value);
      }
      catch {
        return 'Invalid URL format';
      }
    }

    return null;
  }

  getSocialMediaError(profile: SocialMediaProfile): string | null {
    if (profile.platform && !profile.username?.trim()) {
      return 'Username required';
    }

    if (!profile.platform && profile.username?.trim()) {
      return 'Platform required';
    }

    if (profile.platform === 'other' && !profile.platformOtherValue?.trim()) {
      return 'Other platform is required';
    }

    if (profile.profileUrl) {
      try {
        new URL(profile.profileUrl);
      }
      catch {
        return 'Invalid URL format';
      }
    }

    return null;
  }

  getLinkedEntityLabel(entity: CaseEntity): string {
    const value = entity.value || entity.entityId;

    if (entity.role === 'primary') {
      return `Primary Entity - ${value}`;
    }

    const relatedEntities = this.allCaseEntities.filter(item => item.role !== 'primary');
    const realIndex = relatedEntities.findIndex(item => item.entityId === entity.entityId);

    return `Related Entity ${realIndex + 1} - ${value}`;
  }

  toggleTag(tag: CaseTag): void {
    this.entity.tags = this.entity.tags || [];

    if (this.entity.tags.includes(tag)) {
      this.entity.tags = this.entity.tags.filter(item => item !== tag);
      return;
    }

    this.entity.tags = [...this.entity.tags, tag];
  }

  isTagSelected(tag: CaseTag): boolean {
    return (this.entity.tags || []).includes(tag);
  }

  addSocialMedia(): void {
    this.entity.socialProfiles = this.entity.socialProfiles || [];
    this.entity.socialProfiles.push({
      platform: '',
      username: '',
      profileUrl: '',
      displayName: '',
      platformOtherValue: ''
    });
  }

  removeSocialMedia(index: number): void {
    this.entity.socialProfiles.splice(index, 1);
  }

  addIdentifier(): void {
    this.entity.identifiers = this.entity.identifiers || [];
    this.entity.identifiers.push({
      type: '',
      value: '',
      issuer: '',
      verified: false,
      identifierTypeOtherValue: ''
    });
  }

  removeIdentifier(index: number): void {
    this.entity.identifiers.splice(index, 1);
  }

  onSave(): void {
    this.save.emit();
  }

  hasSocialProfilesChanged(): boolean {
    return (this.entity.socialProfiles?.length || 0) !== this.initialSocialProfileCount;
  }

  hasIdentifiersChanged(): boolean {
    return (this.entity.identifiers?.length || 0) !== this.initialIdentifierCount;
  }

  onRemove(): void {
    this.remove.emit();
  }
}