import { Case, CaseAnalyst, CaseEntity } from '../case.model';
import { setOwnProperty } from '../../../../../shared/utils/type-guards.util';


export type CaseDateField = 'dueAt' | 'capturedAt';

export interface CaseDateTarget {
  dueAt?: Date | string | null;
  capturedAt?: Date | string | null;
}

export function formatCaseLabel(value?: string | null): string {
  if (!value) {
    return '-';
  }
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function getCaseDisplayLabel(value?: string | null, otherValue?: string | null): string {
  if (value === 'other' && otherValue?.trim()) {
    return `Other: ${otherValue}`;
  }
  return formatCaseLabel(value);
}

export function formatCaseConfidence(value?: string | null): string {
  return formatCaseLabel(value ?? 'high');
}

export function getFormattedCaseDateTime(date?: Date | string | null): string {
  if (!date) {
    return '-';
  }

  const utcDate = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+')
    ? date + 'Z'
    : date;

  return new Date(utcDate).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function getFormattedCaseDateOnly(date?: Date | string | null): string {
  if (!date) {
    return '-';
  }

  const dateOnly = typeof date === 'string'
    ? date.slice(0, 10)
    : date.toISOString().slice(0, 10);

  const [year, month, day] = dateOnly.split('-');

  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function getCaseDateInputValue(date?: Date | string | null): string {
  if (!date) {
    return '';
  }

  return typeof date === 'string'
    ? date.slice(0, 10)
    : date.toISOString().slice(0, 10);
}

export function setCaseDateInputValue(target: CaseDateTarget, field: CaseDateField, value: string): void {
  setOwnProperty(target, field, value || null);
}

export function getCaseAnalystLabel(analysts: CaseAnalyst[], userId?: string): string {
  if (!userId) {
    return 'Unassigned';
  }
  const analyst = analysts.find(item => item.id === userId);
  if (!analyst) {
    return userId;
  }
  return analyst.username ?? analyst.email ?? analyst.id;
}

export function getAssignedCaseAnalysts(analysts: CaseAnalyst[], caseItem: Case | null): CaseAnalyst[] {
  const assignedIds = new Set(caseItem?.assignedAnalystIds ?? []);
  return analysts.filter(analyst => assignedIds.has(analyst.id));
}

export function getPrimaryCaseEntity(caseItem: Case | null): CaseEntity | null {
  if (!caseItem?.entities?.length) {
    return null;
  }
  return caseItem.entities.find(entity => entity.entityId === caseItem.primaryEntityId)
    ?? caseItem.entities.find(entity => entity.role === 'primary')
    ?? caseItem.entities[0];
}

export function getRelatedCaseEntities(caseItem: Case | null): CaseEntity[] {
  const primaryEntity = getPrimaryCaseEntity(caseItem);
  return caseItem?.entities?.filter(entity => entity.entityId !== primaryEntity?.entityId) ?? [];
}

export function getLinkableCaseEntities(caseItem: Case | null, currentEntityId?: string): CaseEntity[] {
  return (caseItem?.entities ?? []).filter(entity => entity.entityId !== currentEntityId);
}

export function getLinkedCaseEntityDisplayLabel(caseItem: Case | null, entityId?: string): string {
  if (!entityId) {
    return 'Not linked';
  }

  const allEntities = caseItem?.entities ?? [];
  const linkedEntity = allEntities.find(entity => entity.entityId === entityId);

  if (!linkedEntity) {
    return 'Linked entity not found';
  }

  const primaryEntity = getPrimaryCaseEntity(caseItem);
  const label = linkedEntity.value || linkedEntity.entityId;

  if (linkedEntity.entityId === primaryEntity?.entityId || linkedEntity.role === 'primary') {
    return `Primary Entity - ${label}`;
  }

  const relatedIndex = getRelatedCaseEntities(caseItem)
    .findIndex(entity => entity.entityId === linkedEntity.entityId);

  return `Related Entity ${relatedIndex + 1} - ${label}`;
}
