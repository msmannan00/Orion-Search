import { DatePipe, NgClass } from '@angular/common';
import { Component, HostListener, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';

import { FeederScriptItem, FeederValueItem } from '../model/feeder.model';
import { PaginationComponent } from '../../../../shared/partials/pagination/pagination.component';
import { ConfirmationPopupComponent } from '../../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { ScrollTopComponent } from '../../../../shared/partials/scroll-top/scroll-top.component';
import { AppService } from '../../../../services/core/app/app.service';
import { MessageNotificationService } from '../../../../services/message_notification/message-notification.service';
import { FeederService } from '../feeder.service';
import { SidebarUserFeederOwnerDialogComponent } from '../owner-dialog/sidebar-user-feeder-owner-dialog.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';

type SortDirection = 'asc' | 'desc';
type SortColumn = 'file' | 'owner' | 'path' | 'active' | 'status' | 'lastSuccess' | 'updated';

@Component({
  selector: 'app-sidebar-user-feeder-view',
  standalone: true,
  imports: [NgClass, DatePipe, PaginationComponent, ConfirmationPopupComponent, ScrollTopComponent, SidebarUserFeederOwnerDialogComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './sidebar-user-feeder-view.component.html',
})
export class SidebarUserFeederViewComponent implements OnChanges {
  private readonly oneDayMs = 24 * 60 * 60 * 1000;
  private readonly pageSize = 1000;
  private consumedHighlightedScriptId: string | null = null;
  private scriptTotal = 0;
  private isSelectingScripts = false;
  private selectionAnchorScriptId: string | null = null;
  private dragEnteredScriptIds = new Set<string>();

  rawScripts: FeederScriptItem[] = [];
  scripts: FeederScriptItem[] = [];
  displayedScripts: FeederScriptItem[] = [];
  rawValues: FeederValueItem[] = [];
  displayedValues: FeederValueItem[] = [];
  valuesRecord: FeederScriptItem | null = null;
  selectedValueUrl: string | null = null;
  searchText = '';
  selectedScript: FeederScriptItem | null = null;
  selectedScriptIds = new Set<string>();
  isScriptsLoading = false;
  isOwnerDialogOpen = false;
  ownerDialogScript: FeederScriptItem | null = null;
  isConfirmationOpen = false;
  confirmationMessage = '';
  pendingAction: { type: 'clear' | 'delete' | 'toggle' | 'enableAll' | 'disableAll' | 'deleteValue' | 'deleteAllValues'; script?: FeederScriptItem | null; value?: string | null; selectedIds?: string[]; } | null = null;
  hasLoadedScripts = false;
  currentPage = 1;
  totalPages = 1;
  sortColumn: SortColumn | null = null;
  sortDirection: SortDirection | null = null;
  readonly shimmerRows = Array.from({ length: 4 }, (_, index) => index);

  @Input() active = false;
  @Input() selectedRuleKey = '';
  @Input() entryType: 'scripts' | 'values' = 'scripts';
  @Input() highlightedScript: FeederScriptItem | null = null;

  constructor(private feederService: FeederService, private messageNotificationService: MessageNotificationService, private appService: AppService, private translationService: TranslationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.active && !changes.active.currentValue) {
      this.closeScriptPreview();
    }

    if (changes.active?.currentValue && !this.hasLoadedScripts) {
      this.loadScripts();
    }

    if (changes.selectedRuleKey || changes.entryType) {
      this.currentPage = 1;
      this.consumedHighlightedScriptId = null;
      this.clearScriptSelection();
      if (this.hasLoadedScripts) {
        this.loadScripts();
      }
      this.closeScriptPreview();
      this.selectedValueUrl = null;
    }

    if (changes.highlightedScript) {
      const script = changes.highlightedScript.currentValue as FeederScriptItem | null;
      if (!script) {
        this.consumedHighlightedScriptId = null;
        return;
      }
      if (script.id === this.consumedHighlightedScriptId) {
        return;
      }
      this.ensureScriptsLoadedAndOpen(script);
    }
  }

  canTransferOwnership(): boolean {
    return this.entryType !== 'values' && this.appService.userSessionData()?.user?.role === 'admin';
  }

  canTransferScript(script: FeederScriptItem): boolean {
    return this.canTransferOwnership() && script.entry_kind !== 'values';
  }

  canBulkToggle(): boolean {
    const selectedScripts = this.getSelectedScripts();
    if (selectedScripts.length) {
      return selectedScripts.some((script) => this.canToggleScript(script));
    }
    return this.scripts.some((script) => this.canToggleScript(script));
  }

  canToggleScript(script: FeederScriptItem): boolean {
    return this.entryType !== 'values' && script.entry_kind !== 'values';
  }

  loadScripts(): void {
    this.hasLoadedScripts = true;
    this.isScriptsLoading = true;
    const requestPage = this.entryType === 'values' ? 1 : this.currentPage;
    this.feederService.getScripts({
      ruleKey: this.selectedRuleKey || undefined,
      entryType: this.entryType,
      page: requestPage,
      limit: this.pageSize,
    })
      .pipe(finalize(() => {
        this.isScriptsLoading = false;
      }))
      .subscribe({
        next: (response) => {
          this.deferStateUpdate(() => {
            this.rawScripts = response?.scripts ?? [];
            this.scriptTotal = response?.total ?? this.rawScripts.length;
            this.applyLocalSearch();
            if (this.selectedScript) {
              this.selectedScript = this.scripts.find(script => script.id === this.selectedScript?.id) ?? null;
            }
            if (this.highlightedScript && this.highlightedScript.id !== this.consumedHighlightedScriptId) {
              const matched = this.scripts.find(script => script.id === this.highlightedScript?.id);
              if (matched) {
                this.openScript(matched);
                this.consumedHighlightedScriptId = matched.id;
              }
            }
          });
        },
        error: (error) => {
          this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Failed to load feeder scripts'));
        }
      });
  }

  getScriptPathLabel(script: FeederScriptItem | null | undefined): string {
    if (script?.entry_kind === 'values') {
      return 'Stored Rule Values';
    }
    return script?.path ?? script?.url ?? 'Unknown Path';
  }

  getScriptExternalUrl(script: FeederScriptItem | null | undefined): string {
    const url = (script?.url ?? '').trim();
    if (!url) {
      return '';
    }
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  getSectionTitle(): string {
    if (this.entryType === 'values') {
      return 'Your Values';
    }
    return 'Your Scripts';
  }

  getSectionDescription(): string {
    if (this.entryType === 'values') {
      return 'Stored values for the selected platform.';
    }
    return 'Only scripts authored by your user are listed here.';
  }

  getEmptyStateDescription(): string {
    if (this.entryType === 'values') {
      return 'Use the Add tab to save URL values for this rule.';
    }
    return 'Use the Add tab to upload a parser or save URL values for this rule.';
  }

  getScriptDisplayName(script: FeederScriptItem): string {
    if (script.entry_kind === 'values') {
      return 'Stored Values';
    }
    return script.file_name ?? script.url ?? 'Untitled Entry';
  }

  getValueRowNumber(index: number): number {
    return ((this.currentPage - 1) * this.pageSize) + index + 1;
  }

  getValueStatus(value: FeederValueItem): 'success' | 'failure' | 'pending' {
    const runtimeStatus = this.getDateDerivedStatus(value.last_failure_date, value.last_success_date);
    if (runtimeStatus === 'success') {
      return 'success';
    }
    if (runtimeStatus === 'failed') {
      return 'failure';
    }
    if (value.status === 'success' || value.status === 'failure') {
      return value.status;
    }
    return 'pending';
  }

  getValueUpdatedAt(value: FeederValueItem): string | null {
    return value.last_checked_at ?? value.last_success_date ?? value.last_failure_date ?? null;
  }

  toggleSort(column: SortColumn): void {
    this.sortDirection = this.sortColumn === column && this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortColumn = column;
    this.applyLocalSearch();
  }

  getSortIcon(column: SortColumn): string {
    if (this.sortColumn !== column) {
      return '';
    }
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  hasValuePreview(value: FeederValueItem): boolean {
    return [
      value.last_success_date,
      value.last_success_message,
      value.last_failure_date,
      value.last_failure_message,
      value.last_error,
    ].some(Boolean);
  }

  toggleValuePreview(value: FeederValueItem): void {
    this.selectedValueUrl = this.selectedValueUrl === value.url ? null : value.url;
  }

  hasEntries(): boolean {
    return this.entryType === 'values' ? this.rawValues.length > 0 : this.scripts.length > 0;
  }

  toggleScript(script: FeederScriptItem): void {
    if (this.selectedScript?.id === script.id) {
      this.closeScriptPreview();
      return;
    }

    this.openScript(script);
  }

  closeScriptPreview(): void {
    this.selectedScript = null;
  }

  deleteScript(script: FeederScriptItem): void {
    this.feederService.deleteScript(script.id)
      .subscribe({
        next: (response) => {
          this.messageNotificationService.show(response?.message ?? this.translationService.translate('Script deleted successfully'), 'success');
          if (this.selectedScript?.id === script.id) {
            this.closeScriptPreview();
          }
          this.loadScripts();
        },
        error: (error) => {
          this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Failed to delete'));
        }
      });
  }

  deleteValue(script: FeederScriptItem, value: string): void {
    const url = value.trim();
    if (!url) {
      return;
    }

    this.feederService.deleteValue(script.id, url)
      .subscribe({
        next: (response) => {
          this.messageNotificationService.show(response?.message ?? this.translationService.translate('Value deleted successfully'), 'success');
          this.loadScripts();
        },
        error: (error) => {
          this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Failed to delete value'));
        }
      });
  }

  deleteAllValues(): void {
    const record = this.valuesRecord;
    if (!record || !this.rawValues.length) {
      return;
    }

    this.feederService.deleteAllValues(record.id)
      .subscribe({
        next: (response) => {
          this.messageNotificationService.show(response?.message ?? this.translationService.translate('Values deleted successfully'), 'success');
          this.selectedValueUrl = null;
          this.currentPage = 1;
          this.loadScripts();
        },
        error: (error) => {
          this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Failed to delete value'));
        }
      });
  }

  toggleScriptEnabled(script: FeederScriptItem): void {
    if (!this.canToggleScript(script)) {
      return;
    }

    this.feederService.toggleScript(script.id)
      .subscribe({
        next: (response) => {
          this.messageNotificationService.show(response?.message ?? this.translationService.translate('Script status updated successfully'), 'success');
          const updated = response?.script;
          if (updated) {
            this.rawScripts = this.rawScripts.map(item => item.id === updated.id ? updated : item);
            this.scripts = this.scripts.map(item => item.id === updated.id ? updated : item);
            this.displayedScripts = this.displayedScripts.map(item => item.id === updated.id ? updated : item);
            if (this.selectedScript?.id === updated.id) {
              this.selectedScript = updated;
            }
          }
          else {
            this.loadScripts();
          }
        },
        error: (error) => {
          this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Failed to update script status'));
        }
      });
  }

  clearAllForRule(selectedIds: string[] = []): void {
    if (selectedIds?.length) {
      this.deleteSelectedScripts(selectedIds);
      return;
    }

    if (!this.selectedRuleKey) {
      return;
    }

    this.feederService.clearAllForRule(this.selectedRuleKey)
      .subscribe({
        next: (response) => {
          this.messageNotificationService.show(response?.message ?? this.translationService.translate('Selected rule entries deleted successfully'), 'success');
          this.closeScriptPreview();
          this.clearScriptSelection();
          this.currentPage = 1;
          this.loadScripts();
        },
        error: (error) => {
          this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Failed to clear selected rule entries'));
        }
      });
  }

  setAllForRule(enabled: boolean, selectedIds: string[] = []): void {
    if (selectedIds?.length) {
      this.setSelectedScripts(enabled, selectedIds);
      return;
    }

    if (!this.selectedRuleKey) {
      return;
    }

    this.feederService.setAllForRule(this.selectedRuleKey, enabled)
      .subscribe({
        next: (response) => {
          const successMessage = this.translationService.translate(enabled
            ? 'Selected rule entries enabled successfully'
            : 'Selected rule entries disabled successfully');
          this.messageNotificationService.show(response?.message ?? successMessage, 'success');
          this.rawScripts = this.rawScripts.map(script => ({ ...script, enabled }));
          this.scripts = this.scripts.map(script => ({ ...script, enabled }));
          this.displayedScripts = this.displayedScripts.map(script => ({ ...script, enabled }));
          if (this.selectedScript) {
            this.selectedScript = { ...this.selectedScript, enabled };
          }
          this.clearScriptSelection();
        },
        error: (error) => {
          const errorMessage = this.translationService.translate(enabled
            ? 'Failed to enable selected rule entries'
            : 'Failed to disable selected rule entries');
          this.messageNotificationService.show(error?.error?.detail ?? errorMessage);
        }
      });
  }

  openOwnerDialog(script: FeederScriptItem): void {
    if (!this.canTransferOwnership()) {
      return;
    }
    this.ownerDialogScript = script;
    this.isOwnerDialogOpen = true;
  }

  closeOwnerDialog(): void {
    this.isOwnerDialogOpen = false;
    this.ownerDialogScript = null;
  }

  onOwnerTransferSaved(): void {
    this.closeOwnerDialog();
    this.loadScripts();
  }

  getOwnerLabel(script: FeederScriptItem): string {
    if (script.owner_name) {
      return script.owner_name;
    }
    if (!script.owner_id) {
      return 'Unknown';
    }
    return 'Assigned';
  }

  getExpandedColspan(): number {
    return this.canTransferOwnership() ? 9 : 8;
  }

  getRuntimeStatus(script: FeederScriptItem): 'failed' | 'success' | 'warning' | 'unknown' {
    return this.getDateDerivedStatus(script.last_failure_date, script.last_success_date);
  }

  isScriptSelected(script: FeederScriptItem): boolean {
    return this.selectedScriptIds.has(script.id);
  }

  beginScriptSelection(event: MouseEvent, script: FeederScriptItem): void {
    const usesSelectionModifier = event.shiftKey || event.ctrlKey || event.metaKey;
    if (this.entryType === 'values' || this.isInteractiveTarget(event.target) || (this.isTextSelectionTarget(event.target) && !usesSelectionModifier)) {
      return;
    }

    event.preventDefault();

    if (event.shiftKey) {
      this.selectScriptRange(script);
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      this.toggleScriptSelection(script.id);
      this.selectionAnchorScriptId = script.id;
      return;
    }

    this.isSelectingScripts = true;
    this.dragEnteredScriptIds = new Set([script.id]);
    this.selectedScriptIds = this.selectedScriptIds.size === 1 && this.selectedScriptIds.has(script.id) ? new Set<string>() : new Set([script.id]);
    this.selectionAnchorScriptId = script.id;
  }

  extendScriptSelection(script: FeederScriptItem): void {
    if (!this.isSelectingScripts || this.entryType === 'values' || this.dragEnteredScriptIds.has(script.id)) {
      return;
    }

    this.dragEnteredScriptIds.add(script.id);
    this.toggleScriptSelection(script.id);
  }

  leaveScriptSelection(script: FeederScriptItem): void {
    if (this.isSelectingScripts) {
      this.dragEnteredScriptIds.delete(script.id);
    }
  }

  @HostListener('document:mousedown', ['$event'])
  clearSelectionOnDocumentMouseDown(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest('[data-feeder-script-row="true"], [data-feeder-selection-action="true"]')) {
      return;
    }
    this.clearScriptSelection();
  }

  @HostListener('document:mouseup')
  endScriptSelection(): void {
    this.isSelectingScripts = false;
    this.dragEnteredScriptIds.clear();
  }

  private getDateDerivedStatus(lastFailureDate?: string | null, lastSuccessDate?: string | null): 'failed' | 'success' | 'warning' | 'unknown' {
    const failureTime = lastFailureDate ? Date.parse(lastFailureDate) : NaN;
    const successTime = lastSuccessDate ? Date.parse(lastSuccessDate) : NaN;
    const isStaleSuccess = !Number.isNaN(successTime) && successTime < Date.now() - this.oneDayMs;

    if (!Number.isNaN(failureTime)) {
      if (Number.isNaN(successTime) || successTime < failureTime - this.oneDayMs) {
        return 'failed';
      }
      if (isStaleSuccess) {
        return 'warning';
      }
      return 'success';
    }
    if (!Number.isNaN(successTime)) {
      if (isStaleSuccess) {
        return 'warning';
      }
      return 'success';
    }
    return 'unknown';
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadScripts();
    const container = document.getElementById('dashboard-container');
    if (container) {
      container.scrollTo({ top: 0, left: 0 });
    }
    else {
      window.scrollTo({ top: 0, left: 0 });
    }
  }

  onSearchInput(value: string): void {
    this.searchText = value;
    this.currentPage = 1;
    this.applyLocalSearch();
  }

  openConfirmation(action: 'clear' | 'delete' | 'toggle' | 'enableAll' | 'disableAll' | 'deleteValue' | 'deleteAllValues', script?: FeederScriptItem | null, value?: string): void {
    const selectedIds = action === 'clear' || action === 'enableAll' || action === 'disableAll'
      ? this.getSelectedScripts().map((selectedScript) => selectedScript.id)
      : [];
    this.pendingAction = { type: action, script: script ?? null, value: value ?? null, selectedIds };
    this.confirmationMessage = action === 'clear'
      ? 'Are you sure you want to delete all feeder entries for the selected rule?'
      : action === 'deleteAllValues'
        ? 'Are you sure you want to delete all values for the selected rule?'
        : action === 'enableAll'
          ? 'Are you sure you want to enable all feeder entries for the selected rule?'
          : action === 'disableAll'
            ? 'Are you sure you want to disable all feeder entries for the selected rule?'
            : action === 'deleteValue'
              ? `Are you sure you want to delete this value${value ? `: ${value}` : ''}?`
              : action === 'delete'
                ? `Are you sure you want to delete ${this.formatDisplayName(script)}?`
                : `Are you sure you want to ${script?.enabled ? 'disable' : 'enable'} ${this.formatDisplayName(script)}?`;
    this.isConfirmationOpen = true;
  }

  handleConfirmation(confirmed: boolean): void {
    const action = this.pendingAction;
    this.isConfirmationOpen = false;
    this.pendingAction = null;

    if (!confirmed || !action) {
      return;
    }

    if (action.type === 'clear') {
      this.clearAllForRule(action.selectedIds);
      return;
    }
    if (action.type === 'enableAll') {
      this.setAllForRule(true, action.selectedIds);
      return;
    }
    if (action.type === 'disableAll') {
      this.setAllForRule(false, action.selectedIds);
      return;
    }
    if (action.type === 'delete' && action.script) {
      this.deleteScript(action.script);
      return;
    }
    if (action.type === 'deleteValue' && action.script && action.value) {
      this.deleteValue(action.script, action.value);
      return;
    }
    if (action.type === 'deleteAllValues') {
      this.deleteAllValues();
      return;
    }
    if (action.type === 'toggle' && action.script) {
      this.toggleScriptEnabled(action.script);
    }
  }

  private ensureScriptsLoadedAndOpen(script: FeederScriptItem): void {
    if (!this.hasLoadedScripts) {
      this.loadScripts();
      return;
    }

    const matched = this.scripts.find((item) => item.id === script.id);
    if (matched) {
      this.openScript(matched);
      this.consumedHighlightedScriptId = matched.id;
    }
  }

  private openScript(script: FeederScriptItem): void {
    this.selectedScript = script;
  }

  private formatDisplayName(script: FeederScriptItem | null | undefined): string {
    return script ? this.getScriptDisplayName(script) : 'this entry';
  }

  private getSelectedScripts(selectedIds: Iterable<string> = this.selectedScriptIds): FeederScriptItem[] {
    const selectedIdSet = new Set(selectedIds);
    return this.displayedScripts.filter((script) => selectedIdSet.has(script.id));
  }

  private clearScriptSelection(): void {
    this.isSelectingScripts = false;
    this.selectionAnchorScriptId = null;
    this.dragEnteredScriptIds.clear();
    this.selectedScriptIds = new Set<string>();
  }

  private toggleScriptSelection(scriptId: string): void {
    const selectedIds = new Set(this.selectedScriptIds);
    if (selectedIds.has(scriptId)) {
      selectedIds.delete(scriptId);
    }
    else {
      selectedIds.add(scriptId);
    }
    this.selectedScriptIds = selectedIds;
  }

  private selectScriptRange(script: FeederScriptItem): void {
    const selectedIdList = Array.from(this.selectedScriptIds);
    const anchorId = this.selectionAnchorScriptId ?? selectedIdList[selectedIdList.length - 1] ?? script.id;
    const anchorIndex = this.displayedScripts.findIndex((item) => item.id === anchorId);
    const scriptIndex = this.displayedScripts.findIndex((item) => item.id === script.id);
    if (anchorIndex < 0 || scriptIndex < 0) {
      this.toggleScriptSelection(script.id);
      this.selectionAnchorScriptId = script.id;
      return;
    }

    const selectedIds = new Set(this.selectedScriptIds);
    const [fromIndex, toIndex] = [Math.min(anchorIndex, scriptIndex), Math.max(anchorIndex, scriptIndex)];
    this.displayedScripts.slice(fromIndex, toIndex + 1).forEach((item) => selectedIds.add(item.id));
    this.selectedScriptIds = selectedIds;
  }

  private deleteSelectedScripts(selectedIds: string[]): void {
    const selectedScripts = this.getSelectedScripts(selectedIds);
    if (!selectedScripts.length) {
      return;
    }

    const selectedIdSet = new Set(selectedIds);
    forkJoin(selectedScripts.map((script) => this.feederService.deleteScript(script.id)))
      .subscribe({
        next: () => {
          if (this.selectedScript && selectedIdSet.has(this.selectedScript.id)) {
            this.closeScriptPreview();
          }
          this.clearScriptSelection();
          this.currentPage = 1;
          this.loadScripts();
        },
        error: (error) => {
          this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Failed to delete'));
        }
      });
  }

  private setSelectedScripts(enabled: boolean, selectedIds: string[]): void {
    const selectedScripts = this.getSelectedScripts(selectedIds).filter((script) => this.canToggleScript(script));
    const targetScripts = selectedScripts.filter((script) => script.enabled !== enabled);
    if (!selectedScripts.length) {
      return;
    }

    if (!targetScripts.length) {
      this.clearScriptSelection();
      return;
    }

    const targetIdSet = new Set(targetScripts.map((script) => script.id));
    forkJoin(targetScripts.map((script) => this.feederService.toggleScript(script.id)))
      .subscribe({
        next: (responses) => {
          const updatedById = new Map<string, FeederScriptItem>();
          responses.forEach((response) => {
            if (response?.script) {
              updatedById.set(response.script.id, response.script);
            }
          });
          const updateScript = (script: FeederScriptItem): FeederScriptItem => updatedById.get(script.id) ?? (targetIdSet.has(script.id) ? { ...script, enabled } : script);
          this.rawScripts = this.rawScripts.map(updateScript);
          this.scripts = this.scripts.map(updateScript);
          this.displayedScripts = this.displayedScripts.map(updateScript);
          if (this.selectedScript) {
            this.selectedScript = updateScript(this.selectedScript);
          }
          this.clearScriptSelection();
        },
        error: (error) => {
          this.messageNotificationService.show(error?.error?.detail ?? this.translationService.translate('Failed to update script status'));
        }
      });
  }

  private isInteractiveTarget(target: EventTarget | null): boolean {
    const element = this.getEventElement(target);
    return !!element?.closest('button, input, textarea, select, a, [role="button"]');
  }

  private isTextSelectionTarget(target: EventTarget | null): boolean {
    const element = this.getEventElement(target);
    return !!element?.closest('[data-feeder-text-selectable="true"]');
  }

  private getEventElement(target: EventTarget | null): HTMLElement | null {
    if (target instanceof HTMLElement) {
      return target;
    }
    if (target instanceof Node && target.parentElement instanceof HTMLElement) {
      return target.parentElement;
    }
    return null;
  }

  hasStatusPreview(script: FeederScriptItem | null | undefined): boolean {
    return !!script && [
      script.url,
      script.last_success_date,
      script.last_success_message,
      script.last_failure_date,
      script.last_failure_message,
    ].some(Boolean);
  }

  formatPreviewMessage(message: string | null | undefined): string {
    if (!message) {
      return '-';
    }

    try {
      return JSON.stringify(this.stripEmbeddingField(JSON.parse(message)), null, 2);
    }
    catch {
      return message;
    }
  }

  private stripEmbeddingField(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.stripEmbeddingField(item));
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'm_embedding')
        .map(([key, nestedValue]) => [key, this.stripEmbeddingField(nestedValue)]);
      return Object.fromEntries(entries);
    }

    return value;
  }

  private applyLocalSearch(): void {
    const query = this.searchText.trim().toLowerCase();
    if (this.entryType === 'values') {
      const valuesRecord = this.rawScripts.find((script) => script.entry_kind === 'values') ?? null;
      const sharedValuesRecord = this.rawScripts.find((script) => script.entry_kind !== 'values' && !!(script.values || []).length) ?? null;
      this.valuesRecord = valuesRecord ?? sharedValuesRecord;
      const allValues = this.valuesRecord?.values ?? [];
      this.rawValues = [...allValues];
      const filteredValues = !query
        ? [...allValues]
        : allValues.filter((value) =>
          value.url.toLowerCase().includes(query)
          || (value.status ?? '').toLowerCase().includes(query)
          || (value.last_error ?? '').toLowerCase().includes(query));
      const totalValues = filteredValues.length;
      const sortedValues = this.sortColumn === 'status' && this.sortDirection
        ? [...filteredValues].sort((left, right) => {
          const result = this.getValueStatus(left).localeCompare(this.getValueStatus(right));
          return this.sortDirection === 'asc' ? result : -result;
        })
        : filteredValues;
      this.totalPages = Math.max(1, Math.ceil(totalValues / this.pageSize));
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
      const startIndex = (this.currentPage - 1) * this.pageSize;
      this.displayedValues = sortedValues.slice(startIndex, startIndex + this.pageSize);
      this.scripts = [];
      this.displayedScripts = [];
      return;
    }

    this.valuesRecord = null;
    if (!query) {
      this.scripts = [...this.rawScripts];
      this.displayedScripts = this.sortScripts(this.scripts);
      this.totalPages = Math.max(1, Math.ceil(this.scriptTotal / this.pageSize));
      return;
    }

    this.scripts = this.rawScripts.filter((script) => {
      const haystacks = [
        this.getScriptDisplayName(script),
        this.getScriptPathLabel(script),
        script.url ?? '',
        script.id,
      ];
      return haystacks.some(value => value.toLowerCase().includes(query));
    });
    this.displayedScripts = this.sortScripts(this.scripts);
    this.totalPages = 1;
  }

  private sortScripts(scripts: FeederScriptItem[]): FeederScriptItem[] {
    const sortColumn = this.sortColumn;
    const sortDirection = this.sortDirection;
    if (!sortColumn || !sortDirection) {
      return [...scripts];
    }
    return [...scripts].sort((left, right) => {
      const leftValue = this.getScriptSortValue(left, sortColumn);
      const rightValue = this.getScriptSortValue(right, sortColumn);
      const result = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue));
      return sortDirection === 'asc' ? result : -result;
    });
  }

  private getScriptSortValue(script: FeederScriptItem, column: SortColumn): string | number {
    switch (column) {
      case 'file':
        return this.getScriptDisplayName(script).toLowerCase();
      case 'owner':
        return this.getOwnerLabel(script).toLowerCase();
      case 'path':
        return this.getScriptPathLabel(script).toLowerCase();
      case 'active':
        return script.enabled ? 1 : 0;
      case 'status':
        return this.getRuntimeStatus(script);
      case 'lastSuccess':
        return this.getDateSortValue(script.last_success_date);
      case 'updated':
        return this.getDateSortValue(script.updated_at);
    }
  }

  private getDateSortValue(value?: string | null): number {
    const timestamp = value ? Date.parse(value) : NaN;
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private deferStateUpdate(callback: () => void): void {
    queueMicrotask(callback);
  }
}
