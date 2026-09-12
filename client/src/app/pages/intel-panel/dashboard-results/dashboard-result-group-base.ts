import { signal } from '@angular/core';

const STAGGER_RENDER_BATCH_SIZE = 10;
const STAGGER_RENDER_DELAY_MS = 16;
const RECORD_SIDEBAR_CLOSE_MS = 300;

export interface RenderableGroup {
  key: string;
  records: unknown[];
  latestSeen: string | null;
}

export abstract class DashboardResultGroupBase {
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private recordSidebarCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private renderKey = '';
  private renderTargetCount = 0;

  expandedGroupKey: string | null = null;
  isRecordSidebarVisible = false;
  visibleGroupCount = signal(0);

  toggleGroup(key: string): void {
    if (this.expandedGroupKey === key && this.isRecordSidebarOpen()) {
      this.closeRecordSidebar();
      return;
    }
    this.expandedGroupKey = key;
    this.openRecordSidebar();
  }

  isGroupExpanded(key: string): boolean {
    return this.expandedGroupKey === key && this.isRecordSidebarOpen();
  }

  isRecordSidebarOpen(): boolean {
    return this.isRecordSidebarVisible;
  }

  openRecordSidebar(): void {
    this.clearRecordSidebarCloseTimer();
    this.isRecordSidebarVisible = true;
  }

  closeRecordSidebar(): void {
    this.isRecordSidebarVisible = false;
    this.clearRecordSidebarCloseTimer();
    this.recordSidebarCloseTimer = setTimeout(() => {
      if (!this.isRecordSidebarVisible) {
        this.expandedGroupKey = null;
      }
      this.recordSidebarCloseTimer = null;
    }, RECORD_SIDEBAR_CLOSE_MS);
  }

  protected buildRenderKey(groups: RenderableGroup[]): string {
    return groups.map(group => `${group.key}:${group.records.length}:${group.latestSeen ?? ''}`).join('|');
  }

  protected startStaggeredRender(targetCount: number, key: string): void {
    if (this.renderKey === key && this.renderTargetCount === targetCount) {
      return;
    }
    this.clearRenderTimer();
    this.renderKey = key;
    this.renderTargetCount = targetCount;
    this.visibleGroupCount.set(Math.min(targetCount, STAGGER_RENDER_BATCH_SIZE));
    this.revealNextGroupBatch();
  }

  protected clearRenderTimer(): void {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
  }

  protected clearRecordSidebarCloseTimer(): void {
    if (this.recordSidebarCloseTimer) {
      clearTimeout(this.recordSidebarCloseTimer);
      this.recordSidebarCloseTimer = null;
    }
  }

  protected getLatestDate(current: string | null, next: string | null): string | null {
    if (!current) {
      return next;
    }
    if (!next) {
      return current;
    }
    return this.dateTime(next) > this.dateTime(current) ? next : current;
  }

  protected dateTime(value: string | null): number {
    if (!value) {
      return 0;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private revealNextGroupBatch(): void {
    if (this.visibleGroupCount() >= this.renderTargetCount) {
      return;
    }
    this.renderTimer = setTimeout(() => {
      this.visibleGroupCount.update(count => Math.min(count + STAGGER_RENDER_BATCH_SIZE, this.renderTargetCount));
      this.revealNextGroupBatch();
    }, STAGGER_RENDER_DELAY_MS);
  }
}
