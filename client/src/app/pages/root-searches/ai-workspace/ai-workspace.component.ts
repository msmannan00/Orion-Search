import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AppService } from '../../../services/core/app/app.service';
import { AiWorkspaceMessage, AiWorkspaceTrigger } from './model/ai-workspace-message.model';
import { AiWorkspacePrompt } from '../../../shared/constants/shared-enums';
import { ResultRowHelperService } from '../../../shared/services/result-row-helper.service';
import { NexusChatService } from './nexus-chat.service';
import { BotMessageActionsComponent } from './bot-message-actions/bot-message-actions.component';
import { MessageScrollRailComponent } from './message-scroll-rail/message-scroll-rail.component';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AiChatSession, NexusChatMessage, NexusChatSession } from './model/ai-chat-session.model';
import { AiChatSidebarComponent } from './ai-chat-sidebar/ai-chat-sidebar.component';
import { ProfileComponent } from '../../../shared/partials/profile/profile.component';
import { AiDirectory } from './ai-directory/ai-directory';
import { TranslationService } from '../../../shared/services/translation.service';
import type { PendingNexusStream } from './model/ai-workspace.model';
export type { PendingNexusStream } from './model/ai-workspace.model';


type AiWorkspaceViewMode = 'chat' | 'directory' | 'split';



@Component({
  selector: 'app-ai-workspace',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, BotMessageActionsComponent, MessageScrollRailComponent, AiChatSidebarComponent, AiDirectory, MarkdownPipe, ProfileComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './ai-workspace.component.html',
})
export class AiWorkspaceComponent implements OnInit, OnDestroy {
  private readonly pendingStreamStorageKey = 'orion.nexus.pending-stream';
  private activeChatRequest?: Subscription;
  private chatHistoryRequest?: Subscription;
  private resumedRequestId: string | null = null;
  private activeSplitPointerId: number | null = null;
  private composerHistoryIndex = -1;
  private composerHistorySessionId: string | null = null;
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;
  @ViewChild('composerInput') private composerInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('workspacePanels') private workspacePanels?: ElementRef<HTMLElement>;

  protected activeRequestSessionId: string | null = null;
  protected readonly quickPrompts = Object.values(AiWorkspacePrompt);
  protected readonly isSending = signal(false);
  protected readonly isLoadingHistory = signal(true);
  protected readonly copiedMessageId = signal<string | null>(null);
  protected readonly nexusStep = signal('');
  protected readonly maxComposerTokens = 300;
  protected creatingNewChat = false;
  protected clearingChats = false;
  protected workspaceViewMode: AiWorkspaceViewMode = 'chat';
  protected directorySplitPercent = 42;
  protected directoryImportBusy = false;
  protected directorySessionId: string | null = null;
  protected directoryImportRequest: { requestId: string; sessionId: string; repoUrl: string } | null = null;

  messageDraft = '';
  editingMessageId: string | null = null;
  editDraft = '';
  messages: AiWorkspaceMessage[] = [];
  composerExpanded = false;
  composerRows = 1;
  composerScrollable = false;
  activeSessionId: string | null = null;
  chatSessions: AiChatSession[] = [];

  constructor(protected readonly appService: AppService, private readonly router: Router, private readonly route: ActivatedRoute, private readonly nexusChatService: NexusChatService, private readonly resultRowHelper: ResultRowHelperService, private readonly cdr: ChangeDetectorRef, private readonly translationService: TranslationService) { }

  ngOnInit(): void {
    const requestedView = this.route.snapshot.queryParamMap.get('view');
    if (requestedView === 'chat' || requestedView === 'directory' || requestedView === 'split') {
      this.workspaceViewMode = requestedView;
    }
    else {
      void this.router.navigate([], { relativeTo: this.route, queryParams: { view: 'chat' }, queryParamsHandling: 'merge', replaceUrl: true });
    }
    this.loadBackendChatSessions();
  }

  ngOnDestroy(): void {
    this.detachActiveNexusRequest();
    this.chatHistoryRequest?.unsubscribe();
  }

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    this.detachActiveNexusRequest();
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    this.router.navigate(['/dashboard/home']).then();
  }

  protected setWorkspaceViewMode(mode: AiWorkspaceViewMode): void {
    if (this.workspaceViewMode === mode) {
      return;
    }
    this.workspaceViewMode = mode;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { view: mode }, queryParamsHandling: 'merge', replaceUrl: true });
    this.activeSplitPointerId = null;
    if (mode === 'split') {
      this.setDirectorySplitPercent(this.directorySplitPercent);
    }
    requestAnimationFrame(() => {
      if (mode !== 'directory') {
        this.queueComposerResize();
        this.scrollToBottom();
      }
    });
  }

  protected startDirectoryResize(event: PointerEvent): void {
    if (this.workspaceViewMode !== 'split') {
      return;
    }
    event.preventDefault();
    this.activeSplitPointerId = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.resizeDirectoryPanel(event);
  }

  protected resizeDirectoryPanel(event: PointerEvent): void {
    if (event.pointerId !== this.activeSplitPointerId) {
      return;
    }
    const panelBounds = this.workspacePanels?.nativeElement.getBoundingClientRect();
    if (!panelBounds?.width) {
      return;
    }
    this.setDirectorySplitPercent((panelBounds.right - event.clientX) / panelBounds.width * 100);
  }

  protected stopDirectoryResize(event: PointerEvent): void {
    if (event.pointerId !== this.activeSplitPointerId) {
      return;
    }
    const divider = event.currentTarget;
    if (!(divider instanceof HTMLElement)) {
      return;
    }
    if (divider.hasPointerCapture(event.pointerId)) {
      divider.releasePointerCapture(event.pointerId);
    }
    this.activeSplitPointerId = null;
  }

  protected resizeDirectoryWithKeyboard(event: KeyboardEvent): void {
    let nextPercent: number | null = null;
    if (event.key === 'ArrowLeft') {
      nextPercent = this.directorySplitPercent + 2;
    }
    else if (event.key === 'ArrowRight') {
      nextPercent = this.directorySplitPercent - 2;
    }
    else if (event.key === 'Home') {
      nextPercent = 0;
    }
    else if (event.key === 'End') {
      nextPercent = 100;
    }
    if (nextPercent === null) {
      return;
    }
    event.preventDefault();
    this.setDirectorySplitPercent(nextPercent);
  }

  sendMessage(): void {
    if (this.clearingChats || this.isActiveChatSending) {
      return;
    }

    const text = this.messageDraft.trim();

    if (!text || this.countMessageTokens(text) > this.maxComposerTokens) {
      return;
    }

    if (this.isAnotherChatSending) {
      this.cancelRunningNexusStream();
    }

    this.cancelMessageEdit();
    this.detachActiveNexusRequest();
    const requestId = this.resumedRequestId ?? crypto.randomUUID();
    this.resumedRequestId = null;

    const sendToSession = (sessionId: string, sessionMessages: AiWorkspaceMessage[], shouldNameNewChat = false) => {
      const baselineMessageCount = sessionMessages.length;
      this.composerHistoryIndex = -1;
      this.composerHistorySessionId = sessionId;
      this.messageDraft = '';
      this.queueComposerResize();

      this.isSending.set(true);
      this.activeRequestSessionId = sessionId;
      this.nexusStep.set('Thinking');
      const requestMessages: AiWorkspaceMessage[] = [
        ...sessionMessages,
        { id: `pending-user-${requestId}`, sender: 'user', text, time: new Date() },
      ];
      this.updateSessionMessages(sessionId, requestMessages);
      if (shouldNameNewChat) {
        this.nameNewChatFromPrompt(sessionId, text);
      }
      this.writePendingStream({ requestId, sessionId, message: text, baselineMessageCount });
      if (this.activeSessionId === sessionId) {
        this.scrollToBottom();
      }

      let reply = '';
      let triggers: AiWorkspaceTrigger[] | undefined;
      let finished = false;
      const finishRequest = () => {
        this.clearPendingStream();
        this.isSending.set(false);
        this.nexusStep.set('');
        if (this.activeRequestSessionId === sessionId) {
          this.activeRequestSessionId = null;
        }
        this.activeChatRequest = undefined;
      };
      const fail = (errorText = this.translationService.translate('Something went wrong. Try again.')) => {
        if (finished) {
          return;
        }
        finished = true;
        this.updateSessionMessages(sessionId, [...requestMessages, this.createErrorMessage(text, errorText)]);
        finishRequest();
        if (this.activeSessionId === sessionId) {
          this.scrollToBottom();
        }
      };
      const complete = () => {
        if (finished) {
          return;
        }
        if (!reply.trim()) {
          fail(this.translationService.translate('Nexus returned no response. Try again.'));
          return;
        }
        finished = true;
        const now = new Date();
        const completedMessages: AiWorkspaceMessage[] = [
          ...requestMessages,
          { id: crypto.randomUUID(), sender: 'bot', text: reply, time: now, triggers },
        ];

        this.updateSessionMessages(sessionId, completedMessages, now.toISOString());
        finishRequest();
        if (this.activeSessionId === sessionId) {
          this.scrollToBottom();
        }
      };

      this.activeChatRequest = this.nexusChatService.streamNexusChat({ message: text, request_id: requestId, session_id: sessionId, session_type: 'persistent', tool: 'open_chat' }).subscribe({
        next: (chunk) => {
          if (chunk.status) {
            this.nexusStep.set(chunk.status);
            this.cdr.detectChanges();
          }
          if (chunk.error) {
            fail(chunk.response ?? this.translationService.translate('Something went wrong. Try again.'));
            return;
          }
          if (chunk.delta) {
            reply += chunk.delta;
          }
          if (chunk.response) {
            reply = chunk.response;
          }
          if (chunk.triggers?.length) {
            triggers = chunk.triggers;
          }
        },
        complete,
        error: () => {
          fail();
        },
      });
    };

    if (this.activeSessionId) {
      const activeSession = this.chatSessions.find(chat => chat.sessionId === this.activeSessionId);
      sendToSession(this.activeSessionId, [...this.messages], activeSession?.title.trim().toLowerCase() === 'new chat');
    }
  }

  onComposerKeydown(event: KeyboardEvent): void {
    const historyDirection = event.key === 'ArrowUp' ? 'older' : event.key === 'ArrowDown' ? 'newer' : null;

    if (historyDirection && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && this.navigateUserMessageHistory(historyDirection)) {
      event.preventDefault();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  resizeComposer(): void {
    const textarea = this.composerInput?.nativeElement;
    if (!textarea) {
      return;
    }

    const lineCount = this.getComposerLineCount(textarea);
    this.composerRows = Math.min(5, lineCount);
    this.composerScrollable = lineCount > 5;
    this.composerExpanded = this.composerRows > 1;
  }

  private navigateUserMessageHistory(direction: 'older' | 'newer'): boolean {
    if (!this.activeSessionId) {
      return false;
    }

    const history = this.messages
      .filter(message => message.sender === 'user')
      .map(message => message.text)
      .reverse();

    if (!history.length) {
      return false;
    }

    if (this.composerHistorySessionId !== this.activeSessionId) {
      this.composerHistorySessionId = this.activeSessionId;
      this.composerHistoryIndex = -1;
    }

    if (this.composerHistoryIndex >= 0 && this.messageDraft !== history[this.composerHistoryIndex]) {
      this.composerHistoryIndex = -1;
      return false;
    }

    if (direction === 'older') {
      if (this.composerHistoryIndex < 0 && this.messageDraft.trim()) {
        return false;
      }

      this.composerHistoryIndex = Math.min(this.composerHistoryIndex + 1, history.length - 1);
    }
    else {
      if (this.composerHistoryIndex < 0) {
        return false;
      }

      this.composerHistoryIndex--;
    }

    this.messageDraft = this.composerHistoryIndex < 0 ? '' : history[this.composerHistoryIndex];
    this.queueComposerResize();

    requestAnimationFrame(() => {
      const textarea = this.composerInput?.nativeElement;
      textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    });

    return true;
  }

  usePrompt(prompt: string): void {
    this.messageDraft = prompt;
    this.queueComposerResize();
  }

  retryMessage(message: AiWorkspaceMessage): void {
    const prompt = message.retryPayload?.trim();
    if (!prompt) {
      return;
    }
    const errorIndex = this.messages.findIndex(item => item.id === message.id);
    const failedUserIndex = errorIndex > 0 && this.messages[errorIndex - 1].sender === 'user'
      ? errorIndex - 1
      : errorIndex;
    if (failedUserIndex >= 0) {
      this.messages = this.messages.slice(0, failedUserIndex);
    }
    this.cancelMessageEdit();
    this.messageDraft = prompt;
    this.sendMessage();
  }

  stopMessageGeneration(): void {
    this.cancelRunningNexusStream();
    this.scrollToBottom();
  }

  startNewChat(): void {
    if (this.clearingChats) {
      return;
    }

    this.cancelRunningNexusStream();

    const emptyChat = this.chatSessions.find(chat => chat.messageCount === 0 && chat.messages.length === 0 &&
      chat.title.trim().toLowerCase() === 'new chat');
    if (emptyChat) {
      this.activeSessionId = emptyChat.sessionId;
      this.syncDirectorySession(emptyChat.sessionId);
      this.messages = [];
      this.messageDraft = '';
      this.cancelMessageEdit();
      this.queueComposerResize();
      this.scrollToBottom();
      return;
    }

    if (this.creatingNewChat) {
      return;
    }

    this.createEmptyChat();
  }

  clearAllChats(): void {
    if (this.clearingChats || this.creatingNewChat || !this.chatSessions.length) {
      return;
    }

    this.cancelRunningNexusStream();
    this.clearingChats = true;
    this.chatHistoryRequest?.unsubscribe();
    this.chatHistoryRequest = undefined;
    this.cancelMessageEdit();

    this.nexusChatService.deleteAllChatSessions().pipe(switchMap(() => {
      this.chatSessions = [];
      this.activeSessionId = null;
      this.syncDirectorySession(null);
      this.messages = [];
      this.messageDraft = '';
      this.clearPendingStream();
      this.queueComposerResize();
      this.cdr.detectChanges();
      return this.nexusChatService.createChat();
    })).subscribe({
      next: (session) => {
        const newChatSession = this.mapSession(session);
        this.chatSessions = [newChatSession];
        this.activeSessionId = newChatSession.sessionId;
        this.syncDirectorySession(newChatSession.sessionId);
        this.messages = [];
        this.cdr.detectChanges();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.clearingChats = false;
            this.cdr.detectChanges();
            this.scrollToBottom();
          });
        });
      },
      error: () => {
        this.clearingChats = false;
      },
    });
  }

  private createEmptyChat(): void {
    this.creatingNewChat = true;
    this.nexusChatService.createChat().subscribe({
      next: (session) => {
        const newChatSession = this.mapSession(session);
        this.creatingNewChat = false;
        this.chatSessions = this.sortChatSessions([
          newChatSession,
          ...this.chatSessions.filter(chat => chat.sessionId !== newChatSession.sessionId),
        ]);
        this.activeSessionId = newChatSession.sessionId;
        this.syncDirectorySession(newChatSession.sessionId);
        this.messages = [];
        this.messageDraft = '';
        this.cancelMessageEdit();
        this.queueComposerResize();
        this.scrollToBottom();
      },
      error: () => {
        this.creatingNewChat = false;
      },
    });
  }

  submitDirectoryImport(repoUrl: string): void {
    const normalizedRepoUrl = repoUrl.trim();

    if (!normalizedRepoUrl || this.directoryImportBusy) {
      return;
    }

    this.ensureBackendSessionForDirectory((sessionId) => {
      this.directorySessionId = sessionId;
      this.directoryImportRequest = {
        requestId: crypto.randomUUID(),
        sessionId,
        repoUrl: normalizedRepoUrl,
      };
    });
  }

  private ensureBackendSessionForDirectory(next: (sessionId: string) => void): void {
    if (this.activeSessionId) {
      this.directorySessionId = this.activeSessionId;
      next(this.activeSessionId);
      return;
    }

    this.directoryImportBusy = true;

    this.nexusChatService.createChat().subscribe({
      next: (session) => {
        const mappedSession = this.mapSession(session);

        this.chatSessions = this.sortChatSessions([
          mappedSession,
          ...this.chatSessions.filter(chat => chat.sessionId !== mappedSession.sessionId),
        ]);

        this.activeSessionId = mappedSession.sessionId;
        this.directorySessionId = mappedSession.sessionId;
        this.messages = [];
        this.directoryImportBusy = false;

        next(mappedSession.sessionId);
      },
      error: () => {
        this.directoryImportBusy = false;
      },
    });
  }

  trackMessage(_index: number, message: AiWorkspaceMessage): string {
    return message.id;
  }

  canEditMessage(message: AiWorkspaceMessage): boolean {
    return !this.isSending() && message.sender === 'user';
  }

  copyMessage(message: AiWorkspaceMessage, event?: MouseEvent): void {
    event?.stopPropagation();
    const text = message.text.trim();
    if (!text) {
      return;
    }
    this.resultRowHelper.copyToClipboard(text).subscribe((ok) => {
      this.copiedMessageId.set(ok ? message.id : null);
      setTimeout(() => {
        this.copiedMessageId.set(null);
      }, 1200);
    });
  }

  async downloadTrigger(trigger: AiWorkspaceTrigger, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    await this.nexusChatService.downloadTrigger(trigger);
  }

  startMessageEdit(message: AiWorkspaceMessage): void {
    if (!this.canEditMessage(message)) {
      return;
    }
    this.editingMessageId = message.id;
    this.editDraft = message.text;
    requestAnimationFrame(() => {
      const textarea = document.getElementById(`ai-message-edit-${message.id}`);
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    });
  }

  cancelMessageEdit(): void {
    this.editingMessageId = null;
    this.editDraft = '';
  }

  saveMessageEdit(message: AiWorkspaceMessage): void {
    const text = this.editDraft.trim();
    const index = this.messages.findIndex(item => item.id === message.id);
    if (!text || index === -1 || this.countMessageTokens(text) > this.maxComposerTokens) {
      return;
    }

    this.detachActiveNexusRequest();
    this.isSending.set(false);
    this.nexusStep.set('');
    this.messages = this.messages.slice(0, index);
    this.messageDraft = text;
    this.cancelMessageEdit();
    this.queueComposerResize();
    this.sendMessage();
  }

  onEditKeydown(event: KeyboardEvent, message: AiWorkspaceMessage): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelMessageEdit();
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.saveMessageEdit(message);
    }
  }

  protected get messageDraftTokenCount(): number {
    return this.countMessageTokens(this.messageDraft);
  }

  protected get messageDraftTokenOverflow(): number {
    return Math.max(0, this.messageDraftTokenCount - this.maxComposerTokens);
  }

  protected get isMessageDraftOverLimit(): boolean {
    return this.messageDraftTokenOverflow > 0;
  }

  protected get isActiveChatSending(): boolean {
    return this.isSending() && this.activeSessionId === this.activeRequestSessionId;
  }

  protected get isAnotherChatSending(): boolean {
    return this.isSending() && this.activeSessionId !== this.activeRequestSessionId;
  }

  protected get editDraftTokenCount(): number {
    return this.countMessageTokens(this.editDraft);
  }

  protected get editDraftTokenOverflow(): number {
    return Math.max(0, this.editDraftTokenCount - this.maxComposerTokens);
  }

  protected get isEditDraftOverLimit(): boolean {
    return this.editDraftTokenOverflow > 0;
  }

  private cancelActiveNexusRequest(): void {
    if (Boolean(this.activeChatRequest) || this.isSending()) {
      this.nexusChatService.cancelNexusChat();
    }
    this.activeChatRequest?.unsubscribe();
    this.activeChatRequest = undefined;
  }

  private cancelRunningNexusStream(): void {
    this.cancelActiveNexusRequest();
    this.clearPendingStream();
    this.isSending.set(false);
    this.activeRequestSessionId = null;
    this.nexusStep.set('');
  }

  private detachActiveNexusRequest(): void {
    this.activeChatRequest?.unsubscribe();
    this.activeChatRequest = undefined;
  }

  private createErrorMessage(text: string, errorText = this.translationService.translate('Something went wrong. Try again.')): AiWorkspaceMessage {
    return {
      id: crypto.randomUUID(),
      sender: 'error',
      text: errorText.trim() || this.translationService.translate('Something went wrong. Try again.'),
      time: new Date(),
      retryPayload: text,
    };
  }

  private updateSessionMessages(sessionId: string, messages: AiWorkspaceMessage[], updatedAt = new Date().toISOString()): void {
    this.chatSessions = this.sortChatSessions(this.chatSessions.map(session =>
      session.sessionId === sessionId
        ? { ...session, updatedAt, messageCount: messages.length, messages }
        : session));
    if (this.activeSessionId === sessionId) {
      this.messages = messages;
    }
  }

  private writePendingStream(pending: PendingNexusStream): void {
    try {
      sessionStorage.setItem(this.pendingStreamStorageKey, JSON.stringify(pending));
    }
    catch (error) {
      void error;
    }
  }

  private readPendingStream(): PendingNexusStream | null {
    try {
      const value = sessionStorage.getItem(this.pendingStreamStorageKey);
      if (!value) {
        return null;
      }
      const pending = JSON.parse(value) as Partial<PendingNexusStream>;
      if (!pending.requestId || !pending.sessionId || !pending.message || typeof pending.baselineMessageCount !== 'number') {
        this.clearPendingStream();
        return null;
      }
      return pending as PendingNexusStream;
    }
    catch {
      this.clearPendingStream();
      return null;
    }
  }

  private clearPendingStream(): void {
    try {
      sessionStorage.removeItem(this.pendingStreamStorageKey);
    }
    catch {
      return;
    }
  }

  private resumePendingStream(): boolean {
    const pending = this.readPendingStream();
    if (!pending) {
      return false;
    }

    const existingSession = this.chatSessions.find(session => session.sessionId === pending.sessionId);
    if (existingSession && existingSession.messageCount >= pending.baselineMessageCount + 2) {
      this.clearPendingStream();
      this.loadChat(pending.sessionId);
      return true;
    }

    if (!existingSession) {
      this.chatSessions = this.sortChatSessions([{
        sessionId: pending.sessionId,
        title: 'New Chat',
        updatedAt: new Date().toISOString(),
        messageCount: pending.baselineMessageCount,
        messages: [],
      }, ...this.chatSessions]);
    }
    this.activeSessionId = pending.sessionId;
    this.syncDirectorySession(pending.sessionId);

    const resume = () => {
      this.resumedRequestId = pending.requestId;
      this.messageDraft = pending.message;
      this.sendMessage();
    };
    this.nexusChatService.getChat(pending.sessionId).subscribe({
      next: (chat) => {
        this.messages = chat.messages.map(message => this.mapMessage(message));
        if (this.messages.length >= pending.baselineMessageCount + 2) {
          this.clearPendingStream();
          this.loadChat(pending.sessionId);
          return;
        }
        resume();
      },
      error: () => {
        this.messages = [];
        resume();
      },
    });
    return true;
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const container = this.messagesContainer?.nativeElement;
      if (!container) {
        return;
      }
      const lastMessage = container.lastElementChild;
      if (!(lastMessage instanceof HTMLElement)) {
        return;
      }

      const shouldAnchorToTop = lastMessage.offsetHeight > container.clientHeight * 0.45;
      if (shouldAnchorToTop) {
        const targetTop = Math.max(0, lastMessage.offsetTop - 56);
        container.scrollTo({ top: targetTop, behavior: 'smooth' });
        return;
      }

      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    });
  }

  queueComposerResize(): void {
    requestAnimationFrame(() => {
      this.resizeComposer();
    });
  }

  private getComposerLineCount(textarea: HTMLTextAreaElement): number {
    const horizontalPadding = 24;
    const averageCharWidth = 7;
    const availableWidth = Math.max(averageCharWidth, textarea.clientWidth - horizontalPadding);
    const charsPerLine = Math.max(1, Math.floor(availableWidth / averageCharWidth));
    const lines = (textarea.value || '').split('\n');

    return Math.max(1, lines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0));
  }

  private countMessageTokens(value: string): number {
    return value.trim().match(/[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g)?.length ?? 0;
  }

  private setDirectorySplitPercent(value: number): void {
    const dividerWidth = 12;
    const minimumChatWidth = 520;
    const minimumDirectoryWidth = 420;
    const panelWidth = Math.max(1, (this.workspacePanels?.nativeElement.clientWidth ?? 0) - dividerWidth);
    const minimumCombinedWidth = minimumChatWidth + minimumDirectoryWidth;

    let minimumPercent: number;
    let maximumPercent: number;
    if (panelWidth < minimumCombinedWidth) {
      minimumPercent = minimumDirectoryWidth / minimumCombinedWidth * 100;
      maximumPercent = minimumPercent;
    }
    else {
      minimumPercent = Math.max(20, minimumDirectoryWidth / panelWidth * 100);
      maximumPercent = Math.min(50, 100 - minimumChatWidth / panelWidth * 100);
    }

    const clamped = Math.min(maximumPercent, Math.max(minimumPercent, value));
    this.directorySplitPercent = Math.round(clamped * 10) / 10;
    const panels = this.workspacePanels?.nativeElement;
    panels?.style.setProperty('--ai-chat-panel-grow', String(100 - this.directorySplitPercent));
    panels?.style.setProperty('--ai-directory-panel-grow', String(this.directorySplitPercent));
  }

  private mapSession(session: NexusChatSession): AiChatSession {
    return {
      sessionId: session.session_id ?? session.id ?? '',
      title: session.title,
      updatedAt: session.updated_at,
      messageCount: session.message_count ?? (Array.isArray(session.messages) ? session.messages.length : 0),
      messages: [],
    };
  }

  private mapMessage(message: NexusChatMessage): AiWorkspaceMessage {
    return {
      id: message.id,
      sender: message.sender === 'bot' ? 'bot' : 'user',
      text: message.text,
      time: new Date(message.created_at),
      triggers: Array.isArray(message.triggers) ? message.triggers.filter(trigger => Boolean(trigger?.url)) : undefined,
    };
  }

  private loadBackendChatSessions(): void {
    this.isLoadingHistory.set(true);

    this.nexusChatService.listChats().subscribe({
      next: (sessions) => {
        this.chatSessions = this.sortChatSessions(sessions.map(session => this.mapSession(session)));
        this.activeSessionId = null;
        this.messages = [];

        if (this.resumePendingStream()) {
          this.isLoadingHistory.set(false);
        }
        else if (this.chatSessions[0]) {
          this.selectChat(this.chatSessions[0]);
        }
        else {
          this.isLoadingHistory.set(false);
        }
      },
      error: () => {
        this.chatSessions = [];
        this.messages = [];
        this.activeSessionId = null;
        this.isLoadingHistory.set(false);
        this.resumePendingStream();
      },
    });
  }

  private loadChat(sessionId: string): void {
    this.chatHistoryRequest?.unsubscribe();
    this.isLoadingHistory.set(true);

    this.chatHistoryRequest = this.nexusChatService.getChat(sessionId).subscribe({
      next: (chat) => {
        const chatSessionId = chat.session_id;
        if (this.activeSessionId && this.activeSessionId !== sessionId) {
          return;
        }
        const messages = chat.messages.map(message => this.mapMessage(message));

        this.activeSessionId = chatSessionId;
        this.messages = messages;
        this.syncDirectorySession(chatSessionId);

        const updatedSession: AiChatSession = {
          ...this.mapSession(chat),
          messageCount: chat.message_count ?? messages.length,
          messages,
        };
        this.chatSessions = this.sortChatSessions(this.chatSessions.some(session => session.sessionId === chatSessionId)
          ? this.chatSessions.map(session => session.sessionId === chatSessionId ? { ...session, ...updatedSession } : session)
          : [updatedSession, ...this.chatSessions]);
        this.isLoadingHistory.set(false);
        this.chatHistoryRequest = undefined;
        this.cancelMessageEdit();
        this.queueComposerResize();
        this.scrollToBottom();
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingHistory.set(false);
        this.chatHistoryRequest = undefined;
      },
    });
  }

  private sortChatSessions(chats: AiChatSession[]): AiChatSession[] {
    return [...chats].sort((a, b) => {
      const aIsEmpty = a.messageCount === 0 && a.messages.length === 0;
      const bIsEmpty = b.messageCount === 0 && b.messages.length === 0;
      if (aIsEmpty !== bIsEmpty) {
        return aIsEmpty ? -1 : 1;
      }

      return new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime();
    });
  }

  private chatTitleFromPrompt(prompt: string): string {
    const normalizedPrompt = prompt.replace(/\s+/g, ' ').trim();
    return normalizedPrompt.length > 48
      ? `${normalizedPrompt.slice(0, 47).trimEnd()}…`
      : normalizedPrompt;
  }

  private nameNewChatFromPrompt(sessionId: string, prompt: string): void {
    const title = this.chatTitleFromPrompt(prompt);
    this.chatSessions = this.sortChatSessions(this.chatSessions.map(chat =>
      chat.sessionId === sessionId ? { ...chat, title } : chat));
    this.nexusChatService.renameChatSession(sessionId, title).subscribe({
      next: (session) => {
        this.chatSessions = this.sortChatSessions(this.chatSessions.map(chat =>
          chat.sessionId === sessionId ? { ...chat, title: session.title || title } : chat));
      },
    });
  }

  private syncDirectorySession(sessionId: string | null): void {
    if (!sessionId) {
      this.directorySessionId = null;
      this.directoryImportRequest = null;
      return;
    }

    this.directorySessionId = sessionId;
    this.directoryImportRequest = null;
  }

  selectChat(session: AiChatSession, openChat = false): void {
    if (openChat) {
      this.setWorkspaceViewMode('chat');
    }

    if (this.isSending() && session.sessionId === this.activeRequestSessionId) {
      this.chatHistoryRequest?.unsubscribe();
      this.chatHistoryRequest = undefined;
      this.activeSessionId = session.sessionId;
      this.syncDirectorySession(session.sessionId);
      this.messages = [...session.messages];
      this.isLoadingHistory.set(false);
      this.cancelMessageEdit();
      this.queueComposerResize();
      this.scrollToBottom();
      return;
    }

    if (this.activeSessionId === session.sessionId) {
      this.syncDirectorySession(session.sessionId);

      if (!this.messages.length && session.messageCount > 0) {
        this.isLoadingHistory.set(true);
        this.loadChat(session.sessionId);
      }

      return;
    }

    if (session.messages.length || session.messageCount === 0) {
      this.chatHistoryRequest?.unsubscribe();
      this.chatHistoryRequest = undefined;
      this.activeSessionId = session.sessionId;
      this.syncDirectorySession(session.sessionId);
      this.messages = [...session.messages];
      this.isLoadingHistory.set(false);
      this.cancelMessageEdit();
      this.queueComposerResize();
      this.scrollToBottom();
      return;
    }

    this.activeSessionId = session.sessionId;
    this.messages = [];
    this.isLoadingHistory.set(true);
    this.syncDirectorySession(session.sessionId);
    this.loadChat(session.sessionId);
  }

  onSidebarSessionUpdated(session: AiChatSession): void {
    this.chatSessions = this.sortChatSessions(this.chatSessions.map(chat => chat.sessionId === session.sessionId ? { ...chat, ...session } : chat));
  }

  onSidebarSessionDeleted(sessionId: string): void {
    this.chatSessions = this.chatSessions.filter(chat => chat.sessionId !== sessionId);
    if (this.activeSessionId !== sessionId) {
      return;
    }
    const nextChat = this.chatSessions[0];
    if (nextChat) {
      this.selectChat(nextChat);
    }
    else {
      this.activeSessionId = null;
      this.syncDirectorySession(null);
      this.messages = [];
      this.messageDraft = '';
    }
  }
}
