import { Component, DestroyRef, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../../../services/dashboard/dashboard.service';
import { SubscriptionService } from '../../../../services/dashboard/subscription.service';
import { NexusChatService } from '../nexus-chat.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';

@Component({
  selector: 'app-ai-summary',
  imports: [TranslatePipe],
  standalone: true,
  templateUrl: './ai-summary.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./ai-summary.component.css'],
})
export class AiSummaryComponent {
  private activeRequest?: Subscription;

  protected readonly isVisible = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly summary = signal('');
  protected readonly step = signal('');

  readonly content = input<string | null | undefined>(null);

  constructor(private readonly nexusChatService: NexusChatService, private readonly subscriptionService: SubscriptionService, private readonly dashboardService: DashboardService, private readonly translationService: TranslationService, destroyRef: DestroyRef) {
    destroyRef.onDestroy(() => {
      this.activeRequest?.unsubscribe();
    });
  }

  summarize(): void {
    if (!this.subscriptionService.accountExpirable()) {
      this.dashboardService.showSubscription.set(true);
      return;
    }

    const text = (this.content() ?? '').trim();
    if (!text || this.isLoading()) {
      return;
    }

    this.activeRequest?.unsubscribe();
    this.summary.set('');
    this.step.set('');
    this.isVisible.set(true);
    this.isLoading.set(true);

    this.activeRequest = this.nexusChatService.pollNexusSummary({ data: [text] }).subscribe({
      next: (response) => {
        if (this.nexusChatService.isNexusPending(response)) {
          this.step.set(this.nexusChatService.getNexusStep(response));
          return;
        }

        this.summary.set(this.nexusChatService.getNexusSummary(response) || this.translationService.translate('No summary available'));
        this.step.set('');
        this.isLoading.set(false);
      },
      error: () => {
        this.summary.set(this.translationService.translate('No summary available'));
        this.step.set('');
        this.isLoading.set(false);
      },
    });
  }
}
