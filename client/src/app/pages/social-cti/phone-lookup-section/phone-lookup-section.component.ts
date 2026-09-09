import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { social_phone_lookup, social_phone_lookup_result, social_profile } from '../models/social.models';
import { SocialFetchService } from '../services/social-fetch.service';
import { SocialStorageService } from '../services/social-storage.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { getInputValue } from '../../../shared/utils/event-input.util';
import { asUnknownRecord } from '../../../shared/utils/type-guards.util';

@Component({
  selector: 'app-social-phone-lookup-section',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './phone-lookup-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhoneLookupSectionComponent implements OnDestroy {
  private static readonly phoneKeys = new Set(['phone', 'phonenumber', 'phonenumbers', 'mobile', 'mobilenumber', 'telephone', 'contactnumber', 'whatsapp', 'whatsappnumber']);
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
  result = signal<social_phone_lookup_result | null>(null);
  displayedResult = computed<social_phone_lookup_result>(() => this.result() ?? {});
  displayedWebFootprints = computed(() => this.result()?.web_footprints ?? []);
  isLoading = signal(false);
  isClearing = signal(false);
  errorMessage = signal('');
  profileKey = computed(() => this.username());
  associatedPhone = computed(() => this.findAssociatedPhone(this.platforms()));
  storedLookup = computed<social_phone_lookup | null>(() => this.platforms().find(platform => !!platform.phone_lookup)?.phone_lookup ?? null);
  hasSavedLookup = computed(() => !!this.storedLookup() || this.result() !== null);
  hasKnowledgeGraph = computed(() => {
    const knowledgeGraph = this.result()?.knowledge_graph;
    return knowledgeGraph && typeof knowledgeGraph === 'object' ? Object.keys(knowledgeGraph).length > 0 : !!knowledgeGraph;
  });
  hasEntityIdentification = computed(() => {
    const result = this.result();
    return [result?.name, result?.formatted_address, result?.rating, result?.website, result?.phone_numbers?.length].some(Boolean);
  });
  hasOpenSourceFootprints = computed(() => {
    const result = this.result();
    return [this.hasKnowledgeGraph(), result?.emails?.length, result?.web_footprints?.length].some(Boolean);
  });

  constructor() {
    effect(() => {
      const profileKey = this.profileKey();
      const associatedPhone = this.associatedPhone();
      const storedLookup = this.storedLookup();

      if (profileKey === this.activeProfileKey) {
        if (associatedPhone && !untracked(() => this.query().trim())) {
          this.query.set(associatedPhone);
        }
        return;
      }

      this.activeProfileKey = profileKey;
      this.subscription?.unsubscribe();
      this.persistenceSubscription?.unsubscribe();
      this.requestId++;
      this.query.set(storedLookup?.query ?? associatedPhone);
      this.result.set(storedLookup?.result ?? null);
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
    this.result.set(null);
    this.subscription = this.fetchService.fetchPhoneLookup(query).subscribe({
      next: result => {
        if (currentRequestId !== this.requestId) {
          return;
        }
        this.result.set(result);
        this.isLoading.set(false);
        this.persistenceSubscription = this.storageService.savePhoneLookup(this.profileKey(), { query, result }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          error: () => {
            if (currentRequestId === this.requestId) {
              this.errorMessage.set('Phone intelligence loaded but could not be saved.');
            }
          }
        });
      },
      error: () => {
        if (currentRequestId !== this.requestId) {
          return;
        }
        this.result.set(null);
        this.errorMessage.set('Could not search phone intelligence.');
        this.isLoading.set(false);
      }
    });
  }

  clearSavedLookup(event: Event): void {
    event.stopPropagation();
    if (this.isLoading() || this.isClearing()) {
      return;
    }

    const previousLookup = this.storedLookup() ?? { query: this.query(), result: this.result() };
    const currentRequestId = ++this.requestId;
    this.subscription?.unsubscribe();
    this.persistenceSubscription?.unsubscribe();
    this.query.set(this.associatedPhone());
    this.result.set(null);
    this.errorMessage.set('');
    this.isClearing.set(true);
    this.persistenceSubscription = this.storageService.clearPhoneLookup(this.profileKey()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => {
        if (currentRequestId === this.requestId) {
          this.query.set(previousLookup.query);
          this.result.set(previousLookup.result);
          this.errorMessage.set('Could not clear saved phone intelligence.');
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

  private findAssociatedPhone(platforms: social_profile[]): string {
    for (const platform of platforms) {
      const sources = [platform.profile_details, platform.meta, platform] as (Record<string, unknown> | null | undefined)[];
      for (const source of sources) {
        for (const [key, value] of Object.entries(source ?? {})) {
          if (!PhoneLookupSectionComponent.phoneKeys.has(key.toLowerCase().replace(/[^a-z]/g, ''))) {
            continue;
          }
          const phone = this.normalizePhoneValue(value);
          if (phone) {
            return phone;
          }
        }
      }
    }
    return '';
  }

  private normalizePhoneValue(value: unknown): string {
    if (Array.isArray(value)) {
      for (const item of value) {
        const phone = this.normalizePhoneValue(item);
        if (phone) {
          return phone;
        }
      }
      return '';
    }
    if (value && typeof value === 'object') {
      const record = asUnknownRecord(value);
      return this.normalizePhoneValue(record.number ?? record.value ?? record.phone ?? '');
    }
    const phone = String(value ?? '').trim();
    const digitCount = phone.replace(/\D/g, '').length;
    return digitCount >= 7 && digitCount <= 15 ? phone : '';
  }
}
