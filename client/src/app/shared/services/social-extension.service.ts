import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EXTENSION_DOWNLOAD_URLS, EXTENSION_LATEST_TTL_MS } from '../constants/extension';
import { ExtensionPresence, ExtensionState } from '../model/extension/extension.model';
import { getOwnProperty } from '../utils/type-guards.util';


@Injectable({ providedIn: 'root' })
export class SocialExtensionService {
  private latest = '';
  private latestAt = 0;
  private installedVersion = '';

  detect(): Observable<ExtensionState> {
    return new Observable<ExtensionState>(subscriber => {
      if (!this.isSupportedBrowser()) {
        subscriber.next('unsupported');
        subscriber.complete();
        return;
      }

      let settled = false;
      let installed = false;
      let connected = false;
      let deadlineReached = false;

      const finish = (state: ExtensionState) => {
        if (settled) {
          return;
        }
        settled = true;
        subscriber.next(state);
        subscriber.complete();
      };
      const resolveState = () => {
        if (!installed) {
          const stamped = typeof document !== 'undefined'
              && document.documentElement?.getAttribute('data-orion-extension') === 'installed';
          finish(stamped ? 'checking' : 'install');
          return;
        }
        if (connected && this.outdated(this.installedVersion)) {
          finish('update');
          return;
        }
        finish(connected ? 'ready' : 'signin');
      };
      const resolveWhenProbesSettle = () => {
        if (deadlineReached) {
          resolveState();
        }
      };

      const onMessage = (event: MessageEvent) => {
        const data = event.data as ExtensionPresence;
        if (event.source !== window || data?.source !== 'orion-extension' || data.type !== 'presence') {
          return;
        }
        installed = true;
        connected = data.connected === true;
        if (typeof data.version === 'string' && data.version) {
          this.installedVersion = data.version;
        }
        resolveState();
      };

      void this.refreshLatest().finally(() => {
        resolveWhenProbesSettle();
      });
      window.addEventListener('message', onMessage);
      window.postMessage({ source: 'orion-app', type: 'ping' }, window.location.origin);
      const presenceTimer = setTimeout(() => {
        deadlineReached = true;
        resolveWhenProbesSettle();
      }, 1000);
      const hardTimer = setTimeout(resolveState, 1500);

      return () => {
        window.removeEventListener('message', onMessage);
        clearTimeout(presenceTimer);
        clearTimeout(hardTimer);
      };
    });
  }

  openExtension(): void {
    window.postMessage({ source: 'orion-app', type: 'open' }, window.location.origin);
  }

  crawlProfile(platform: string, url: string): Observable<Record<string, unknown> | null> {
    return new Observable<Record<string, unknown> | null>(subscriber => {
      let settled = false;
      const finish = (profile: Record<string, unknown> | null) => {
        if (settled) {
          return;
        }
        settled = true;
        subscriber.next(profile);
        subscriber.complete();
      };

      const onMessage = (event: MessageEvent) => {
        const data = event.data as { source?: string; type?: string; items?: Record<string, unknown>[] };
        if (event.source !== window || data?.source !== 'orion-extension' || data.type !== 'crawl-result') {
          return;
        }
        finish(data.items?.[0] ?? null);
      };

      window.addEventListener('message', onMessage);
      window.postMessage({ source: 'orion-app', type: 'crawl', platform, url }, window.location.origin);
      const timer = setTimeout(() => {
        finish(null);
      }, 30000);

      return () => {
        window.removeEventListener('message', onMessage);
        clearTimeout(timer);
      };
    });
  }

  async refreshLatest(): Promise<void> {
    if (this.latestAt && Date.now() - this.latestAt < EXTENSION_LATEST_TTL_MS) {
      return;
    }
    this.latestAt = Date.now();

    try {
      const response = await fetch('/api/social/extensions/version', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        return;
      }
      const body = await response.json() as { chrome?: string; firefox?: string };
      const value = this.browserKind() === 'firefox' ? body?.firefox : body?.chrome;
      if (typeof value === 'string' && value) {
        this.latest = value;
      }
    }
    catch {
      void 0;
    }
  }

  latestVersion(): string {
    return this.latest;
  }

  browserKind(): 'chrome' | 'firefox' {
    return typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox/') ? 'firefox' : 'chrome';
  }

  downloadUrl(browser: 'chrome' | 'firefox' = this.browserKind()): string {
    return getOwnProperty(EXTENSION_DOWNLOAD_URLS, browser);
  }

  private outdated(installed: string): boolean {
    if (!installed || !this.latest) {
      return false;
    }

    const current = installed.split('.').map(part => Number.parseInt(part, 10) || 0);
    const target = this.latest.split('.').map(part => Number.parseInt(part, 10) || 0);
    for (let i = 0; i < Math.max(current.length, target.length); i += 1) {
      const diff = (getOwnProperty(current, i) ?? 0) - (getOwnProperty(target, i) ?? 0);
      if (diff !== 0) {
        return diff < 0;
      }
    }
    return false;
  }

  private isSupportedBrowser(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }
    if (navigator.userAgent.includes('Firefox/')) {
      return true;
    }
    const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
    if (!brands?.length) {
      return false;
    }
    const names = brands.map(entry => entry.brand);
    return names.some(name => /chromium/i.test(name)) && !names.some(name => /opera|edge|brave|vivaldi|yandex|samsung/i.test(name));
  }
}
