import { Component, input, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { finalize } from 'rxjs';
import { UiDropdownComponent, UiDropdownOption } from '../../../shared/partials/ui-dropdown/ui-dropdown.component';
import { MessageNotificationService } from '../../../services/message_notification/message-notification.service';
import { ManageProfilesService } from '../manage-profiles.service';
import { PlatformEntry, SocialAdDetectionResult, SocialPostResult, SocialProfile } from '../model/manage-profiles.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

export type ManageProfileResultsActivity = 'ad_detection' | 'posting' | 'hate_speech';

@Component({
  selector: 'app-manage-profile-results',
  standalone: true,
  imports: [DatePipe, NgClass, UiDropdownComponent, TranslatePipe],
  templateUrl: './manage-profile-results.component.html',
})
export class ManageProfileResultsComponent {
  readonly profiles = input<SocialProfile[]>([]);
  readonly platforms = input<PlatformEntry[]>([]);
  readonly activities: { key: ManageProfileResultsActivity; label: string }[] = [{ key: 'ad_detection', label: 'Ad Detection' }, { key: 'posting', label: 'Posting' }, { key: 'hate_speech', label: 'Hate Speech' }];
  readonly activeActivity = signal<ManageProfileResultsActivity>('ad_detection');
  readonly resultsProfileId = signal('');
  readonly resultsLoading = signal(false);
  readonly adDetectionResults = signal<SocialAdDetectionResult[]>([]);
  readonly postResults = signal<SocialPostResult[]>([]);
  readonly expandedResults = signal<Set<string>>(new Set<string>());
  readonly shimmerRows = [1, 2, 3, 4, 5];

  constructor(private service: ManageProfilesService, private notification: MessageNotificationService) {}

  selectResultsProfile(profileId: string): void {
    this.resultsProfileId.set(profileId);
    this.adDetectionResults.set([]);
    this.postResults.set([]);
    this.expandedResults.set(new Set<string>());
    if (!profileId) {
      return;
    }
    this.resultsLoading.set(true);
    this.service.getProfileResults(profileId).pipe(finalize(() => this.resultsLoading.set(false))).subscribe({
      next: (response) => {
        this.adDetectionResults.set(response?.ad_detection_results || []);
        this.postResults.set(response?.post_results || []);
      },
      error: (error) => this.notification.show(error?.error?.detail || 'Failed to load results'),
    });
  }

  setActivity(activity: ManageProfileResultsActivity): void {
    this.activeActivity.set(activity);
  }

  resultsProfileOptions(): UiDropdownOption[] {
    return this.profiles().map(profile => ({ key: profile.profile_id, label: `${this.platformLabel(profile.platform)} - ${profile.profile_name || profile.profile_username || 'Profile'}` }));
  }

  toggleResult(key: string): void {
    this.expandedResults.update(current => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      }
      else {
        next.add(key);
      }
      return next;
    });
  }

  isResultExpanded(key: string): boolean {
    return this.expandedResults().has(key);
  }

  private safePlatform(platform: string): string {
    return platform.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private platformLabel(platform: string): string {
    return this.platforms().find(entry => this.safePlatform(entry.platform) === this.safePlatform(platform))?.platform || platform;
  }
}
