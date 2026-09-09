import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnChanges, SimpleChanges, ViewChild, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { AppService } from '../../../../../services/core/app/app.service';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import type { FeatureCollection } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { ZoomAnchor } from './model/geo-coordinates-modal.model';
import type { Nullable } from '../../../../../shared/utils/type-guards.util';
export type { ZoomAnchor } from './model/geo-coordinates-modal.model';


type WorldTopology = Topology<{ countries: GeometryCollection }>;

@Component({
  selector: 'app-geo-coordinates-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './geo-coordinates-modal.component.html',
})
export class GeoCoordinatesModalComponent implements AfterViewInit, OnChanges {
  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('mapViewport') private mapViewport?: ElementRef<HTMLDivElement>;
  private projection: Nullable<ReturnType<typeof d3.geoNaturalEarth1>> = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartScrollLeft = 0;
  private dragStartScrollTop = 0;
  private hasDraggedMap = false;
  private lastDragEndedAt = 0;
  private readonly zoomStep = 0.5;
  private readonly mapAspectRatio = 1380 / 700;

  readonly minZoomLevel = 1.5;
  readonly maxZoomLevel = 12;
  readonly minRadiusKm = 1;
  readonly maxRadiusKm = 50000;
  readonly minMaxIps = 10;
  readonly maxMaxIps = 10000;
  coordinateInputMode: 'map' | 'manual' = 'map';
  zoomLevel = 1.5;
  mapCanvasWidth = 0;
  mapCanvasHeight = 0;
  isDraggingMap = false;
  readonly isOpen = input(false);
  readonly isScanning = input(false);
  readonly coordinates = input('');
  readonly radiusKm = input(25);
  readonly maxIps = input(200);
  readonly close = output<undefined>();
  readonly coordinatesChange = output<string>();
  readonly radiusKmChange = output<number>();
  readonly maxIpsChange = output<number>();
  readonly search = output<undefined>();

  get parsedCoordinates(): { lat: number; lon: number } | null {
    return this.parseCoordinates(this.coordinates());
  }

  constructor(private appService: AppService) {
  }

  ngAfterViewInit(): void {
    this.queueRenderMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isOpen?.currentValue) {
      this.queueRenderMap();
    }
  }

  get mapMarkerPoint(): { x: number; y: number } | null {
    const parsed = this.parsedCoordinates;
    if (!parsed || !this.projection) {
      return null;
    }

    const point = this.projection([parsed.lon, parsed.lat]);
    if (!point) {
      return null;
    }

    return { x: point[0], y: point[1] };
  }

  onClose(): void {

    this.close.emit(undefined);
  }

  onSearch(): void {

    this.search.emit(undefined);
  }

  onRadiusKmChange(value: number | string | null | undefined): void {
    this.radiusKmChange.emit(this.clampWholeNumber(value, this.minRadiusKm, this.maxRadiusKm, this.radiusKm()));
  }

  onMaxIpsChange(value: number | string | null | undefined): void {
    this.maxIpsChange.emit(this.clampWholeNumber(value, this.minMaxIps, this.maxMaxIps, this.maxIps()));
  }

  setCoordinateInputMode(mode: 'map' | 'manual'): void {
    this.coordinateInputMode = mode;

    if (mode === 'map' && this.isOpen()) {
      this.queueRenderMap();
    }
  }

  onMapSelect(event: MouseEvent): void {
    const projection = this.projection;
    const viewport = this.mapViewport?.nativeElement;
    if (!projection || typeof projection.invert !== 'function' || !viewport) {
      return;
    }

    if (Date.now() - this.lastDragEndedAt < 150) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - rect.left) + viewport.scrollLeft, 0), this.mapCanvasWidth);
    const y = Math.min(Math.max((event.clientY - rect.top) + viewport.scrollTop, 0), this.mapCanvasHeight);
    const inverted = projection.invert([x, y]);
    if (!inverted) {
      return;
    }

    const [lon, lat] = inverted;

    this.coordinatesChange.emit(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
  }

  onMapDragStart(event: MouseEvent): void {
    const viewport = this.mapViewport?.nativeElement;
    if (!viewport || event.button !== 0) {
      return;
    }

    this.isDraggingMap = true;
    this.hasDraggedMap = false;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartScrollLeft = viewport.scrollLeft;
    this.dragStartScrollTop = viewport.scrollTop;
  }

  zoomIn(): void {
    this.applyZoom(this.zoomLevel + this.zoomStep, this.getViewportCenterAnchor());
  }

  zoomOut(): void {
    this.applyZoom(this.zoomLevel - this.zoomStep, this.getViewportCenterAnchor());
  }

  onMapWheel(event: WheelEvent): void {
    event.preventDefault();

    const direction = event.deltaY < 0 ? 1 : -1;
    this.applyZoom(this.zoomLevel + (direction * this.zoomStep), this.getPointerAnchor(event));
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.isOpen()) {
      this.queueRenderMap();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    const viewport = this.mapViewport?.nativeElement;
    if (!this.isDraggingMap || !viewport) {
      return;
    }

    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      this.hasDraggedMap = true;
      event.preventDefault();
    }

    viewport.scrollLeft = this.dragStartScrollLeft - deltaX;
    viewport.scrollTop = this.dragStartScrollTop - deltaY;
    if (this.hasDraggedMap) {
      event.preventDefault();
    }
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (!this.isDraggingMap) {
      return;
    }

    this.isDraggingMap = false;
    if (this.hasDraggedMap) {
      this.lastDragEndedAt = Date.now();
    }
  }

  private parseCoordinates(value: string): { lat: number; lon: number } | null {
    const parts = value.split(',').map((part) => part.trim());
    if (parts.length !== 2) {
      return null;
    }

    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return null;
    }

    return { lat, lon };
  }

  private clampWholeNumber(value: number | string | null | undefined, min: number, max: number, fallback: number): number {
    const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(numeric)) {
      return fallback;
    }

    const whole = Math.trunc(numeric);
    return Math.min(max, Math.max(min, whole));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {

      this.close.emit(undefined);
    }
  }

  private queueRenderMap(): void {
    setTimeout(() => {
      this.renderMap();
    }, 0);
  }

  private applyZoom(nextZoomLevel: number, anchor: ZoomAnchor | null): void {
    const clampedZoomLevel = Math.min(this.maxZoomLevel, Math.max(this.minZoomLevel, nextZoomLevel));
    if (clampedZoomLevel === this.zoomLevel) {
      return;
    }

    this.zoomLevel = clampedZoomLevel;
    this.renderMap(anchor);
  }

  private getViewportCenterAnchor(): ZoomAnchor | null {
    const viewport = this.mapViewport?.nativeElement;
    if (!viewport) {
      return null;
    }

    return this.createAnchor(viewport.clientWidth / 2, viewport.clientHeight / 2);
  }

  private getPointerAnchor(event: MouseEvent | WheelEvent): ZoomAnchor | null {
    const viewport = this.mapViewport?.nativeElement;
    if (!viewport) {
      return null;
    }

    const rect = viewport.getBoundingClientRect();
    return this.createAnchor(event.clientX - rect.left, event.clientY - rect.top);
  }

  private createAnchor(viewportX: number, viewportY: number): ZoomAnchor | null {
    const viewport = this.mapViewport?.nativeElement;
    if (!viewport) {
      return null;
    }

    const safeViewportX = Math.min(Math.max(viewportX, 0), viewport.clientWidth);
    const safeViewportY = Math.min(Math.max(viewportY, 0), viewport.clientHeight);
    const currentWidth = this.mapCanvasWidth || viewport.clientWidth || 1;
    const currentHeight = this.mapCanvasHeight || viewport.clientHeight || 1;

    return {
      ratioX: (viewport.scrollLeft + safeViewportX) / currentWidth,
      ratioY: (viewport.scrollTop + safeViewportY) / currentHeight,
      viewportX: safeViewportX,
      viewportY: safeViewportY,
    };
  }

  private renderMap(anchor: ZoomAnchor | null = null): void {
    if (!this.isOpen() || !this.mapContainer?.nativeElement) {
      return;
    }

    const worldData = this.appService.worldJson();
    if (!worldData) {
      setTimeout(() => {
        this.renderMap();
      }, 100);
      return;
    }

    const container = this.mapContainer.nativeElement;
    const viewport = this.mapViewport?.nativeElement;
    const viewportWidth = Math.max(viewport?.clientWidth ?? container.clientWidth, 320);
    const viewportHeight = Math.max(viewport?.clientHeight ?? container.clientHeight, 220);
    const baseCanvasWidth = Math.max(viewportWidth, Math.round(viewportHeight * this.mapAspectRatio));
    const baseCanvasHeight = Math.max(viewportHeight, Math.round(baseCanvasWidth / this.mapAspectRatio));

    this.mapCanvasWidth = Math.round(baseCanvasWidth * this.zoomLevel);
    this.mapCanvasHeight = Math.round(baseCanvasHeight * this.zoomLevel);

    d3.select(container).selectAll('*').remove();

    const topology = worldData as WorldTopology;
    const countries = topojson.feature(topology, topology.objects.countries) as FeatureCollection;

    const svg = d3.select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${this.mapCanvasWidth} ${this.mapCanvasHeight}`)
      .attr('width', this.mapCanvasWidth)
      .attr('height', this.mapCanvasHeight)
      .attr('class', 'block max-w-none');

    this.projection = d3
      .geoMercator()
      .fitSize([this.mapCanvasWidth, this.mapCanvasHeight], countries);

    const path = d3.geoPath(this.projection);

    svg.append('g')
      .selectAll('path')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', 'rgba(87,165,235,0.16)')
      .attr('stroke', 'rgba(87,165,235,0.24)')
      .attr('stroke-width', 0.8);

    if (viewport) {
      const fallbackAnchor = {
        ratioX: 0.5,
        ratioY: 0.5,
        viewportX: viewport.clientWidth / 2,
        viewportY: viewport.clientHeight / 2,
      };
      const nextAnchor = anchor ?? fallbackAnchor;
      const nextLeft = Math.max(0, Math.min(this.mapCanvasWidth - viewport.clientWidth, (this.mapCanvasWidth * nextAnchor.ratioX) - nextAnchor.viewportX));
      const nextTop = Math.max(0, Math.min(this.mapCanvasHeight - viewport.clientHeight, (this.mapCanvasHeight * nextAnchor.ratioY) - nextAnchor.viewportY));
      viewport.scrollLeft = nextLeft;
      viewport.scrollTop = nextTop;
    }
  }
}
