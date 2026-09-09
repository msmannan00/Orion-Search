import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { Component, HostListener, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';
import { AiChatSession, NexusChatSession } from '../model/ai-chat-session.model';
import { ConfirmationPopupComponent } from '../../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { SidebarShellComponent } from '../../../../shared/partials/sidebar-shell/sidebar-shell.component';
import { NexusChatService } from '../nexus-chat.service';

const chatRowAnimation = trigger('chatRowAnimation', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('180ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate('140ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0 })),
  ]),
]);

@Component({
  selector: 'app-ai-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationPopupComponent, SidebarShellComponent, TooltipDirective, TranslatePipe],
  templateUrl: './ai-chat-sidebar.component.html',
  styleUrls: ['./ai-chat-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [chatRowAnimation],
})
export class AiChatSidebarComponent {
  readonly sessions = input<AiChatSession[]>([]);
  readonly activeSessionId = input<string | null>(null);
  readonly busySessionId = input<string | null>(null);
  readonly creatingChat = input(false);
  readonly clearingChats = input(false);
  readonly newChat = output();
  readonly clearChats = output();
  readonly chatSelected = output<AiChatSession>();
  readonly sessionUpdated = output<AiChatSession>();
  readonly sessionDeleted = output<string>();
  openedSessionMenuId: string | null = null;
  deleteChatTarget: AiChatSession | null = null;
  clearChatsConfirmationOpen = false;
  renameChatTarget: AiChatSession | null = null;
  renameChatDraft = '';
  searchOpen = false;
  searchQuery = '';
  sharingSessionId: string | null = null;
  isCollapsed = false;

  constructor(private readonly nexusChatService: NexusChatService, private readonly api: ApiService) { }

  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
    this.closeChatMenu();
    if (this.isCollapsed) {
      this.closeSearch();
    }
  }

  startNewChat(): void {
    if (this.hasEmptyChat || this.creatingChat() || this.clearingChats()) {
      return;
    }
    this.closeChatMenu();
    this.newChat.emit();
  }

  selectChat(chat: AiChatSession): void {
    this.closeChatMenu();
    this.chatSelected.emit(chat);
  }

  toggleSearch(event?: Event): void {
    event?.stopPropagation();
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) {
      this.searchQuery = '';
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  requestClearChats(event?: Event): void {
    event?.stopPropagation();
    if (!this.canClearChats) {
      return;
    }
    this.closeChatMenu();
    this.clearChatsConfirmationOpen = true;
  }

  confirmClearChats(confirmed: boolean): void {
    this.clearChatsConfirmationOpen = false;
    if (confirmed && this.canClearChats) {
      this.clearChats.emit();
    }
  }

  closeSearch(): void {
    this.searchOpen = false;
    this.searchQuery = '';
  }

  toggleChatMenu(chat: AiChatSession, event: Event): void {
    event.stopPropagation();
    if (this.isChatBusy(chat)) {
      return;
    }
    this.openedSessionMenuId = this.openedSessionMenuId === chat.sessionId ? null : chat.sessionId;
  }

  shareChat(chat: AiChatSession, event: Event): void {
    event.stopPropagation();
    if (Boolean(this.sharingSessionId) || this.isChatBusy(chat)) {
      return;
    }
    this.sharingSessionId = chat.sessionId;
    this.nexusChatService.getChat(chat.sessionId).subscribe({
      next: chatDetail => {
        const messages = chatDetail.messages.map(message => ({
          sender: message.sender,
          text: message.text,
          time: message.created_at,
        }));
        if (!messages.length) {
          this.finishSharing();
          return;
        }
        this.api.post<{ path: string }>('profile/chat-shares', { messages, expiresInHours: 168 }).subscribe({
          next: share => {
            window.open(new URL(share.path, window.location.origin).toString(), '_blank', 'noopener');
            this.finishSharing();
          },
          error: () => {
            this.finishSharing();
          },
        });
      },
      error: () => {
        this.finishSharing();
      },
    });
  }

  renameChat(chat: AiChatSession, event: Event): void {
    event.stopPropagation();
    if (this.isChatBusy(chat)) {
      return;
    }
    this.renameChatTarget = chat;
    this.renameChatDraft = chat.title;
    this.closeChatMenu();
  }

  confirmRenameChat(): void {
    const title = this.renameChatDraft.trim();
    const chat = this.renameChatTarget;
    if (!chat || !title || this.isChatBusy(chat)) {
      return;
    }
    this.nexusChatService.renameChatSession(chat.sessionId, title).subscribe({
      next: updated => {
        this.sessionUpdated.emit(this.updatedSession(chat, updated));
        this.closeRenameChatPopup();
      },
    });
  }

  closeRenameChatPopup(): void {
    this.renameChatTarget = null;
    this.renameChatDraft = '';
  }

  onRenameBackdrop(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.role === 'backdrop') {
      this.closeRenameChatPopup();
    }
  }

  deleteChat(chat: AiChatSession, event: Event): void {
    event.stopPropagation();
    if (!this.canDeleteChat || this.isChatBusy(chat)) {
      return;
    }
    this.deleteChatTarget = chat;
    this.closeChatMenu();
  }

  confirmDeleteChat(confirmed: boolean): void {
    const chat = this.deleteChatTarget;
    this.deleteChatTarget = null;
    if (!confirmed || !chat || !this.canDeleteChat || this.isChatBusy(chat)) {
      return;
    }
    this.nexusChatService.deleteChatSession(chat.sessionId).subscribe({
      next: () => {
        this.sessionDeleted.emit(chat.sessionId);
      },
    });
  }

  closeChatMenu(): void {
    this.openedSessionMenuId = null;
  }

  get filteredSessions(): AiChatSession[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return this.visibleSessions;
    }
    return this.visibleSessions.filter(chat => chat.title.toLowerCase().includes(query));
  }

  get visibleSessions(): AiChatSession[] {
    return this.sessions().filter(chat =>
      !this.isChatEmpty(chat)
      || chat.sessionId === this.activeSessionId());
  }

  isChatEmpty(chat: AiChatSession): boolean {
    return chat.messageCount === 0 && chat.messages.length === 0;
  }

  isChatBusy(chat: AiChatSession): boolean {
    return this.busySessionId() === chat.sessionId;
  }

  get hasEmptyChat(): boolean {
    const activeChat = this.sessions().find(chat => chat.sessionId === this.activeSessionId());
    return Boolean(activeChat && this.isChatEmpty(activeChat) && activeChat.title.trim().toLowerCase() === 'new chat');
  }

  get canDeleteChat(): boolean {
    return this.visibleSessions.length > 1;
  }

  get canClearChats(): boolean {
    return this.sessions().length > 0 && !this.clearingChats();
  }

  getChatInitial(chat: AiChatSession): string {
    return (chat.title || 'N').trim().charAt(0).toUpperCase() || 'N';
  }

  getChatTooltip(chat: AiChatSession): string {
    return chat.title || 'Nexus Chat';
  }

  shouldOpenMenuAbove(chat: AiChatSession): boolean {
    const sessions = this.filteredSessions;
    return sessions.length > 4 && sessions.indexOf(chat) >= sessions.length - 3;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeChatMenu();
    this.closeSearch();
  }

  private finishSharing(): void {
    this.sharingSessionId = null;
    this.closeChatMenu();
  }

  private updatedSession(current: AiChatSession, updated: NexusChatSession): AiChatSession {
    return {
      ...current,
      sessionId: updated.session_id || current.sessionId,
      title: updated.title || current.title,
      updatedAt: updated.updated_at || current.updatedAt,
      messageCount: updated.message_count ?? current.messageCount,
    };
  }
}
