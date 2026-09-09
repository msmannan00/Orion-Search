import { Injectable, inject } from '@angular/core';
import { AppService } from '../../services/core/app/app.service';

@Injectable({
  providedIn: 'root'
})
export class ProxyController {
  private isInitialized = false;
  private readonly appService = inject(AppService);
  private readonly handleDocumentClick = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }

    const anchor = this.getAnchorFromEvent(event);
    if (!anchor) {
      return;
    }

    if (anchor.hasAttribute('data-no-proxy')) {
      return;
    }

    const href = anchor.href?.trim();
    if (!href || href.startsWith('javascript')) {
      return;
    }

    event.preventDefault();
    this.open(href);
  };

  initialize(): void {
    if (this.isInitialized || typeof document === 'undefined') {
      return;
    }

    document.addEventListener('click', this.handleDocumentClick, true);
    this.isInitialized = true;
  }

  open(url?: string | null): void {
    const targetUrl = this.resolveTargetUrl(url);
    if (!targetUrl || typeof window === 'undefined') {
      return;
    }

    const openedWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (openedWindow) {
      openedWindow.opener = null;
    }
  }

  private getAnchorFromEvent(event: MouseEvent): HTMLAnchorElement | null {

    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
      if (node instanceof HTMLAnchorElement && node.matches('a[target="_blank"][href]')) {
        return node;
      }
    }

    const rawTarget = event.target;
    const eventTarget = rawTarget instanceof Element
      ? rawTarget
      : rawTarget instanceof Node
        ? rawTarget.parentElement
        : null;

    return eventTarget?.closest?.('a[target="_blank"][href]') as HTMLAnchorElement | null;
  }

  private resolveTargetUrl(url?: string | null): string {
    const rawUrl = String(url ?? '').trim();
    if (!rawUrl || typeof window === 'undefined') {
      return '';
    }
    try {
      const resolvedUrl = new URL(rawUrl, window.location.href);
      const currentHost = window.location.hostname.toLowerCase();
      const isCurrentOnionHost = currentHost.endsWith('.onion');
      const isLocalhostHost = currentHost === 'localhost'
        || currentHost === '127.0.0.1'
        || currentHost.endsWith('.localhost');
      const onionHost = resolvedUrl.hostname.toLowerCase();

      if (isCurrentOnionHost || this.appService.isMobileMode()) {
        return resolvedUrl.toString();
      }

      if (isLocalhostHost && onionHost.endsWith('.onion')) {
        const proxyHost = onionHost.slice(0, -'.onion'.length);
        return `${resolvedUrl.protocol}//${proxyHost}.localhost:9080${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
      }

      if (onionHost.endsWith('.onion')) {
        return `https://${onionHost}.tor.orionintelligence.org:9080${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
      }

      return resolvedUrl.toString();
    }
    catch {
      return rawUrl;
    }
  }
}
