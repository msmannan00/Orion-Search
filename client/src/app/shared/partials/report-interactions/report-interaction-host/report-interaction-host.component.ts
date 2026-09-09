import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { DashboardService } from '../../../../services/dashboard/dashboard.service';
import { ReportFeedbackCommentsComponent } from '../report-feedback-comments/report-feedback-comments.component';
import { ReportFeedbackComponent } from '../report-feedback/report-feedback.component';
import { ReportUserSidebarComponent } from '../report-user-sidebar/report-user-sidebar.component';
import { ReportFeedbackModel } from '../models/report-feedback.model';

type FeedbackAction = 'recommended' | 'trust' | 'untrust';

@Component({
  selector: 'app-report-interaction-host',
  standalone: true,
  imports: [CommonModule, ReportFeedbackComponent, ReportFeedbackCommentsComponent, ReportUserSidebarComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './report-interaction-host.component.html',
})
export class ReportInteractionHostComponent implements OnChanges {
  @ViewChild(ReportUserSidebarComponent) private userSidebar?: ReportUserSidebarComponent;

  feedbackModel = new ReportFeedbackModel();
  feedbackSavingKey: 'recommended_count' | 'trust_count' | 'untrust_count' | '' = '';
  isCommentSaving = false;
  commentErrorMessage = '';

  @Input() docId = '';

  constructor(private dashboardService: DashboardService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.docId) {
      this.feedbackModel = new ReportFeedbackModel({ doc_id: this.docId });
      this.feedbackSavingKey = '';
      this.isCommentSaving = false;
      this.commentErrorMessage = '';
      this.loadFeedback();
    }
  }

  submitFeedback(action: FeedbackAction): void {
    this.dashboardService.submitFeedbackAction(action, this.docId, this.feedbackModel, (value) => this.feedbackSavingKey = value);
  }

  saveFeedbackComment(comment: string): void {
    this.dashboardService.saveDocumentFeedbackComment(this.docId, comment, this.feedbackModel, {
      setSaving: this.setCommentSaving.bind(this),
      setError: this.setCommentErrorMessage.bind(this),
    });
  }

  deleteFeedbackComment(commentCreatedAt: string): void {
    this.dashboardService.deleteDocumentFeedbackComment(this.docId, commentCreatedAt, this.feedbackModel, {
      setSaving: this.setCommentSaving.bind(this),
      setError: this.setCommentErrorMessage.bind(this),
    });
  }

  private loadFeedback(): void {
    this.dashboardService.loadDocumentFeedback(this.docId, this.feedbackModel);
  }

  private setCommentSaving(value: boolean): void {
    this.isCommentSaving = value;
  }

  private setCommentErrorMessage(value: string): void {
    this.commentErrorMessage = value;
  }

  openUserSidebar(userId: string): void {
    this.userSidebar?.open(userId);
  }
}
