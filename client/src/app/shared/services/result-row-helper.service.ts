import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResultRowHelperService {
  isCopied(copiedKey: string | null, key: string): boolean {
    return copiedKey === key;
  }

  normalizeToArray(value: unknown): string[] {
    if (value == null) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map(v => String(v)).filter(Boolean);
    }
    return [String(value)].filter(Boolean);
  }

  prettyLabel(key: string): string {
    const cleaned = String(key).replace(/^m_/, '').replace(/[_-]+/g, ' ').replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    if (!cleaned) {
      return String(key);
    }
    if (cleaned.length < 4) {
      return cleaned.toUpperCase();
    }
    return cleaned.toLowerCase().replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1));
  }

  valueOrDash(value: unknown): string {
    if (value == null || value === '') {
      return '-';
    }
    return String(value);
  }

  arrayOrDash(value: unknown, joinBy = ', '): string {
    const values = this.normalizeToArray(value);
    if (values.length === 0) {
      return '-';
    }
    return values.join(joinBy);
  }

  truncate(value: unknown, max = 30): string {
    const text = value == null ? '' : String(value);
    if (!text) {
      return '-';
    }
    if (text.length > max) {
      return `${text.slice(0, max)}...`;
    }
    return text;
  }

  copyToClipboard(value: string): Observable<boolean> {
    if (navigator?.clipboard?.writeText) {
      return new Observable<boolean>((observer) => {
        navigator.clipboard.writeText(value).then(() => {
          observer.next(true);
          observer.complete();
        }).catch(() => {
          observer.next(this.copyWithExecCommand(value));
          observer.complete();
        });
      });
    }
    return of(this.copyWithExecCommand(value));
  }

  copyText(text: unknown, key: string, setCopied: (key: string) => void, e?: MouseEvent): void {
    if (e) {
      e.stopPropagation();
    }
    const value = text == null ? '' : String(text);
    if (!value || value === '-') {
      return;
    }
    this.copyToClipboard(value).subscribe((ok) => {
      if (!ok) {
        return;
      }
      setCopied(key);
    });
  }

  setCopiedState(key: string, copiedTimer: ReturnType<typeof setTimeout> | null, setCopiedKey: (value: string | null) => void): ReturnType<typeof setTimeout> {
    setCopiedKey(key);
    if (copiedTimer) {
      clearTimeout(copiedTimer);
    }
    return setTimeout(() => {
      setCopiedKey(null);
    }, 1200);
  }

  private copyWithExecCommand(value: string): boolean {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.className = 'fixed -left-[9999px] top-0';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
    catch {
      return false;
    }
  }
}
