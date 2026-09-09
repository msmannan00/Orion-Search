import { Component, OnInit, input, output, ChangeDetectionStrategy } from '@angular/core';
import { KeyValuePipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { fadeInDashboardItem } from '../../animations/dashboard.item.animation';
import { advancedRowMotionAnimation } from '../../animations/advanced.row.motion.animation';
import { popupAnimation } from '../../animations/popup.animations';
import { StealerlogsSearchFilters, StealerlogsSearchFilterLabels } from '../../model/stealerlogs-filter/stealerlogs-filters';
import { SidebarService } from '../../services/sidebar.service';
import { TooltipDirective } from '../../directive/tooltip-directive.directive';
import { ChatWidgetComponent } from '../../../pages/root-searches/ai-workspace/chat-widget/chat-widget.component';
import { AppService } from '../../../services/core/app/app.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AiToolRoutingService } from '../../services/ai-tool-routing.service';
import { DOMAIN_NAME_PATTERN, EMAIL_ADDRESS_PATTERN, IPV4_ADDRESS_PATTERN } from '../../utils/network-validation.util';
import type { SharedSearchAdvancedChip, SharedSearchAdvancedFilter } from './model/ioc-search.model';
import { getOwnProperty } from '../../utils/type-guards.util';

export type { SharedSearchAdvancedChip, SharedSearchAdvancedFilter } from './model/ioc-search.model';





@Component({
  selector: 'app-ioc-search',
  imports: [KeyValuePipe, FormsModule, TooltipDirective, NgClass, NgTemplateOutlet, ChatWidgetComponent, TranslatePipe],
  templateUrl: './ioc-search.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [fadeInDashboardItem, advancedRowMotionAnimation, popupAnimation],
})
export class IocSearchComponent implements OnInit {
  private readonly DEFAULT_VALUE_VALIDATORS: RegExp[] = [EMAIL_ADDRESS_PATTERN, DOMAIN_NAME_PATTERN, IPV4_ADDRESS_PATTERN, /^(?:\d{6}|\d{13,19})$/];
  private readonly DEFAULT_TAG_VALIDATORS: Record<string, RegExp> = { [StealerlogsSearchFilters.EMAIL]: EMAIL_ADDRESS_PATTERN, [StealerlogsSearchFilters.DOMAIN]: DOMAIN_NAME_PATTERN, [StealerlogsSearchFilters.IP]: IPV4_ADDRESS_PATTERN, [StealerlogsSearchFilters.CREDITCARD]: /^(?:\d{6}|\d{13,19})$/, [StealerlogsSearchFilters.CHANNEL]: /^.*$/ };

  readonly basicTags = input<string[]>([StealerlogsSearchFilters.ALL, StealerlogsSearchFilters.DOMAIN, StealerlogsSearchFilters.EMAIL, StealerlogsSearchFilters.CREDITCARD, StealerlogsSearchFilters.IP]);
  readonly filterLabels = input<Record<string, string>>(StealerlogsSearchFilterLabels);
  readonly allTag = input<string>(StealerlogsSearchFilters.ALL);
  readonly defaultBasicTag = input<string>(StealerlogsSearchFilters.ALL);
  readonly defaultAdvancedTag = input<string>(StealerlogsSearchFilters.DOMAIN);
  readonly maxAdvancedFilters = input<number>(8);
  readonly valueValidators = input<RegExp[]>(this.DEFAULT_VALUE_VALIDATORS);
  readonly tagValidators = input<Record<string, RegExp>>(this.DEFAULT_TAG_VALIDATORS);
  readonly useRouteQuery = input<boolean>(true);
  readonly advancedTitle = input<string>('Advanced Filter Builder');
  readonly advancedSubtitle = input<string>('Combine multiple filters with AND/OR for precise results');
  readonly aiType = input<string>('');
  readonly aiWelcomeMessage = input<string>('');
  readonly usePageSearchStyle = input<boolean>(false);
  isAdvanced = false;
  isAdvancedBuilderExpanded = false;
  basicSubmitted = false;
  basicTouched = false;
  selectedTag = this.defaultBasicTag();
  basicQuery = '';
  advancedFilters: SharedSearchAdvancedFilter[] = [{ id: this.generateId(), tag: this.defaultAdvancedTag(), value: '', operator: '&&' }];
  readonly searchTriggered = output<string>();

  constructor(protected sidebarService: SidebarService, private route: ActivatedRoute, protected appService: AppService, protected aiToolRoutingService: AiToolRoutingService) { }

  get resolvedAiType(): string {
    return this.aiType() || this.aiToolRoutingService.getTypeForApiType('stealer-ioc');
  }

  get resolvedAiWelcomeMessage(): string {
    return this.aiWelcomeMessage() || this.aiToolRoutingService.getMessageForApiType('stealer-ioc');
  }

  ngOnInit(): void {
    this.selectedTag = this.defaultBasicTag();
    this.advancedFilters = [{ id: this.generateId(), tag: this.defaultAdvancedTag(), value: '', operator: '&&' }];
    if (this.useRouteQuery()) {
      this.route.queryParams.subscribe(params => {
        const q = params.q;
        if (q) {
          this.basicQuery = this.stripUrlPrefixes(q);
        }
      });
    }
  }

  toggleAdvanced(): void {
    this.isAdvanced = !this.isAdvanced;
    if (!this.isAdvanced) {
      this.closeAdvancedBuilder();
    }
  }

  openAdvancedBuilder(): void {
    this.isAdvancedBuilderExpanded = true;
  }

  closeAdvancedBuilder(): void {
    this.isAdvancedBuilderExpanded = false;
  }

  onAdvancedBuilderBackdrop(event: MouseEvent): void {
    const eventTargetElement = event.target;
    if (eventTargetElement instanceof HTMLElement && eventTargetElement.dataset.role === 'backdrop') {
      this.closeAdvancedBuilder();
    }
  }

  clearAdvancedBuilder(): void {
    this.advancedFilters = [{ id: this.generateId(), tag: this.defaultAdvancedTag(), value: '', operator: '&&' }];
  }

  hasAdvancedBuilderState(): boolean {
    if (this.advancedFilters.length !== 1) {
      return true;
    }
    const filter = this.advancedFilters[0];
    return Boolean(filter?.value.trim() || filter?.tag !== this.defaultAdvancedTag());
  }

  getAdvancedFilterChips(): SharedSearchAdvancedChip[] {
    return this.advancedFilters.reduce<SharedSearchAdvancedChip[]>((chips, filter, index) => {
      const value = filter.value.trim();
      if (!value) {
        return chips;
      }
      const operator = index === 0 ? 'WHERE' : (this.advancedFilters[index - 1].operator === '&&' ? 'AND' : 'OR');
      const label = this.filterLabels()[filter.tag] || filter.tag;
      chips.push({ id: filter.id, label: `${operator} ${label}: ${value}` });
      return chips;
    }, []);
  }

  executeAdvancedBuilder(): void {
    if (this.triggerSearch()) {
      this.closeAdvancedBuilder();
    }
  }

  selectBasicTag(tag: string): void {
    this.selectedTag = tag;
    this.basicSubmitted = false;
  }

  addFilter(): void {
    if (this.advancedFilters.length >= this.maxAdvancedFilters()) {
      return;
    }
    this.advancedFilters.push({
      id: this.generateId(),
      tag: this.defaultAdvancedTag(),
      value: '',
      operator: '&&'
    });
  }

  removeFilter(id: string): void {
    if (this.advancedFilters.length > 1) {
      this.advancedFilters = this.advancedFilters.filter(f => f.id !== id);
    }
  }

  triggerSearch(): boolean {
    this.basicSubmitted = true;
    let finalQuery: string;
    if (this.isAdvanced) {
      this.advancedFilters = this.advancedFilters.map(f => ({ ...f, value: this.stripUrlPrefixes(f.value) }));
      const invalidFilter = this.advancedFilters.find(f => f.value && !this.validateValue(f.tag, f.value));
      if (invalidFilter) {
        return false;
      }
      finalQuery = this.advancedFilters
        .filter(f => f.value.trim() !== '')
        .map((f, index) => {
          const op = index === 0 ? '' : ` ${this.advancedFilters[index - 1].operator} `;
          return `${op}${f.tag}:${f.value.trim()}`;
        })
        .join('');
    }
    else {
      if (this.isBasicInvalid()) {
        return false;
      }
      finalQuery = this.normalizeBasicQuery(this.selectedTag, this.basicQuery);
    }
    this.searchTriggered.emit(finalQuery);
    return true;
  }

  isBasicInvalid(): boolean {
    if (!this.basicSubmitted && !this.basicTouched) {
      return false;
    }
    if (!this.basicSubmitted) {
      return false;
    }
    const value = this.basicQuery?.trim();
    if (!value) {
      return false;
    }
    return !this.validateComplexQuery(value);
  }

  isAdvancedInvalid(filter: SharedSearchAdvancedFilter): boolean {
    return !!filter.value && !this.validateValue(filter.tag, filter.value);
  }

  validateComplexQuery(input: string): boolean {
    if (!input.trim()) {
      return false;
    }
    if (this.selectedTag === this.allTag()) {
      return true;
    }
    if (this.hasInvalidOperators(input)) {
      return false;
    }
    if (/\s+/.test(input) && !/&&|\|\|/.test(input)) {
      return false;
    }
    const tokens = this.extractTokens(input);
    if (!tokens.length) {
      return false;
    }
    return tokens.every(token => this.isValidToken(token));
  }

  private isValidToken(value: string): boolean {
    return this.valueValidators().some(regex => regex.test(value));
  }

  private hasInvalidOperators(input: string): boolean {
    return (/(&{3,}|\|{3,})/.test(input) ||
              /(&&\|\||\|\|&&)/.test(input) ||
              /^[&|]/.test(input));
  }

  private extractTokens(input: string): string[] {
    const normalized = this.normalizeOperators(input);
    return normalized
      .split(/\s+(?:\|\||&&)\s+/)
      .map(v => v.trim())
      .filter(Boolean);
  }

  private normalizeOperators(input: string): string {
    return input
      .replace(/(?<!\|)\|(?!\|)/g, ' || ')
      .replace(/(?<!&)&(?!&)/g, ' && ')
      .replace(/\s*\|\|\s*/g, ' || ')
      .replace(/\s*&&\s*/g, ' && ')
      .trim();
  }

  validateValue(tag: string, value: string): boolean {
    if (tag == StealerlogsSearchFilters.CHANNEL) {
      return true;
    }
    if (this.hasInvalidOperators(value)) {
      return false;
    }
    if (/\s+/.test(value) && !/&&|\|\|/.test(value)) {
      return false;
    }
    const validator = getOwnProperty(this.tagValidators(), tag);
    if (!validator) {
      return true;
    }
    const values = this.extractValues(value);
    if (!values.length) {
      return false;
    }
    return values.every(v => validator.test(v));
  }

  private normalizeBasicQuery(tag: string, input: string): string {
    input = this.stripUrlPrefixes(input);
    if (!input.trim()) {
      return tag === this.allTag() ? '' : `${tag}:*`;
    }
    let normalized = input
      .replace(/(?<!\|)\|(?!\|)/g, ' || ')
      .replace(/(?<!&)&(?!&)/g, ' && ')
      .replace(/\s*\|\|\s*/g, ' || ')
      .replace(/\s*&&\s*/g, ' && ')
      .trim();
    const parts = normalized.split(/\s+(?:\|\||&&)\s+/g);
    const operators = normalized.match(/(\|\||&&)/g) ?? [];
    const result: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = getOwnProperty(parts, i).trim();
      if (!part || part === '&&' || part === '||') {
        continue;
      }
      result.push(`${tag}:${part}`);
      if (getOwnProperty(operators, i)) {
        result.push(getOwnProperty(operators, i));
      }
    }
    return result.join(' ');
  }

  getBasicErrorMessage(): string {
    const value = this.basicQuery?.trim();
    const displayTag = (this.filterLabels()[this.selectedTag] || this.selectedTag).replace(/^m_/, '');
    if (!value && this.selectedTag !== this.allTag()) {
      return `Please enter a valid ${displayTag.toLowerCase()}`;
    }
    if (this.hasInvalidOperators(value)) {
      return 'Invalid operator usage (use && or ||)';
    }
    if (/\s+/.test(value) && !/&&|\|\|/.test(value)) {
      return 'Use && or || between multiple values';
    }
    if (this.selectedTag === this.allTag()) {
      return '';
    }
    switch (this.selectedTag) {
      case StealerlogsSearchFilters.EMAIL:
        return 'Invalid email format';
      case StealerlogsSearchFilters.DOMAIN:
        return 'Invalid domain format';
      case StealerlogsSearchFilters.IP:
        return 'Invalid IP address format';
      case StealerlogsSearchFilters.CREDITCARD:
        return 'Invalid credit card format';
      default:
        return `Invalid ${displayTag.toLowerCase()} format`;
    }
  }

  private extractValues(input: string): string[] {
    return input
      .replace(/(?<!\|)\|(?!\|)/g, ' || ')
      .replace(/(?<!&)&(?!&)/g, ' && ')
      .split(/\s+(?:\|\||&&)\s+/)
      .map(v => v.trim())
      .filter(Boolean);
  }

  onBasicQueryChange(value: string): void {
    this.basicQuery = this.stripUrlPrefixes(value);
    if (!this.basicTouched && this.basicQuery.trim().length > 0) {
      this.basicTouched = true;
    }
  }

  filterBasicInput(event: Event): void {
    const inputElement = event.target;
    if (!(inputElement instanceof HTMLInputElement)) {
      return;
    }
    const value = this.stripUrlPrefixes(inputElement.value);
    if (this.selectedTag === this.allTag()) {
      this.updateBasicInput(inputElement, value);
      return;
    }
    let regex: RegExp;
    switch (this.selectedTag) {
      case StealerlogsSearchFilters.EMAIL:
        regex = /[^a-zA-Z0-9@._&|\s-]/g;
        break;
      case StealerlogsSearchFilters.DOMAIN:
        regex = /[^a-zA-Z0-9.&|\s-]/g;
        break;
      case StealerlogsSearchFilters.IP:
        regex = /[^0-9.&|\s]/g;
        break;
      case StealerlogsSearchFilters.CREDITCARD:
        regex = /[^0-9\s&|]/g;
        break;
      default:
        regex = /[^a-zA-Z0-9&|@.\s]/g;
    }
    const sanitized = value.replace(regex, '');
    this.updateBasicInput(inputElement, sanitized);
  }

  stripUrlPrefixes(value: string): string {
    return String(value || '').replace(/\bhttps?:\/\//gi, '').replace(/\bwww\./gi, '').replace(/\/$/, '');
  }

  private updateBasicInput(inputElement: HTMLInputElement, value: string): void {
    if (value !== inputElement.value) {
      const cursor = Math.min(inputElement.selectionStart ?? value.length, value.length);
      inputElement.value = value;
      this.basicQuery = value;
      inputElement.setSelectionRange(cursor, cursor);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}
