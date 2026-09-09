import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { NexusChatService } from '../nexus-chat.service';
import { NexusWorkspaceFileNode, NexusWorkspaceImportResponse } from '../model/ai-chat-session.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';
import { asUnknownRecord } from '../../../../shared/utils/type-guards.util';
import type { WorkspaceLogEntry, WorkspaceStatusType } from './model/ai-directory.model';
export type { WorkspaceLogEntry, WorkspaceStatusType } from './model/ai-directory.model';


type AiDirectoryViewMode = 'chat' | 'directory' | 'split';
type AiDirectoryTab = 'files' | 'logs';




@Component({
  selector: 'app-ai-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './ai-directory.html',
})
export class AiDirectory implements OnChanges, OnDestroy {
  private workspaceStatusRequest?: Subscription;
  private readonly workspaceFileChunkSize = 1000;
  private activeWorkspaceSessionId: string | null = null;
  private lastImportRequestId: string | null = null;
  private workspaceLogSequence = 0;

  workspaceStatusMessage = '';
  workspaceStatusType: WorkspaceStatusType = 'idle';
  workspaceLogs: WorkspaceLogEntry[] = [];
  workspaceLogSearch = '';
  activeDirectoryTab: AiDirectoryTab = 'files';
  workspaceTree: NexusWorkspaceFileNode | null = null;
  selectedWorkspaceFilePath = '';
  selectedWorkspaceFileContent = '';
  selectedWorkspaceFileLines: string[] = [];
  selectedWorkspaceFileHasMore = false;
  selectedWorkspaceFileNextStartLine: number | null = null;
  selectedWorkspaceFileLoading = false;
  repositoryImportMode = false;
  repositoryRepoUrl = '';

  @Input() sessionId: string | null = null;
  @Input() importRequest: { requestId: string; sessionId: string; repoUrl: string } | null = null;
  @Input() importBusy = false;
  @Input() viewMode: AiDirectoryViewMode = 'directory';

  @Output() importRequested = new EventEmitter<string>();

  constructor(private readonly nexusChatService: NexusChatService, private readonly cdr: ChangeDetectorRef, private readonly translationService: TranslationService) { }

  get filteredWorkspaceLogs(): WorkspaceLogEntry[] {
    const search = this.workspaceLogSearch.trim().toLowerCase();

    if (!search) {
      return this.workspaceLogs;
    }

    return this.workspaceLogs.filter((log) => {
      const level = log.type === 'loading' ? 'info' : log.type === 'approved' ? 'done' : log.type === 'infected' ? 'block' : 'error';
      return `${log.message} ${log.details} ${log.type} ${level}`.toLowerCase().includes(search);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.importRequest && this.importRequest) {
      if (this.importRequest.requestId === this.lastImportRequestId) {
        return;
      }

      this.lastImportRequestId = this.importRequest.requestId;
      this.activeWorkspaceSessionId = this.importRequest.sessionId;
      this.repositoryImportMode = false;
      this.repositoryRepoUrl = '';

      this.importGithubRepo(this.importRequest.repoUrl,
        this.importRequest.sessionId);

      return;
    }

    if (changes.sessionId) {
      this.workspaceStatusRequest?.unsubscribe();
      this.resetWorkspace(false);
      this.repositoryImportMode = false;
      this.repositoryRepoUrl = '';

      if (!this.sessionId) {
        this.activeWorkspaceSessionId = null;
        return;
      }

      this.activeWorkspaceSessionId = this.sessionId;
      this.loadExistingWorkspaceStatus();
      return;
    }

    if (changes.viewMode && this.viewMode !== 'chat' && this.sessionId) {
      this.workspaceStatusRequest?.unsubscribe();
      this.activeWorkspaceSessionId = this.sessionId;
      this.loadExistingWorkspaceStatus();
    }
  }

  ngOnDestroy(): void {
    this.workspaceStatusRequest?.unsubscribe();
  }

  toggleRepositoryImport(): void {
    this.repositoryImportMode = !this.repositoryImportMode;
  }

  selectDirectoryTab(tab: AiDirectoryTab): void {
    this.activeDirectoryTab = tab;

    if (tab !== 'logs' || !this.sessionId) {
      return;
    }

    this.workspaceStatusRequest?.unsubscribe();
    this.activeWorkspaceSessionId = this.sessionId;
    this.loadExistingWorkspaceStatus();
  }

  submitRepositoryImport(): void {
    const repoUrl = this.repositoryRepoUrl.trim();

    if (!repoUrl || this.importBusy || this.workspaceStatusType === 'loading') {
      return;
    }

    this.importRequested.emit(repoUrl);
  }

  importGithubRepo(repoUrl: string, sessionId = this.sessionId): void {
    if (!sessionId || !repoUrl.trim() || this.workspaceStatusType === 'loading') {
      return;
    }

    this.activeWorkspaceSessionId = sessionId;
    this.repositoryRepoUrl = repoUrl.trim();

    this.workspaceStatusRequest?.unsubscribe();

    this.updateWorkspaceStatus('loading', this.translate('Repository import started. Downloading and scanning...'));
    this.resetWorkspace(true);

    this.nexusChatService.importGithubRepo(sessionId, this.repositoryRepoUrl).subscribe({
      next: (response) => {
        const result = response.result ?? response;

        if (result.status === 'processing') {
          this.updateWorkspaceStatus('loading',
            result.message || this.translate('Repository is being processed...'),
            result.scan_output,);
          this.pollWorkspaceStatus(sessionId);
          return;
        }

        this.handleWorkspaceImportResult(response);
      },
      error: (error) => {
        this.updateWorkspaceStatus('failed', this.getApiErrorMessage(error));
      },
    });
  }

  loadWorkspaceTree(path = '', targetNode?: NexusWorkspaceFileNode): void {
    const sessionId = this.activeWorkspaceSessionId ?? this.sessionId;

    if (!sessionId) {
      return;
    }

    if (targetNode) {
      targetNode.loading = true;
    }

    this.nexusChatService.getWorkspaceTree(sessionId, path).subscribe({
      next: (response) => {
        const result = response.result ?? response;
        const loadedNode = result.tree;

        if (!loadedNode) {
          console.error('Workspace tree failed:', response);

          if (targetNode) {
            targetNode.loading = false;
            this.cdr.markForCheck();
            return;
          }

          this.workspaceTree = null;
          this.updateWorkspaceStatus('failed',
            result.message ?? this.translate('Repository scanned, but file tree was not found.'),);
          return;
        }

        if (targetNode) {
          targetNode.children = loadedNode.children ?? [];
          targetNode.children_loaded = true;
          targetNode.expanded = true;
          targetNode.loading = false;
          this.cdr.markForCheck();
          return;
        }

        this.workspaceTree = {
          ...loadedNode,
          expanded: true,
          children_loaded: true,
          children: loadedNode.children ?? [],
        };
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Workspace tree API error:', error);

        if (targetNode) {
          targetNode.loading = false;
          this.cdr.markForCheck();
          return;
        }

        const detail = error?.error?.detail?.detail ?? error?.error?.detail ?? error?.error;

        if (detail?.status === 'not_found') {
          this.workspaceTree = null;
          this.clearWorkspaceStatus();
          return;
        }

        this.workspaceTree = null;
        this.updateWorkspaceStatus('failed', this.translate('Unable to load repository file tree.'));
      },
    });
  }

  toggleWorkspaceDirectory(node: NexusWorkspaceFileNode): void {
    if (node.type !== 'directory') {
      return;
    }

    if (node.children_loaded) {
      node.expanded = !node.expanded;
      return;
    }

    this.loadWorkspaceTree(node.path, node);
  }

  openWorkspaceFile(node: NexusWorkspaceFileNode): void {
    const sessionId = this.activeWorkspaceSessionId ?? this.sessionId;

    if (!sessionId || node.type !== 'file') {
      return;
    }

    this.selectedWorkspaceFilePath = node.path;
    this.selectedWorkspaceFileContent = '';
    this.selectedWorkspaceFileLines = [];
    this.selectedWorkspaceFileHasMore = false;
    this.selectedWorkspaceFileNextStartLine = null;
    this.selectedWorkspaceFileLoading = false;

    this.loadWorkspaceFileChunk(node.path, 1, true);
  }

  loadWorkspaceFileChunk(path: string, startLine = 1, reset = false): void {
    const sessionId = this.activeWorkspaceSessionId ?? this.sessionId;

    if (!sessionId || this.selectedWorkspaceFileLoading) {
      return;
    }

    this.selectedWorkspaceFileLoading = true;

    this.nexusChatService
      .getWorkspaceFile(sessionId, path, startLine, this.workspaceFileChunkSize)
      .subscribe({
        next: (response) => {
          const content = response.content || '';

          if (reset) {
            this.selectedWorkspaceFileContent = content;
          }
          else {
            this.selectedWorkspaceFileContent += content;
          }

          this.selectedWorkspaceFileLines = this.selectedWorkspaceFileContent.split('\n');
          this.selectedWorkspaceFileHasMore = response.has_more;
          this.selectedWorkspaceFileNextStartLine = response.next_start_line ?? null;
          this.selectedWorkspaceFileLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.selectedWorkspaceFileLoading = false;

          if (reset) {
            this.selectedWorkspaceFileContent =
              this.getApiErrorMessage(error) || this.translate('Unable to read file.');
            this.selectedWorkspaceFileLines = this.selectedWorkspaceFileContent.split('\n');
          }

          this.cdr.markForCheck();
        },
      });
  }

  onWorkspaceFileScroll(event: Event): void {
    const element = event.target;
    if (!(element instanceof HTMLElement)) {
      return;
    }

    const nearBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 200;

    if (
      nearBottom &&
      this.selectedWorkspaceFileHasMore &&
      this.selectedWorkspaceFileNextStartLine &&
      !this.selectedWorkspaceFileLoading &&
      this.selectedWorkspaceFilePath
    ) {
      this.loadWorkspaceFileChunk(this.selectedWorkspaceFilePath,
        this.selectedWorkspaceFileNextStartLine,
        false);
    }
  }

  private pollWorkspaceStatus(sessionId: string): void {
    this.workspaceStatusRequest?.unsubscribe();

    this.workspaceStatusRequest = timer(0, 500).subscribe(() => {
      this.nexusChatService.getWorkspaceStatus(sessionId).subscribe({
        next: (response) => {
          const result = response.result ?? response;

          if (result.status === 'processing') {
            this.updateWorkspaceStatus('loading',
              result.message || this.translate('Repository is still processing...'),
              result.scan_output,);
            return;
          }

          this.workspaceStatusRequest?.unsubscribe();
          this.handleWorkspaceImportResult(response);
        },
        error: (error) => {
          this.workspaceStatusRequest?.unsubscribe();
          this.updateWorkspaceStatus('failed', this.getApiErrorMessage(error));
        },
      });
    });
  }

  private handleWorkspaceImportResult(response: NexusWorkspaceImportResponse): void {
    const result = response.result ?? response;

    this.repositoryRepoUrl = result.repo_url ?? this.repositoryRepoUrl;

    if (result.status === 'approved') {
      this.updateWorkspaceStatus('approved',
        result.message || this.translate('Repository imported and scanned successfully.'),
        result.scan_output,);
      this.loadWorkspaceTree();
      return;
    }

    if (result.status === 'infected') {
      this.updateWorkspaceStatus('infected',
        result.message || this.translate('Repository blocked because a threat was detected.'),
        result.scan_output ?? result.error,);
      return;
    }

    this.updateWorkspaceStatus('failed',
      result.message ?? result.error ?? this.translate('Repository import failed.'),
      result.error ?? result.scan_output,);
  }

  private resetWorkspace(keepStatus: boolean): void {
    if (!keepStatus) {
      this.clearWorkspaceStatus();
      this.workspaceLogs = [];
      this.workspaceLogSearch = '';
      this.workspaceLogSequence = 0;
      this.activeDirectoryTab = 'files';
    }

    this.workspaceTree = null;
    this.selectedWorkspaceFilePath = '';
    this.selectedWorkspaceFileContent = '';
    this.selectedWorkspaceFileLines = [];
    this.selectedWorkspaceFileHasMore = false;
    this.selectedWorkspaceFileNextStartLine = null;
    this.selectedWorkspaceFileLoading = false;
  }

  private getApiErrorMessage(error: unknown): string {
    const errorRecord = asUnknownRecord(error);
    const nestedError = asUnknownRecord(errorRecord.error);
    const detail = nestedError.detail ?? errorRecord.error;

    if (typeof detail === 'string') {
      return detail;
    }

    const detailRecord = asUnknownRecord(detail);
    return String(detailRecord.message ?? detailRecord.error ?? errorRecord.message ?? this.translate('Request failed.'));
  }

  private clearWorkspaceStatus(): void {
    this.workspaceStatusType = 'idle';
    this.workspaceStatusMessage = '';
    this.cdr.markForCheck();
  }

  private updateWorkspaceStatus( type: Exclude<WorkspaceStatusType, 'idle'>, message: string, details = '', ): void {
    const normalizedMessage = message.trim();
    const normalizedDetails = details?.trim() || '';

    this.workspaceStatusType = type;
    this.workspaceStatusMessage = normalizedMessage;
    this.cdr.markForCheck();

    if (!normalizedMessage) {
      return;
    }

    const latestEntry = this.workspaceLogs[0];

    if (latestEntry?.type === type && latestEntry.message === normalizedMessage) {
      if (normalizedDetails && latestEntry.details !== normalizedDetails) {
        this.workspaceLogs = [
          {
            ...latestEntry,
            details: normalizedDetails,
            timestamp: new Date(),
          },
          ...this.workspaceLogs.slice(1),
        ];
      }

      return;
    }

    this.workspaceLogs = [
      {
        id: ++this.workspaceLogSequence,
        message: normalizedMessage,
        details: normalizedDetails,
        timestamp: new Date(),
        type,
      },
      ...this.workspaceLogs,
    ].slice(0, 100);
  }

  private translate(key: string): string {
    return this.translationService.translate(key);
  }

  private loadExistingWorkspaceStatus(): void {
    const sessionId = this.activeWorkspaceSessionId ?? this.sessionId;

    if (!sessionId) {
      return;
    }

    this.nexusChatService.getWorkspaceStatus(sessionId).subscribe({
      next: (response) => {
        const result = response.result ?? response;

        this.repositoryRepoUrl = result.repo_url ?? '';

        if (result.status === 'approved') {
          this.updateWorkspaceStatus('approved',
            result.message || this.translate('Repository is ready.'),
            result.scan_output,);
          this.loadWorkspaceTree();
          return;
        }

        if (result.status === 'processing') {
          this.updateWorkspaceStatus('loading',
            result.message || this.translate('Repository is still processing...'),
            result.scan_output,);
          this.pollWorkspaceStatus(sessionId);
          return;
        }

        if (result.status === 'infected') {
          this.updateWorkspaceStatus('infected',
            result.message || this.translate('Repository blocked because a threat was detected.'),
            result.scan_output ?? result.error,);
          return;
        }

        if (['failed', 'timeout', 'error'].includes(result.status)) {
          this.updateWorkspaceStatus('failed',
            result.message ?? result.error ?? this.translate('Repository import failed.'),
            result.error ?? result.scan_output,);
          this.workspaceTree = null;
          return;
        }

        this.clearWorkspaceStatus();
        this.workspaceTree = null;
      },
      error: (error) => {
        this.workspaceTree = null;

        const detail = error?.error?.detail ?? error?.error;

        if (error?.status === 404 || detail?.status === 'not_found') {
          this.clearWorkspaceStatus();
          return;
        }

        this.updateWorkspaceStatus('failed', this.getApiErrorMessage(error));
      },
    });
  }
}
