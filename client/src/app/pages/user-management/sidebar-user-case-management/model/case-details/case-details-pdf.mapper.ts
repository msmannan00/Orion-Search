import { Case, SharedCaseReport } from '../case.model';

export function buildCasePdfReport(caseData: Case, getAnalystLabel: (userId?: string) => string): SharedCaseReport {
  const report: SharedCaseReport = {
    shareId: '',
    caseId: caseData.caseId,
    title: caseData.title,
    description: caseData.description,
    caseType: caseData.caseType,
    otherValue: caseData.caseTypeOtherValue,
    status: caseData.status,
    severity: caseData.severity,
    priority: caseData.priority,
    tags: caseData.tags || [],
    primaryEntityId: caseData.primaryEntityId ?? null,
    entities: (caseData.entities || []).map(entity => {
      const createdAt = toPdfDate(entity.createdAt);
      const updatedAt = toPdfDate(entity.updatedAt);
      return {
        entityId: entity.entityId,
        type: entity.type,
        value: entity.value,
        entityTypeOtherValue: entity.entityTypeOtherValue,
        entitySourceOtherValue: entity.entitySourceOtherValue,
        entityDescription: entity.entityDescription,
        role: entity.role,
        confidence: entity.confidence,
        source: entity.source,
        identifiers: entity.identifiers || [],
        socialProfiles: entity.socialProfiles || [],
        tags: entity.tags || [],
        createdBy: entity.createdBy,
        updatedBy: entity.updatedBy,
        ...(createdAt ? { createdAt } : {}),
        ...(updatedAt ? { updatedAt } : {})
      };
    }),
    artifacts: (caseData.artifacts || []).map(artifact => {
      const capturedAt = toPdfDate(artifact.capturedAt);
      return {
        artifactId: artifact.artifactId,
        type: artifact.type,
        title: artifact.title,
        description: artifact.description,
        source: artifact.source,
        artifactTypeOtherValue: artifact.artifactTypeOtherValue,
        artifactSourceOtherValue: artifact.artifactSourceOtherValue,
        url: artifact.url,
        files: artifact.files || [],
        tags: artifact.tags || [],
        ...(capturedAt ? { capturedAt } : {})
      };
    }),
    tasks: (caseData.tasks || []).map(task => {
      const dueAt = toPdfDate(task.dueAt);
      const createdAt = toPdfDate(task.createdAt);
      const updatedAt = toPdfDate(task.updatedAt);
      const completedAt = toPdfDate(task.completedAt);
      return {
        taskId: task.taskId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo ? getAnalystLabel(task.assignedTo) : '',
        ...(dueAt ? { dueAt } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(updatedAt ? { updatedAt } : {}),
        ...(completedAt ? { completedAt } : {})
      };
    }),
    linkedCases: (caseData.linkedCases || []).map(linkedCase => {
      const createdAt = toPdfDate(linkedCase.createdAt);
      return {
        targetCaseId: linkedCase.targetCaseId,
        relationship: linkedCase.relationship,
        reason: linkedCase.reason,
        createdBy: linkedCase.createdBy,
        ...(createdAt ? { createdAt } : {})
      };
    }),
    comments: (caseData.comments || []).map(comment => {
      const createdAt = toPdfDate(comment.createdAt);
      const updatedAt = toPdfDate(comment.updatedAt);
      return {
        commentId: comment.commentId,
        body: comment.body,
        entityIds: comment.entityIds || [],
        artifactIds: comment.artifactIds || [],
        createdBy: comment.createdBy,
        ...(createdAt ? { createdAt } : {}),
        ...(updatedAt ? { updatedAt } : {})
      };
    }),
    closure: caseData.closure ? {
      reason: caseData.closure.reason,
      closureReasonOtherValue: caseData.closure.closureReasonOtherValue,
      summary: caseData.closure.summary,
      resolution: caseData.closure.resolution,
      ...((toPdfDate(caseData.closure.closedAt ?? caseData.closedAt)) ? { closedAt: toPdfDate(caseData.closure.closedAt ?? caseData.closedAt) } : {})
    } : null
  };

  const createdAt = toPdfDate(caseData.createdAt);
  const updatedAt = toPdfDate(caseData.updatedAt);
  const closedAt = toPdfDate(caseData.closedAt);
  if (createdAt) {
    report.createdAt = createdAt;
  }
  if (updatedAt) {
    report.updatedAt = updatedAt;
  }
  if (closedAt) {
    report.closedAt = closedAt;
  }
  return report;
}

function toPdfDate(value?: Date | string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  return value instanceof Date ? value.toISOString() : String(value);
}
