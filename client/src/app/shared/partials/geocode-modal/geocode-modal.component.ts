import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Inject, Input, OnChanges, OnDestroy, Output, Renderer2, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { validateCoordinatesInput } from '../../utils/geo-coordinates.utils';
import { TranslatePipe } from '../../pipes/translate.pipe';
import type { GeoLocationSearchResult } from './model/geocode-modal.model';
export type { GeoLocationSearchResult } from './model/geocode-modal.model';




@Component({
  selector:    'app-geocode-modal',
  standalone:  true,
  imports:     [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './geocode-modal.component.html',
})
export class GeocodeModalComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly DEBOUNCE_MS = 400;
  private readonly MIN_SEARCH_LENGTH = 2;
  private readonly KM_PER_DEGREE = 111.32;
  private readonly MIN_DELTA = 0.001;
  private readonly DEFAULT_MAX_COVERAGE_KM = 1000;
  private readonly MAX_IPS_LIMIT = 500;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private searchRequestId = 0;

  searchQuery = '';
  searchResults: GeoLocationSearchResult[] = [];
  isSearching = false;
  searchError: string | null = null;
  manualCoords = '';
  manualDelta = 0.05;
  manualMaxIps = 200;
  coordsError: string | null = null;
  coverageError: string | null = null;
  activeInputMode: 'search' | 'coordinates' = 'search';
  hasSelectedSearchLocation = false;

  @Input() isOpen = false;
  @Input() isScanning = false;
  @Input() coordinates = '';
  @Input() delta = 0.05;
  @Input() allowCoverage = true;
  @Input() title = 'Location';
  @Input() maxCoverageKm = this.DEFAULT_MAX_COVERAGE_KM;
  @Input() radiusKm = 100;
  @Input() maxRadiusKm = this.DEFAULT_MAX_COVERAGE_KM;
  @Input() maxIps = 200;
  @Input() distanceMode: 'delta' | 'radius' = 'delta';
  @Input() searchProvider: ((query: string) => Promise<GeoLocationSearchResult[]> | GeoLocationSearchResult[]) | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() coordinatesChange = new EventEmitter<string>();
  @Output() deltaChange = new EventEmitter<number>();
  @Output() radiusKmChange = new EventEmitter<number>();
  @Output() maxIpsChange = new EventEmitter<number>();
  @Output() search = new EventEmitter<void>();

  constructor(private elementRef: ElementRef<HTMLElement>, private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) {}

  ngAfterViewInit(): void {
    this.renderer.appendChild(this.document.body, this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.searchRequestId++;
    clearTimeout(this.searchTimer);
    if (this.document.body.contains(this.elementRef.nativeElement)) {
      this.renderer.removeChild(this.document.body, this.elementRef.nativeElement);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const isOpenChange = changes.isOpen;
    if (isOpenChange) {
      this.searchRequestId++;
      clearTimeout(this.searchTimer);
      this.isSearching = false;
    }
    if (isOpenChange?.currentValue) {
      this.manualCoords = this.coordinates;
      this.manualDelta = this.getInitialDelta();
      this.manualMaxIps = this.clampWholeNumber(this.maxIps, 1, this.MAX_IPS_LIMIT);
      this.searchQuery = '';
      this.searchResults = [];
      this.searchError = null;
      this.coordsError = null;
      this.coverageError = null;
      this.activeInputMode = 'search';
      this.hasSelectedSearchLocation = false;
    }
  }

  @HostListener('keydown.escape')
  onEsc(): void {
    if (this.isOpen) {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimer);
    this.searchError = null;
    this.searchResults = [];
    this.hasSelectedSearchLocation = false;
    if (this.searchQuery.trim().length < this.MIN_SEARCH_LENGTH) {
      this.isSearching = false;
      return;
    }
    this.isSearching = true;
    this.searchTimer = setTimeout(() => {
      void this.runSearch();
    }, this.DEBOUNCE_MS);
  }

  async runSearch(): Promise<void> {
    const query = this.searchQuery.trim();
    if (!query) {
      return;
    }

    if (!this.searchProvider) {
      this.searchError = 'Location search is unavailable';
      this.isSearching = false;
      return;
    }

    const requestId = ++this.searchRequestId;
    this.isSearching = true;
    this.searchError = null;
    try {
      const results = await this.searchProvider(query);
      if (requestId !== this.searchRequestId) {
        return;
      }
      this.searchResults = results;
      if (!results.length) {
        this.searchError = `No results for "${query}"`;
      }
    }
    catch (err: unknown) {
      if (requestId === this.searchRequestId) {
        this.searchError = err instanceof Error ? err.message : 'Search failed';
      }
    }
    finally {
      if (requestId === this.searchRequestId) {
        this.isSearching = false;
      }
    }
  }

  selectResult(result: GeoLocationSearchResult): void {
    const coords = `${result.lat}, ${result.lon}`;
    this.manualCoords = coords;
    this.searchQuery = result.name;
    this.searchResults = [];
    this.hasSelectedSearchLocation = true;
    this.setCoverageFromDelta(result.delta);
    this.coordinatesChange.emit(coords);
    if (this.allowCoverage) {
      this.emitCoverageChange();
    }
  }

  onManualCoordsChange(): void {
    this.coordsError = validateCoordinatesInput(this.manualCoords);
  }

  onManualCoverageChange(): void {
    if (!this.allowCoverage) {
      this.coverageError = null;
      return;
    }
    const delta = Number(this.manualDelta);
    this.coverageError = this.validateCoverageDelta(delta);
  }

  onManualMaxIpsChange(): void {
    this.manualMaxIps = this.clampWholeNumber(this.manualMaxIps, 1, this.MAX_IPS_LIMIT);
  }

  onSubmit(): void {
    this.onManualCoordsChange();
    this.onManualCoverageChange();
    if (Boolean(this.coordsError) || Boolean(this.coverageError) || !this.manualCoords.trim()) {
      return;
    }

    this.coordinatesChange.emit(this.manualCoords.trim());
    if (this.allowCoverage) {
      this.emitCoverageChange();
    }
    if (this.showMaxIps) {
      this.maxIpsChange.emit(this.manualMaxIps);
    }
    this.search.emit();
  }

  get usesRadius(): boolean {
    return this.distanceMode === 'radius';
  }

  get showMaxIps(): boolean {
    return this.usesRadius;
  }

  get maxIpsLimit(): number {
    return this.MAX_IPS_LIMIT;
  }

  get effectiveMaxCoverageKm(): number {
    const value = Number(this.usesRadius ? this.maxRadiusKm : this.maxCoverageKm);
    return Number.isFinite(value) && value > 0 ? value : this.DEFAULT_MAX_COVERAGE_KM;
  }

  get effectiveMaxDelta(): number {
    return Number((this.effectiveMaxCoverageKm / this.KM_PER_DEGREE).toFixed(4));
  }

  get minDelta(): number {
    return this.MIN_DELTA;
  }

  get coverageLabelValue(): string {
    const coverageKm = this.deltaToCoverageKm(this.manualDelta);
    if (!Number.isFinite(coverageKm)) {
      return '';
    }
    const rounded = Number(coverageKm.toFixed(1));
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} km`;
  }

  get canApplyLocation(): boolean {
    if (!this.manualCoords.trim()) {
      return false;
    }
    return this.activeInputMode === 'coordinates' || this.hasSelectedSearchLocation;
  }

  resultCoverageLabel(result: GeoLocationSearchResult): string | null {
    if (!Number.isFinite(result.delta)) {
      return null;
    }
    return `${this.deltaToCoverageKm(Number(result.delta)).toFixed(1)} km`;
  }

  private getInitialDelta(): number {
    if (this.usesRadius) {
      return this.coverageKmToDelta(this.radiusKm);
    }
    return this.clampDelta(this.delta);
  }

  private emitCoverageChange(): void {
    if (this.usesRadius) {
      this.radiusKmChange.emit(this.deltaToRadiusKm(this.manualDelta));
      return;
    }
    this.deltaChange.emit(this.manualDelta);
  }

  private setCoverageFromDelta(delta: number | undefined): void {
    if (!Number.isFinite(delta)) {
      return;
    }
    this.manualDelta = this.clampDelta(Number(delta));
  }

  private deltaToCoverageKm(delta: number): number {
    return Number(delta) * this.KM_PER_DEGREE;
  }

  private deltaToRadiusKm(delta: number): number {
    const coverageKm = this.deltaToCoverageKm(delta);
    if (!Number.isFinite(coverageKm)) {
      return 0;
    }
    return Math.min(this.effectiveMaxCoverageKm, Math.max(0.1, Number(coverageKm.toFixed(3))));
  }

  private coverageKmToDelta(coverageKm: number): number {
    return this.clampDelta(Number((this.clampCoverageKm(coverageKm) / this.KM_PER_DEGREE).toFixed(4)));
  }

  private validateCoverageDelta(delta: number): string | null {
    if (!Number.isFinite(delta) || delta < this.MIN_DELTA || delta > this.effectiveMaxDelta) {
      return `Coverage size must be between ${this.MIN_DELTA} and ${this.effectiveMaxDelta.toFixed(3)} degrees (~${this.effectiveMaxCoverageKm.toLocaleString()} km)`;
    }
    return null;
  }

  private clampDelta(value: number): number {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return this.MIN_DELTA;
    }
    return Math.min(this.effectiveMaxDelta, Math.max(this.MIN_DELTA, next));
  }

  private clampCoverageKm(value: number): number {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return 1;
    }
    return Math.min(this.effectiveMaxCoverageKm, Math.max(1, next));
  }

  private clampWholeNumber(value: number, min: number, max: number): number {
    const next = Math.round(Number(value));
    if (!Number.isFinite(next)) {
      return min;
    }
    return Math.min(max, Math.max(min, next));
  }
}
