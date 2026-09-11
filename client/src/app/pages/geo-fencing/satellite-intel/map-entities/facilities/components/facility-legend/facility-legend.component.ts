import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { OrionSatelliteFilterOption } from '../../../../../models/geo-fencing.models';
import { TranslatePipe } from '../../../../../../../shared/pipes/translate.pipe';
import { getOwnProperty } from '../../../../../../../shared/utils/type-guards.util';
import { FACILITY_TYPE_DOT_CLASSES } from '../../facility-dot-classes.const';


@Component({
  selector: 'app-facility-legend',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './facility-legend.component.html',
})
export class FacilityLegendComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('scrollArea') private scrollArea?: ElementRef<HTMLDivElement>;
  private resizeObserver: ResizeObserver | null = null;
  private overflowTimer: ReturnType<typeof setTimeout> | null = null;

  showEndFade = false;

  @Input() visible = true;
  @Input() constrained = false;
  @Input() filters: OrionSatelliteFilterOption[] = [];

  ngAfterViewInit(): void {
    if (typeof ResizeObserver !== 'undefined' && this.scrollArea?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateOverflow();
      });
      this.resizeObserver.observe(this.scrollArea.nativeElement);
    }
    this.scheduleOverflowUpdate();
  }

  ngOnChanges(): void {
    this.scheduleOverflowUpdate();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.overflowTimer) {
      clearTimeout(this.overflowTimer);
      this.overflowTimer = null;
    }
  }

  updateOverflow(): void {
    const element = this.scrollArea?.nativeElement;
    if (!element) {
      this.showEndFade = false;
      return;
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    this.showEndFade = maxScrollLeft > 1 && maxScrollLeft - element.scrollLeft > 1;
  }

  dotClass(type: string): string {
    return getOwnProperty(FACILITY_TYPE_DOT_CLASSES, type) || 'bg-[#6b7280]';
  }

  private scheduleOverflowUpdate(): void {
    if (this.overflowTimer) {
      clearTimeout(this.overflowTimer);
    }
    this.overflowTimer = setTimeout(() => {
      this.overflowTimer = null;
      this.updateOverflow();
    });
  }
}
