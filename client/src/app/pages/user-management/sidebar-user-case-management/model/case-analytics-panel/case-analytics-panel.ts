import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CASE_STATUS_OPTIONS, CASE_TYPE_OPTIONS, INTAKE_SOURCE_OPTIONS, PRIORITY_OPTIONS, SEVERITY_OPTIONS, TASK_STATUS_OPTIONS } from '../case-management.defaults';
import { Case, CaseChartItem, CaseStatus, CaseType, IntakeSource, Priority, Severity } from '../case.model';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { getOwnProperty } from '../../../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-case-analytics-panel',
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-analytics-panel.html'
})
export class CaseAnalyticsPanel {
  @Input() cases: Case[] = [];
  @Input() filteredCases: Case[] = [];

  constructor(private translationService: TranslationService) {}

  get activeCaseCount(): number {
    return this.filteredCases.filter(caseItem => caseItem.status !== 'resolved' && caseItem.status !== 'closed').length;
  }

  get criticalCaseCount(): number {
    return this.filteredCases.filter(caseItem => caseItem.severity === 'critical').length;
  }

  get highPriorityCaseCount(): number {
    return this.filteredCases.filter(caseItem => caseItem.priority === 'high' || caseItem.priority === 'critical').length;
  }

  get unassignedCaseCount(): number {
    return this.filteredCases.filter(caseItem => !caseItem.assignedAnalystIds?.length && !caseItem.assignedAnalysts?.length).length;
  }

  get openTaskCount(): number {
    return this.filteredCases.reduce((total, caseItem) =>
      total + (caseItem.tasks || []).filter(task => task.status !== 'done' && task.status !== 'cancelled').length, 0);
  }

  get artifactCount(): number {
    return this.filteredCases.reduce((total, caseItem) => total + (caseItem.artifacts || []).length, 0);
  }

  get averageAgeDays(): number {
    if (!this.filteredCases.length) {
      return 0;
    }

    const totalDays = this.filteredCases.reduce((total, caseItem) => total + this.getCaseAgeDays(caseItem), 0);
    return Math.round(totalDays / this.filteredCases.length);
  }

  get staleCaseCount(): number {
    return this.filteredCases.filter(caseItem =>
      caseItem.status !== 'resolved' &&
      caseItem.status !== 'closed' &&
      this.getDaysSince(caseItem.updatedAt ?? caseItem.createdAt) >= 7).length;
  }

  get statusChart(): CaseChartItem[] {
    return CASE_STATUS_OPTIONS.map(option => this.getChartItem(option.value, option.label, 'status'));
  }

  get severityChart(): CaseChartItem[] {
    return SEVERITY_OPTIONS.map(value => this.getChartItem(value, this.formatLabel(value), 'severity'));
  }

  get priorityChart(): CaseChartItem[] {
    return PRIORITY_OPTIONS.map(value => this.getChartItem(value, this.formatLabel(value), 'priority'));
  }

  get caseTypeChart(): CaseChartItem[] {
    return CASE_TYPE_OPTIONS.map(option => this.getChartItem(option.value, option.label, 'caseType'))
      .filter(item => item.count > 0);
  }

  get intakeSourceChart(): CaseChartItem[] {
    return INTAKE_SOURCE_OPTIONS.map(option => this.getChartItem(option.value, option.label, 'intakeSource'))
      .filter(item => item.count > 0);
  }

  get taskStatusChart(): CaseChartItem[] {
    return TASK_STATUS_OPTIONS.map(option => ({
      key: option.value,
      label: option.label,
      count: this.filteredCases.reduce((total, caseItem) =>
        total + (caseItem.tasks || []).filter(task => task.status === option.value).length, 0)
    })).filter(item => item.count > 0);
  }

  get analystWorkloadChart(): CaseChartItem[] {
    const counts = new Map<string, CaseChartItem>();

    this.filteredCases.forEach(caseItem => {
      const analysts = caseItem.assignedAnalysts ?? [];

      if (!analysts.length && !caseItem.assignedAnalystIds?.length) {
        const current = counts.get('unassigned') ?? { key: 'unassigned', label: 'Unassigned', count: 0 };
        counts.set('unassigned', { ...current, count: current.count + 1 });
        return;
      }

      if (analysts.length) {
        analysts.forEach(analyst => {
          const label = analyst.username ?? analyst.email ?? analyst.id;
          const current = counts.get(analyst.id) ?? { key: analyst.id, label, count: 0 };
          counts.set(analyst.id, { ...current, count: current.count + 1 });
        });
        return;
      }

      caseItem.assignedAnalystIds.forEach(analystId => {
        const current = counts.get(analystId) ?? { key: analystId, label: analystId, count: 0 };
        counts.set(analystId, { ...current, count: current.count + 1 });
      });
    });

    return Array.from(counts.values()).sort((first, second) => second.count - first.count).slice(0, 6);
  }

  get attentionCases(): Case[] {
    return [...this.filteredCases]
      .filter(caseItem => caseItem.status !== 'resolved' && caseItem.status !== 'closed')
      .sort((first, second) =>
        this.getSeverityWeight(second.severity) - this.getSeverityWeight(first.severity) ||
        this.getPriorityWeight(second.priority) - this.getPriorityWeight(first.priority) ||
        this.getDaysSince(second.updatedAt ?? second.createdAt) - this.getDaysSince(first.updatedAt ?? first.createdAt))
      .slice(0, 5);
  }

  getToneClass(key: string): string {
    if (key === 'critical' || key === 'closed') {
      return 'bg-red-400';
    }

    if (key === 'high' || key === 'under_investigation' || key === 'evidence_collection') {
      return 'bg-orange-400';
    }

    if (key === 'medium' || key === 'verification' || key === 'legal_review' || key === 'regulatory_action') {
      return 'bg-amber-400';
    }

    if (key === 'resolved' || key === 'low') {
      return 'bg-emerald-400';
    }

    return 'bg-sky-400';
  }

  getChartWidthClass(count: number): string {
    return this.getWidthClass(count, this.filteredCases.length);
  }

  getWorkloadWidthClass(count: number): string {
    const max = this.analystWorkloadChart[0]?.count || 0;
    return this.getWidthClass(count, max);
  }

  getTaskChartWidthClass(count: number): string {
    const totalTasks = this.taskStatusChart.reduce((total, item) => total + item.count, 0);
    return this.getWidthClass(count, totalTasks);
  }

  getUpdatedLabel(caseItem: Case): string {
    this.translationService.version();
    const days = this.getDaysSince(caseItem.updatedAt ?? caseItem.createdAt);

    if (days <= 0) {
      return this.translationService.translate('Updated today');
    }

    return `${this.translationService.translate('Updated')} ${days}${this.translationService.translate('d ago')}`;
  }

  private getChartItem(value: CaseStatus, label: string, field: 'status'): CaseChartItem;

  private getChartItem(value: Severity, label: string, field: 'severity'): CaseChartItem;

  private getChartItem(value: Priority, label: string, field: 'priority'): CaseChartItem;

  private getChartItem(value: CaseType, label: string, field: 'caseType'): CaseChartItem;

  private getChartItem(value: IntakeSource, label: string, field: 'intakeSource'): CaseChartItem;

  private getChartItem(value: CaseStatus | Severity | Priority | CaseType | IntakeSource, label: string, field: 'status' | 'severity' | 'priority' | 'caseType' | 'intakeSource'): CaseChartItem {
    return {
      key: value,
      label,
      count: this.filteredCases.filter(caseItem => getOwnProperty(caseItem, field) === value).length
    };
  }

  private getWidthClass(count: number, total: number): string {
    if (!count || !total) {
      return 'w-0';
    }

    const percent = Math.round((count / total) * 100);

    if (percent >= 92) {
      return 'w-full';
    }

    if (percent >= 84) {
      return 'w-11/12';
    }

    if (percent >= 75) {
      return 'w-3/4';
    }

    if (percent >= 67) {
      return 'w-2/3';
    }

    if (percent >= 58) {
      return 'w-7/12';
    }

    if (percent >= 50) {
      return 'w-1/2';
    }

    if (percent >= 42) {
      return 'w-5/12';
    }

    if (percent >= 34) {
      return 'w-1/3';
    }

    if (percent >= 25) {
      return 'w-1/4';
    }

    if (percent >= 17) {
      return 'w-1/6';
    }

    return 'w-1/12';
  }

  private formatLabel(value?: string | null): string {
    if (!value) {
      return '-';
    }

    return value.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  private getCaseAgeDays(caseItem: Case): number {
    const start = this.parseDate(caseItem.createdAt);
    const end = this.parseDate(caseItem.closedAt ?? caseItem.closure?.closedAt ?? caseItem.updatedAt);

    if (!start) {
      return 0;
    }

    return Math.max(0, Math.round(((end ?? new Date()).getTime() - start.getTime()) / 86400000));
  }

  private getDaysSince(value?: Date | string | null): number {
    const date = this.parseDate(value);

    if (!date) {
      return 0;
    }

    return Math.max(0, Math.round((Date.now() - date.getTime()) / 86400000));
  }

  private parseDate(value?: Date | string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getPriorityWeight(priority?: Priority | null): number {
    return { low: 1, medium: 2, high: 3, critical: 4 }[priority ?? 'low'] || 0;
  }

  private getSeverityWeight(severity?: Severity | null): number {
    return { info: 1, low: 2, medium: 3, high: 4, critical: 5 }[severity ?? 'info'] || 0;
  }
}
