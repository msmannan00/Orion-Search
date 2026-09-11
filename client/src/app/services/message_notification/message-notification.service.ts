import { Injectable, signal, computed } from '@angular/core';
type MessageType = 'success' | 'fail';
@Injectable({ providedIn: 'root' })
export class MessageNotificationService {
  private messageSignal = signal<string | null>(null);
  private typeSignal = signal<MessageType>('fail');
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private showTimeoutId: ReturnType<typeof setTimeout> | null = null;

  message = computed(() => this.messageSignal());
  type = computed(() => this.typeSignal());

  private clearActiveMessage(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }
    this.messageSignal.set(null);
  }

  show(message: string, type: MessageType = 'fail', duration = 3000) {
    this.clearActiveMessage();
    this.showTimeoutId = setTimeout(() => {
      this.showTimeoutId = null;
      this.messageSignal.set(message);
      this.typeSignal.set(type);
      this.timeoutId = setTimeout(() => {
        this.messageSignal.set(null);
        this.timeoutId = null;
      }, duration);
    });
  }

  clear() {
    this.clearActiveMessage();
  }
}
