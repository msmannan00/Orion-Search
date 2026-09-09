import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { social_profile, social_wanted } from '../models/social.models';
import { SocialFetchService } from '../services/social-fetch.service';
import { SocialStorageService } from '../services/social-storage.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { getInputValue } from '../../../shared/utils/event-input.util';

@Component({
  selector: 'app-social-wanted-list-section',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './wanted-list-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WantedListSectionComponent implements OnDestroy {
  private readonly fetchService = inject(SocialFetchService);
  private readonly storageService = inject(SocialStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private requestId = 0;
  private activeProfileKey = '';
  private subscription: Subscription | null = null;
  private persistenceSubscription: Subscription | null = null;

  username = input.required<string>();
  platforms = input<social_profile[]>([]);
  query = signal('');
  records = signal<social_wanted[]>([]);
  isLoading = signal(false);
  isClearing = signal(false);
  errorMessage = signal('');
  profileKey = computed(() => this.username());
  storedWantedProfile = computed<social_profile | null>(() => this.platforms().find(platform => platform.wanted_query !== null && platform.wanted_query !== undefined)
    ?? this.platforms().find(platform => !!platform.wanted?.length)
    ?? null);
  hasRecords = computed(() => this.records().length > 0);
  hasSavedWantedList = computed(() => !!this.storedWantedProfile() || this.records().length > 0);
  visibleRecords = computed(() => this.records().slice(0, 3));

  constructor() {
    effect(() => {
      const profileKey = this.profileKey();
      const storedProfile = this.storedWantedProfile();
      if (profileKey === this.activeProfileKey) {
        return;
      }

      this.activeProfileKey = profileKey;
      this.subscription?.unsubscribe();
      this.persistenceSubscription?.unsubscribe();
      this.requestId++;
      this.query.set(storedProfile?.wanted_query ?? '');
      this.records.set(storedProfile?.wanted ?? []);
      this.errorMessage.set('');
      this.isLoading.set(false);
      this.isClearing.set(false);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.persistenceSubscription?.unsubscribe();
  }

  onQueryInput(event: Event): void {
    this.query.set(getInputValue(event));
  }

  search(event?: Event): void {
    event?.stopPropagation();
    const query = this.query().trim();
    if (!query || this.isLoading() || this.isClearing()) {
      return;
    }
    const currentRequestId = ++this.requestId;
    this.subscription?.unsubscribe();
    this.persistenceSubscription?.unsubscribe();
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.records.set([]);
    this.subscription = this.fetchService.fetchWantedList(query).subscribe({
      next: (records) => {
        if (currentRequestId !== this.requestId) {
          return;
        }
        const savedRecords = Array.isArray(records) ? records : [];
        this.records.set(savedRecords);
        this.isLoading.set(false);
        this.persistenceSubscription = this.storageService.saveWantedList(this.profileKey(), query, savedRecords).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          error: () => {
            if (currentRequestId === this.requestId) {
              this.errorMessage.set('Wanted list loaded but could not be saved.');
            }
          }
        });
      },
      error: () => {
        if (currentRequestId !== this.requestId) {
          return;
        }
        this.records.set([]);
        this.errorMessage.set('Could not search wanted list.');
        this.isLoading.set(false);
      }
    });
  }

  clearSavedWantedList(event: Event): void {
    event.stopPropagation();
    if (this.isLoading() || this.isClearing()) {
      return;
    }

    const previousQuery = this.query();
    const previousRecords = this.records();
    const currentRequestId = ++this.requestId;
    this.subscription?.unsubscribe();
    this.persistenceSubscription?.unsubscribe();
    this.query.set('');
    this.records.set([]);
    this.errorMessage.set('');
    this.isClearing.set(true);
    this.persistenceSubscription = this.storageService.clearWantedList(this.profileKey()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => {
        if (currentRequestId === this.requestId) {
          this.query.set(previousQuery);
          this.records.set(previousRecords);
          this.errorMessage.set('Could not clear saved wanted list.');
          this.isClearing.set(false);
        }
      },
      complete: () => {
        if (currentRequestId === this.requestId) {
          this.isClearing.set(false);
        }
      }
    });
  }

  getRecordTrackKey(index: number, record: social_wanted): string {
    return `${this.getRecordTitle(record)}|${this.getRecordMeta(record)}|${index}`;
  }

  getRecordTitle(record: social_wanted): string {
    return record?.name ?? record?.caption ?? record?.entity ?? record?.id ?? 'Unknown person';
  }

  getRecordMeta(record: social_wanted): string {
    return record?.schema ?? record?.status ?? record?.authority ?? record?.program ?? record?.topics ?? record?.datasets ?? '-';
  }

  getRecordSummary(record: social_wanted): string {
    return record?.description ?? record?.summary ?? record?.notes ?? record?.source_url ?? '';
  }
}
