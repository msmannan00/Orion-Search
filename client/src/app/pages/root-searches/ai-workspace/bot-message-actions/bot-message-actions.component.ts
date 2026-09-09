import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { AiWorkspaceMessage } from '../model/ai-workspace-message.model';
import { ResultRowHelperService } from '../../../../shared/services/result-row-helper.service';
import { ShareResponseDialogComponent } from '../../../../shared/partials/share-response-dialog/share-response-dialog.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-bot-message-actions',
  standalone: true,
  imports: [CommonModule, ShareResponseDialogComponent, TranslatePipe],
  templateUrl: './bot-message-actions.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'block w-full' },
})
export class BotMessageActionsComponent implements OnDestroy {
  private copyFeedbackTimer?: ReturnType<typeof setTimeout>;

  protected readonly copied = signal(false);

  @Input({ required: true }) message!: AiWorkspaceMessage;

  constructor(private readonly resultRowHelper: ResultRowHelperService) {}

  ngOnDestroy(): void {
    if (this.copyFeedbackTimer) {
      clearTimeout(this.copyFeedbackTimer);
    }
  }

  copyMessage(event?: MouseEvent): void {
    event?.stopPropagation();
    const text = this.message.text.trim();
    if (!text) {
      return;
    }
    this.resultRowHelper.copyToClipboard(text).subscribe((ok) => {
      this.copied.set(ok);
      if (!ok) {
        return;
      }
      if (this.copyFeedbackTimer) {
        clearTimeout(this.copyFeedbackTimer);
      }
      this.copyFeedbackTimer = setTimeout(() => {
        this.copied.set(false);
      }, 1400);
    });
  }
}
