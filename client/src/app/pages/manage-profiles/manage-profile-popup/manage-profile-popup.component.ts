import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { UiDropdownComponent, UiDropdownOption } from '../../../shared/partials/ui-dropdown/ui-dropdown.component';
import { MessageNotificationService } from '../../../services/message_notification/message-notification.service';
import { ManageProfilesService } from '../manage-profiles.service';
import { PlatformEntry, SessionEntry, SocialPersona, SocialPersonaCreateRequest, SocialPlatform, SocialProfile, SocialProfileConnectRequest, SocialProfilePurpose } from '../model/manage-profiles.model';
import { CaseEditDrawerComponent } from '../../user-management/sidebar-user-case-management/model/case-details/case-edit-drawer/case-edit-drawer';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

export type ManageProfilePopupMode = 'persona' | 'profile';
export type ManageProfilePopupSaveEvent = 'persona' | 'profile';

@Component({
  selector: 'app-manage-profile-popup',
  standalone: true,
  imports: [FormsModule, UiDropdownComponent, CaseEditDrawerComponent, TranslatePipe],
  templateUrl: './manage-profile-popup.component.html',
})
export class ManageProfilePopupComponent {
  readonly mode = input.required<ManageProfilePopupMode>();
  readonly persona = input<SocialPersona | null>(null);
  readonly profile = input<SocialProfile | null>(null);
  readonly platforms = input<PlatformEntry[]>([]);
  readonly sessions = input<Record<string, SessionEntry[]>>({});
  readonly profiles = input<SocialProfile[]>([]);
  readonly closed = output<void>();
  readonly saved = output<ManageProfilePopupSaveEvent>();
  readonly sessionsRequested = output<void>();
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly personaForm = signal<SocialPersonaCreateRequest>({ name: '', age_group: '18-24', gender: 'unspecified', country: '', city: '', interests: [] });
  readonly profileForm = signal<SocialProfileConnectRequest>({ platform: '', session_id: '', profile_name: '', profile_username: '', purposes: [] });
  readonly ageGroups: UiDropdownOption[] = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map(value => ({ key: value, label: value }));
  readonly genders: UiDropdownOption[] = [{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }, { key: 'unspecified', label: 'Unspecified' }];
  readonly interests: UiDropdownOption[] = ['Animals', 'Comedy', 'Travel', 'Food', 'Sports', 'Beauty & Style', 'Art', 'Gaming', 'Science & Education', 'Dance', 'DIY', 'Auto', 'Music', 'Life Hacks', 'Oddly Satisfying', 'Outdoors', 'Fandom'].map(value => ({ key: value, label: value }));
  readonly purposes: UiDropdownOption[] = [{ key: 'posting', label: 'Posting' }, { key: 'ad_monitoring', label: 'Ad Monitoring' }, { key: 'hate_speech_monitoring', label: 'Hate Speech Monitoring' }];

  constructor(private service: ManageProfilesService, private notification: MessageNotificationService) {}

  ngOnInit(): void {
    const persona = this.persona();
    const profile = this.profile();
    if (persona) {
      this.personaForm.set({
        name: persona.name,
        age_group: persona.age_group,
        gender: persona.gender,
        country: persona.country || '',
        city: persona.city || '',
        interests: [...(persona.interests || []).slice(0, 3)],
      });
    }
    if (profile) {
      this.profileForm.set({
        platform: profile.platform,
        session_id: profile.session_id || '',
        profile_name: profile.profile_name || '',
        profile_username: profile.profile_username || '',
        purposes: [...(profile.purposes || [])],
      });
    }
  }

  close(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  save(): void {
    if (this.mode() === 'persona') {
      this.savePersona();
      return;
    }
    this.saveProfile();
  }

  onPersonaField(field: keyof SocialPersonaCreateRequest, value: string | string[]): void {
    this.personaForm.update(form => ({ ...form, [field]: value }));
  }

  onInterestChange(values: string[]): void {
    if (values.length > 3) {
      this.notification.show('You can select up to 3 interests');
    }
    this.personaForm.update(form => ({ ...form, interests: values.slice(0, 3) }));
  }

  onProfilePlatform(value: string | null): void {
    this.profileForm.update(form => ({ ...form, platform: this.safePlatform(value || '') as SocialPlatform, session_id: '' }));
  }

  onProfileSession(value: string | null): void {
    this.profileForm.update(form => ({ ...form, session_id: value || '' }));
  }

  onProfilePurposes(values: string[]): void {
    this.profileForm.update(form => ({ ...form, purposes: values as SocialProfilePurpose[] }));
  }

  platformOptions(): UiDropdownOption[] {
    return this.platforms()
      .map(entry => ({ key: this.safePlatform(entry.platform), label: entry.platform }))
      .filter((option, index, values) => !!option.key && values.findIndex(item => item.key === option.key) === index);
  }

  availableSessionOptions(): UiDropdownOption[] {
    const platform = this.profileForm().platform;
    if (!platform) {
      return [];
    }
    const currentProfileId = this.profile()?.profile_id || '';
    const used = new Set(this.profiles().filter(profile => profile.profile_id !== currentProfileId).map(profile => profile.session_id).filter(Boolean));
    return (this.sessions()[platform] || [])
      .filter(session => !used.has(session.id))
      .map(session => ({ key: session.id, label: `Session #${session.id.slice(0, 8)} - ${new Date(session.capturedAt).toLocaleString()}` }));
  }

  adultStatusLabel(): string {
    return this.personaForm().age_group === '13-17' ? 'Minor' : 'Adult';
  }

  selectedPlatformEmptyText(): string {
    const platform = this.profileForm().platform;
    return platform ? `No available ${this.platformLabel(platform)} sessions. Add a session first.` : 'Select a platform to view available sessions.';
  }

  title(): string {
    return this.mode() === 'persona' ? (this.persona() ? 'Edit Persona' : 'Add Persona') : (this.profile() ? 'Edit Profile' : 'Add Profile');
  }

  private savePersona(): void {
    const form = this.personaForm();
    if (!form.name.trim()) {
      this.formError.set('Persona name is required');
      return;
    }
    this.saving.set(true);
    const personaId = this.persona()?.persona_id || '';
    const request = personaId ? this.service.updatePersona(personaId, form) : this.service.createPersona(form);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.saved.emit('persona'),
      error: (error) => this.formError.set(error?.error?.detail || 'Failed to save persona'),
    });
  }

  private saveProfile(): void {
    const form = this.profileForm();
    if (!form.platform || !form.session_id) {
      this.formError.set('Select a platform and available session');
      return;
    }
    if ((form.purposes || []).length === 0) {
      this.formError.set('Select at least one action or purpose');
      return;
    }
    this.saving.set(true);
    const profileId = this.profile()?.profile_id || '';
    const request = profileId ? this.service.updateProfile(profileId, form) : this.service.connectProfile(form);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.saved.emit('profile'),
      error: (error) => this.formError.set(error?.error?.detail || 'Failed to save profile'),
    });
  }

  private safePlatform(platform: string): string {
    return platform.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private platformLabel(platform: string): string {
    return this.platforms().find(entry => this.safePlatform(entry.platform) === platform)?.platform || platform;
  }
}
