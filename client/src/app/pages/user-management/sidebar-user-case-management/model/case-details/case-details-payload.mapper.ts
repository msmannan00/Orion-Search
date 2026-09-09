import { Case, CaseArtifact, CaseArtifactRequest, CaseClosure, CaseClosureRequest, CaseComment, CaseCommentRequest, CaseEntity, CaseEntityRequest, CaseTask, CaseTaskRequest, CaseUpdateRequest } from '../case.model';
import { DEFAULT_PRIMARY_CASE_ENTITY_TEMPLATE } from '../case-management.defaults';
import { getPrimaryCaseEntity, getRelatedCaseEntities } from './case-details-formatters';

export function createCaseId(): string {
  return crypto.randomUUID();
}

export function ensurePrimaryEntity(caseItem: Case): CaseEntity {
  if (!caseItem.entities) {
    caseItem.entities = [];
  }
  let primaryEntity = getPrimaryCaseEntity(caseItem);
  if (!primaryEntity) {
    primaryEntity = createPrimaryEntity();
    caseItem.entities.push(primaryEntity);
  }
  ensureEntityDefaults(primaryEntity);
  primaryEntity.role = 'primary';
  caseItem.primaryEntityId = primaryEntity.entityId;
  return primaryEntity;
}

export function ensureEntityDefaults(entity: CaseEntity): CaseEntity {
  entity.entityId = entity.entityId || createCaseId();
  entity.type = entity.type || 'person';
  entity.value = entity.value || '';
  entity.entityDescription = entity.entityDescription ?? '';
  entity.role = entity.role || 'related';
  entity.confidence = entity.confidence || 'high';
  entity.source = entity.source || 'manual';
  entity.identifiers = entity.identifiers || [];
  entity.socialProfiles = entity.socialProfiles || [];
  entity.tags = entity.tags || [];
  entity.linkedEntityId = entity.linkedEntityId ?? '';
  return entity;
}

export function ensureArtifactDefaults(artifact: CaseArtifact): CaseArtifact {
  artifact.artifactId = artifact.artifactId || createCaseId();
  artifact.type = artifact.type || 'evidence';
  artifact.title = artifact.title || '';
  artifact.description = artifact.description ?? '';
  artifact.source = artifact.source || 'manual';
  artifact.url = artifact.url ?? '';
  artifact.files = artifact.files || [];
  artifact.entityIds = artifact.entityIds || [];
  artifact.tags = artifact.tags || [];
  artifact.linkedReportSource = artifact.linkedReportSource ?? '';
  artifact.linkedReportId = artifact.linkedReportId ?? '';
  artifact.linkedReportTitle = artifact.linkedReportTitle ?? '';
  artifact.capturedAt = artifact.capturedAt ?? null;
  return artifact;
}

export function ensureTaskDefaults(task: CaseTask): CaseTask {
  task.taskId = task.taskId || createCaseId();
  task.title = task.title || '';
  task.description = task.description ?? '';
  task.status = task.status || 'open';
  task.priority = task.priority || 'medium';
  task.assignedTo = task.assignedTo ?? '';
  task.dueAt = task.dueAt ?? null;
  task.entityIds = task.entityIds || [];
  task.artifactIds = task.artifactIds || [];
  return task;
}

export function cleanCaseForSave(caseItem: Case): CaseUpdateRequest {
  const primaryEntity = cleanEntity(ensurePrimaryEntity(caseItem));
  const relatedEntities = getRelatedCaseEntities(caseItem)
    .map(entity => cleanEntity(ensureEntityDefaults(entity)));

  return {
    title: caseItem.title.trim(),
    description: caseItem.description?.trim() || '',
    caseType: caseItem.caseType,
    caseTypeOtherValue: caseItem.caseTypeOtherValue?.trim() ?? '',
    status: caseItem.status,
    severity: caseItem.severity,
    priority: caseItem.priority,
    intakeSource: caseItem.intakeSource,
    intakeSourceOtherValue: caseItem.intakeSourceOtherValue?.trim() ?? '',
    tags: caseItem.tags || [],
    primaryEntityId: primaryEntity.entityId,
    assignedAnalystIds: caseItem.assignedAnalystIds || [],
    artifacts: (caseItem.artifacts || []).map(artifact => cleanArtifact(ensureArtifactDefaults(artifact))),
    entities: [
      primaryEntity,
      ...relatedEntities
    ],
    tasks: (caseItem.tasks || []).map(task => cleanTask(ensureTaskDefaults(task))),
    linkedCases: (caseItem.linkedCases || []).map(link => ({
      targetCaseId: link.targetCaseId.trim(),
      relationship: link.relationship,
      reason: link.reason.trim()
    })).filter(link => link.targetCaseId && link.reason),
    closure: caseItem.closure ? cleanClosure(caseItem.closure) : null
  };
}

export function cleanArtifact(artifact: CaseArtifact): CaseArtifactRequest {
  return {
    artifactId: artifact.artifactId || createCaseId(),
    type: artifact.type,
    artifactTypeOtherValue: artifact.artifactTypeOtherValue?.trim() ?? '',
    title: artifact.title.trim(),
    description: artifact.description?.trim() ?? '',
    source: artifact.source || 'manual',
    artifactSourceOtherValue: artifact.artifactSourceOtherValue?.trim() ?? '',
    url: artifact.url?.trim() ?? '',
    files: artifact.files || [],
    entityIds: artifact.entityIds || [],
    tags: artifact.tags || [],
    linkedReportSource: artifact.linkedReportSource ?? '',
    linkedReportId: artifact.linkedReportId ?? '',
    linkedReportTitle: artifact.linkedReportTitle ?? '',
    capturedAt: artifact.capturedAt ?? null
  };
}

export function cleanTask(task: CaseTask): CaseTaskRequest {
  return {
    taskId: task.taskId || createCaseId(),
    title: task.title.trim(),
    description: task.description?.trim() ?? '',
    status: task.status,
    priority: task.priority,
    assignedTo: task.assignedTo ?? '',
    dueAt: task.dueAt ?? null,
    entityIds: task.entityIds || [],
    artifactIds: task.artifactIds || []
  };
}

export function cleanComment(comment: CaseComment): CaseCommentRequest {
  return {
    commentId: comment.commentId || createCaseId(),
    body: comment.body?.trim() || '',
    entityIds: comment.entityIds || [],
    artifactIds: comment.artifactIds || []
  };
}

export function cleanClosure(closure: CaseClosure | CaseClosureRequest): CaseClosureRequest {
  return {
    reason: closure.reason || 'other',
    closureReasonOtherValue: closure.closureReasonOtherValue?.trim() ?? '',
    summary: closure.summary?.trim() ?? '',
    resolution: closure.resolution?.trim() ?? ''
  };
}

export function cleanEntity(entity: CaseEntity): CaseEntityRequest {
  const value = entity.value.trim();

  return {
    entityId: entity.entityId || createCaseId(),
    type: entity.type,
    entityTypeOtherValue: entity.entityTypeOtherValue?.trim() ?? '',
    value,
    entityDescription: entity.entityDescription?.trim() ?? value,
    role: entity.role,
    confidence: entity.confidence,
    source: entity.source,
    entitySourceOtherValue: entity.entitySourceOtherValue?.trim() ?? '',
    identifiers: (entity.identifiers || [])
      .filter(identifier => identifier.type && identifier.value.trim())
      .map(identifier => ({
        type: identifier.type,
        identifierTypeOtherValue: identifier.identifierTypeOtherValue?.trim() ?? '',
        value: identifier.value.trim(),
        issuer: identifier.issuer?.trim() ?? '',
        verified: !!identifier.verified
      })),
    socialProfiles: (entity.socialProfiles || [])
      .filter(profile => profile.platform && profile.username.trim())
      .map(profile => ({
        platform: profile.platform,
        platformOtherValue: profile.platformOtherValue?.trim() ?? '',
        username: profile.username.trim(),
        profileUrl: profile.profileUrl?.trim() ?? '',
        displayName: profile.displayName?.trim() ?? ''
      })),
    tags: entity.tags || [],
    linkedEntityId: entity.linkedEntityId ?? '',
  };
}

function createPrimaryEntity(): CaseEntity {
  return {
    ...structuredClone(DEFAULT_PRIMARY_CASE_ENTITY_TEMPLATE),
    entityId: createCaseId()
  };
}
