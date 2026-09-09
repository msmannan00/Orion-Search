import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { exhaustMap } from 'rxjs/operators';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ManageProfilesExtensionState, ManageProfilesService } from './manage-profiles.service';
import { PlatformEntry, SessionEntry } from './model/manage-profiles.model';
import { SocialExtensionManagerComponent } from '../../shared/partials/extension-manager/extension-manager.component';
import { SocialIconComponent } from '../../shared/partials/social-icon/social-icon.component';
import { UiDropdownComponent, UiDropdownOption } from '../../shared/partials/ui-dropdown/ui-dropdown.component';
import { ConfirmationPopupComponent } from '../../shared/partials/confirmation-popup/confirmation-popup.component';

import { MessageNotificationService } from '../../services/message_notification/message-notification.service';
import { SocialPersona, SocialPlatform, SocialProfile } from './model/manage-profiles.model';
import { ManageProfilePopupComponent, ManageProfilePopupSaveEvent } from './manage-profile-popup/manage-profile-popup.component';
import { ManageProfileResultsComponent } from './manage-profile-results/manage-profile-results.component';

type ManageProfilesTab = 'personas' | 'sessions' | 'profiles' | 'assignments' | 'results';
type ModalMode = 'persona' | 'profile';

import type { PendingSessionDelete } from './model/manage-profiles.interfaces.model';
export type { PendingSessionDelete } from './model/manage-profiles.interfaces.model';




@Component({
  selector: 'app-manage-profiles',
  standalone: true,
  imports: [DatePipe, NgClass, TranslatePipe, SocialExtensionManagerComponent, SocialIconComponent, UiDropdownComponent, ConfirmationPopupComponent, ManageProfilePopupComponent, ManageProfileResultsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './manage-profiles.component.html',
  styleUrls: ['./manage-profiles.component.scss'],
})

export class ManageProfilesComponent {
  private readonly service = inject(ManageProfilesService);
  private readonly notification = inject(MessageNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<ManageProfilesTab>('sessions');
  readonly tabs: { key: ManageProfilesTab; label: string }[] = [ { key: 'sessions', label: 'Sessions' }, { key: 'personas', label: 'Personas' }, { key: 'profiles', label: 'Profiles' }, { key: 'assignments', label: 'Persona Assignments' }, { key: 'results', label: 'Results' }, ];
  readonly state = signal<ManageProfilesExtensionState | null>(null);
  readonly loading = signal(false);
  readonly socialLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal('');
  readonly platforms = signal<PlatformEntry[]>([]);
  readonly personas = signal<SocialPersona[]>([]);
  readonly profiles = signal<SocialProfile[]>([]);
  readonly shimmerRows = [1, 2, 3, 4, 5];
  readonly maxSessions = 10;
  readonly sessionFetching = signal<Set<string>>(new Set<string>());
  readonly sessionVerifying = signal<Set<string>>(new Set<string>());
  readonly sessions = signal<Record<string, SessionEntry[]>>({});
  readonly expanded = signal<Set<string>>(new Set<string>());
  readonly modalMode = signal<ModalMode | null>(null);
  readonly selectedPersona = signal<SocialPersona | null>(null);
  readonly selectedProfile = signal<SocialProfile | null>(null);
  readonly confirmationMessage = signal('');
  readonly confirmationAction = signal<'persona' | 'profile' | 'assignment' | ''>('');
  readonly assignmentPersonaId = signal('');
  readonly assignmentProfileId = signal('');
  readonly purposes: UiDropdownOption[] = [ { key: 'posting', label: 'Posting' }, { key: 'ad_monitoring', label: 'Ad Monitoring' }, { key: 'hate_speech_monitoring', label: 'Hate Speech Monitoring' }, ];
  readonly sessionPendingDelete = signal<PendingSessionDelete | null>(null);

  constructor() {
    this.loadSocialData();
    timer(0, 3000).pipe(exhaustMap(() => this.service.detectExtension()), takeUntilDestroyed(this.destroyRef)).subscribe(state => {
      const previous = this.state();
      this.state.set(state);
      if (state !== 'ready' && this.activeTab() !== 'sessions') {
        this.activeTab.set('sessions');
      }
      if (state === 'ready' && previous !== 'ready') {
        this.loadPlatforms();
        this.loadCapturedSessions();
      }
    });
  }

  setTab(tab: ManageProfilesTab): void {
    if (!this.canOpenTab(tab)) {
      return;
    }
    this.activeTab.set(tab);
    this.formError.set('');
  }

  canOpenTab(tab: ManageProfilesTab): boolean {
    return tab === 'sessions' || (this.state() === 'ready' && !this.loading() && !this.error());
  }

  editSession(entry: PlatformEntry, sessionId: string): void {
    this.fetchSession(entry, sessionId);
  }

  fetchSession(entry: PlatformEntry, sessionId = ''): void {
    if (this.sessionFetching().has(entry.platform)) {
      return;
    }
    if (!sessionId && this.sessionCount(entry.platform) >= this.maxSessions) {
      return;
    }
    this.sessionFetching.update(current => new Set(current).add(entry.platform));
    this.service.fetchSession(entry.platform, entry.base, sessionId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      this.sessionFetching.update(current => {
        const next = new Set(current);
        next.delete(entry.platform);
        return next;
      });
      if (result.error === 'session_limit') {
        // this.notification.show(`Maximum of ${this.maxSessions} sessions reached for ${entry.platform}`);
        this.loadCapturedSessions();
        return;
      }
      if (result.error) {
        this.notification.show(`Session fetch failed for ${entry.platform}.`);
        return;
      }
      this.expanded.update(current => new Set(current).add(this.safePlatform(entry.platform)));
      this.loadCapturedSessions();
      this.notification.show(`Session data for ${entry.platform} was fetched successfully.`, 'success');
    });
  }

  isVerifying(sessionId: string): boolean {
    return this.sessionVerifying().has(sessionId);
  }

  verifySession(entry: PlatformEntry, sessionId: string): void {
    if (this.sessionVerifying().has(sessionId)) {
      return;
    }
    this.sessionVerifying.update(current => new Set(current).add(sessionId));
    this.service.verifySession(entry.platform, entry.base, sessionId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.sessionVerifying.update(current => {
        const next = new Set(current);
        next.delete(sessionId);
        return next;
      });
      this.loadCapturedSessions();
    });
  }

  safePlatform(platform: string): string {
    return platform.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  sessionsFor(platform: string): SessionEntry[] {
    return this.sessions()[this.safePlatform(platform)] ?? [];
  }

  sessionCount(platform: string): number {
    return this.sessionsFor(platform).length;
  }

  unverifiedSessionCount(platform: string): number {
    return this.sessionsFor(platform).filter(session => !session.verified).length;
  }

  sessionStatus(session: SessionEntry): 'verified' | 'failed' | 'pending' {
    if (session.verified) {
      return 'verified';
    }
    return session.verifiedAt ? 'failed' : 'pending';
  }

  platformStatus(platform: string): 'verified' | 'failed' | 'pending' {
    const sessions = this.sessionsFor(platform);
    if (sessions.some(session => this.sessionStatus(session) === 'failed')) {
      return 'failed';
    }
    if (sessions.some(session => this.sessionStatus(session) === 'verified')) {
      return 'verified';
    }
    return 'pending';
  }

  isExpanded(platform: string): boolean {
    return this.expanded().has(this.safePlatform(platform));
  }

  toggleRow(entry: PlatformEntry, event?: Event): void {
    if (this.sessionCount(entry.platform) <= 0) {
      return;
    }
    event?.preventDefault();
    this.toggleExpand(entry.platform);
  }

  toggleExpand(platform: string): void {
    const key = this.safePlatform(platform);
    this.expanded.update(current => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  requestDeleteSession(platform: string, sessionId: string): void {
    this.sessionPendingDelete.set({ platform, sessionId });
  }

  deleteConfirmationMessage(sessionId: string): string {
    const profiles = this.profiles().filter(profile => profile.session_id === sessionId);
    if (profiles.length) {
      return `Delete Session #${sessionId.slice(0, 8)}? This session is used by ${profiles.length} profile${profiles.length === 1 ? '' : 's'}. Deleting it will remove the session from those profiles and mark them disconnected.`;
    }
    return `Delete Session #${sessionId.slice(0, 8)}? This action cannot be undone.`;
  }

  handleDeleteConfirmation(confirmed: boolean): void {
    const pending = this.sessionPendingDelete();
    this.sessionPendingDelete.set(null);
    if (confirmed && pending) {
      this.deleteSession(pending.platform, pending.sessionId);
    }
  }

  deleteSession(platform: string, sessionId: string): void {
    this.service.deleteSession(platform, sessionId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadCapturedSessions();

      this.loadSocialData();
      this.notification.show('Session deleted successfully', 'success');
    });
  }

  openPersonaModal(persona?: SocialPersona): void {
    this.formError.set('');
    this.selectedPersona.set(persona ?? null);
    this.selectedProfile.set(null);
    this.modalMode.set('persona');
  }

  openProfileModal(profile?: SocialProfile): void {
    this.formError.set('');
    this.selectedProfile.set(profile ?? null);
    this.selectedPersona.set(null);
    this.modalMode.set('profile');
  }

  closeModal(): void {
    this.modalMode.set(null);
    this.selectedPersona.set(null);
    this.selectedProfile.set(null);
    this.formError.set('');
  }

  onPopupSaved(event: ManageProfilePopupSaveEvent): void {
    this.notification.show(event === 'persona' ? 'Persona saved successfully' : 'Profile saved successfully', 'success');
    this.closeModal();
    this.loadSocialData();
  }

  deletePersona(persona: SocialPersona): void {
    this.selectedPersona.set(persona);
    this.selectedProfile.set(null);
    this.confirmationAction.set('persona');
    const profiles = this.profiles().filter(profile => profile.assigned_persona_id === persona.persona_id);
    if (profiles.length) {
      this.confirmationMessage.set(`Delete persona "${persona.name}"? This persona is assigned to ${profiles.length} profile${profiles.length === 1 ? '' : 's'}. Deleting it will remove those assignments.`);
      return;
    }
    this.confirmationMessage.set(`Are you sure you want to delete persona "${persona.name}"?`);
  }

  deleteProfile(profile: SocialProfile): void {
    this.selectedProfile.set(profile);
    this.selectedPersona.set(null);
    this.confirmationAction.set('profile');
    this.confirmationMessage.set('Are you sure you want to delete this profile?');
  }

  confirmAction(confirmed: boolean): void {
    const action = this.confirmationAction();
    this.confirmationAction.set('');
    if (!confirmed) {
      return;
    }
    if (action === 'persona' && this.selectedPersona()) {
      this.service.deletePersona(this.selectedPersona()!.persona_id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notification.show('Persona deleted successfully', 'success');
          this.loadSocialData();
        },
        error: (error) => {
          this.notification.show(error?.error?.detail ?? 'Failed to delete persona');
        },
      });
    }
    if (action === 'profile' && this.selectedProfile()) {
      this.service.deleteProfile(this.selectedProfile()!.profile_id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notification.show('Profile deleted successfully', 'success');
          this.loadSocialData();
        },
        error: (error) => {
          this.notification.show(error?.error?.detail ?? 'Failed to delete profile');
        },
      });
    }
    if (action === 'assignment' && this.selectedProfile()) {
      this.service.removeAssignment(this.selectedProfile()!.profile_id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notification.show('Assignment removed successfully', 'success');
          this.loadSocialData();
        },
        error: (error) => {
          this.notification.show(error?.error?.detail ?? 'Failed to remove assignment');
        },
      });
    }
  }

  assignProfile(): void {
    if (!this.assignmentPersonaId() || !this.assignmentProfileId()) {
      this.formError.set('Select a persona and profile');
      return;
    }
    const profile = this.profiles().find(item => item.profile_id === this.assignmentProfileId());
    if (profile && this.hasPlatformAssignment(this.assignmentPersonaId(), profile.platform, profile.profile_id)) {
      this.formError.set('This persona is already assigned to a profile on the selected platform');
      return;
    }
    this.service.assignProfile({ persona_id: this.assignmentPersonaId(), profile_id: this.assignmentProfileId() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.formError.set('');
        this.assignmentPersonaId.set('');
        this.assignmentProfileId.set('');
        this.notification.show('Persona assigned successfully', 'success');
        this.loadSocialData();
      },
      error: (error) => {
        this.formError.set(error?.error?.detail ?? 'Failed to assign persona');
      },
    });
  }

  removeAssignment(profile: SocialProfile): void {
    this.selectedProfile.set(profile);
    this.confirmationAction.set('assignment');
    this.confirmationMessage.set('Are you sure you want to remove this assignment?');
  }

  personaOptions(): UiDropdownOption[] {
    return this.personas().map(persona => ({ key: persona.persona_id, label: persona.name }));
  }

  assignmentProfileOptions(): UiDropdownOption[] {
    return this.profiles().map(profile => ({ key: profile.profile_id, label: `${this.platformLabel(profile.platform)} - ${profile.profile_name ?? profile.profile_username ?? 'Profile'}` }));
  }

  personaName(personaId?: string | null): string {
    return this.personas().find(persona => persona.persona_id === personaId)?.name ?? 'Unassigned';
  }

  platformLabel(platform?: string | null): string {
    const entry = this.platforms().find(item => this.safePlatform(item.platform) === this.safePlatform(platform ?? ''));
    return entry?.platform ?? (platform === 'x' ? 'Twitter/X' : platform === 'facebook' ? 'Facebook' : (platform ?? 'Unknown'));
  }

  purposeLabel(purpose: string): string {
    return this.purposes.find(item => item.key === purpose)?.label ?? purpose.replace(/_/g, ' ');
  }

  statusLabel(value?: string | null): string {
    return (value ?? '').replace(/_/g, ' ') ?? 'Unknown';
  }

  private loadSocialData(): void {
    this.socialLoading.set(true);
    this.service.getPersonas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.personas.set(response?.personas ?? []);
      },
      error: (error) => {
        this.formError.set(error?.error?.detail ?? 'Failed to load personas');
      },
    });
    this.service.getProfiles().pipe(finalize(() => {
      this.socialLoading.set(false);
    }), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.profiles.set(response?.profiles ?? []);
      },
      error: (error) => {
        this.formError.set(error?.error?.detail ?? 'Failed to load profiles');
      },
    });
  }

  private loadCapturedSessions(): void {
    this.service.loadCapturedSessions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(sessions => {
      this.sessions.set(sessions);
    });
  }

  private loadPlatforms(): void {
    if (this.loading() || this.platforms().length > 0) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.service.fetchPlatforms().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      this.loading.set(false);
      if (result.error) {
        this.error.set(result.error);
        return;
      }
      this.platforms.set(result.items);
    });
  }

  private hasPlatformAssignment(personaId: string, platform: SocialPlatform, ignoredProfileId = ''): boolean {
    return this.profiles().some(profile => profile.profile_id !== ignoredProfileId && profile.assigned_persona_id === personaId && profile.platform === platform);
  }
}
