import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { OrionSatelliteFilterOption } from '../../../../../models/geo-fencing.models';
import { TranslatePipe } from '../../../../../../../shared/pipes/translate.pipe';
import { getOwnProperty } from '../../../../../../../shared/utils/type-guards.util';


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
    const classes: Record<string, string> = {
      hydro: 'bg-[#2563eb]',
      solar: 'bg-[#facc15]',
      wind: 'bg-[#16a34a]',
      gas: 'bg-[#f59e0b]',
      coal: 'bg-[#111827]',
      oil: 'bg-[#f97316]',
      nuclear: 'bg-[#dc2626]',
      geothermal: 'bg-[#ec4899]',
      biomass: 'bg-[#84cc16]',
      waste: 'bg-[#8b5cf6]',
      storage: 'bg-[#06b6d4]',
      cogeneration: 'bg-[#14b8a6]',
      petcoke: 'bg-[#78716c]',
      wave_and_tidal: 'bg-[#0ea5e9]',
      airport: 'bg-[#9333ea]',
      port: 'bg-[#0d9488]',
      warehouse: 'bg-[#92400e]',
      industrial: 'bg-[#6b7280]',
      military: 'bg-[#d71c1c]',
      other: 'bg-[#a3a3a3]',
    };
    return getOwnProperty(classes, type) || 'bg-[#6b7280]';
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
