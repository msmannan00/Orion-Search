import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef, NgZone, input, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../../../services/dashboard/dashboard.service';
import { chatBotAnimation } from '../../../../shared/animations/chat.bot.animation';
import { overlayFadeAnimation } from '../../../../shared/animations/chat.overlay.animation';
import { SubscriptionService } from '../../../../services/dashboard/subscription.service';
import { AppService } from '../../../../services/core/app/app.service';
import { NexusChatService } from '../nexus-chat.service';
import { AiWorkspaceMessage, AiWorkspaceTrigger } from '../model/ai-workspace-message.model';
import { BotMessageActionsComponent } from '../bot-message-actions/bot-message-actions.component';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, BotMessageActionsComponent, MarkdownPipe, TranslatePipe],
  templateUrl: './chat-widget.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [chatBotAnimation, overlayFadeAnimation]
})
export class ChatWidgetComponent implements OnInit, AfterViewInit, OnDestroy {
  private activeChatRequest?: Subscription;
  private chatRequestId = 0;
  private stoppedRequestIds = new Set<number>();
  private userNearBottom = true;
  private routeSubscription?: Subscription;
  private activeTempSessionId = '';
  private io?: IntersectionObserver;
  private mo?: MutationObserver;
  @ViewChild('composerInput') private composerInput?: ElementRef<HTMLTextAreaElement>;

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLElement>;
  @ViewChild('bottomSentinel') bottomSentinel!: ElementRef<HTMLElement>;
  chatMessages: AiWorkspaceMessage[] = [];
  isBotTyping = false;
  botStep = '';
  newMessage = '';
  chatOpen = false;
  isFullScreen = false;
  composerExpanded = false;
  composerRows = 1;
  composerScrollable = false;
  readonly maxComposerTokens = 300;
  readonly reportText = input<string>();
  readonly report = input<string>();
  readonly showLauncher = input(true);
  readonly tool = input('open_chat');
  readonly type = input('default');
  readonly welcomeMessage = input('Hi there! How can I help you today?');

  constructor(public appService: AppService, private dashboardService: DashboardService, private cdr: ChangeDetectorRef, private zone: NgZone, private subscriptionService: SubscriptionService, private nexusChatService: NexusChatService, private router: Router, private readonly translationService: TranslationService) { }

  ngOnInit(): void {
    this.activeTempSessionId = this.temporarySessionId();
    this.routeSubscription = this.router.events.subscribe(event => {
      if (!(event instanceof NavigationEnd)) {
        return;
      }
      const nextSessionId = this.temporarySessionId();
      if (nextSessionId === this.activeTempSessionId) {
        return;
      }
      const previousSessionId = this.activeTempSessionId;
      this.activeTempSessionId = nextSessionId;
      this.chatRequestId += 1;
      this.stoppedRequestIds.clear();
      this.cancelActiveNexusRequest();
      this.clearTemporarySession(previousSessionId);
      this.isBotTyping = false;
      this.botStep = '';
      this.resetChatView();
    });
    if (this.chatMessages.length === 0) {
      this.chatMessages.push({
        id: crypto.randomUUID(),
        sender: 'bot',
        text: this.defaultWelcomeMessage(),
        time: new Date()
      });
    }
  }

  ngAfterViewInit(): void {
    this.setupObserversIfPossible();
    this.scrollToBottom(true);
  }

  ngOnDestroy(): void {
    this.cancelActiveNexusRequest();
    this.clearTemporarySession(this.activeTempSessionId);
    this.stoppedRequestIds.clear();
    this.routeSubscription?.unsubscribe();
    this.io?.disconnect();
    this.mo?.disconnect();
  }

  sendMessage(event?: Event): void {
    event?.preventDefault();
    if (this.isBotTyping) {
      return;
    }
    const text = this.newMessage.trim();
    if (!text || this.countMessageTokens(text) > this.maxComposerTokens) {
      return;
    }
    this.chatMessages.push({ id: crypto.randomUUID(), sender: 'user', text, time: new Date() });
    this.newMessage = '';
    this.queueComposerResize();
    this.isBotTyping = true;
    this.botStep = '';
    this.scrollToNewMessage();
    this.aiSuggest(text);
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }
    event.preventDefault();
    this.sendMessage(event);
  }

  aiSuggest(userMessage: string): void {
    if (!this.subscriptionService.accountExpirable()) {
      this.showErrorMessage(userMessage);
      this.isBotTyping = false;
      this.scrollToNewMessage();
      return;
    }
    const report = (this.report() ?? this.reportText() ?? '').trim();
    const payload = {
      session_id: this.temporarySessionId(),
      session_type: 'temporary' as const,
      message: report ? `${report}\n\n${userMessage}` : userMessage,
      tool: this.resolveTool(report),
      type: this.type() || 'default',
    };
    const requestId = ++this.chatRequestId;
    this.stoppedRequestIds.delete(requestId);
    let reply = '';
    let pendingTriggers: AiWorkspaceTrigger[] = [];
    let botMessage: AiWorkspaceMessage | undefined;
    const updateReply = (value: string) => {
      if (requestId !== this.chatRequestId || this.stoppedRequestIds.has(requestId)) {
        return;
      }
      if (!botMessage) {
        botMessage = { id: crypto.randomUUID(), sender: 'bot', text: '', time: new Date() };
        this.chatMessages.push(botMessage);
      }
      botMessage.text = value;
      if (pendingTriggers.length) {
        botMessage.triggers = pendingTriggers;
      }
      this.scrollToNewMessage();
    };
    const finishStream = () => {
      if (requestId !== this.chatRequestId || this.stoppedRequestIds.has(requestId)) {
        return;
      }
      this.activeChatRequest = undefined;
      this.isBotTyping = false;
      this.botStep = '';
      if (!reply.trim()) {
        this.chatMessages = botMessage ? this.chatMessages.filter(message => message.id !== botMessage?.id) : this.chatMessages;
        this.showErrorMessage(userMessage);
      }
      this.scrollToNewMessage();
    };

    this.activeChatRequest = this.nexusChatService.streamNexusChat(payload).subscribe({
      next: (chunk) => {
        if (requestId !== this.chatRequestId || this.stoppedRequestIds.has(requestId)) {
          return;
        }
        if (chunk.status) {
          this.botStep = chunk.status;
          this.cdr.detectChanges();
        }
        if (chunk.error) {
          reply = chunk.response ?? chunk.delta ?? this.translationService.translate('Something went wrong. Try again.');
          this.chatMessages = botMessage ? this.chatMessages.filter(message => message.id !== botMessage?.id) : this.chatMessages;
          this.showErrorMessage(userMessage, reply);
          this.scrollToNewMessage();
          return;
        }
        if (chunk.triggers?.length) {
          pendingTriggers = this.validTriggers(chunk.triggers);
          if (botMessage) {
            botMessage.triggers = pendingTriggers;
          }
        }
        if (chunk.delta) {
          reply += chunk.delta;
          updateReply(reply);
        }
        if (chunk.response) {
          reply = chunk.response;
          updateReply(reply);
        }
      },
      complete: () => {
        finishStream();
      },
      error: () => {
        if (requestId !== this.chatRequestId || this.stoppedRequestIds.has(requestId)) {
          return;
        }
        this.activeChatRequest = undefined;
        this.chatMessages = botMessage ? this.chatMessages.filter(message => message.id !== botMessage?.id) : this.chatMessages;
        this.showErrorMessage(userMessage);
        this.isBotTyping = false;
        this.botStep = '';
        this.scrollToNewMessage();
      }
    });
  }

  private showErrorMessage(originalMessage: string, errorText = this.translationService.translate('Something went wrong. Try again.')): void {
    this.chatMessages.push({
      id: crypto.randomUUID(),
      sender: 'error',
      text: errorText.trim() || this.translationService.translate('Something went wrong. Try again.'),
      time: new Date(),
      retryPayload: originalMessage
    });
  }

  retryMessage( payload: string ): void {
    if (this.isBotTyping) {
      return;
    }
    this.isBotTyping = true;
    this.botStep = '';
    this.scrollToNewMessage();
    this.aiSuggest(payload);
  }

  stopMessageGeneration(): void {
    this.stoppedRequestIds.add(this.chatRequestId);
    this.chatRequestId += 1;
    this.cancelActiveNexusRequest();
    this.chatMessages.push({
      id: crypto.randomUUID(),
      sender: 'error',
      text: this.translationService.translate('Message canceled.'),
      time: new Date()
    });
    this.isBotTyping = false;
    this.botStep = '';
    this.scrollToNewMessage();
  }

  startNewChat(): void {
    this.chatRequestId += 1;
    this.stoppedRequestIds.clear();
    this.cancelActiveNexusRequest();
    this.isBotTyping = false;
    this.botStep = '';
    this.nexusChatService.clearNexusSession({ session_id: this.temporarySessionId() }).subscribe({
      next: () => {
        this.resetChatView();
      },
      error: () => {
        this.resetChatView();
      },
    });
  }

  openChat() {
    if (!this.subscriptionService.accountExpirable()) {
      this.dashboardService.showSubscription.set(true);
      return;
    }
    this.chatOpen = true;
    this.cdr.detectChanges();
    this.setupObserversIfPossible();
    this.queueComposerResize();
    this.scrollToBottom(true);
  }

  closeChat() {
    this.chatOpen = false;
    this.composerExpanded = false;
    this.composerRows = 1;
    this.composerScrollable = false;
    this.io?.disconnect();
    this.mo?.disconnect();
    this.io = undefined;
    this.mo = undefined;
  }

  private validTriggers(value: AiWorkspaceTrigger[]): AiWorkspaceTrigger[] {
    return value.filter(item => Boolean(item.url));
  }

  async downloadTrigger(trigger: AiWorkspaceTrigger, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    try {
      await this.nexusChatService.downloadTrigger(trigger);
    }
    catch {
      this.chatMessages.push({
        id: crypto.randomUUID(),
        sender: 'error',
        text: this.translationService.translate('Unable to download file. Please try again.'),
        time: new Date()
      });
      this.scrollToNewMessage();
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  pushButton(btn: HTMLButtonElement) {
    btn.classList.add('chat-bot-push-anim');
    setTimeout(() => {
      btn.classList.remove('chat-bot-push-anim');
    }, 150);
  }

  onMessagesScroll(): void {
    this.userNearBottom = this.isAtBottom(80);
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

  get newMessageTokenCount(): number {
    return this.countMessageTokens(this.newMessage);
  }

  get newMessageTokenOverflow(): number {
    return Math.max(0, this.newMessageTokenCount - this.maxComposerTokens);
  }

  get isNewMessageOverLimit(): boolean {
    return this.newMessageTokenOverflow > 0;
  }

  queueComposerResize(): void {
    requestAnimationFrame(() => {
      this.resizeComposer();
    });
  }

  private isAtBottom(threshold = 4): boolean {
    const el = this.messagesContainer?.nativeElement;
    if (!el) {
      return true;
    }
    return el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;
  }

  private cancelActiveNexusRequest(): void {
    if (Boolean(this.activeChatRequest) || this.isBotTyping) {
      this.nexusChatService.cancelNexusChat();
    }
    this.activeChatRequest?.unsubscribe();
    this.activeChatRequest = undefined;
  }

  private resolveTool(report: string): string {
    const tool = this.tool() || 'open_chat';
    return report && tool === 'open_chat' ? 'summarizer' : tool;
  }

  private resetChatView(): void {
    this.chatMessages = [{
      id: crypto.randomUUID(),
      sender: 'bot',
      text: this.defaultWelcomeMessage(),
      time: new Date()
    }];
    this.newMessage = '';
    this.composerExpanded = false;
    this.composerRows = 1;
    this.composerScrollable = false;
    this.queueComposerResize();
    this.scrollToBottom(true);
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

  private defaultWelcomeMessage(): string {
    return this.translationService.translate(this.welcomeMessage().trim() || 'Hi there! How can I help you today?');
  }

  private temporarySessionId(): string {
    return `temp:${this.routeHash(this.router.url.split('#')[0] || '/')}`;
  }

  private clearTemporarySession(sessionId: string): void {
    if (!sessionId) {
      return;
    }
    this.nexusChatService.clearNexusSession({ session_id: sessionId }).subscribe({ error: () => undefined });
  }

  private routeHash(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  private scrollToNewMessage(): void {
    if (!this.userNearBottom) {
      return;
    }
    this.cdr.detectChanges();
    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.scrollToBottom(true);
      });
    });
  }

  private scrollToBottom(_: boolean): void {
    void _;
    const el = this.messagesContainer?.nativeElement;
    if (!el) {
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    this.userNearBottom = true;
  }

  private setupObserversIfPossible(): void {
    const rootEl = this.messagesContainer?.nativeElement;
    const sentinelEl = this.bottomSentinel?.nativeElement;
    if (!rootEl || !sentinelEl) {
      return;
    }
    if (!this.io) {
      this.io = new IntersectionObserver(entries => {
        this.userNearBottom = entries.some(e => e.isIntersecting);
      }, { root: rootEl, threshold: 1 });
      this.io.observe(sentinelEl);
    }
    if (!this.mo) {
      this.mo = new MutationObserver(() => {
        if (this.userNearBottom || this.isBotTyping) {
          this.scrollToBottom(true);
        }
      });
      this.mo.observe(rootEl, { childList: true, subtree: true });
    }
  }
}
