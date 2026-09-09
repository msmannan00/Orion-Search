import { Component, OnChanges, OnDestroy, SimpleChanges, input, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { ResultRowHelperService } from '../../../../shared/services/result-row-helper.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ConfirmationPopupComponent } from '../../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { CredentialResultItem } from '../../../../shared/model/results/credentials/credential.callback.model';
import type { CreditCardField, TelemetryGroup } from './model/expanded-row.model';
import { isIpv4Address } from '../../../../shared/utils/network-validation.util';
import { getOwnProperty } from '../../../../shared/utils/type-guards.util';

export type { CreditCardField, TelemetryGroup } from './model/expanded-row.model';





@Component({
  selector: 'app-expanded-row',
  standalone: true,
  imports: [NgClass, TooltipDirective, TranslatePipe, ConfirmationPopupComponent],
  templateUrl: './expanded-row.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./expanded-row.component.scss'],
})
export class ExpandedRowComponent implements OnChanges, OnDestroy {
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;
  private telemetryGroupsCache: TelemetryGroup[] = [];
  private visiblePasswordKeys = new Set<string>();
  private readonly passwordRevealConfirmKey = 'orion.passwordRevealConfirmed';
  private passwordRevealConfirmed = false;
  private pendingPasswordRevealKey: string | null = null;

  activeTelemetryKey: string | null = null;
  matchedValues: string[] = [];
  copiedKey: string | null = null;
  isPasswordRevealConfirmationOpen = false;
  readonly mode = input<'stealer' | 'threat'>('stealer');
  readonly item = input<CredentialResultItem | null>(null);
  readonly result = input<CredentialResultItem | null>(null);
  readonly searchQuery = input<string>('');

  constructor(private rowHelper: ResultRowHelperService) {
    this.passwordRevealConfirmed = this.getPasswordRevealConfirmed();
  }

  ngOnDestroy(): void {
    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.mode || changes.item || changes.result) {
      this.activeTelemetryKey = null;
      this.copiedKey = null;
      if (this.copiedTimer) {
        clearTimeout(this.copiedTimer);
      }
      this.visiblePasswordKeys.clear();
      this.rebuildTelemetryGroups();
    }
    if (changes.mode || changes.item || changes.result || changes.searchQuery) {
      this.parseSearchQuery();
    }
  }

  parseSearchQuery(): void {
    this.matchedValues = [];
    const searchQuery = this.searchQuery();
    if (!searchQuery) {
      return;
    }
    const parts = searchQuery
      .split(/\s*(\|\||\||&&|&)\s*/)
      .filter(p => p && !['||', '|', '&&', '&'].includes(p));
    for (let part of parts) {
      part = part.trim();
      let value = part;
      const tagMatch = /^(\w+):(.+)$/.exec(part);
      if (tagMatch) {
        value = tagMatch[2].trim();
      }
      if (value) {
        this.matchedValues.push(value);
      }
    }
  }

  isTelemetryMatched(group: TelemetryGroup): boolean {
    return this.isAnyValueMatched(group.values);
  }

  isAnyValueMatched(values: unknown[]): boolean {
    return values.some(value => this.isValueMatched(value));
  }

  isValueMatched(value: unknown): boolean {
    const candidate = this.normalizeMatchValue(value);
    if (!candidate || !this.matchedValues.length) {
      return false;
    }
    return this.matchedValues.some(matched => this.valuesMatch(candidate, matched));
  }

  get channelValue(): string {
    const item = this.item();
    const result = this.result();
    const v = item?.channel ??
          item?.m_channel ??
          item?.source_channel ??
          item?.m_source_channel ??
          result?.channel ??
          result?.m_channel ??
          result?.source_channel ??
          result?.m_source_channel;
    const arr = this.rowHelper.normalizeToArray(v);
    return arr[0] || '-';
  }

  get yearValue(): string {
    const d = this.item()?.date ?? this.result()?.m_update_date;
    if (!d) {
      return '-';
    }
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 7);
  }

  get fileTypeValue(): string {
    const item = this.item();
    const result = this.result();
    const v = item?.type ??
          item?.file_type ??
          item?.fileType ??
          result?.type ??
          result?.file_type ??
          result?.fileType;
    const arr = this.rowHelper.normalizeToArray(v);
    return arr[0] || '-';
  }

  get threatSourceIndexValue(): string {
    const result = this.result();
    const value = result?.rank_index ??
          result?.m_rank_index ??
          result?.m_index ??
          result?.index ??
          result?.type ??
          result?.file_type;
    return this.formatIndexLabel(value);
  }

  get threatTitleValue(): string {
    const result = this.result();
    const candidates = [
      ...this.rowHelper.normalizeToArray(result?.m_title),
      ...this.rowHelper.normalizeToArray(result?.title),
      ...this.rowHelper.normalizeToArray(result?.m_name),
      ...this.rowHelper.normalizeToArray(result?.name),
    ];
    const title = candidates
      .map(value => String(value || '').replace(/\s+/g, ' ').trim())
      .find(Boolean);
    return title ?? this.threatBaseDomainValue;
  }

  get threatBaseDomainValue(): string {
    const result = this.result();
    const candidates = [
      ...this.rowHelper.normalizeToArray(result?.m_base_url),
      ...this.rowHelper.normalizeToArray(result?.m_url),
      ...this.rowHelper.normalizeToArray(result?.m_weblink),
      ...this.rowHelper.normalizeToArray(result?.m_web_url),
      ...this.rowHelper.normalizeToArray(result?.m_domain),
      ...this.rowHelper.normalizeToArray(result?.m_root_domain),
      ...this.rowHelper.normalizeToArray(result?.m_websites),
    ];
    return candidates.map(value => this.extractDomain(value)).find(Boolean) ?? '-';
  }

  get threatDescriptionValue(): string {
    const result = this.result();
    const candidates = [
      ...this.rowHelper.normalizeToArray(result?.m_important_content),
      ...this.rowHelper.normalizeToArray(result?.m_description),
      ...this.rowHelper.normalizeToArray(result?.m_content),
      ...this.rowHelper.normalizeToArray(result?.m_title),
      ...this.rowHelper.normalizeToArray(result?.description),
      ...this.rowHelper.normalizeToArray(result?.content),
      ...this.rowHelper.normalizeToArray(result?.title),
    ];
    const description = candidates
      .map(value => String(value || '').replace(/\s+/g, ' ').trim())
      .map(value => value.replace(/^(description|m_description|content|m_content|title|m_title)\s*[:=-]\s*/i, '').trim())
      .find(Boolean);
    return description ?? 'Description not found';
  }

  get passwordValue(): string {
    const arr = this.rowHelper.normalizeToArray(this.item()?.password);
    return arr[0] || '-';
  }

  get isCreditCardRecord(): boolean {
    return String(this.item()?.type ?? '').toLowerCase() === 'bin';
  }

  get recordSubtitle(): string {
    return this.isCreditCardRecord ? 'Credit card BIN record' : 'Recovered credential record';
  }

  get identityPanelTitle(): string {
    return this.isCreditCardRecord ? 'Credit Card Intelligence' : 'Identity Intelligence';
  }

  get identityPanelIcon(): string {
    return this.isCreditCardRecord ? 'bi-credit-card-2-front-fill' : 'bi-person-badge-fill';
  }

  get creditCardFields(): CreditCardField[] {
    const item = this.item();
    return [
      { key: 'bin', label: 'BIN', icon: 'bi-credit-card-2-front-fill', value: this.firstValue(item?.bin) },
      { key: 'Scheme', label: 'Scheme', icon: 'bi-wallet2', value: this.firstValue(item?.Scheme ?? item?.scheme) },
      { key: 'Type', label: 'Type', icon: 'bi-card-text', value: this.firstValue(item?.Type ?? item?.card_type ?? item?.type) },
      { key: 'Tier', label: 'Tier', icon: 'bi-tag-fill', value: this.firstValue(item?.Tier ?? item?.tier) },
      { key: 'Issuer', label: 'Issuer', icon: 'bi-building', value: this.firstValue(item?.Issuer ?? item?.issuer) },
      { key: 'Country', label: 'Country', icon: 'bi-flag-fill', value: this.firstValue(item?.Country ?? item?.country) },
      { key: 'Luhn', label: 'Luhn', icon: 'bi-check2-circle', value: this.formatBooleanValue(item?.Luhn ?? item?.luhn) },
      { key: 'Website', label: 'Website', icon: 'bi-link-45deg', value: this.firstValue(item?.Website ?? item?.website) },
    ];
  }

  get sourceDomainValues(): string[] {
    return this.getSourceDomainValues(this.item());
  }

  get sourceDomainValueText(): string {
    return this.sourceDomainValues.length ? this.sourceDomainValues.join(', ') : '-';
  }

  get domainValues(): string[] {
    const item = this.item();
    const domains = this.getRawDomainValues(item);
    if (domains.length) {
      return domains;
    }
    return this.getSourceDomainValues(item);
  }

  confidenceScore(): number {
    const record = this.mode() === 'stealer' ? this.item() : this.result();
    if (!record) {
      return 0;
    }

    const values = (value: unknown): string[] => this.rowHelper.normalizeToArray(value);
    const clean = (value: unknown): string => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    const term = (value: string): string => {
      let text = String(value || '').trim().replace(/^['"]|['"]$/g, '');
      if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
        const fieldMatch = /^[a-z_][a-z0-9_]*:(.+)$/i.exec(text);
        if (fieldMatch) {
          text = fieldMatch[1].trim();
        }
      }
      return clean(text);
    };
    const domain = (value: string): string => {
      let text = clean(value);
      if (!text || text === '-') {
        return '';
      }
      text = text.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
      text = text.replace(/^[^@/\s]+@/, '');
      text = text.split(/[/?#]/)[0] ?? '';
      text = text.split(':')[0] ?? '';
      text = text.replace(/^\.+|\.+$/g, '').replace(/^www\./, '');
      return text && text.includes('.') && !/\s/.test(text) && !isIpv4Address(text) ? text : '';
    };

    const searchTerms = Array.from(new Set((this.searchQuery() || '')
      .split(/\s*(?:\|\||&&|\||&)\s*|[\s,;]+/)
      .map(term)
      .filter(value => value.length >= 3)));
    const domains = Array.from(new Set((this.mode() === 'stealer'
      ? [...values(record?.domain), ...values(record?.source_domain)]
      : [...values(record?.m_domain), ...values(record?.m_root_domain), ...values(record?.m_url), ...values(record?.m_base_url), ...values(record?.m_weblink)])
      .map(domain)
      .filter(Boolean)));
    const keys = this.mode() === 'stealer'
      ? ['email', 'username', 'user', 'domain', 'source_domain', 'raw', 'url', 'ip', 'bin', 'card_type', 'channel', 'file', 'timestamp', 'date']
      : ['m_email', 'm_username', 'm_user', 'm_domain', 'm_root_domain', 'm_url', 'm_base_url', 'm_weblink', 'm_title', 'm_content', 'm_important_content', 'm_channel', 'm_date', 'm_update_date', 'rank_index', 'm_rank_index'];
    const searchable = Array.from(new Set([...domains, ...keys.flatMap(key => values(getOwnProperty(record, key)))])).map(clean).filter(value => value.length >= 3);
    const baseKeys = ['confidence', 'confidence_score', 'score', 'rank_score', 'relevance_score', 'm_score'];
    let score = baseKeys.reduce((found, key) => {
      if (found > 0) {
        return found;
      }
      const raw = Number(values(getOwnProperty(record, key))[0]);
      return Number.isFinite(raw) && raw > 0 ? (raw <= 1 ? raw * 100 : raw) : 0;
    }, 0) || 50;

    if (searchTerms.some(search => searchable.some(value => value.includes(search) || search.includes(value)))) {
      score += 18;
    }
    const dateValue = ['date', 'm_date', 'm_update_date', 'timestamp', 'created_at', 'updated_at', 'time', 'year']
      .map(key => values(getOwnProperty(record, key))[0])
      .find(Boolean);
    const parsedDate = dateValue ? new Date(dateValue) : null;
    if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
      const days = (Date.now() - parsedDate.getTime()) / 86400000;
      score += days <= 30 ? 12 : days <= 180 ? 8 : days <= 365 ? 5 : 0;
    }
    if (domains.length > 1) {
      score += 8;
    }
    if (searchTerms.some(search => {
      const queryDomain = domain(search) || search;
      return queryDomain.length >= 3 && domains.some(value => value.includes(queryDomain) || queryDomain.includes(value));
    })) {
      score += 15;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  get identityPasswordKey(): string {
    return `${this.mode()}-identity-password`;
  }

  isPasswordVisible(key: string): boolean {
    return this.visiblePasswordKeys.has(key);
  }

  togglePassword(key: string, value: string, e?: MouseEvent) {
    if (e) {
      e.stopPropagation();
    }
    if (!value || value === '-') {
      return;
    }
    if (this.visiblePasswordKeys.has(key)) {
      return;
    }
    if (!this.passwordRevealConfirmed) {
      this.pendingPasswordRevealKey = key;
      this.isPasswordRevealConfirmationOpen = true;
      return;
    }
    this.visiblePasswordKeys.add(key);
  }

  isPasswordMasked(key: string, value: string): boolean {
    return !!value && value !== '-' && !this.isPasswordVisible(key);
  }

  passwordTooltip(key: string, value: string): string {
    if (!value || value === '-') {
      return 'No password';
    }
    return this.isPasswordVisible(key) ? 'Password revealed' : 'Show password';
  }

  isPasswordGroup(group: TelemetryGroup): boolean {
    const key = (group?.key || '').toLowerCase();
    const label = (group?.label || '').toLowerCase();
    return key.includes('password') || label.includes('password');
  }

  passwordTelemetryKey(groupKey: string, index: number): string {
    return `${this.mode()}-${groupKey}-${index}`;
  }

  isTelemetryPasswordMasked(group: TelemetryGroup, index: number, value: string): boolean {
    return this.isPasswordGroup(group) && this.isPasswordMasked(this.passwordTelemetryKey(group.key, index), value);
  }

  telemetryValueTooltip(group: TelemetryGroup, value: string, index: number, copyKey: string): string {
    if (!this.isPasswordGroup(group)) {
      return this.isCopied(copyKey) ? 'Copied' : 'Copy';
    }
    return this.passwordTooltip(this.passwordTelemetryKey(group.key, index), value);
  }

  handleTelemetryValueClick(group: TelemetryGroup, value: string, index: number, copyKey: string, e?: MouseEvent) {
    if (!this.isPasswordGroup(group)) {
      this.copyText(value, copyKey, e);
      return;
    }
    this.togglePassword(this.passwordTelemetryKey(group.key, index), value, e);
  }

  handlePasswordRevealConfirmation(confirmed: boolean) {
    this.isPasswordRevealConfirmationOpen = false;
    if (confirmed) {
      this.passwordRevealConfirmed = true;
      this.setPasswordRevealConfirmed();
      if (this.pendingPasswordRevealKey) {
        this.visiblePasswordKeys.add(this.pendingPasswordRevealKey);
      }
    }
    this.pendingPasswordRevealKey = null;
  }

  private getPasswordRevealConfirmed(): boolean {
    try {
      return localStorage.getItem(this.passwordRevealConfirmKey) === 'true';
    }
    catch {
      return false;
    }
  }

  private setPasswordRevealConfirmed() {
    try {
      localStorage.setItem(this.passwordRevealConfirmKey, 'true');
    }
    catch {
      return;
    }
  }

  get telemetryGroups(): TelemetryGroup[] {
    return this.telemetryGroupsCache;
  }

  get activeTelemetryGroup(): TelemetryGroup | null {
    if (!this.activeTelemetryKey) {
      return null;
    }
    return this.telemetryGroups.find(g => g.key === this.activeTelemetryKey) ?? null;
  }

  selectTelemetry(key: string, e?: MouseEvent) {
    if (e) {
      e.stopPropagation();
    }
    this.activeTelemetryKey = key;
  }

  telemetryIcon(key: string): string {
    const k = (key || '').toLowerCase();
    if (k.includes('email')) {
      return 'bi-envelope-fill';
    }
    if (k.includes('phone')) {
      return 'bi-telephone-fill';
    }
    if (k.includes('domain')) {
      return 'bi-globe2';
    }
    if (k.includes('url')) {
      return 'bi-link-45deg';
    }
    if (k.includes('ip')) {
      return 'bi-router-fill';
    }
    if (k.includes('country')) {
      return 'bi-flag-fill';
    }
    if (k.includes('cve') || k.includes('cwe')) {
      return 'bi-bug-fill';
    }
    if (k.includes('yara')) {
      return 'bi-shield-lock-fill';
    }
    if (k.includes('credit') || k.includes('card')) {
      return 'bi-credit-card-2-front-fill';
    }
    if (k.includes('org') || k.includes('company') || k.includes('industry')) {
      return 'bi-building';
    }
    if (k.includes('person') || k.includes('author')) {
      return 'bi-person-fill';
    }
    if (k.includes('location')) {
      return 'bi-geo-alt-fill';
    }
    if (k.includes('language')) {
      return 'bi-translate';
    }
    if (k.includes('agent')) {
      return 'bi-window';
    }
    if (k.includes('asn')) {
      return 'bi-diagram-3-fill';
    }
    if (k.includes('team')) {
      return 'bi-people-fill';
    }
    if (k.includes('hash') || k.includes('id')) {
      return 'bi-fingerprint';
    }
    if (k.includes('platform')) {
      return 'bi-cpu-fill';
    }
    if (k.includes('file') || k.includes('path')) {
      return 'bi-folder-fill';
    }
    return 'bi-tag-fill';
  }

  copyText(text: unknown, key: string, e?: MouseEvent) {
    this.rowHelper.copyText(text, key, (copiedKey) => {
      this.copiedTimer = this.rowHelper.setCopiedState(copiedKey, this.copiedTimer, (value) => {
        this.copiedKey = value;
      });
    }, e);
  }

  isCopied(key: string): boolean {
    return this.rowHelper.isCopied(this.copiedKey, key);
  }

  private rebuildTelemetryGroups() {
    this.telemetryGroupsCache = this.mode() === 'stealer'
      ? this.buildStealerGroups(this.item())
      : this.buildThreatGroups(this.result());
    const domainKey = this.mode() === 'stealer' ? 'domain' : 'm_domain';
    this.activeTelemetryKey = this.telemetryGroupsCache.find(g => g.key === domainKey)?.key ?? this.telemetryGroupsCache[0]?.key ?? null;
  }

  private buildStealerGroups(item: CredentialResultItem | null): TelemetryGroup[] {
    if (!item) {
      return [];
    }
    const emails = this.rowHelper.normalizeToArray(item?.email);
    const sourceDomains = this.getSourceDomainValues(item);
    const domains = this.uniqueValues([
      ...this.getRawDomainValues(item),
      ...sourceDomains
    ]);
    const ips = this.rowHelper.normalizeToArray(item?.ip);
    const passwords = this.rowHelper.normalizeToArray(item?.password);
    const exclude = new Set<string>([
      '_id',
      'raw',
      'type',
      'file_type',
      'date',
      'fileType',
      'channel',
      'm_channel',
      'm_sub_host',
      'source_channel',
      'm_source_channel',
      'ip',
      'password',
      'hash',
      'index',
      'mapping',
      'delimiter',
      'domain',
      'source_domain'
    ]);
    if (this.isCreditCardRecord) {
      ['bin', 'Scheme', 'scheme', 'Type', 'card_type', 'Tier', 'tier', 'Issuer', 'issuer', 'Country', 'country', 'Luhn', 'luhn', 'Website', 'website']
        .forEach(key => exclude.add(key));
      const cardGroups = this.creditCardFields
        .filter(field => field.value && field.value !== '-')
        .map(field => ({ key: field.key, label: field.label, values: [field.value] }));
      const rest = Object.keys(item)
        .filter(k => !exclude.has(k))
        .map(k => ({ key: k, label: this.rowHelper.prettyLabel(k), values: this.rowHelper.normalizeToArray(getOwnProperty(item, k)) }))
        .filter(g => g.values.length > 0)
        .filter(g => !this.isHashOrIndexKey(g.key, g.label))
        .sort((a, b) => a.label.localeCompare(b.label));
      return [...cardGroups, ...rest];
    }
    const core: TelemetryGroup[] = [];
    if (emails.length > 1) {
      core.push({ key: 'email', label: 'Email', values: emails });
    }
    if (domains.length > 0) {
      core.push({ key: 'domain', label: sourceDomains.length ? 'Domain / Source Domain' : 'Domain', values: domains });
    }
    if (ips.length > 1) {
      core.push({ key: 'ip', label: 'IP', values: ips });
    }
    if (passwords.length > 1) {
      core.push({ key: 'password', label: 'Password', values: passwords });
    }
    const rest: TelemetryGroup[] = Object.keys(item)
      .filter(k => !exclude.has(k))
      .map(k => ({ key: k, label: this.rowHelper.prettyLabel(k), values: this.rowHelper.normalizeToArray(getOwnProperty(item, k)) }))
      .filter(g => g.values.length > 0)
      .filter(g => !this.isHashOrIndexKey(g.key, g.label))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [...core, ...rest];
  }

  private buildThreatGroups(result: CredentialResultItem | null): TelemetryGroup[] {
    if (!result) {
      return [];
    }
    const exclude = new Set<string>([
      'm_date',
      'm_file',
      'm_year',
      'm_source',
      'm_root_domain',
      'm_channel',
      'm_rank_index',
      'm_hash',
      'm_index'
    ]);
    const groups: TelemetryGroup[] = Object.entries(result)
      .filter(([key, value]) => key.startsWith('m_') && Array.isArray(value) && value.length > 0 && !exclude.has(key))
      .map(([key, value]) => ({ key, label: this.rowHelper.prettyLabel(key), values: this.rowHelper.normalizeToArray(value) }))
      .filter(g => g.values.length > 0)
      .filter(g => !this.isHashOrIndexKey(g.key, g.label));
    const emailK = 'm_email';
    const domainK = 'm_domain';
    const ipK = 'm_ip';
    const passK = 'm_password';
    const emailV = this.rowHelper.normalizeToArray(getOwnProperty(result, emailK));
    const domainV = this.rowHelper.normalizeToArray(getOwnProperty(result, domainK));
    const ipV = this.rowHelper.normalizeToArray(getOwnProperty(result, ipK));
    const passV = this.rowHelper.normalizeToArray(getOwnProperty(result, passK));
    const core: TelemetryGroup[] = [];
    if (emailV.length > 0) {
      core.push({ key: emailK, label: 'Email', values: emailV });
    }
    if (domainV.length > 0) {
      core.push({ key: domainK, label: 'Domain', values: domainV });
    }
    if (ipV.length > 0) {
      core.push({ key: ipK, label: 'IP', values: ipV });
    }
    if (passV.length > 0) {
      core.push({ key: passK, label: 'Password', values: passV });
    }
    const rest = groups
      .filter(g => ![emailK, domainK, ipK, passK].includes(g.key))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [...core, ...rest];
  }

  private isHashOrIndexKey(key: string, label?: string): boolean {
    const k = (key || '').toLowerCase();
    const l = (label ?? '').toLowerCase();
    return k.includes('hash') || k.includes('index') || l.includes('hash') || l.includes('index');
  }

  private uniqueValues(values: string[]): string[] {
    return Array.from(new Set(values.map(v => String(v).trim()).filter(Boolean)));
  }

  private firstValue(value: unknown): string {
    return this.rowHelper.normalizeToArray(value)
      .map(v => String(v ?? '').trim())
      .find(Boolean) ?? '-';
  }

  private formatBooleanValue(value: unknown): string {
    if (value === true) {
      return 'Valid';
    }
    if (value === false) {
      return 'Invalid';
    }
    return this.firstValue(value);
  }

  private formatIndexLabel(value: unknown): string {
    const raw = this.rowHelper.normalizeToArray(value)[0];
    if (!raw) {
      return '-';
    }
    const cleaned = String(raw)
      .replace(/^m[_\s-]+/i, '')
      .replace(/[_\s-]*model$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned ? cleaned.replace(/\b\w/g, c => c.toUpperCase()) : '-';
  }

  private extractDomain(value: unknown): string {
    let text = String(value ?? '').trim().replace(/^['"]|['"]$/g, '');
    if (!text || text === '-') {
      return '';
    }
    if (text.includes('@') && !text.includes('/')) {
      text = text.split('@').pop() ?? text;
    }
    const parseValue = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
    try {
      const host = new URL(parseValue).hostname;
      return host.replace(/^www\./i, '');
    }
    catch {
      return text
        .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
        .split(/[/?#]/)[0]
        .split(':')[0]
        .replace(/^www\./i, '')
        .replace(/^\.+|\.+$/g, '');
    }
  }

  private normalizeMatchValue(value: unknown): string {
    let text = String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    text = text.replace(/^['"]|['"]$/g, '').replace(/^\*+|\*+$/g, '');
    const fieldMatch = /^[a-z_][a-z0-9_]*:(.+)$/i.exec(text);
    return (fieldMatch ? fieldMatch[1] : text).trim().replace(/^['"]|['"]$/g, '').replace(/^\*+|\*+$/g, '');
  }

  private valuesMatch(value: unknown, matched: unknown): boolean {
    const candidate = this.normalizeMatchValue(value);
    const search = this.normalizeMatchValue(matched);
    if (!candidate || !search || candidate === '-' || search === '-') {
      return false;
    }
    if (candidate.includes(search) || search.includes(candidate)) {
      return true;
    }
    const candidateDomain = this.matchableDomain(candidate);
    const searchDomain = this.matchableDomain(search);
    return !!candidateDomain && !!searchDomain && (candidateDomain.includes(searchDomain) || searchDomain.includes(candidateDomain));
  }

  private matchableDomain(value: unknown): string {
    const domain = this.extractDomain(value).toLowerCase();
    return domain && domain.includes('.') && !/\s/.test(domain) ? domain : '';
  }

  private getRawDomainValues(item: CredentialResultItem | null): string[] {
    return this.uniqueValues(this.rowHelper.normalizeToArray(item?.domain));
  }

  private getSourceDomainValues(item: CredentialResultItem | null): string[] {
    return this.uniqueValues(this.rowHelper.normalizeToArray(item?.source_domain));
  }
}
