import { ReportFeedbackModel } from '../../../../../shared/partials/report-interactions/models/report-feedback.model';
import { Case } from '../case.model';

export function buildCaseCommentsFeedback(caseData: Case | null, getAnalystLabel: (userId?: string) => string): ReportFeedbackModel {
  const comments = (caseData?.comments ?? []).map(comment => ({
    user_id: comment.createdBy ?? '',
    username: getAnalystLabel(comment.createdBy),
    comment: comment.body,
    is_deleted: false,
    created_at: String(comment.createdAt ?? ''),
    updated_at: String(comment.updatedAt ?? comment.createdAt ?? '')
  }));
  return new ReportFeedbackModel({
    doc_id: caseData?.caseId ?? '',
    comments
  });
}
