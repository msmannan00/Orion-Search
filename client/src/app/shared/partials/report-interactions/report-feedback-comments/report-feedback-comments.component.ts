import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportFeedbackCommentModel, ReportFeedbackModel } from '../models/report-feedback.model';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { getFormattedCaseDateTime } from '../../../../pages/user-management/sidebar-user-case-management/model/case-details/case-details-formatters';
import { AppService } from '../../../../services/core/app/app.service';
import { ConfirmationPopupComponent } from '../../confirmation-popup/confirmation-popup.component';

@Component({
  selector: 'app-report-feedback-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ConfirmationPopupComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './report-feedback-comments.component.html',
})
export class ReportFeedbackCommentsComponent implements OnChanges {
  draft = '';
  pendingDeleteCommentCreatedAt = '';

  @Input() docId = '';
  @Input() feedback: ReportFeedbackModel = new ReportFeedbackModel();
  @Input() isSaving = false;
  @Input() errorMessage = '';
  @Input() flushSpacing = false;

  @Output() saveComment = new EventEmitter<string>();
  @Output() deleteComment = new EventEmitter<string>();
  @Output() userSelected = new EventEmitter<string>();

  constructor(private appService: AppService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.docId) {
      this.draft = '';
    }
  }

  submitComment(): void {
    const text = this.draft.trim();
    if (!this.docId || !text) {
      return;
    }
    this.saveComment.emit(text);
    this.draft = '';
  }

  openUser(userId: string): void {
    if (!userId) {
      return;
    }
    this.userSelected.emit(userId);
  }

  requestDeleteComment(commentCreatedAt: string): void {
    if (!commentCreatedAt) {
      return;
    }
    this.pendingDeleteCommentCreatedAt = commentCreatedAt;
  }

  handleDeleteConfirmation(confirmed: boolean): void {
    const commentCreatedAt = this.pendingDeleteCommentCreatedAt;
    this.pendingDeleteCommentCreatedAt = '';
    if (confirmed && commentCreatedAt) {
      this.deleteComment.emit(commentCreatedAt);
    }
  }

  canDeleteComment(comment: ReportFeedbackCommentModel): boolean {
    return !comment.is_deleted && !!comment.username && comment.username === this.appService.userSessionData().user.username;
  }

  getFormattedDateTime(date?: Date | string | null): string {
    return getFormattedCaseDateTime(date);
  }
}
