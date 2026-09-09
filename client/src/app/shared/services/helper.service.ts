import { Injectable, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { franc } from 'franc-min';
import { LANGUAGE_MAP } from '../constants/shared-enums';
import { ConsolidatedParamModel } from '../model/results/consolidated/consolidated.param.model';
import { AppService } from '../../services/core/app/app.service';
import { MessageNotificationService } from '../../services/message_notification/message-notification.service';
import { PublicUserActivityItem } from '../partials/report-interactions/models/public-user-data.model';
import { ExportBrandingService } from './export/export-branding.service';
import { getOwnProperty, setOwnProperty } from '../utils/type-guards.util';

type RiskClass = 'risk-high' | 'risk-medium' | 'risk-low' | 'risk-info';
@Injectable({
  providedIn: 'root'
})
export class HelperService {
  constructor(private sanitizer: DomSanitizer, private appService: AppService, private messageNotificationService: MessageNotificationService, private exportBranding: ExportBrandingService) {
  }

  detectLanguageName(text: string): string {
    const iso639_3 = franc(text);
    if (iso639_3 === 'und') {
      return "en";
    }
    const match = getOwnProperty(LANGUAGE_MAP, iso639_3);
    return match ? match.iso1 : "fr";
  }

  riskClass(risk: string | null | undefined): RiskClass {
    const r = String(risk ?? '').toLowerCase();
    if (r === 'high' || r === 'critical') {
      return 'risk-high';
    }
    if (r === 'medium') {
      return 'risk-medium';
    }
    if (r === 'low') {
      return 'risk-low';
    }
    return 'risk-info';
  }

  extractDomain(url: string): string {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split('?')[0]
      .split('#')[0];
  }

  extractLinks(input: string): string[] {
    if (!input) {
      return [];
    }
    const matches = input.match(/\b(?:https:\/\/|http:\/\/)?[a-z0-9.-]{1,253}\.[a-z]{2,63}[^\s]*/gi) ?? [];
    return matches.map(v => {
      const url = /^https?:\/\//i.test(v) ? v : 'https://' + v.replace(/^\/+/, '');
      try {
        return `https://${new URL(url).hostname.replace(/^www\./i, '')}`;
      }
      catch {
        return null;
      }
    }).filter((v): v is string => !!v);
  }

  downloadAsCSV(data: unknown, filename = 'search_results.csv') {
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  downloadstixJson(data: unknown, filename = 'stix_report.json') {
    const jsonString = JSON.stringify(this.exportBranding.addTenantJsonMetadata(data), null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  removeEmptyOrNullValues<T extends Record<string, unknown>>(params: T): Partial<T> {
    const defaultParams = new ConsolidatedParamModel();
    const cleanedParams: Partial<T> = {};
    for (const key in params) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        continue;
      }
      const value = getOwnProperty(params, key);
      const defaultValue = getOwnProperty((defaultParams as unknown as Record<string, unknown>), key);
      const isNullOrUndefined = value === null || value === undefined;
      const isEmptyString = typeof (value as unknown) === 'string' && (value as string).trim() === '';
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      const isSameAsDefault = JSON.stringify(value) === JSON.stringify(defaultValue);
      if (!isNullOrUndefined && !isEmptyString && !isEmptyArray && !isSameAsDefault || key == "q" || key == "page") {
        setOwnProperty(cleanedParams, key, value);
      }
    }
    return cleanedParams;
  }

  printPage() {
    window.print();
  }

  shareResult(url: string) {
    const shareUrl = this.normalizeShareUrl(url);
    if (navigator.share && shareUrl) {
      navigator.share({
        title: this.appService.getConfig().appSettings.app_name,
        text: 'Sharing a relevant CTI resource for review.',
        url: shareUrl
      }).catch(() => {
        this.copyShareUrl(shareUrl);
      });
      return;
    }
    if (shareUrl) {
      this.copyShareUrl(shareUrl);
    }
  }


  highlightWords(text: string): string {
    if (!text) {
      return '';
    }
    const escapeMarkup = (value: string) => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    let renderedMarkup: string;
    const highlightPattern = /<em>(.*?)<\/em>/g;
    const matches = [...text.matchAll(highlightPattern)];
    if (matches.length > 0) {
      let highlightedMarkup = '';
      let lastIndex = 0;
      let i = 0;
      while (i < matches.length) {
        let merged = getOwnProperty(matches, i)[1];
        const start = getOwnProperty(matches, i).index;
        let end = start + getOwnProperty(matches, i)[0].length;
        let j = i + 1;
        while (j < matches.length) {
          const prevEnd = end;
          const nextStart = getOwnProperty(matches, j).index;
          const betweenText = text.slice(prevEnd, nextStart);
          const cleanBetween = new DOMParser().parseFromString(betweenText, 'text/html').body.textContent ?? '';
          const wordGap = cleanBetween
            .trim()
            .split(/\s+/)
            .filter(Boolean).length;
          if (wordGap <= 2) {
            merged += ` ${cleanBetween.trim()} ${getOwnProperty(matches, j)[1]}`;
            end = getOwnProperty(matches, j).index + getOwnProperty(matches, j)[0].length;
            j++;
          }
          else {
            break;
          }
        }
        highlightedMarkup += escapeMarkup(text.slice(lastIndex, start));
        highlightedMarkup += `<span class="bg-[var(--color-tags)] text-[var(--color-text1)] rounded-sm px-1">${escapeMarkup(merged.trim())}</span>`;
        lastIndex = end;
        i = j;
      }
      renderedMarkup = highlightedMarkup + escapeMarkup(text.slice(lastIndex));
    }
    else {
      renderedMarkup = escapeMarkup(text.length > 500 ? text.substring(0, 500) : text);
    }
    const contextName = 'HTML';
    return this.sanitizer.sanitize(getOwnProperty(SecurityContext, contextName), renderedMarkup) ?? '';
  }

  private convertToCSV(data: unknown): string {
    const rows = this.toCsvRows(data);
    if (!rows.length) {
      return '';
    }
    const keys = Array.from(rows.reduce((acc, row) => {
      Object.keys(row).forEach(key => acc.add(key));
      return acc;
    }, new Set<string>()));
    return [
      keys.map(key => this.escapeCsvValue(key)).join(','),
      ...rows.map(row => keys.map(key => this.escapeCsvValue(getOwnProperty(row, key))).join(','))
    ].join('\n');
  }

  private toCsvRows(data: unknown): Record<string, unknown>[] {
    const tenantName = this.exportBranding.getTenantName();
    if (data === null || data === undefined) {
      return [];
    }
    if (Array.isArray(data)) {
      return data.map((item, index) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return { tenant_name: tenantName, ...this.brandCsvRow(item as Record<string, unknown>) };
        }
        return { tenant_name: tenantName, index: index + 1, value: this.exportBranding.replaceSystemBrand(item) };
      });
    }
    if (typeof data === 'object') {
      return [{ tenant_name: tenantName, ...this.brandCsvRow(data as Record<string, unknown>) }];
    }
    return [{ tenant_name: tenantName, value: this.exportBranding.replaceSystemBrand(data) }];
  }

  private brandCsvRow(row: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [
      key,
      this.exportBranding.replaceSystemBrand(value)
    ]));
  }

  private escapeCsvValue(value: unknown): string {
    const text = value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  sortByKey<T extends Record<string, unknown>>(list: T[], key: string, order: 'asc' | 'desc' = 'asc'): T[] {
    return list.slice().sort((a, b) => {
      const rawA = getOwnProperty(a, key);
      const rawB = getOwnProperty(b, key);
      const aVal = typeof rawA === 'string' ? rawA.trim() : String(rawA ?? '');
      const bVal = typeof rawB === 'string' ? rawB.trim() : String(rawB ?? '');
      const isDateKey = /date|timestamp/i.test(key);
      if (isDateKey) {
        const timeA = new Date(aVal).getTime();
        const timeB = new Date(bVal).getTime();
        const isValidA = !isNaN(timeA);
        const isValidB = !isNaN(timeB);
        if (!isValidA && !isValidB) {
          return 0;
        }
        if (!isValidA) {
          return order === 'asc' ? 1 : -1;
        }
        if (!isValidB) {
          return order === 'asc' ? -1 : 1;
        }
        return order === 'asc' ? timeA - timeB : timeB - timeA;
      }
      const strA = aVal.toString();
      const strB = bVal.toString();
      const comparison = strA.localeCompare(strB, undefined, { sensitivity: 'base' });
      return order === 'asc' ? comparison : -comparison;
    });
  }

  getActivityThreadTarget(item: PublicUserActivityItem): { path: string[]; queryParams: Record<string, string> } | null {
    const docId = item.doc_id?.trim();
    if (!docId) {
      return null;
    }

    switch (item.index_name) {
      case 'generic_model':
        return { path: ['/dashboard', 'strategic', 'all', docId], queryParams: { ci: 'strategic' } };
      case 'leak_model':
        return { path: ['/dashboard', 'breach', 'all', docId], queryParams: { ci: 'leak' } };
      case 'exploit_model':
        return { path: ['/dashboard', 'exploit', 'all', docId], queryParams: { ci: 'exploit' } };
      case 'apt_model':
        return { path: ['/dashboard', 'apt-intel', 'apt', docId], queryParams: { ci: 'apt' } };
      case 'malware_model':
        return { path: ['/dashboard', 'apt-intel', 'malware', docId], queryParams: { ci: 'malware' } };
      case 'defacement_model':
        return { path: ['/dashboard', 'defacement', 'all', docId], queryParams: { ci: 'defacement' } };
      case 'social_model':
        return { path: ['/dashboard', 'social', 'all', docId], queryParams: { ci: 'social' } };
      case 'chat_model':
        return { path: ['/dashboard', 'social', 'chat', 'all', docId], queryParams: { ci: 'chat' } };
      default:
        if (!item.route_path) {
          return null;
        }
        return {
          path: ['/', ...item.route_path.split('/').filter(Boolean)],
          queryParams: item.route_query,
        };
    }
  }

  private normalizeShareUrl(url: string): string {
    const raw = String(url || '').trim() || window.location.href;
    if (!raw) {
      return '';
    }
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(normalized).toString();
    }
    catch {
      return window.location.href || '';
    }
  }

  private copyShareUrl(shareUrl: string): void {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.messageNotificationService.show('Share link copied to clipboard.', 'success');
      }).catch(() => {
        this.messageNotificationService.show(shareUrl, 'success', 5000);
      });
      return;
    }
    this.messageNotificationService.show(shareUrl, 'success', 5000);
  }
}
