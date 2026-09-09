import { Injectable } from '@angular/core';
import { setOwnProperty } from '../../utils/type-guards.util';


@Injectable({ providedIn: 'root' })
export class ExportSharedService {
  protected toRecord(input: string | object | null | undefined): Record<string, string> {
    if (!input) {
      return {};
    }
    if (typeof input === 'string') {
      return { value: input };
    }
    const out: Record<string, string> = {};
    Object.entries(input as Record<string, unknown>).forEach(([k, v]) => {
      if (v === null || v === undefined) {
        return;
      }
      setOwnProperty(out, k, Array.isArray(v) ? v.join(', ') : String(v));
    });
    return out;
  }

  protected cleanText(value: string): string {
    return String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  protected toTitle(input: string): string {
    return String(input || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  protected normalizeUrl(raw: string): string {
    const value = String(raw || '').trim();
    if (!value) {
      return '';
    }
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  protected compactMiddle(value: string, head: number, tail: number): string {
    const v = String(value || '').trim();
    if (!v) {
      return '';
    }
    if (v.length <= head + tail + 3) {
      return v;
    }
    return `${v.slice(0, head)}...${v.slice(-tail)}`;
  }
}
