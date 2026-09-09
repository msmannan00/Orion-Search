import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ScrollRailMarker, ScrollRailMessage, ScrollRailPrompt } from '../model/message-scroll-rail.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-message-scroll-rail',
  imports: [TranslatePipe],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './message-scroll-rail.component.html',
})
export class MessageScrollRailComponent implements OnChanges, OnDestroy {
  private readonly maxVisibleMarkers = 10;
  private readonly scrollAnchorOffset = 72;
  private readonly scrollEdgeThreshold = 96;
  private activeMessageIndex: number | null = null;
  private activeMarkerIndex: number | null = null;
  private activePromptNumber: number | null = null;
  private scrollFrame: number | null = null;
  private scrollTarget: HTMLElement | Window | null = null;
  private setupFrame: number | null = null;
  private readonly onScroll = () => {
    this.scheduleScrollSync();
  };
  private readonly onResize = () => {
    this.scheduleScrollSync();
  };

  prompts: ScrollRailPrompt[] = [];
  visibleMarkers: ScrollRailMarker[] = [];

  @Input() messages: readonly ScrollRailMessage[] = [];

  constructor(private readonly cdr: ChangeDetectorRef) { }

  ngOnChanges(): void {
    this.rebuildPrompts();
  }

  ngOnDestroy(): void {
    this.clearScrollTracking();
  }

  isActive(prompt: ScrollRailPrompt): boolean {
    return prompt.promptNumber === this.activePromptNumber;
  }

  isMarkerActive(marker: ScrollRailMarker): boolean {
    return marker.markerIndex === this.activeMarkerIndex;
  }

  scrollToMarker(marker: ScrollRailMarker): void {
    this.setActiveMessageIndex(marker.startMessageIndex);
    if (marker.startMessageIndex === 0) {
      this.scrollToEdge('start');
      return;
    }
    this.scrollToMessage(marker.startMessageIndex);
  }

  scrollToPrompt(prompt: ScrollRailPrompt): void {
    this.setActivePrompt(prompt, this.getMarkerForPrompt(prompt));
    this.scrollToMessage(prompt.messageIndex);
  }

  private scrollToMessage(messageIndex: number): void {
    this.getMessageElement(messageIndex)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private scrollToEdge(position: 'end' | 'start'): void {
    const scrollTarget = this.scrollTarget ?? this.getFallbackScrollTarget();
    if (scrollTarget instanceof HTMLElement) {
      scrollTarget.scrollTo({
        behavior: 'smooth',
        top: position === 'start' ? 0 : scrollTarget.scrollHeight - scrollTarget.clientHeight,
      });
      return;
    }
    const documentElement = document.documentElement;
    window.scrollTo({
      behavior: 'smooth',
      top: position === 'start' ? 0 : documentElement.scrollHeight - window.innerHeight,
    });
  }

  private rebuildPrompts(): void {
    let promptNumber = 0;
    this.prompts = this.messages.reduce<ScrollRailPrompt[]>((items, message, messageIndex) => {
      if (message.sender === 'user') {
        promptNumber += 1;
        items.push({ messageIndex, promptNumber, title: this.getPromptTitle(message) });
      }
      return items;
    }, []);

    if (!this.prompts.some(prompt => prompt.messageIndex === this.activeMessageIndex)) {
      const lastPrompt = this.prompts.at(-1);
      this.activeMessageIndex = lastPrompt?.messageIndex ?? null;
      this.activePromptNumber = lastPrompt?.promptNumber ?? null;
    }
    this.visibleMarkers = this.getVisibleMarkers(this.prompts);
    this.syncActiveMarker();
    this.scheduleScrollTracking();
  }

  private getVisibleMarkers(prompts: ScrollRailPrompt[]): ScrollRailMarker[] {
    if (!prompts.length || !this.messages.length) {
      return [];
    }

    const markerCount = Math.min(this.maxVisibleMarkers, prompts.length, this.messages.length);
    return Array.from({ length: markerCount }, (_, index) => {
      const startMessageIndex = Math.floor(index * this.messages.length / markerCount);
      const rawEndMessageIndex = Math.floor((index + 1) * this.messages.length / markerCount) - 1;
      const endMessageIndex = Math.max(startMessageIndex, Math.min(rawEndMessageIndex, this.messages.length - 1));
      const rangePrompts = prompts.filter(prompt => prompt.messageIndex >= startMessageIndex && prompt.messageIndex <= endMessageIndex);
      const startPrompt = rangePrompts[0] ?? this.getPromptForMessageIndex(startMessageIndex) ?? prompts[0];
      const endPrompt = rangePrompts.at(-1) ?? this.getPromptForMessageIndex(endMessageIndex) ?? startPrompt;
      const startPromptNumber = startPrompt.promptNumber;
      const endPromptNumber = endPrompt.promptNumber;
      return {
        endPromptNumber,
        endMessageIndex,
        markerIndex: index,
        startMessageIndex,
        startPromptNumber,
        targetPrompt: startPrompt,
        title: startPromptNumber === endPromptNumber ? `Prompt ${startPromptNumber}` : `Prompts ${startPromptNumber}-${endPromptNumber}`,
      };
    });
  }

  private setActivePrompt(prompt: ScrollRailPrompt, marker: ScrollRailMarker | undefined): void {
    this.activeMessageIndex = prompt.messageIndex;
    this.activePromptNumber = prompt.promptNumber;
    this.activeMarkerIndex = marker?.markerIndex ?? null;
  }

  private setActiveMessageIndex(messageIndex: number): boolean {
    const marker = this.getMarkerForMessageIndex(messageIndex);
    const prompt = this.getPromptForMessageIndex(messageIndex);
    const nextPromptNumber = prompt?.promptNumber ?? null;
    const nextMarkerIndex = marker?.markerIndex ?? null;
    const changed = this.activeMessageIndex !== messageIndex
      || this.activePromptNumber !== nextPromptNumber
      || this.activeMarkerIndex !== nextMarkerIndex;
    this.activeMessageIndex = messageIndex;
    this.activePromptNumber = nextPromptNumber;
    this.activeMarkerIndex = nextMarkerIndex;
    return changed;
  }

  private syncActiveMarker(): void {
    if (this.activeMessageIndex === null) {
      this.activeMarkerIndex = null;
      return;
    }

    this.activeMarkerIndex = this.getMarkerForMessageIndex(this.activeMessageIndex)?.markerIndex ?? null;
  }

  private getMarkerForPrompt(prompt: ScrollRailPrompt): ScrollRailMarker | undefined {
    return this.visibleMarkers.find(marker => prompt.messageIndex >= marker.startMessageIndex && prompt.messageIndex <= marker.endMessageIndex);
  }

  private getMarkerForMessageIndex(messageIndex: number): ScrollRailMarker | undefined {
    return this.visibleMarkers.find(marker => messageIndex >= marker.startMessageIndex && messageIndex <= marker.endMessageIndex);
  }

  private getPromptForMessageIndex(messageIndex: number): ScrollRailPrompt | undefined {
    const prompt = [...this.prompts].reverse().find(item => item.messageIndex <= messageIndex);
    return prompt ?? this.prompts[0];
  }

  private scheduleScrollTracking(): void {
    if (this.setupFrame !== null) {
      cancelAnimationFrame(this.setupFrame);
    }
    this.setupFrame = requestAnimationFrame(() => {
      this.setupFrame = null;
      this.updateScrollTarget();
      this.syncActivePromptFromScroll();
    });
  }

  private updateScrollTarget(): void {
    const firstMessageElement = this.getMessageElement(0);
    const nextTarget = firstMessageElement ? this.getScrollTarget(firstMessageElement) : null;
    if (nextTarget === this.scrollTarget) {
      return;
    }

    this.removeScrollListeners();
    this.scrollTarget = nextTarget;
    if (!this.scrollTarget) {
      return;
    }
    this.scrollTarget.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  private scheduleScrollSync(): void {
    if (this.scrollFrame !== null) {
      return;
    }
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = null;
      this.syncActivePromptFromScroll();
    });
  }

  private syncActivePromptFromScroll(): void {
    if (!this.prompts.length || !this.scrollTarget) {
      return;
    }

    const edgeMessageIndex = this.getScrollEdgeMessageIndex(this.scrollTarget);
    if (edgeMessageIndex !== null) {
      if (this.setActiveMessageIndex(edgeMessageIndex)) {
        this.cdr.detectChanges();
      }
      return;
    }

    const anchorY = this.getScrollViewportTop(this.scrollTarget) + this.scrollAnchorOffset;
    let activeMessageIndex: number | null = null;
    for (let messageIndex = 0; messageIndex < this.messages.length; messageIndex += 1) {
      const element = this.getMessageElement(messageIndex);
      if (!element) {
        continue;
      }
      if (element.getBoundingClientRect().top <= anchorY) {
        activeMessageIndex = messageIndex;
        continue;
      }
      break;
    }

    activeMessageIndex = activeMessageIndex ?? this.getFirstVisibleMessageIndex(this.scrollTarget) ?? 0;
    if (!this.setActiveMessageIndex(activeMessageIndex)) {
      return;
    }

    this.cdr.detectChanges();
  }

  private getFirstVisibleMessageIndex(scrollTarget: HTMLElement | Window): number | null {
    const viewportTop = this.getScrollViewportTop(scrollTarget);
    const viewportBottom = this.getScrollViewportBottom(scrollTarget);
    for (let messageIndex = 0; messageIndex < this.messages.length; messageIndex += 1) {
      const element = this.getMessageElement(messageIndex);
      if (!element) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.bottom >= viewportTop && rect.top <= viewportBottom) {
        return messageIndex;
      }
    }
    return null;
  }

  private getMessageElement(messageIndex: number): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-ai-message-index="${messageIndex}"]`);
  }

  private getFallbackScrollTarget(): HTMLElement | Window {
    const firstMessageElement = this.getMessageElement(0);
    return firstMessageElement ? this.getScrollTarget(firstMessageElement) : window;
  }

  private getScrollTarget(element: HTMLElement): HTMLElement | Window {
    let current = element.parentElement;
    while (current && current !== document.body) {
      const overflowY = window.getComputedStyle(current).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
        return current;
      }
      current = current.parentElement;
    }
    return window;
  }

  private getScrollViewportTop(scrollTarget: HTMLElement | Window): number {
    return scrollTarget instanceof HTMLElement ? scrollTarget.getBoundingClientRect().top : 0;
  }

  private getScrollViewportBottom(scrollTarget: HTMLElement | Window): number {
    return scrollTarget instanceof HTMLElement ? scrollTarget.getBoundingClientRect().bottom : window.innerHeight;
  }

  private getScrollEdgeMessageIndex(scrollTarget: HTMLElement | Window): number | null {
    if (!this.messages.length) {
      return null;
    }
    const lastMessageIndex = this.messages.length - 1;
    const firstMessageElement = this.getMessageElement(0);
    const lastMessageElement = this.getMessageElement(lastMessageIndex);
    const viewportTop = this.getScrollViewportTop(scrollTarget);
    const viewportBottom = this.getScrollViewportBottom(scrollTarget);
    if (firstMessageElement) {
      const firstRect = firstMessageElement.getBoundingClientRect();
      if (firstRect.top <= viewportTop + this.scrollEdgeThreshold && firstRect.bottom >= viewportTop) {
        return 0;
      }
    }
    if (lastMessageElement) {
      const lastRect = lastMessageElement.getBoundingClientRect();
      if (lastRect.bottom >= viewportBottom - this.scrollEdgeThreshold && lastRect.top <= viewportBottom) {
        return lastMessageIndex;
      }
    }
    if (!(scrollTarget instanceof HTMLElement)) {
      if (window.scrollY <= this.scrollEdgeThreshold) {
        return 0;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - this.scrollEdgeThreshold) {
        return lastMessageIndex;
      }
      return null;
    }
    if (scrollTarget.scrollTop <= this.scrollEdgeThreshold) {
      return 0;
    }
    if (scrollTarget.scrollTop + scrollTarget.clientHeight >= scrollTarget.scrollHeight - this.scrollEdgeThreshold) {
      return lastMessageIndex;
    }
    return null;
  }

  private clearScrollTracking(): void {
    if (this.setupFrame !== null) {
      cancelAnimationFrame(this.setupFrame);
      this.setupFrame = null;
    }
    if (this.scrollFrame !== null) {
      cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = null;
    }
    this.removeScrollListeners();
  }

  private removeScrollListeners(): void {
    this.scrollTarget?.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    this.scrollTarget = null;
  }

  private getPromptTitle(message: ScrollRailMessage): string {
    const title = typeof message.text === 'string' ? message.text.trim().replace(/\s+/g, ' ') : '';
    return title ? title.slice(0, 90) : 'Untitled prompt';
  }
}
