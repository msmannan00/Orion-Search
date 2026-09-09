import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Job, social_profile } from './models/social.models';
import { ManageProfilesModalData } from './models/social-usability.models';
import type { FeedUser, NotificationData } from './models/social-usability.models';
import { HomeMenuComponent } from './home-menu/home-menu.component';
import { SocialProfileListingComponent } from './profile-listing/profile-listing.component';
import { SocialUserGraphComponent } from './user-graph/social-user-graph.component';
import { NotificationBarComponent } from './notification-bar/notification-bar.component';
import { SocialService } from './services/social.service';
import { SocialStorageService } from './services/social-storage.service';
import { ConfirmationPopupComponent } from '../../shared/partials/confirmation-popup/confirmation-popup.component';
import { getFirstFileFromInputEvent, readFileAsDataUrl } from '../../shared/utils/file-input.util';
import { ProfileComponent } from '../../shared/partials/profile/profile.component';
import { ManageProfilesModalComponent } from './profile-popups/manage-profiles-modal/manage-profiles-modal.component';
import type { SocialResultSource } from './enums/social-graph.enums';
import { SocialBreadcrumbComponent } from './breadcrumb/social-breadcrumb.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { getInputValue } from '../../shared/utils/event-input.util';
import { getOwnProperty } from '../../shared/utils/type-guards.util';


@Component({
  selector: 'app-social-graph',
  templateUrl: './social-mapper.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    HomeMenuComponent,
    SocialProfileListingComponent,
    SocialUserGraphComponent,
    ConfirmationPopupComponent,
    NotificationBarComponent,
    ProfileComponent,
    ManageProfilesModalComponent,
    SocialBreadcrumbComponent,
    NgClass,
    TranslatePipe
  ]
})
export class SocialMapperComponent {
  private readonly socialService = inject(SocialService);
  private readonly storageService = inject(SocialStorageService);
  private readonly router = inject(Router);
  private readonly sidebarState = this.storageService.state;
  private readonly profilesState = this.storageService.state;
  private notificationTimeout: ReturnType<typeof setTimeout> | undefined;

  activeUsername = this.storageService.activeUsername;
  homeMenuSearchTerm = this.sidebarState.homeMenuSearchTerm;
  jobs = this.sidebarState.jobs;
  loadingUsernames = this.sidebarState.loadingUsernames;
  scanResults = this.profilesState.scanResults;
  resultUsernames = computed(() => new Set([
    ...Array.from(this.scanResults().keys()),
    ...this.jobs().filter(job => job.status === 'completed').map(job => job.id)
  ]));
  isHomeMenuCollapsed = this.sidebarState.isHomeMenuCollapsed;
  isInitialLoading = signal(true);
  graphView = signal(false);
  graphUsernames = signal<string[]>([]);
  notification = signal<NotificationData | null>(null);
  deleteConfirmationMessage = signal<string | null>(null);
  deleteUsername = signal<string | null>(null);
  manageProfilesModalData = signal<ManageProfilesModalData | null>(null);
  highlightedNodeId = signal<string | null>(null);
  profileBreadcrumbLabel = signal<string | null>(null);
  activeResultSources = signal<Record<string, SocialResultSource>>({});
  activeSourcePlatforms = computed(() => {
    const username = this.activeUsername();
    if (!username) {
      return [];
    }
    const results = this.scanResults();
    const platforms = results.get(username) ?? Array.from(results.entries()).find(([key]) => key.toLowerCase() === username.toLowerCase())?.[1] ?? [];
    return this.getVisiblePlatforms(username, platforms);
  });
  hasResultSourceTabs = computed(() => this.activeSourcePlatforms().some(platform => this.getResultSource(platform) === 'darkweb'));
  activeResultSource = computed(() => {
    const username = this.activeUsername();
    const platforms = this.activeSourcePlatforms();
    const preferred = username ? getOwnProperty(this.activeResultSources(), username) ?? 'normal' : 'normal';
    if (platforms.some(platform => this.getResultSource(platform) === preferred)) {
      return preferred;
    }
    return platforms.some(platform => this.getResultSource(platform) === 'normal') ? 'normal' : 'darkweb';
  });
  imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');
  profileListing = viewChild(SocialProfileListingComponent);

  constructor(private destroyRef: DestroyRef) {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.notificationTimeout);
    });
    this.storageService.loadProfiles().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      this.isInitialLoading.set(false);
      this.resumeIncompleteScans();
    })).subscribe();
    this.storageService.loadGraphUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(usernames => {
      if (usernames.length && !this.graphUsernames().length) {
        this.graphUsernames.set(usernames);
      }
    });
  }

  onHomeMenuSearchChanged(term: string): void {
    this.sidebarState.homeMenuSearchTerm.set(term);
  }

  onDashboardScanInput(event: Event): void {
    const nextValue = getInputValue(event);
    this.onHomeMenuSearchChanged(nextValue);
  }

  onHomeMenuToggled(): void {
    this.sidebarState.isHomeMenuCollapsed.update(value => !value);
  }

  setResultSource(source: SocialResultSource): void {
    const username = this.activeUsername();
    if (!username) {
      return;
    }
    const nextSource: SocialResultSource = this.activeResultSource() === source ? (source === 'normal' ? 'darkweb' : 'normal') : source;
    if (this.getResultSourceCount(nextSource) === 0) {
      return;
    }
    this.activeResultSources.update(current => ({ ...current, [username]: nextSource }));
    this.profileListing()?.clearProfileOverview();
  }

  getResultSourceCount(source: SocialResultSource): number {
    return this.activeSourcePlatforms().filter(platform => this.getResultSource(platform) === source).length;
  }

  triggerScan(): void {
    let username = this.homeMenuSearchTerm().trim();
    if (username.startsWith('@')) {
      username = username.substring(1);
    }
    if (username) {
      if (!this.socialService.initiateScan(username, this.destroyRef)) {
        this.showScanInProgressNotification();
      }
      this.sidebarState.homeMenuSearchTerm.set('');
    }
  }

  triggerImageUpload(): void {
    this.imageInput()?.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const selected = getFirstFileFromInputEvent(event);
    if (!selected) {
      return;
    }
    const { input, file } = selected;
    void readFileAsDataUrl(file)
      .then((dataUrl) => {
        const base64Image = dataUrl.split(',')[1];
        if (base64Image) {
          this.initiateImageScan(base64Image, file.name);
        }
      })
      .finally(() => {
        input.value = '';
      });
  }

  confirmDeletion(): void {
    const usernameToDelete = this.deleteUsername();
    if (usernameToDelete) {
      this.profileListing()?.cancelAllFetchesForUser(usernameToDelete);
      this.removeUserScanData(usernameToDelete);
      this.storageService.deleteProfiles(usernameToDelete).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
    this.closeDeleteConfirmation();
  }

  onDeleteConfirmation(confirmed: boolean): void {
    if (confirmed) {
      this.confirmDeletion();
      return;
    }
    this.closeDeleteConfirmation();
  }

  handleCompletedJobClick(job: Job): void {
    if (this.graphView()) {
      this.sidebarState.activeUsername.set(job.id);
      this.addGraphUser(job.id);
      return;
    }
    if (job.status !== 'completed') {
      return;
    }
    this.profileListing()?.clearProfileOverview();
    this.sidebarState.activeUsername.set(job.id);
  }

  toggleGraphView(): void {
    const next = !this.graphView();
    if (next) {
      const active = this.activeUsername();
      if (active && !this.graphUsernames().length) {
        this.graphUsernames.set([active]);
      }
    }
    this.graphView.set(next);
  }

  addGraphUser(username: string): void {
    const handle = username.trim().replace(/^@+/, '').toLowerCase();
    if (!handle || this.graphUsernames().includes(handle)) {
      return;
    }
    this.setGraphUsers([...this.graphUsernames(), handle]);
  }

  onGraphUsernamesChange(usernames: string[]): void {
    this.setGraphUsers(usernames);
    const last = usernames[usernames.length - 1];
    if (last) {
      this.sidebarState.activeUsername.set(last);
    }
  }

  private setGraphUsers(usernames: string[]): void {
    this.graphUsernames.set(usernames);
    this.storageService.saveGraphUsers(usernames).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  private initiateScan(username: string): void {
    if (!this.socialService.initiateScan(username, this.destroyRef)) {
      this.showScanInProgressNotification();
    }
  }

  private initiateImageScan(base64Image: string, fileName: string): void {
    this.socialService.initiateImageScan(base64Image, fileName, this.destroyRef);
  }

  cancelScan(jobId: string): void {
    this.socialService.cancelScan(jobId, this.destroyRef);
  }

  retryScan(job: Job): void {
    this.initiateScan(job.id);
  }

  private resumeIncompleteScans(): void {
    this.socialService.resumeIncompleteScans(this.destroyRef);
  }

  private removeUserScanData(username: string): void {
    this.sidebarState.jobs.update(currentJobs => currentJobs.filter(job => job.id !== username));
    this.profilesState.scanResults.update(currentMap => {
      const newMap = new Map(currentMap);
      for (const key of newMap.keys()) {
        if (key === username) {
          newMap.delete(key);
        }
      }
      return newMap;
    });
    this.profilesState.profileConfigs.update(currentMap => {
      const newMap = new Map(currentMap);
      for (const key of newMap.keys()) {
        if (key.toLowerCase() === username.toLowerCase()) {
          newMap.delete(key);
        }
      }
      return newMap;
    });
    this.sidebarState.activeUsername.set(Array.from(this.profilesState.scanResults().keys())[0] ?? null);
  }

  onStopFetches(username: string): void {
    this.profileListing()?.stopUserFetches(username);
  }

  openNewProfilePage(): void {
    window.open('/dashboard/manage-profiles', '_blank', 'noopener');
  }

  openDeleteConfirmation(username: string): void {
    const job = this.jobs().find(currentJob => currentJob.id === username);
    this.deleteUsername.set(username);
    this.deleteConfirmationMessage.set(`Are you sure you want to delete the profile for ${job?.id ?? username}? This will remove all associated data and cannot be undone.`);
  }

  closeDeleteConfirmation(): void {
    this.deleteConfirmationMessage.set(null);
    this.deleteUsername.set(null);
  }

  openManageProfiles(user: FeedUser): void {
    const results = this.profilesState.scanResults().get(user.username);
    if (!results) {
      return;
    }
    const owner = user.username;
    this.manageProfilesModalData.set({ username: owner, platforms: results, config: this.storageService.getProfileConfig(owner) });
  }

  closeManageProfilesModal(): void {
    this.manageProfilesModalData.set(null);
  }

  updateProfilesFromModal(selectedPlatforms: social_profile[]): void {
    const modalData = this.manageProfilesModalData();
    if (!modalData) {
      return;
    }
    const config = this.storageService.setSelection(modalData.username, selectedPlatforms);
    this.storageService.saveProfileConfig(modalData.username, config)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
    this.closeManageProfilesModal();
  }

  handleImageFlowSearch(username: string): void {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      return;
    }
    this.closeManageProfilesModal();
    this.initiateScan(normalizedUsername);
  }

  onSidebarPlatformClicked(elementId: string): void {
    this.highlightedNodeId.set(elementId);
    setTimeout(() => {
      if (this.highlightedNodeId() === elementId) {
        this.highlightedNodeId.set(null);
      }
    }, 3500);

    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onHeaderBack(): void {
    const profileListing = this.profileListing();
    if (profileListing?.hasOpenProfileOverview()) {
      profileListing.clearProfileOverview();
      return;
    }
    void this.router.navigate(['/dashboard/home']);
  }

  onProfileOverviewLabelChanged(label: string | null): void {
    this.profileBreadcrumbLabel.set(label);
  }

  protected showScanInProgressNotification(): void {
    clearTimeout(this.notificationTimeout);
    this.notification.set({
      message: 'A scan for this user is already in progress.',
      icon: 'bi bi-hourglass-split',
      style: 'bg-orange-500/90 text-white border border-orange-400',
    });
    this.notificationTimeout = setTimeout(() => {
      this.notification.set(null);
    }, 3000);
  }

  private getResultSource(platformData: social_profile): SocialResultSource {
    const platform = String(platformData?.meta?.platform ?? '').toLowerCase();
    const kind = `${platformData?.meta?.entity_type ?? ''} ${platformData?.meta?.target_type ?? ''}`.toLowerCase();
    const darkweb = ['forum', 'telegram', 'discord', 'chat', 'darkweb', 'dark_web', 'onion', 'paste', 'leak'];
    return darkweb.some(key => platform.includes(key)) || kind.includes('dark') || kind.includes('forum') ? 'darkweb' : 'normal';
  }

  private getVisiblePlatforms(ownerUsername: string, platforms: social_profile[]): social_profile[] {
    return platforms.filter(platform => this.storageService.isSelected(ownerUsername, platform));
  }
}
