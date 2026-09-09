import { Directive, ElementRef, HostListener, OnDestroy, AfterViewInit, Renderer2, NgZone, input } from '@angular/core';
@Directive({
  selector: '[appTooltip]'
})
export class TooltipDirective implements AfterViewInit, OnDestroy {
  private tooltip: HTMLElement | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;
  private removeContainerScroll?: () => void;
  private rafHideScheduled = false;
  private tooltipLeft = 0;
  private tooltipTop = 0;

  readonly tooltipText = input('', { alias: "appTooltip" });

  constructor(private el: ElementRef, private renderer: Renderer2, private zone: NgZone) { }

  ngAfterViewInit(): void {
    const container = document.getElementById('dashboard-container');
    if (container) {
      this.zone.runOutsideAngular(() => {
        this.removeContainerScroll = this.renderer.listen(container, 'scroll', () => {
          this.scheduleHide();
        });
      });
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scheduleHide();
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.tooltipText().trim()) {
      this.showTimeout = setTimeout(() => {
        this.createOrUpdateTooltip();
      }, 300);
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hideNow();
  }

  ngOnDestroy(): void {
    if (this.removeContainerScroll) {
      this.removeContainerScroll();
      this.removeContainerScroll = undefined;
    }
    this.destroyTooltip();
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
  }

  private scheduleHide(): void {
    if (!this.tooltip || this.rafHideScheduled) {
      return;
    }
    this.rafHideScheduled = true;
    requestAnimationFrame(() => {
      this.hideNow();
      this.rafHideScheduled = false;
    });
  }

  private hideNow(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    if (this.tooltip) {
      this.renderer.setAttribute(this.tooltip, 'data-visible', '0');
    }
  }

  private createOrUpdateTooltip(): void {
    if (!this.tooltip) {
      this.tooltip = this.renderer.createElement('div');
      this.renderer.setAttribute(this.tooltip, 'class', 'custom-tooltip');
      this.renderer.setAttribute(this.tooltip, 'data-left', String(this.tooltipLeft));
      this.renderer.setAttribute(this.tooltip, 'data-top', String(this.tooltipTop));
      this.renderer.setAttribute(this.tooltip, 'data-visible', '0');
      this.renderer.appendChild(document.body, this.tooltip);
    }
    else {
      while (this.tooltip.firstChild) {
        this.renderer.removeChild(this.tooltip, this.tooltip.firstChild);
      }
    }
    const textNode = this.renderer.createText(this.tooltipText());
    this.renderer.appendChild(this.tooltip, textNode);
    this.renderer.setAttribute(this.tooltip, 'data-visible', '0');
    requestAnimationFrame(() => {
      if (!this.tooltip) {
        return;
      }
      const hostRect = (this.el.nativeElement as HTMLElement).getBoundingClientRect();
      const tooltipRect = this.tooltip.getBoundingClientRect();
      const margin = 8;
      let top = hostRect.top - tooltipRect.height - margin;
      let left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
      const isTopOverflow = top < margin;
      const isLeftOverflow = left < margin;
      const isRightOverflow = left + tooltipRect.width > window.innerWidth - margin;
      if (isTopOverflow && isLeftOverflow) {
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.right + margin;
      }
      else if (isTopOverflow && isRightOverflow) {
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.left - tooltipRect.width - margin;
      }
      else if (isTopOverflow) {
        top = hostRect.bottom + margin;
      }
      if (left < margin) {
        left = margin;
      }
      else if (left + tooltipRect.width > window.innerWidth - margin) {
        left = window.innerWidth - tooltipRect.width - margin;
      }
      if (top < margin) {
        top = margin;
      }
      else if (top + tooltipRect.height > window.innerHeight - margin) {
        top = window.innerHeight - tooltipRect.height - margin;
      }
      this.setTooltipPositionAttributes(top, left);
      this.renderer.setAttribute(this.tooltip, 'data-visible', '1');
    });
  }

  private destroyTooltip(): void {
    if (this.tooltip) {
      const t = this.tooltip;
      this.tooltip = null;
      if (document.body.contains(t)) {
        this.renderer.removeChild(document.body, t);
      }
    }
  }

  private setTooltipPositionAttributes(top: number, left: number): void {
    if (!this.tooltip) {
      return;
    }
    const nextLeft = this.normalizePositionValue(left);
    const nextTop = this.normalizePositionValue(top);
    if (nextLeft !== this.tooltipLeft) {
      this.tooltipLeft = nextLeft;
      this.renderer.setAttribute(this.tooltip, 'data-left', String(nextLeft));
    }
    if (nextTop !== this.tooltipTop) {
      this.tooltipTop = nextTop;
      this.renderer.setAttribute(this.tooltip, 'data-top', String(nextTop));
    }
  }

  private normalizePositionValue(rawValue: number): number {
    const step = 2;
    const rounded = Math.round(rawValue / step) * step;
    return Math.max(0, Math.min(4000, rounded));
  }
}
