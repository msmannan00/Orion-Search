import { Injectable } from '@angular/core';
import { EMPTY, Observable, timer } from 'rxjs';
import { expand, switchMap, takeWhile } from 'rxjs/operators';
import { ChatApiResponse } from './model/chat-api-response.model';
import { AiWorkspaceTrigger } from './model/ai-workspace-message.model';
import { NexusChatPayload, NexusChatStreamChunk, NexusSummaryPayload } from './model/nexus-chat.model';
import { ApiService } from '../../../shared/services/api.service';
import { NexusChatDetail, NexusChatSession, NexusWorkspaceTreeResponse, NexusWorkspaceFileReadResponse, NexusWorkspaceImportResponse } from './model/ai-chat-session.model';
import type { NexusStreamState } from './model/nexus-chat.interfaces.model';
export type { NexusStreamState } from './model/nexus-chat.interfaces.model';




@Injectable({ providedIn: 'root' })
export class NexusChatService {
  private readonly streamTimeoutMs = 900000;
  private readonly maxResumeAttempts = 8;
  private readonly resumeDelayMs = 400;

  constructor(private readonly api: ApiService) { }

  streamNexusChat(payload: NexusChatPayload): Observable<NexusChatStreamChunk> {
    return this.streamDirectNexusChat(payload);
  }

  cancelNexusChat(): void {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    void fetch('/api/nexus/chat/cancel', {
      method: 'POST',
      headers,
      body: '{}',
      credentials: 'include',
      keepalive: true,
    }).catch(() => undefined);
  }

  async downloadTrigger(trigger: AiWorkspaceTrigger): Promise<void> {
    const downloadUrl = this.normalizedDownloadUrl(trigger.url);
    if (!downloadUrl) {
      return;
    }
    const response = await fetch(downloadUrl, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(await response.text() || response.statusText);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.downloadName(downloadUrl, response.headers.get('content-disposition'));
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }

  private streamDirectNexusChat(payload: NexusChatPayload): Observable<NexusChatStreamChunk> {
    return new Observable<NexusChatStreamChunk>((observer) => {
      const controller = new AbortController();
      let cancelled = false;
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        this.cancelNexusChat();
        controller.abort();
      }, this.streamTimeoutMs);
      const resumablePayload: NexusChatPayload = { ...payload, request_id: payload.request_id ?? this.newRequestId() };
      const state: NexusStreamState = { seen: 0, skip: 0, done: false };

      const readAttempt = async (remaining: number): Promise<void> => {
        const response = await fetch('/api/nexus/chat', {
          method: 'POST',
          headers: {
            Accept: 'application/x-ndjson',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resumablePayload),
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(await response.text() || response.statusText);
        }
        if (!response.body) {
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            buffer = this.emitStreamLines(buffer, observer, state);
          }
          buffer += decoder.decode();
          this.emitStreamLines(`${buffer}\n`, observer, state);
        }
        catch (error) {
          if (!this.canResume(cancelled, timedOut, state, remaining)) {
            throw error;
          }
          return this.resume(state, () => readAttempt(remaining - 1));
        }

        if (!this.canResume(cancelled, timedOut, state, remaining)) {
          return;
        }
        return this.resume(state, () => readAttempt(remaining - 1));
      };

      readAttempt(this.maxResumeAttempts).then(() => {
        observer.complete();
      }).catch((error: unknown) => {
        if (timedOut) {
          observer.error(new Error('Nexus chat timed out.'));
          return;
        }
        if (cancelled || (error instanceof Error && error.name === 'AbortError')) {
          observer.complete();
          return;
        }
        observer.error(error);
      }).finally(() => {
        window.clearTimeout(timeoutId);
      });

      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
        controller.abort();
      };
    });
  }

  private canResume(cancelled: boolean, timedOut: boolean, state: NexusStreamState, remaining: number): boolean {
    return !cancelled && !timedOut && !state.done && remaining > 0;
  }

  private async resume(state: NexusStreamState, next: () => Promise<void>): Promise<void> {
    state.skip = state.seen;
    state.seen = 0;
    await new Promise<void>(resolve => window.setTimeout(resolve, this.resumeDelayMs));
    return next();
  }

  private newRequestId(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  clearNexusSession(payload: { session_id?: string } = {}): Observable<{ cleared?: boolean; }> {
    return this.api.post<{ cleared?: boolean; }>('nexus/chat/clear-session', payload);
  }

  pollNexusSummary(payload: NexusSummaryPayload) {
    return this.api.post<ChatApiResponse>('nlp/summarize/ai', payload).pipe(expand(response => this.isNexusPending(response)
      ? timer(2000).pipe(switchMap(() => this.api.post<ChatApiResponse>('nlp/summarize/ai', payload)))
      : EMPTY), takeWhile(response => this.isNexusPending(response), true));
  }

  getNexusSummary(response: ChatApiResponse): string {
    const result = this.asRecord(response?.result);
    const summary = result
      ? result.response ?? result.summary ?? result.result ?? result.text ?? response?.summary ?? response?.message ?? response?.text
      : response?.result ?? response?.summary ?? response?.message ?? response?.text;
    return Array.isArray(summary) ? summary.join('\n').trim() : this.streamValueToText(summary ?? '').trim();
  }

  isNexusPending(response: ChatApiResponse): boolean {
    const status = this.getNexusStatus(response);
    return ['pending', 'processing', 'running', 'busy', 'queued', 'in_progress'].includes(status);
  }

  getNexusStep(response: ChatApiResponse): string {
    const result = this.asRecord(response?.result);
    const step = result?.step ?? response?.step ?? result?.progress ?? response?.progress ?? result?.status ?? response?.status;
    return this.streamValueToText(step ?? '').trim();
  }

  private getNexusStatus(response: ChatApiResponse): string {
    const result = this.asRecord(response?.result);
    return ((result?.status ?? response?.status ?? '') as string).toString().trim().toLowerCase();
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private emitStreamLines(buffer: string, observer: { next: (value: NexusChatStreamChunk) => void; }, state: NexusStreamState): string {
    const lines = buffer.split(/\r?\n/);
    const rest = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      state.seen += 1;
      if (state.seen <= state.skip) {
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      }
      catch {
        continue;
      }
      const parsedRecord = this.asRecord(parsed) ?? {};
      if (parsedRecord.done === true) {
        state.done = true;
      }
      const output = this.asRecord(parsedRecord.output);
      const delta = output?.delta ?? parsedRecord.delta;
      const response = output?.response ?? parsedRecord.response;
      const rawTriggers = output?.triggers ?? parsedRecord.triggers;
      const triggers = Array.isArray(rawTriggers)
        ? rawTriggers.filter((item) => Boolean(this.asRecord(item)?.url)) as AiWorkspaceTrigger[]
        : undefined;
      const status = this.asRecord(parsedRecord.status);
      const statusMessage = status?.message ?? parsedRecord.status_message;
      const isError = Boolean(parsedRecord.error);
      const error = this.asRecord(parsedRecord.error);
      let detail = parsedRecord.detail ?? error?.message;
      if (typeof detail === 'string' && detail.toLowerCase().includes('stream is already active')) {
        detail = 'Nexus is still finishing the previous chat. Try again in a moment.';
      }
      if (statusMessage !== undefined) {
        observer.next({ status: this.streamValueToText(statusMessage) });
      }
      if (delta !== undefined) {
        observer.next({ delta: this.streamValueToText(delta) });
      }
      if (response !== undefined) {
        observer.next({ response: this.streamValueToText(response), error: isError || undefined, triggers });
      }
      else if (detail !== undefined) {
        observer.next({ response: this.streamValueToText(detail), error: isError || undefined });
      }
    }
    return rest;
  }

  private streamValueToText(value: unknown): string {
    const record = this.asRecord(value);
    if (record) {
      return this.streamValueToText(record.response ?? record.result ?? record.text ?? JSON.stringify(record));
    }
    return String(value);
  }

  private downloadName(url: string, disposition: string | null): string {
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition ?? '');
    const name = match?.[1] ?? match?.[2] ?? url.split('/').pop() ?? 'download';
    return decodeURIComponent(name);
  }

  private normalizedDownloadUrl(url: string | undefined): string {
    if (!url) {
      return '';
    }
    const parsed = new URL(url, window.location.origin);
    if (parsed.pathname.startsWith('/v1/users/downloads/')) {
      return `/api/nexus/downloads/${parsed.pathname.slice('/v1/users/downloads/'.length)}${parsed.search}`;
    }
    return parsed.toString();
  }

  listChats(): Observable<NexusChatSession[]> {
    return this.api.get<NexusChatSession[]>('nexus/chats');
  }

  createChat(title = 'New Chat'): Observable<NexusChatSession> {
    return this.api.post<NexusChatSession>('nexus/chats', { title });
  }

  deleteAllChatSessions(): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>('nexus/chats');
  }

  getChat(sessionId: string): Observable<NexusChatDetail> {
    return this.api.get<NexusChatDetail>(`nexus/chats/${sessionId}`);
  }

  renameChatSession(sessionId: string, title: string): Observable<NexusChatSession> {
    return this.api.put<NexusChatSession>(`nexus/chats/${sessionId}`, { title });
  }

  deleteChatSession(sessionId: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`nexus/chats/${sessionId}`);
  }

  importGithubRepo(sessionId: string, repoUrl: string): Observable<NexusWorkspaceImportResponse> {
    return this.api.post<NexusWorkspaceImportResponse>(`nexus/chats/${sessionId}/workspace/github/import`, { repo_url: repoUrl });
  }

  getWorkspaceStatus(sessionId: string): Observable<NexusWorkspaceImportResponse> {
    return this.api.get<NexusWorkspaceImportResponse>(`nexus/chats/${sessionId}/workspace/status`);
  }

  getWorkspaceTree(sessionId: string, path = ''): Observable<NexusWorkspaceTreeResponse> {
    return this.api.get<NexusWorkspaceTreeResponse>(`nexus/chats/${sessionId}/workspace/tree?path=${encodeURIComponent(path)}`);
  }

  getWorkspaceFile(sessionId: string, path: string, startLine = 1, lineCount = 1000): Observable<NexusWorkspaceFileReadResponse> {
    return this.api.get<NexusWorkspaceFileReadResponse>(`nexus/chats/${sessionId}/workspace/file?path=${encodeURIComponent(path)}&start_line=${startLine}&line_count=${lineCount}`);
  }
}
