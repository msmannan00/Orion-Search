import { Component, HostListener, OnChanges, OnInit, SimpleChanges, input, output, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarShellComponent } from '../../../shared/partials/sidebar-shell/sidebar-shell.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { CtiGraphFilters, CtiGraphLegendItem, CtiGraphStats } from '../model/cti-graph.model';

@Component({
  selector: 'graph-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [SidebarShellComponent, TranslatePipe, FormsModule],
})
export class SidebarComponent implements OnInit, OnChanges {
  private readonly translationService = inject(TranslationService);

  isCollapsed = false;
  isMobile = false;
  localMaxEdge = 25;
  localMaxDepth = 1;
  readonly filters = input<CtiGraphFilters | null>(null);
  readonly stats = input<CtiGraphStats | null>(null);
  readonly legendItems = input<CtiGraphLegendItem[]>([]);
  readonly clusterLegendItems = input<CtiGraphLegendItem[]>([]);
  readonly collapsed = input(false);
  readonly collapsedChange = output<boolean>();
  readonly filtersApply = output<CtiGraphFilters>();

  ngOnInit(): void {
    this.updateViewportState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.collapsed) {
      this.isCollapsed = !!changes.collapsed.currentValue;
    }
    if (changes.filters) {
      this.localMaxEdge = this.clampNumber(this.filters()?.maxEdge, 20, 800, 25);
      this.localMaxDepth = this.clampNumber(this.filters()?.maxDepth, 1, 5, 1);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  onMobileBackdropClick(): void {
    if (!this.isMobile) {
      return;
    }
    this.isCollapsed = true;
    this.collapsedChange.emit(this.isCollapsed);
  }

  get queryModeLabel(): string {
    const type = this.filters()?.selectedType ?? 'cluster';
    if (type === 'property') {
      return 'Entity';
    }
    return this.formatLabel(type);
  }

  get queryValueLabel(): string {
    const filters = this.filters();
    if (!filters) {
      return this.translationService.translate('All');
    }
    if (filters.selectedType === 'property') {
      const value = filters.propertyValue || this.translationService.translate('All');
      const type = filters.propertyType && filters.propertyType !== 'all'
        ? this.translationService.translate(this.formatLabel(filters.propertyType))
        : this.translationService.translate('Any entity');
      return `${type}: ${value}`;
    }
    return filters.singleInput
      ? this.formatLabel(filters.singleInput)
      : this.translationService.translate('All');
  }

  get nodeLimitLabel(): string {
    return String(this.filters()?.maxEdge ?? 25);
  }

  get depthLabel(): string {
    return String(this.filters()?.maxDepth ?? 1);
  }

  onMaxEdgeChange(value: unknown): void {
    this.localMaxEdge = this.clampNumber(value, 20, 800, 25);
    this.applyGraphSize();
  }

  onMaxDepthChange(value: unknown): void {
    this.localMaxDepth = this.clampNumber(value, 1, 5, 1);
    this.applyGraphSize();
  }

  applyGraphSize(): void {
    const filters = this.filters();
    if (!filters) {
      return;
    }
    const nextFilters = {
      ...filters,
      maxEdge: this.clampNumber(this.localMaxEdge, 20, 800, 25),
      maxDepth: this.clampNumber(this.localMaxDepth, 1, 5, 1)
    };
    this.localMaxEdge = nextFilters.maxEdge;
    this.localMaxDepth = nextFilters.maxDepth;
    this.filtersApply.emit(nextFilters);
  }

  private clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(numeric)));
  }

  private updateViewportState(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const nextIsMobile = window.innerWidth < 768;
    if (nextIsMobile !== this.isMobile) {
      this.isMobile = nextIsMobile;
      if (this.isMobile) {
        this.isCollapsed = true;
        this.collapsedChange.emit(this.isCollapsed);
      }
    }
  }

  private formatLabel(value: string): string {
    const clean = String(value || 'all').replace(/^m_/, '').replace(/_/g, ' ');
    if (clean.toLowerCase() === 'apt') {
      return 'APT';
    }
    return clean.replace(/\b\w/g, character => character.toUpperCase());
  }
}
