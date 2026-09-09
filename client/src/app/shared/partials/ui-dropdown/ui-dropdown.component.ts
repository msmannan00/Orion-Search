import { NgClass, NgTemplateOutlet } from '@angular/common';
import { DomPortalOutlet, TemplatePortal } from '@angular/cdk/portal';
import { Component, ElementRef, EmbeddedViewRef, HostListener, NgZone, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import type { Nullable } from '../../utils/type-guards.util';
import type { UiDropdownMenuOption, UiDropdownOption } from './model/ui-dropdown.model';
export type { UiDropdownMenuOption, UiDropdownOption } from './model/ui-dropdown.model';





const UI_DROPDOWN_THEME = {
  ring: 'focus-visible:ring-[rgba(87,165,235,0.4)] [body.light-theme_&]:focus-visible:ring-[rgba(17,118,212,0.3)]',
  trigger: 'border-[#2c3d58] !bg-[#131e30] text-[#e6edf6] hover:border-[#3d5175] hover:!bg-[#131e30] focus:border-[#3d5175] focus:!bg-[#131e30] [body.light-theme_&]:border-[#c5d4e6] [body.light-theme_&]:!bg-[#e9f0f8] [body.light-theme_&]:text-[#243b53] [body.light-theme_&]:hover:border-[#9fb6cf] [body.light-theme_&]:hover:!bg-[#e3ecf6] [body.light-theme_&]:focus:border-[#9fb6cf] [body.light-theme_&]:focus:!bg-[#e9f0f8]',
  triggerOpen: '!border-[#d0d5dd] !border-b-white !bg-white !shadow-none text-[#344054] hover:!border-[#d0d5dd] hover:!border-b-white hover:!bg-white focus:!border-[#d0d5dd] focus:!border-b-white focus:!bg-white [body.light-theme_&]:!border-[#d0d5dd] [body.light-theme_&]:!border-b-white [body.light-theme_&]:!bg-white [body.light-theme_&]:text-[#344054] [body.light-theme_&]:hover:!border-[#d0d5dd] [body.light-theme_&]:hover:!border-b-white [body.light-theme_&]:hover:!bg-white [body.light-theme_&]:focus:!border-[#d0d5dd] [body.light-theme_&]:focus:!border-b-white [body.light-theme_&]:focus:!bg-white',
  selectedText: 'text-[#e6edf6] [body.light-theme_&]:text-[#243b53]',
  selectedTextOpen: 'text-[#344054]',
  placeholder: 'text-[#7f93ac] [body.light-theme_&]:text-[#8aa0b8]',
  placeholderOpen: 'text-[#98a2b3]',
  chevron: 'border-[#9fb3c8] [body.light-theme_&]:border-[#7c93ab]',
  chevronOpen: 'border-[#667085]',
  menu: 'border-[#d0d5dd] !bg-white !shadow-none',
  searchDivider: 'border-[#eaecf0]',
  searchShell: 'border-[#d0d5dd] bg-[#f8fafc]',
  searchIcon: 'text-[#98a2b3]',
  searchInput: 'text-[#344054] placeholder:text-[#98a2b3]',
  clearButton: 'text-[#98a2b3] hover:bg-[#e4e9f0] hover:text-[#344054] focus-visible:ring-[rgba(17,118,212,0.3)]',
  footerDivider: 'border-[#eaecf0]',
  clearAllButton: 'text-[#475467] hover:bg-[#e4e9f0] hover:text-[#101828] focus-visible:ring-[rgba(17,118,212,0.3)]',
  optionRing: 'focus-visible:ring-[rgba(17,118,212,0.3)]',
  option: 'font-medium text-[#475467] hover:bg-[#e4e9f0] hover:text-[#101828]',
  optionActive: '!bg-[#e4e9f0] font-medium text-[#101828]',
  optionSelected: '!bg-[rgba(17,118,212,0.14)] font-semibold text-[#0f172a]',
  optionNull: 'bg-transparent font-medium text-[#667085] hover:bg-[#e4e9f0] hover:text-[#344054]',
  checkbox: 'border-[#d0d5dd] bg-white',
  checkboxSelected: '!border-[#1176d4] !bg-[#1176d4]',
  muted: 'text-[#667085]',
  spinner: 'border-[#d0d5dd] border-t-[#667085]',
  chip: 'border-[rgba(87,165,235,0.3)] bg-[rgba(87,165,235,0.12)] text-[#cfe3f7] [body.light-theme_&]:border-[#cfdcea] [body.light-theme_&]:bg-[#eef4fb] [body.light-theme_&]:text-[#1f3b57]',
  chipRemove: 'text-[#9fb3c8] hover:bg-[rgba(255,255,255,0.1)] hover:text-white focus-visible:ring-[rgba(87,165,235,0.4)] [body.light-theme_&]:text-[#7c93ab] [body.light-theme_&]:hover:bg-[#dde8f4] [body.light-theme_&]:hover:text-[#172235] [body.light-theme_&]:focus-visible:ring-[rgba(17,118,212,0.3)]',
};





@Component({
  selector: 'app-ui-dropdown',
  standalone: true,
  imports: [FormsModule, NgClass, NgTemplateOutlet, TranslatePipe],
  host: {
    class: 'block',
  },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './ui-dropdown.component.html',
})
export class UiDropdownComponent implements OnDestroy {
  private static nextId = 0;
  private static activeDropdown: UiDropdownComponent | null = null;
  private readonly fallbackId = `ui-dropdown-${UiDropdownComponent.nextId++}`;
  @ViewChild('triggerButton') private triggerButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('listbox') private listbox?: ElementRef<HTMLElement>;
  @ViewChild('portalMenu', { static: true }) private portalMenu?: TemplateRef<unknown>;
  private portalOutlet: Nullable<DomPortalOutlet> = null;
  private portalViewRef: Nullable<EmbeddedViewRef<unknown>> = null;
  private readonly onDocumentPointerDown = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Node) || this.hostElement.nativeElement.contains(target)) {
      return;
    }
    if (this.portalViewRef?.rootNodes.some(node => node instanceof Node && node.contains(target))) {
      return;
    }
    this.ngZone.run(() => {
      this.close();
    });
  };
  private readonly onDocumentScroll = (event: Event): void => {
    if (event.target instanceof Node && this.portalOutlet?.outletElement === event.target) {
      return;
    }
    if (this.updatePortalPosition()) {
      this.portalViewRef?.detectChanges();
    }
  };

  readonly id = input<string | null>(null);
  readonly menuId = input<string | null>(null);
  readonly testId = input<string | null>(null);
  readonly optionTestIdPrefix = input<string | null>(null);
  readonly options = input<UiDropdownOption[]>([]);
  readonly selected = input<string | null | undefined>(null);
  readonly selectedValues = input<string[] | null | undefined>(null);
  readonly placeholder = input('Select');
  readonly searchPlaceholder = input('Search options');
  readonly translateLabels = input(false);
  readonly searchable = input(true);
  readonly allowEmpty = input(false);
  readonly multiSelect = input(false);
  readonly showSelectedChips = input(false);
  readonly menuPlacement = input<'absolute' | 'static'>('absolute');
  readonly surface = input<'default' | 'alert'>('default');
  readonly disabled = input(false);
  readonly size = input<'default' | 'large'>('default');
  readonly loading = input(false);
  readonly valueChange = output<string | null>();
  readonly valuesChange = output<string[]>();
  readonly searchChange = output<string>();
  readonly theme = UI_DROPDOWN_THEME;
  isOpen = false;
  searchTerm = '';
  activeIndex = -1;
  menuTop = 0;
  menuLeft = 0;
  menuWidth = 0;

  constructor(private readonly hostElement: ElementRef<HTMLElement>, private readonly translationService: TranslationService, private readonly ngZone: NgZone, private readonly viewContainerRef: ViewContainerRef) {}

  get selectedLabel(): string {
    if (this.multiSelect()) {
      const selectedValues = this.selectedValues() ?? [];
      if (!selectedValues.length) {
        return this.resolveUiLabel(this.placeholder());
      }
      const labels = selectedValues.map(value => {
        const option = this.options().find(item => item.key === value);
        return option ? this.resolveOptionLabel(option.label) : value;
      });
      if (labels.length <= 2) {
        return labels.join(', ');
      }
      return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
    }

    const selected = this.selected();
    if (!selected) {
      return this.resolveUiLabel(this.placeholder());
    }
    const option = this.options().find(item => item.key === selected);
    return option ? this.resolveOptionLabel(option.label) : this.resolveUiLabel(this.placeholder());
  }

  get visibleOptions(): UiDropdownMenuOption[] {
    const query = this.searchTerm.trim().toLowerCase();
    const options: UiDropdownMenuOption[] = this.options().map(option => ({
      ...option,
      label: this.resolveOptionLabel(option.label),
      trackKey: option.key,
      testKey: option.key,
    }));

    if (this.shouldShowEmptyOption()) {
      options.unshift({
        key: null,
        label: this.resolveUiLabel(this.placeholder()),
        trackKey: '__empty__',
        testKey: null,
      });
    }

    if (!query) {
      return options;
    }

    return options.filter(option => option.label.toLowerCase().includes(query) || String(option.key ?? '').toLowerCase().includes(query));
  }

  get resolvedMenuId(): string {
    return this.menuId() ?? `${this.fallbackId}-menu`;
  }

  shouldShowEmptyOption(): boolean {
    return this.allowEmpty() && this.options().length > 0;
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.canOpen()) {
      return;
    }
    if (this.isOpen) {
      this.close();
      return;
    }
    this.open();
  }

  select(value: string | null, event?: Event): void {
    event?.stopPropagation();
    if (this.multiSelect()) {
      if (value === null) {
        this.valuesChange.emit([]);
        return;
      }
      const selectedValues = this.selectedValues() ?? [];
      const nextValues = selectedValues.includes(value)
        ? selectedValues.filter(item => item !== value)
        : [...selectedValues, value];
      this.valuesChange.emit(nextValues);
      return;
    }

    this.close();
    this.valueChange.emit(value);
  }

  hasSelectedValues(): boolean {
    return this.multiSelect() && !!(this.selectedValues() ?? []).length;
  }

  clearAllSelectedValues(event: Event): void {
    event.stopPropagation();
    this.valuesChange.emit([]);
    this.focusSearch();
  }

  removeSelectedValue(value: string, event: Event): void {
    event.stopPropagation();
    const selectedValues = this.selectedValues() ?? [];
    this.valuesChange.emit(selectedValues.filter(item => item !== value));
  }

  selectedChipLabel(value: string): string {
    const option = this.options().find(item => item.key === value);
    return option ? this.resolveOptionLabel(option.label) : value;
  }

  onButtonKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen) {
      event.preventDefault();
      this.close();
      return;
    }
    if (!this.canOpen()) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (this.isOpen) {
        this.selectActive(event);
      }
      else {
        this.open();
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isOpen) {
        this.open();
      }
      this.moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (!this.isOpen) {
        this.open();
      }
      this.setActiveIndex(event.key === 'Home' ? 0 : this.visibleOptions.length - 1);
      return;
    }

    if (this.searchable() && this.isPrintableKey(event)) {
      event.preventDefault();
      this.open(event.key);
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchChange.emit(value);
    this.setActiveIndex(this.visibleOptions.length ? 0 : -1);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (this.handleNavigationKey(event)) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.selectActive(event);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeAndFocusTrigger();
    }
  }

  onOptionKeydown(event: KeyboardEvent): void {
    if (this.handleNavigationKey(event)) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeAndFocusTrigger();
    }
  }

  clearSearch(event: Event): void {
    event.stopPropagation();
    this.onSearchChange('');
    window.setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  setActiveIndex(index: number): void {
    const options = this.visibleOptions;
    if (!options.length) {
      this.activeIndex = -1;
      return;
    }
    this.activeIndex = Math.min(Math.max(index, 0), options.length - 1);
    this.scrollActiveIntoView();
  }

  optionId(index: number): string {
    return `${this.resolvedMenuId}-option-${index}`;
  }

  isSelected(value: string | null): boolean {
    if (this.multiSelect()) {
      return value === null ? !(this.selectedValues() ?? []).length : (this.selectedValues() ?? []).includes(value);
    }
    return value === null ? !this.selected() : this.selected() === value;
  }

  isOptionVisuallySelected(value: string | null): boolean {
    return value !== null && this.isSelected(value);
  }

  optionClass(option: UiDropdownMenuOption, index: number): string {
    if (option.key === null) {
      return `${this.theme.optionRing} ${this.theme.optionNull}`;
    }
    if (this.isSelected(option.key)) {
      return `${this.theme.optionRing} ${this.theme.optionSelected}`;
    }
    if (this.activeIndex === index) {
      return `${this.theme.optionRing} ${this.theme.optionActive}`;
    }
    return `${this.theme.optionRing} ${this.theme.option}`;
  }

  triggerClass(): string {
    const radiusClass = this.isOpen
      ? (this.size() === 'large' ? 'rounded-t-[10px] rounded-b-none' : 'rounded-t-[7px] rounded-b-none')
      : (this.size() === 'large' ? 'rounded-[10px]' : 'rounded-[7px]');
    const sizeClass = this.size() === 'large'
      ? `h-11 ${radiusClass} px-3 text-sm`
      : `h-10 ${radiusClass} px-[13px] text-xs`;


    return `${sizeClass} ${this.theme.ring} ${this.isOpen ? this.theme.triggerOpen : this.theme.trigger}`;
  }

  selectedLabelClass(): string {
    const hasSelection = this.multiSelect() ? !!(this.selectedValues() ?? []).length : !!this.selected();
    const labelSizeClass = this.size() === 'large' ? 'text-sm' : 'text-[13px]';
    if (this.isOpen) {
      return hasSelection ? `${this.theme.selectedTextOpen} ${labelSizeClass}` : `${this.theme.placeholderOpen} ${labelSizeClass}`;
    }
    return hasSelection ? `${this.theme.selectedText} ${labelSizeClass}` : `${this.theme.placeholder} ${labelSizeClass}`;
  }

  chevronClass(): string {
    return `${this.isOpen ? this.theme.chevronOpen : this.theme.chevron} ${this.isOpen ? 'rotate-[225deg] translate-y-1' : 'rotate-45'}`;
  }

  searchInputClass(): string {
    return this.theme.searchInput;
  }

  checkboxClass(value: string | null): string {
    const selected = value !== null && this.isSelected(value);
    return selected ? this.theme.checkboxSelected : this.theme.checkbox;
  }

  listboxClass(): string {
    return this.size() === 'large' ? 'max-h-[280px]' : 'max-h-[240px]';
  }

  menuClass(): string {
    const surfaceClass = this.surface() === 'alert' ? 'ui-dropdown-menu-alert' : '';
    const themeSurface = this.theme.menu;
    const base = `ui-dropdown-menu ${surfaceClass} box-border w-full min-w-full left-0 right-0 z-[1250] overflow-hidden rounded-b-lg rounded-t-none border border-t-0 p-1 ${themeSurface}`;
    if (this.menuPlacement() === 'static') {
      return `ui-dropdown-menu ${surfaceClass} absolute box-border z-[1250] overflow-hidden rounded-b-lg rounded-t-none border border-t-0 p-1 ${themeSurface}`;
    }
    return `${base} absolute top-full`;
  }

  close(): void {
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    this.isOpen = false;
    this.searchTerm = '';
    this.activeIndex = -1;
    this.detachPortalMenu();
    if (UiDropdownComponent.activeDropdown === this) {
      UiDropdownComponent.activeDropdown = null;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isOpen) {
      this.updatePortalPosition();
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    this.detachPortalMenu();
    if (UiDropdownComponent.activeDropdown === this) {
      UiDropdownComponent.activeDropdown = null;
    }
  }

  private open(searchTerm = ''): void {
    UiDropdownComponent.activeDropdown?.close();
    UiDropdownComponent.activeDropdown = this;
    this.isOpen = true;
    this.searchTerm = searchTerm;
    this.searchChange.emit(searchTerm);
    this.attachPortalMenu();
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    });
    const selectedIndex = this.visibleOptions.findIndex(option => this.isSelected(option.key));
    this.activeIndex = selectedIndex >= 0 ? selectedIndex : (this.visibleOptions.length ? 0 : -1);
    this.focusSearch();
    this.scrollActiveIntoView();
  }

  private attachPortalMenu(): void {
    if (this.menuPlacement() !== 'static' || !this.portalMenu || this.portalOutlet) {
      return;
    }
    this.portalOutlet = new DomPortalOutlet(this.findMenuHost());
    this.updatePortalPosition();
    this.portalViewRef = this.portalOutlet.attach(new TemplatePortal(this.portalMenu, this.viewContainerRef));
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('scroll', this.onDocumentScroll, true);
    });
  }

  private findMenuHost(): HTMLElement {





    for (let element = this.hostElement.nativeElement.parentElement; element && element !== document.body; element = element.parentElement) {
      const { position, overflowY } = getComputedStyle(element);
      if (position === 'fixed') {
        return element;
      }
      const scrollsVertically = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && element.scrollHeight > element.clientHeight;
      if (position !== 'static' && scrollsVertically) {
        return element;
      }
    }
    return document.body;
  }

  private detachPortalMenu(): void {
    if (!this.portalOutlet) {
      return;
    }
    document.removeEventListener('scroll', this.onDocumentScroll, true);

    this.portalOutlet.detach();
    this.portalOutlet = null;
    this.portalViewRef = null;
  }

  private updatePortalPosition(): boolean {
    const scroller = this.portalOutlet?.outletElement;
    const trigger = this.triggerButton?.nativeElement;
    if (!(scroller instanceof HTMLElement) || !trigger) {
      return false;
    }
    const triggerRect = this.visibleTriggerRect(trigger, scroller);
    const scrollerRect = scroller.getBoundingClientRect();


    const rawTop = triggerRect.bottom - scrollerRect.top + scroller.scrollTop - scroller.clientTop;
    const top = rawTop > 4000
      ? Math.min(20000, Math.floor(rawTop / 4) * 4)
      : this.snapToPositionGrid(rawTop, 2, Math.floor);
    const left = this.snapToPositionGrid(triggerRect.left - scrollerRect.left + scroller.scrollLeft - scroller.clientLeft, 1);
    const width = this.snapToPositionGrid(triggerRect.right - triggerRect.left, 1);
    if (top === this.menuTop && left === this.menuLeft && width === this.menuWidth) {
      return false;
    }
    this.menuTop = top;
    this.menuLeft = left;
    this.menuWidth = width;
    return true;
  }

  private visibleTriggerRect(trigger: HTMLElement, scroller: HTMLElement): { left: number; right: number; bottom: number } {
    const rect = trigger.getBoundingClientRect();
    let left = rect.left;
    let right = rect.right;
    for (let element = trigger.parentElement; element && element !== scroller; element = element.parentElement) {
      const { overflowX, overflowY } = getComputedStyle(element);
      if (overflowX === 'visible' && overflowY === 'visible') {
        continue;
      }
      const clipRect = element.getBoundingClientRect();
      left = Math.max(left, clipRect.left + element.clientLeft);
      right = Math.min(right, clipRect.left + element.clientLeft + element.clientWidth);
    }
    return { left, right: Math.max(left, right), bottom: rect.bottom };
  }

  private snapToPositionGrid(rawValue: number, step: number, round: (value: number) => number = Math.round): number {
    return Math.max(0, Math.min(4000, round(rawValue / step) * step));
  }

  private canOpen(): boolean {
    return !this.disabled() && (this.options().length > 0 || this.allowEmpty());
  }

  private handleNavigationKey(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        return true;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        return true;
      case 'Home':
        event.preventDefault();
        this.setActiveIndex(0);
        return true;
      case 'End':
        event.preventDefault();
        this.setActiveIndex(this.visibleOptions.length - 1);
        return true;
      case 'PageDown':
        event.preventDefault();
        this.moveActive(6);
        return true;
      case 'PageUp':
        event.preventDefault();
        this.moveActive(-6);
        return true;
      default:
        return false;
    }
  }

  private moveActive(delta: number): void {
    const options = this.visibleOptions;
    if (!options.length) {
      this.activeIndex = -1;
      return;
    }
    const nextIndex = this.activeIndex < 0 ? 0 : this.activeIndex + delta;
    this.setActiveIndex(nextIndex);
  }

  private selectActive(event: Event): void {
    const option = this.visibleOptions[this.activeIndex];
    if (!option) {
      return;
    }
    this.select(option.key, event);
  }

  private closeAndFocusTrigger(): void {
    this.close();
    window.setTimeout(() => this.triggerButton?.nativeElement.focus());
  }

  private focusSearch(): void {
    if (!this.searchable()) {
      return;
    }
    window.setTimeout(() => {
      this.searchInput?.nativeElement.focus();
      const valueLength = this.searchInput?.nativeElement.value.length ?? 0;
      this.searchInput?.nativeElement.setSelectionRange(valueLength, valueLength);
    });
  }

  private scrollActiveIntoView(): void {
    window.setTimeout(() => {
      const activeOption = this.listbox?.nativeElement.querySelector<HTMLElement>(`[data-dropdown-option-index="${this.activeIndex}"]`);
      activeOption?.scrollIntoView({ block: 'nearest' });
    });
  }

  private isPrintableKey(event: KeyboardEvent): boolean {
    return event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey;
  }

  private resolveOptionLabel(label: string): string {
    if (!this.translateLabels()) {
      return label;
    }
    return this.resolveUiLabel(label);
  }

  private resolveUiLabel(label: string): string {
    this.translationService.version();
    return this.translationService.translate(label);
  }
}
