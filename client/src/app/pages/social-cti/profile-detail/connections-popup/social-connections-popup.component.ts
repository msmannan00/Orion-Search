import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { getInputValue } from '../../../../shared/utils/event-input.util';
import { SocialFetchService } from '../../services/social-fetch.service';
import { applyImageFallback } from '../../utils/image-fallback.util';
import { asRecord, initialOf, pickText } from '../../utils/resource-view.util';
import type { connection_user_view } from './model/social-connections-popup.model';
export type { connection_user_view } from './model/social-connections-popup.model';




@Component({
  selector: 'app-social-connections',
  templateUrl: './social-connections-popup.component.html',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialConnectionsPopupComponent {
  private readonly fetchService = inject(SocialFetchService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();
  private readonly searchResults = signal<unknown[] | null>(null);
  private readonly limit = signal(30);

  postUrl = input('');
  platform = input('');
  profileUsername = input('');
  connectionsLoading = input<Set<string>>(new Set<string>());
  connectionsByPost = input<ReadonlyMap<string, unknown[]>>(new Map());
  loadConnections = output<string>();
  readonly onImageError = applyImageFallback;
  readonly searchTerm = signal('');
  readonly isOpen = signal(false);
  readonly isLoading = computed(() => {
    const url = this.postUrl();
    return !!url && this.connectionsLoading().has(url);
  });
  readonly users = computed<connection_user_view[]>(() => {
    const url = this.postUrl();
    if (!url) {
      return [];
    }
    return (this.searchResults() ?? this.connectionsByPost().get(url) ?? []).map((item, index) => {
      const record = asRecord(item);
      const handle = pickText(record, 'handle', 'screen_name', 'acct', 'username', 'login', 'author');
      const name = pickText(record, 'title', 'display_name', 'name', 'full_name', 'author_name') || handle || 'Unknown';
      return {
        key: pickText(record, 'resource_id', 'url', 'user_id', 'id') || `connection-${index}`,
        name,
        handle: handle && handle.toLowerCase() !== name.toLowerCase() ? handle : '',
        avatar: pickText(record, 'thumbnail_url', 'avatar', 'avatar_url', 'author_avatar', 'user_avatar', 'profile_image'),
        initial: initialOf(name),
        url: pickText(record, 'url', 'media_url'),
      };
    });
  });
  readonly displayedUsers = computed<connection_user_view[]>(() => this.searchTerm().trim() ? this.users() : this.users().slice(0, this.limit()));
  readonly canLoadMore = computed(() => !this.searchTerm().trim() && this.users().length > this.limit());

  constructor() {
    this.search$.pipe(switchMap(term => {
      const url = this.postUrl();
      if (!url) {
        return of<unknown[] | null>(null);
      }
      const query = term.trim();
      return timer(query ? 250 : 0).pipe(switchMap(() => this.fetchService.searchConnections(this.platform(), this.profileUsername(), query, url)));
    }),
    takeUntilDestroyed(this.destroyRef)).subscribe(items => {
      this.searchResults.set(items);
    });
  }

  open(event: Event, dialog: HTMLDialogElement): void {
    event.stopPropagation();
    this.searchTerm.set('');
    this.limit.set(30);
    this.search$.next('');
    this.isOpen.set(true);
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  onSearch(event: Event): void {
    const term = getInputValue(event);
    this.searchTerm.set(term);
    this.limit.set(30);
    this.search$.next(term);
  }

  loadMore(): void {
    this.limit.update(current => current + 30);
  }

  onLoad(event: Event): void {
    event.stopPropagation();
    const url = this.postUrl();
    if (url) {
      this.loadConnections.emit(url);
    }
  }

  close(event: Event, dialog: HTMLDialogElement): void {
    event.stopPropagation();
    dialog.close();
  }

  onClosed(): void {
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.limit.set(30);
    this.search$.next('');
  }
}
