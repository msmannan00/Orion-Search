import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { ReportFeedbackModel } from '../models/report-feedback.model';
import { TranslatePipe } from '../../../pipes/translate.pipe';

type FeedbackKey = 'recommended_count' | 'trust_count' | 'untrust_count';
type FeedbackAction = 'recommended' | 'trust' | 'untrust';

@Component({
  selector: 'app-report-feedback',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './report-feedback.component.html',
})
export class ReportFeedbackComponent {
  @Input() docId = '';
  @Input() feedback: ReportFeedbackModel = new ReportFeedbackModel();
  @Input() savingKey: FeedbackKey | '' = '';

  @Output() feedbackAction = new EventEmitter<FeedbackAction>();

  increment(action: FeedbackAction, _key: FeedbackKey): void {
    void _key;
    if (!this.docId || this.savingKey) {
      return;
    }
    this.feedbackAction.emit(action);
  }

  isSelected(action: FeedbackAction): boolean {
    if (action === 'recommended') {
      return !!this.feedback.current_user_reaction?.recommended;
    }
    return this.feedback.current_user_reaction?.trust_state === action;
  }
}
