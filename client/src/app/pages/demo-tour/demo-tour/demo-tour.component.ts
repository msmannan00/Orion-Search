import { AfterViewInit, ChangeDetectorRef, Component, HostBinding, HostListener, NgZone, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DemoTourService } from '../services/demo.tour.service';
import { RenderedGeometry } from '../model/rendered-geometry.interface';
import { TourStep } from '../../../shared/model/demo-tour/demo.tour.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { getOwnProperty } from '../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-demo-tour',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './demo-tour.component.html'
})
export class DemoTourComponent implements OnInit, AfterViewInit, OnDestroy {
  private static readonly hostRuntimeSelector = 'app-demo-tour.demo-tour-runtime';
  private static readonly bodyRuntimeSelector = 'body.demo-tour-scroll-locked';
  private static readonly activeElementUtilityClasses = ['!z-[1001]', 'isolate', '!transition-none'] as const;
  private static readonly activeElementRelativeClass = '!relative';
  private static readonly activeElementPointerClass = '!pointer-events-auto';
  private static readonly activeElementBlockedPointerClass = '!pointer-events-none';
  private readonly fallbackPositions: NonNullable<TourStep['position']>[] = ['bottom', 'top', 'right', 'left'];
  private readonly minimumLoadingMs = 350;
  private readonly geometryTolerancePx = 1.5;
  private readonly geometryTrackingWindowMs = 100;
  private readonly cutoutTransitionMs = 220;
  private readonly sidebarSpotlightPadding = 6;
  private readonly tooltipGap = 14;
  private activeElement: HTMLElement | null = null;
  private activeElementAddedRelativeClass = false;
  private activeElementAddedPointerClass: string | null = null;
  private animationFrameId: number | null = null;
  private geometryTrackingFrameId: number | null = null;
  private geometryTrackingResolve: (() => void) | null = null;
  private cutoutAnimationFrameId: number | null = null;
  private activeElementResizeObserver: ResizeObserver | null = null;
  private activeElementMutationObserver: MutationObserver | null = null;
  private stepPreparationToken = 0;
  private activeInput: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null = null;
  private activeInputWasDisabled = false;
  private disabledElements: { element: HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement; wasDisabled: boolean; }[] = [];
  private scrollLockY = 0;
  private preparingStep = false;
  private loadingStartedAt = 0;
  private geometryFrozen = false;
  private lastRenderedGeometry: RenderedGeometry | null = null;
  private lastTargetCutoutRects: { top: number; left: number; width: number; height: number; rx: number; ry: number; }[] = [];
  private readonly stepUrls = new Map<number, string>();
  private readonly completedStepIndexes = new Set<number>();
  private pendingPreparationDirection: 'forward' | 'backward' = 'forward';
  private currentStepRestoreOnly = false;
  private initialSidebarExpanded: boolean | null = null;
  private initialSidebarScrollTop: number | null = null;
  private focusBeforeTour: HTMLElement | null = null;
  private readonly spotlightCornerRadius = 12;
  private runtimeStyleSheet: CSSStyleSheet | null = null;
  private stepIndexTimerId: number | null = null;
  private startTourTimerId: number | null = null;
  private currentStepSubscription: Subscription | null = null;

  nextTransitionInProgress = false;
  step: TourStep | null = null;
  visible = false;
  stepReady = false;
  loadingVisible = false;
  positionStyle: Record<string, string> = {};
  cutoutRects: { top: number; left: number; width: number; height: number; rx: number; ry: number; }[] = [];
  showDashboardSpotlightBorder = false;
  currentIndex = 0;
  totalSteps = 0;
  tooltipTop = '0px';
  tooltipLeft = '0px';
  tooltipBottom = 'auto';
  tooltipWidth = '360px';
  progressWidth = '0%';
  @HostBinding('class.demo-tour-runtime') readonly runtimeClass = true;

  @HostBinding('class.tour-loading') get tourLoadingClass(): boolean {
    return this.visible && !this.stepReady;
  }

  @HostBinding('class.tour-tooltip-positioned') get isTooltipPositioned(): boolean {
    return this.tooltipTop !== '0px' || this.tooltipLeft !== '0px' || this.tooltipBottom !== 'auto';
  }

  constructor(private tourService: DemoTourService, private cdr: ChangeDetectorRef, private ngZone: NgZone, private router: Router) {}

  ngOnInit() {
    this.currentStepSubscription = this.tourService.currentStep$.subscribe(index => {
      if (this.stepIndexTimerId !== null) {
        window.clearTimeout(this.stepIndexTimerId);
      }

      this.stepIndexTimerId = window.setTimeout(() => {
        this.stepIndexTimerId = null;
        this.ngZone.run(() => {
          this.applyStepIndex(index);
        });
      }, 0);
    });
  }

  ngAfterViewInit(): void {
    this.captureInitialSidebarState();
    this.startTourTimerId = window.setTimeout(() => {
      this.startTourTimerId = null;
      void this.tourService.startTourForCurrentLicense();
    }, 0);
  }

  private applyStepIndex(index: number): void {
    const preparationDirection = this.pendingPreparationDirection;
    this.pendingPreparationDirection = 'forward';
    this.stepPreparationToken += 1;
    this.nextTransitionInProgress = false;
    this.cancelPendingVisualWork();
    this.clearActiveElementStyles();

    if (index >= 0 && !this.visible && document.activeElement instanceof HTMLElement) {
      this.focusBeforeTour = document.activeElement;
    }

    this.visible = index !== -1;
    this.stepReady = false;
    this.lastRenderedGeometry = null;
    this.lastTargetCutoutRects = [];
    this.geometryFrozen = false;
    this.currentIndex = index;
    this.step = this.tourService.getCurrentStep();
    this.syncRuntimeStyles();

    if (this.visible && this.step) {
      this.preparingStep = true;
      this.loadingVisible = true;
      this.lockPageScroll();
      this.totalSteps = this.tourService.getTotalSteps();
      void this.prepareStep(this.step, preparationDirection);
      this.focusTourDialog();
      return;
    }

    this.unlockPageScroll();
    this.resetHostStyles();
  }

  ngOnDestroy(): void {
    this.stepPreparationToken += 1;
    this.currentStepSubscription?.unsubscribe();
    this.currentStepSubscription = null;
    if (this.startTourTimerId !== null) {
      window.clearTimeout(this.startTourTimerId);
      this.startTourTimerId = null;
    }
    if (this.stepIndexTimerId !== null) {
      window.clearTimeout(this.stepIndexTimerId);
      this.stepIndexTimerId = null;
    }
    this.cancelPendingVisualWork();
    this.clearActiveElementStyles();
    this.restoreInitialSidebarState();
    void this.setProfileMenuState('closed');
    this.restoreFocusBeforeTour();
    this.unlockPageScroll();
    this.clearRuntimeStyles();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.visible) {
      this.geometryFrozen = false;
      this.schedulePositionUpdate(true);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.visible) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.skip();
      return;
    }

    if (event.key === 'Tab') {
      this.trapTourFocus(event);
      return;
    }

    if (!this.stepReady || this.nextTransitionInProgress || !this.step || event.key !== 'Enter' || !this.activeElement) {
      return;
    }

    const target = event.target as Node | null;
    if (target && !this.activeElement.contains(target)) {
      return;
    }

    if (this.step.captureValueOnEnter) {
      const value = this.getStepValue(this.activeElement, this.step);
      this.tourService.setCapturedValue(this.step.elementId, value);
    }

    if (this.step.endOnEnter) {
      this.skip();
    }
  }

  updatePosition(): void {
    if (!this.step) {
      return;
    }

    const stepElement = this.getStepElement(this.step);
    const spotlightElement = stepElement
      ? this.getSpotlightAnchorElement(stepElement, this.step.elementId)
      : null;
    const tooltipElement = this.preparingStep
      ? this.getTooltipAnchorElement(this.step) ?? spotlightElement
      : spotlightElement;

    if (!spotlightElement && !tooltipElement) {
      return;
    }

    if (spotlightElement) {
      this.applyActiveElementStyles(spotlightElement);
      this.applyStepInputState(stepElement ?? spotlightElement, this.step);
    }

    const basePadding = this.step.padding ?? this.getDefaultSpotlightPadding(this.step.elementId);
    const paddingTop = this.step.paddingTop ?? basePadding;
    const paddingRight = this.step.paddingRight ?? basePadding;
    const paddingBottom = this.step.paddingBottom ?? basePadding;
    const paddingLeft = this.step.paddingLeft ?? basePadding;
    let top = this.lastRenderedGeometry?.spotlightTop ?? 0;
    let left = this.lastRenderedGeometry?.spotlightLeft ?? 0;
    let width = this.lastRenderedGeometry?.spotlightWidth ?? 0;
    let height = this.lastRenderedGeometry?.spotlightHeight ?? 0;
    let right = left + width;
    let bottom = top + height;

    let nextCutoutRects = this.cutoutRects;
    if (spotlightElement) {
      const spotlightRect = this.step.elementId === 'dashboard-consolidated'
        ? this.getRenderedContentBounds(spotlightElement)
        : spotlightElement.getBoundingClientRect();
      top = Math.max(spotlightRect.top - paddingTop, 8);
      left = Math.max(spotlightRect.left - paddingLeft, 8);
      right = Math.min(spotlightRect.right + paddingRight, window.innerWidth - 8);
      bottom = Math.min(spotlightRect.bottom + paddingBottom, window.innerHeight - 8);
      width = Math.max(right - left, 0);
      height = Math.max(bottom - top, 0);

      if (this.isCompactViewport() && this.step?.elementId === 'dashboard-consolidated') {
        const dashboardBody = document.querySelector('[data-testid="dashboard-body"]');
        if (dashboardBody instanceof HTMLElement && this.isElementRendered(dashboardBody)) {
          const dashboardRect = dashboardBody.getBoundingClientRect();
          const compactSpotlightInset = 10;
          top = Math.max(top, this.getCompactTooltipReservedTop());
          left = Math.max(dashboardRect.left + compactSpotlightInset, compactSpotlightInset);
          right = Math.min(dashboardRect.right - compactSpotlightInset, window.innerWidth - compactSpotlightInset);
          bottom = Math.min(dashboardRect.bottom - compactSpotlightInset, window.innerHeight - compactSpotlightInset);
          width = Math.max(right - left, 0);
          height = Math.max(bottom - top, 0);
        }
      }

      const additionalSpotlightStyles = this.getAdditionalSpotlightStyles(this.step);
      nextCutoutRects = [
        { top, left, width, height, rx: this.spotlightCornerRadius, ry: this.spotlightCornerRadius },
        ...additionalSpotlightStyles.map(spotlight => ({
          top: Number.parseFloat(spotlight.top),
          left: Number.parseFloat(spotlight.left),
          width: Number.parseFloat(spotlight.width),
          height: Number.parseFloat(spotlight.height),
          rx: this.spotlightCornerRadius,
          ry: this.spotlightCornerRadius
        }))
      ];
    }

    const tooltipRect = (tooltipElement ?? spotlightElement)?.getBoundingClientRect();
    if (!tooltipRect) {
      return;
    }

    this.positionStyle = this.getTooltipPosition(tooltipRect, this.step.position, {
      top,
      left,
      right,
      bottom,
      width,
      height
    });

    const nextGeometry = {
      spotlightTop: top,
      spotlightLeft: left,
      spotlightWidth: width,
      spotlightHeight: height,
      tooltipTop: Number.parseFloat(this.positionStyle.top || '0') || 0,
      tooltipLeft: Number.parseFloat(this.positionStyle.left || '0') || 0
    };

    if (this.shouldSkipGeometryUpdate(nextGeometry, nextCutoutRects)) {
      this.progressWidth = `${this.totalSteps > 0 ? ((this.currentIndex + 1) / this.totalSteps) * 100 : 0}%`;
      return;
    }

    this.lastRenderedGeometry = nextGeometry;
    this.lastTargetCutoutRects = nextCutoutRects.map(rect => ({ ...rect }));
    this.animateCutoutRects(nextCutoutRects);
    this.tooltipTop = this.positionStyle.top || '0px';
    this.tooltipLeft = this.positionStyle.left || '0px';
    this.tooltipBottom = this.positionStyle.bottom || 'auto';
    this.progressWidth = `${this.totalSteps > 0 ? ((this.currentIndex + 1) / this.totalSteps) * 100 : 0}%`;
    this.syncRuntimeStyles();
  }

  private shouldSkipGeometryUpdate(nextGeometry: RenderedGeometry, nextCutoutRects: { top: number; left: number; width: number; height: number; rx: number; ry: number; }[]): boolean {
    if (!this.lastRenderedGeometry) {
      return false;
    }

    return this.isWithinTolerance(this.lastRenderedGeometry.spotlightTop, nextGeometry.spotlightTop) &&
      this.isWithinTolerance(this.lastRenderedGeometry.spotlightLeft, nextGeometry.spotlightLeft) &&
      this.isWithinTolerance(this.lastRenderedGeometry.spotlightWidth, nextGeometry.spotlightWidth) &&
      this.isWithinTolerance(this.lastRenderedGeometry.spotlightHeight, nextGeometry.spotlightHeight) &&
      this.isWithinTolerance(this.lastRenderedGeometry.tooltipTop, nextGeometry.tooltipTop) &&
      this.isWithinTolerance(this.lastRenderedGeometry.tooltipLeft, nextGeometry.tooltipLeft) &&
      this.areCutoutRectsStable(nextCutoutRects);
  }

  private areCutoutRectsStable(nextCutoutRects: { top: number; left: number; width: number; height: number; rx: number; ry: number; }[]): boolean {
    return this.lastTargetCutoutRects.length === nextCutoutRects.length &&
      nextCutoutRects.every((rect, index) => {
        const previousRect = getOwnProperty(this.lastTargetCutoutRects, index);
        return this.isWithinTolerance(previousRect.top, rect.top) &&
          this.isWithinTolerance(previousRect.left, rect.left) &&
          this.isWithinTolerance(previousRect.width, rect.width) &&
          this.isWithinTolerance(previousRect.height, rect.height);
      });
  }

  private isWithinTolerance(previousValue: number, nextValue: number): boolean {
    return Math.abs(previousValue - nextValue) < this.geometryTolerancePx;
  }

  private schedulePositionUpdate(force = false): void {
    if (!force && this.geometryFrozen) {
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.updatePosition();
      this.cdr.markForCheck();
    });
  }

  private async prepareStep(step: TourStep, direction: 'forward' | 'backward' = 'forward'): Promise<void> {
    const token = ++this.stepPreparationToken;
    const restoreOnly = direction === 'backward' || this.completedStepIndexes.has(this.currentIndex);
    this.currentStepRestoreOnly = restoreOnly;
    if (this.initialSidebarExpanded === null) {
      this.captureInitialSidebarState();
    }
    this.preparingStep = true;
    this.loadingVisible = true;
    this.loadingStartedAt = performance.now();
    this.cdr.markForCheck();

    await this.ensureMobileViewportState(step);

    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    await this.ensureRequestedUiState(step);

    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    this.schedulePositionUpdate(true);

    if (!restoreOnly && step.activateSelector && !this.isWaitTargetRendered(step)) {
      const trigger = await this.waitForRenderedSelector(step.activateSelector);
      if (token !== this.stepPreparationToken || this.step !== step) {
        return;
      }
      if (trigger instanceof HTMLElement) {
        trigger.click();
        await this.waitForAnimationFrames(2);
        this.schedulePositionUpdate(true);
        await this.waitForStepTarget(step);
        await this.waitForAnimationFrames(2);
        this.schedulePositionUpdate(true);
      }
    }

    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    if (!this.hasStepTarget(step)) {
      await this.waitForStepTarget(step, direction === 'backward' ? 2500 : 1500);
    }

    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    const candidateElement = this.getStepElement(step);
    const element = candidateElement && this.isElementEffectivelyVisible(candidateElement)
      ? candidateElement
      : null;
    if (element && step.scrollIntoView) {
      await this.scrollStepTargetIntoView(step, element);
      this.schedulePositionUpdate(true);
    }

    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    if (element) {
      this.updatePosition();
      this.cdr.markForCheck();
      await this.trackGeometryForWindow(step, this.geometryTrackingWindowMs, token);
    }

    if (element) {
      await this.waitForStepStability(step, element);
      await this.waitForSidebarRectStability(step, element);
    }

    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    if (!restoreOnly && element && step.triggerSubmitOnShow) {
      this.applyStepInputState(element, step);
      this.triggerStepSubmit(element, step);
      await this.waitForStepStability(step, element);
    }

    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    if (element) {
      this.geometryFrozen = false;
      this.updatePosition();
      this.geometryFrozen = true;
      this.cdr.markForCheck();
    }

    const tooltipAnchor = this.getTooltipAnchorElement(step);
    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    if (!element && !tooltipAnchor) {
      if (direction === 'backward') {
        const elapsedLoadingMs = performance.now() - this.loadingStartedAt;
        if (elapsedLoadingMs < this.minimumLoadingMs) {
          await this.wait(this.minimumLoadingMs - elapsedLoadingMs);
        }
        if (token !== this.stepPreparationToken || this.step !== step || !this.visible) {
          return;
        }

        const { width, height, margin } = this.getTooltipMetrics();
        this.cutoutRects = [];
        this.tooltipTop = `${Math.max((window.innerHeight - height) / 2, margin)}px`;
        this.tooltipLeft = `${Math.max((window.innerWidth - width) / 2, margin)}px`;
        this.tooltipBottom = 'auto';
        this.progressWidth = `${this.totalSteps > 0 ? ((this.currentIndex + 1) / this.totalSteps) * 100 : 0}%`;
        this.stepReady = true;
        this.loadingVisible = false;
        this.preparingStep = false;
        this.syncRuntimeStyles();
        this.cdr.markForCheck();
        this.focusPrimaryTourAction(token, step);
        return;
      }

      this.preparingStep = false;
      this.loadingVisible = false;
      this.cdr.markForCheck();
      window.setTimeout(() => {
        if (token === this.stepPreparationToken && this.step === step && this.visible) {
          if (direction === 'forward') {
            this.pendingPreparationDirection = 'forward';
            this.tourService.next();
          }
        }
      }, 0);
      return;
    }

    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    const elapsedLoadingMs = performance.now() - this.loadingStartedAt;
    if (elapsedLoadingMs < this.minimumLoadingMs) {
      await this.wait(this.minimumLoadingMs - elapsedLoadingMs);
    }

    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    if (!restoreOnly) {
      await this.waitForRouterUrlStability(step, token);
    }

    if (token !== this.stepPreparationToken || this.step !== step) {
      return;
    }

    this.stepReady = true;
    this.loadingVisible = false;
    this.preparingStep = false;
    if (!restoreOnly) {
      this.stepUrls.set(this.currentIndex, this.router.url);
      this.completedStepIndexes.add(this.currentIndex);
    }
    this.cdr.markForCheck();
    this.focusPrimaryTourAction(token, step);
    requestAnimationFrame(() => {
      if (token !== this.stepPreparationToken || this.step !== step || !this.visible) {
        return;
      }
      this.geometryFrozen = false;
      this.updatePosition();
      this.geometryFrozen = true;
      this.cdr.markForCheck();
    });
  }

  private applyActiveElementStyles(element: HTMLElement): void {
    if (this.activeElement === element) {
      this.showDashboardSpotlightBorder = this.isDashboardContentTarget(element);
      this.updateActiveElementPointerState(element);
      return;
    }

    this.clearActiveElementStyles();
    this.showDashboardSpotlightBorder = this.isDashboardContentTarget(element);
    this.activeElement = element;
    this.activeElement.classList.add('demo-tour-active', ...DemoTourComponent.activeElementUtilityClasses);
    if (window.getComputedStyle(element).position === 'static' && !element.classList.contains(DemoTourComponent.activeElementRelativeClass)) {
      element.classList.add(DemoTourComponent.activeElementRelativeClass);
      this.activeElementAddedRelativeClass = true;
    }
    this.updateActiveElementPointerState(element);
    this.observeActiveElement(element);
  }

  private updateActiveElementPointerState(element: HTMLElement): void {
    const pointerClass = this.step?.targetInteractive === false
      ? DemoTourComponent.activeElementBlockedPointerClass
      : DemoTourComponent.activeElementPointerClass;
    if (this.activeElementAddedPointerClass === pointerClass) {
      return;
    }
    if (this.activeElementAddedPointerClass) {
      element.classList.remove(this.activeElementAddedPointerClass);
      this.activeElementAddedPointerClass = null;
    }
    if (!element.classList.contains(pointerClass)) {
      element.classList.add(pointerClass);
      this.activeElementAddedPointerClass = pointerClass;
    }
  }

  private clearActiveElementStyles(): void {
    this.restoreActiveInputState();
    this.restoreDisabledElements();
    this.disconnectActiveElementObservers();
    this.showDashboardSpotlightBorder = false;

    if (!this.activeElement) {
      return;
    }

    this.activeElement.classList.remove('demo-tour-active', ...DemoTourComponent.activeElementUtilityClasses);
    if (this.activeElementAddedRelativeClass) {
      this.activeElement.classList.remove(DemoTourComponent.activeElementRelativeClass);
    }
    if (this.activeElementAddedPointerClass) {
      this.activeElement.classList.remove(this.activeElementAddedPointerClass);
    }
    this.activeElementAddedRelativeClass = false;
    this.activeElementAddedPointerClass = null;
    this.activeElement = null;
  }

  private observeActiveElement(element: HTMLElement): void {
    this.disconnectActiveElementObservers();

    this.activeElementResizeObserver = new ResizeObserver(() => {
      if (this.visible && !this.preparingStep && !this.geometryFrozen) {
        this.schedulePositionUpdate();
      }
    });
    this.activeElementResizeObserver.observe(element);

    this.activeElementMutationObserver = new MutationObserver(() => {
      if (this.visible && !this.preparingStep && !this.geometryFrozen) {
        this.schedulePositionUpdate();
      }
    });
    this.activeElementMutationObserver.observe(element, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  private disconnectActiveElementObservers(): void {
    this.activeElementResizeObserver?.disconnect();
    this.activeElementResizeObserver = null;
    this.activeElementMutationObserver?.disconnect();
    this.activeElementMutationObserver = null;
  }

  private getTooltipPosition(rect: DOMRect, preferredPosition: TourStep['position'] = 'bottom', spotlightBounds?: { top: number; left: number; right: number; bottom: number; width: number; height: number; }): Record<string, string> {
    const { width: tooltipWidth, height: tooltipHeight, margin, compact } = this.getTooltipMetrics();
    if (compact) {
      const isSidebarRelatedStep = !!this.step && this.isSidebarRelatedStep(this.step);
      const isDashboardStep = this.step?.elementId === 'dashboard-consolidated';
      const isFinalSidebarStep = this.currentIndex >= Math.max(this.totalSteps - 2, 0);
      const targetCenter = spotlightBounds
        ? spotlightBounds.top + (spotlightBounds.height / 2)
        : rect.top + (rect.height / 2);
      const dockAtTop = isSidebarRelatedStep
        ? targetCenter >= window.innerHeight / 2
        : isDashboardStep || isFinalSidebarStep;
      return {
        top: dockAtTop ? '10px' : 'auto',
        left: '10px',
        bottom: dockAtTop ? 'auto' : '10px'
      };
    }

    const effectivePreferredPosition = compact && (preferredPosition === 'left' || preferredPosition === 'right')
      ? 'bottom'
      : preferredPosition;

    if (effectivePreferredPosition === 'bottom' && this.step?.elementId === 'homeSearch' && spotlightBounds) {
      const homeSearchAlignedTooltip = this.getBelowLeftAlignedTooltipPosition(spotlightBounds, tooltipWidth, tooltipHeight, this.tooltipGap);
      if (this.fitsInViewport(homeSearchAlignedTooltip, tooltipWidth, tooltipHeight, margin)) {
        return homeSearchAlignedTooltip;
      }

      return this.clampTooltipToViewport(homeSearchAlignedTooltip, tooltipWidth, tooltipHeight, margin);
    }

    if (effectivePreferredPosition === 'bottom' && this.step?.elementId === 'free-user-statistics') {
      const freeDashboardAlignedTooltip = this.getDashboardAlignedTooltipPosition(tooltipWidth, tooltipHeight, spotlightBounds);
      if (this.fitsInViewport(freeDashboardAlignedTooltip, tooltipWidth, tooltipHeight, margin)) {
        return freeDashboardAlignedTooltip;
      }

      return this.clampTooltipToViewport(freeDashboardAlignedTooltip, tooltipWidth, tooltipHeight, margin);
    }

    if (effectivePreferredPosition === 'bottom' && this.step?.elementId === 'alert-summery' && spotlightBounds) {
      const alertSummaryAlignedTooltip = this.getAlertSummaryAlignedTooltipPosition(spotlightBounds, tooltipWidth, tooltipHeight);
      if (this.fitsInViewport(alertSummaryAlignedTooltip, tooltipWidth, tooltipHeight, margin)) {
        return alertSummaryAlignedTooltip;
      }

      return this.clampTooltipToViewport(alertSummaryAlignedTooltip, tooltipWidth, tooltipHeight, margin);
    }

    if (effectivePreferredPosition === 'right' && this.step?.elementId.startsWith('sidebar-') && spotlightBounds) {
      const sidebarAlignedTooltip = this.getSidebarAlignedTooltipPosition(spotlightBounds, tooltipWidth, tooltipHeight, this.tooltipGap);
      if (this.fitsInViewport(sidebarAlignedTooltip, tooltipWidth, tooltipHeight, margin)) {
        return sidebarAlignedTooltip;
      }

      return this.clampTooltipToViewport(sidebarAlignedTooltip, tooltipWidth, tooltipHeight, margin);
    }

    if (effectivePreferredPosition === 'left' && this.step?.elementId === 'dashboard-consolidated') {
      const dashboardAlignedTooltip = this.getDashboardAlignedTooltipPosition(tooltipWidth, tooltipHeight, spotlightBounds);
      if (this.fitsInViewport(dashboardAlignedTooltip, tooltipWidth, tooltipHeight, margin)) {
        return dashboardAlignedTooltip;
      }

      return this.clampTooltipToViewport(dashboardAlignedTooltip, tooltipWidth, tooltipHeight, margin);
    }

    if (effectivePreferredPosition === 'left' && this.step?.elementId === 'report-detail') {
      const sidebarElement = document.getElementById('sidebar-general');
      if (sidebarElement) {
        const sidebarRect = sidebarElement.getBoundingClientRect();
        const sidebarAlignedTooltip = this.getSidebarAlignedTooltipPosition({
          top: sidebarRect.top,
          left: sidebarRect.left,
          right: sidebarRect.right,
          bottom: sidebarRect.bottom,
          width: sidebarRect.width,
          height: sidebarRect.height
        }, tooltipWidth, tooltipHeight, this.tooltipGap);

        if (this.fitsInViewport(sidebarAlignedTooltip, tooltipWidth, tooltipHeight, margin)) {
          return sidebarAlignedTooltip;
        }

        return this.clampTooltipToViewport(sidebarAlignedTooltip, tooltipWidth, tooltipHeight, margin);
      }
    }

    const primaryPosition: NonNullable<TourStep['position']> = effectivePreferredPosition ?? 'bottom';
    const positions: NonNullable<TourStep['position']>[] = [
      primaryPosition,
      ...this.fallbackPositions.filter(position => position !== primaryPosition)
    ];

    const positioningRect = spotlightBounds
      ? new DOMRect(spotlightBounds.left, spotlightBounds.top, spotlightBounds.width, spotlightBounds.height)
      : rect;

    for (const position of positions) {
      const tooltip = this.calculateTooltipCoordinates(positioningRect, position, tooltipWidth, tooltipHeight, this.tooltipGap);
      if (this.fitsInViewport(tooltip, tooltipWidth, tooltipHeight, margin)) {
        return tooltip;
      }
    }

    return this.clampTooltipToViewport(this.calculateTooltipCoordinates(positioningRect, effectivePreferredPosition ?? 'bottom', tooltipWidth, tooltipHeight, this.tooltipGap),
      tooltipWidth,
      tooltipHeight,
      margin);
  }

  private getTooltipMetrics(): { width: number; height: number; margin: number; compact: boolean } {
    const viewportWidth = window.innerWidth;
    const compact = viewportWidth <= 900;
    const margin = compact ? 10 : 12;
    const width = compact
      ? Math.min(Math.max(viewportWidth - 20, 240), 360)
      : 360;
    const tooltipElement = document.querySelector('[data-testid="demo-tour-tooltip"]');
    const fallbackHeight = compact ? 270 : 240;
    const measuredHeight = tooltipElement instanceof HTMLElement && tooltipElement.offsetHeight > 0
      ? tooltipElement.offsetHeight
      : fallbackHeight;
    const height = Math.min(measuredHeight, Math.max(window.innerHeight - (margin * 2), 180));

    this.tooltipWidth = `${width}px`;

    return { width, height, margin, compact };
  }

  private getCompactTooltipReservedTop(): number {
    const { height: tooltipHeight, margin } = this.getTooltipMetrics();
    const tooltipTopOffset = 10;
    const spotlightGap = 16;

    return Math.max(tooltipTopOffset + tooltipHeight + spotlightGap + margin, 8);
  }

  private getSidebarAlignedTooltipPosition(spotlightBounds: { top: number; left: number; right: number; bottom: number; width: number; height: number; }, tooltipWidth: number, tooltipHeight: number, gap: number): Record<string, string> {
    const centeredTop = spotlightBounds.top + (spotlightBounds.height / 2) - (tooltipHeight / 2);
    return this.clampTooltipToViewport({ top: `${centeredTop}px`, left: `${spotlightBounds.right + gap}px` }, tooltipWidth, tooltipHeight, 12);
  }

  private getBelowLeftAlignedTooltipPosition(spotlightBounds: { top: number; left: number; right: number; bottom: number; width: number; height: number; }, tooltipWidth: number, tooltipHeight: number, gap: number): Record<string, string> {
    return this.clampTooltipToViewport({ top: `${spotlightBounds.bottom + gap}px`, left: `${spotlightBounds.left}px` }, tooltipWidth, tooltipHeight, 12);
  }

  private getDashboardAlignedTooltipPosition(tooltipWidth: number, tooltipHeight: number, spotlightBounds?: { top: number; left: number; right: number; bottom: number; width: number; height: number; }): Record<string, string> {
    if (spotlightBounds) {
      return this.clampTooltipToViewport({ top: `${spotlightBounds.top + 15}px`, left: `${spotlightBounds.left + 15}px` }, tooltipWidth, tooltipHeight, 12);
    }

    return { top: '12px', left: '12px' };
  }

  private getAlertSummaryAlignedTooltipPosition(spotlightBounds: { top: number; left: number; right: number; bottom: number; width: number; height: number; }, tooltipWidth: number, tooltipHeight: number): Record<string, string> {
    return this.getSidebarAlignedTooltipPosition(spotlightBounds, tooltipWidth, tooltipHeight, this.tooltipGap);
  }

  private calculateTooltipCoordinates( rect: DOMRect, position: NonNullable<TourStep['position']>, tooltipWidth: number, tooltipHeight: number, margin: number ): Record<string, string> {
    switch (position) {
      case 'top':
        return {
          top: `${rect.top - tooltipHeight - margin}px`,
          left: `${rect.left + rect.width / 2 - tooltipWidth / 2}px`
        };
      case 'left':
        return {
          top: `${rect.top + rect.height / 2 - tooltipHeight / 2}px`,
          left: `${rect.left - tooltipWidth - margin}px`
        };
      case 'right':
        return {
          top: `${rect.top + rect.height / 2 - tooltipHeight / 2}px`,
          left: `${rect.right + margin}px`
        };
      case 'bottom':
      default:
        return {
          top: `${rect.bottom + margin}px`,
          left: `${rect.left + rect.width / 2 - tooltipWidth / 2}px`
        };
    }
  }

  private fitsInViewport( tooltip: Record<string, string>, tooltipWidth: number, tooltipHeight: number, margin: number ): boolean {
    const top = Number.parseFloat(tooltip.top);
    const left = Number.parseFloat(tooltip.left);

    return top >= margin &&
      left >= margin &&
      top + tooltipHeight <= window.innerHeight - margin &&
      left + tooltipWidth <= window.innerWidth - margin;
  }

  private clampTooltipToViewport( tooltip: Record<string, string>, tooltipWidth: number, tooltipHeight: number, margin: number ): Record<string, string> {
    const top = Number.parseFloat(tooltip.top);
    const left = Number.parseFloat(tooltip.left);

    return {
      top: `${Math.min(Math.max(top, margin), Math.max(window.innerHeight - tooltipHeight - margin, margin))}px`,
      left: `${Math.min(Math.max(left, margin), Math.max(window.innerWidth - tooltipWidth - margin, margin))}px`
    };
  }

  private getStepElement(step: TourStep): HTMLElement | null {
    const primaryElement = document.getElementById(step.elementId);
    if (primaryElement) {
      return primaryElement;
    }

    return this.getStepFallbackElement(step);
  }

  private getSpotlightAnchorElement(element: HTMLElement, elementId: string): HTMLElement {
    if (!elementId.startsWith('sidebar-')) {
      return element;
    }

    if (element.matches('[data-testid^="sidebar-group-"]')) {
      return element;
    }

    const groupControl = element.querySelector<HTMLElement>('[data-testid^="sidebar-group-"]');
    if (groupControl && this.isElementRendered(groupControl)) {
      return groupControl;
    }

    const directControl = element.querySelector<HTMLElement>(':scope > a, :scope > button, :scope > [role="button"]');
    return directControl && this.isElementRendered(directControl) ? directControl : element;
  }

  private getDefaultSpotlightPadding(elementId: string): number {
    return elementId.startsWith('sidebar-') ? this.sidebarSpotlightPadding : 10;
  }

  private getStepFallbackElement(step: TourStep): HTMLElement | null {
    if (step.elementId !== 'alert-summery') {
      return null;
    }

    const additionalFallback = step.additionalElementIds
      ?.map(elementId => document.getElementById(elementId))
      .find((element): element is HTMLElement => !!element && this.isElementRendered(element));

    if (additionalFallback) {
      return additionalFallback;
    }

    const sidebarProfile = document.getElementById('sidebar-profile');
    return sidebarProfile && this.isElementRendered(sidebarProfile) ? sidebarProfile : null;
  }

  private getRenderedContentBounds(element: HTMLElement): DOMRect {
    const baseRect = element.getBoundingClientRect();
    const descendants = Array.from(element.querySelectorAll<HTMLElement>('*'))
      .filter(candidate => this.isElementRendered(candidate));

    if (!descendants.length) {
      return baseRect;
    }

    let top = baseRect.top;
    let left = baseRect.left;
    let right = baseRect.right;
    let bottom = baseRect.top;

    for (const candidate of descendants) {
      const rect = candidate.getBoundingClientRect();
      top = Math.min(top, rect.top);
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
      bottom = Math.max(bottom, rect.bottom);
    }

    return new DOMRect(left, top, Math.max(right - left, 0), Math.max(bottom - top, 0));
  }

  private isCompactViewport(): boolean {
    return window.innerWidth <= 900;
  }

  private isSidebarStep(step: TourStep): boolean {
    return step.elementId.startsWith('sidebar-');
  }

  private isDashboardContentTarget(element: HTMLElement): boolean {
    return element.closest('[data-testid="dashboard-body"]') instanceof HTMLElement;
  }

  private isSidebarRelatedStep(step: TourStep): boolean {
    return this.isSidebarStep(step) ||
      step.elementId === 'alert-summery' ||
      !!step.additionalElementIds?.some(elementId => elementId.startsWith('sidebar-'));
  }

  private async ensureMobileViewportState(step: TourStep): Promise<void> {
    if (!this.isCompactViewport()) {
      return;
    }

    if (this.isSidebarStep(step)) {
      if (step.sidebarState === 'collapsed') {
        await this.ensureMobileSidebarCollapsed();
      }
      else {
        await this.ensureMobileSidebarExpanded();
      }
      return;
    }

    await this.ensureMobileSidebarCollapsed();
  }

  private async ensureMobileSidebarExpanded(): Promise<void> {
    if (this.isExpandedSidebarVisible()) {
      return;
    }

    const expandButton = document.querySelector('[data-testid="sidebar-expand-button"]');
    if (expandButton instanceof HTMLElement) {
      expandButton.click();
      await this.waitForCompactSidebarState(true);
      await this.waitForAnimationFrames(2);
    }
  }

  private async ensureMobileSidebarCollapsed(): Promise<void> {
    if (!this.isExpandedSidebarVisible()) {
      return;
    }

    const collapseButton = document.querySelector('[data-testid="sidebar-collapse-button"]');
    if (collapseButton instanceof HTMLElement) {
      collapseButton.click();
      await this.waitForCompactSidebarState(false);
      await this.waitForAnimationFrames(2);
    }
  }

  private isExpandedSidebarVisible(): boolean {
    const expandButton = document.querySelector('[data-testid="sidebar-expand-button"]');
    return !(expandButton instanceof HTMLElement);
  }

  private getSidebarExpandedState(): boolean | null {
    if (document.querySelector('[data-testid="sidebar-collapse-button"]') instanceof HTMLElement) {
      return true;
    }
    if (document.querySelector('[data-testid="sidebar-expand-button"]') instanceof HTMLElement) {
      return false;
    }
    return null;
  }

  private async ensureRequestedUiState(step: TourStep): Promise<void> {
    const sidebarState = step.sidebarState ?? (this.isSidebarStep(step) ? 'expanded' : null);
    if (sidebarState) {
      await this.setSidebarState(sidebarState);
    }
    if (step.profileMenuState) {
      await this.setProfileMenuState(step.profileMenuState);
    }
  }

  private async setSidebarState(state: NonNullable<TourStep['sidebarState']>): Promise<void> {
    let expanded = this.getSidebarExpandedState();
    if (expanded === null) {
      await this.waitForSidebarControl();
      expanded = this.getSidebarExpandedState();
    }

    const shouldBeExpanded = state === 'expanded';
    if (expanded !== null && expanded !== shouldBeExpanded) {
      const selector = shouldBeExpanded
        ? '[data-testid="sidebar-expand-button"]'
        : '[data-testid="sidebar-collapse-button"]';
      this.getRenderedSelectorElement(selector)?.click();
    }

    await this.waitForSidebarProjection(state);
  }

  private async setProfileMenuState(state: NonNullable<TourStep['profileMenuState']>): Promise<void> {
    const menuOpen = document.getElementById('profile-dropdown-menu') !== null;
    const shouldBeOpen = state === 'open';
    if (menuOpen !== shouldBeOpen) {
      const trigger = await this.waitForRenderedSelector('[data-testid="profile-menu"]');
      trigger?.click();
    }

    await this.waitForProfileMenuState(state);
  }

  private restoreInitialSidebarState(): void {
    const initialState = this.initialSidebarExpanded;
    const initialScrollTop = this.initialSidebarScrollTop;
    const currentState = this.getSidebarExpandedState();
    this.initialSidebarExpanded = null;
    this.initialSidebarScrollTop = null;

    const restoreScrollPosition = () => {
      if (initialScrollTop === null) {
        return;
      }
      const scroller = this.getRenderedSelectorElement('[data-testid="dashboard-sidebar-scroll"]');
      if (scroller) {
        scroller.scrollTop = initialScrollTop;
      }
    };

    if (initialState === null || currentState === null || initialState === currentState) {
      if (initialState === null) {
        restoreScrollPosition();
        return;
      }
      const state = initialState ? 'expanded' : 'collapsed';
      void this.waitForSidebarProjection(state).then(restoreScrollPosition);
      return;
    }

    const selector = initialState
      ? '[data-testid="sidebar-expand-button"]'
      : '[data-testid="sidebar-collapse-button"]';
    const toggle = document.querySelector(selector);
    if (toggle instanceof HTMLElement) {
      toggle.click();
      const state = initialState ? 'expanded' : 'collapsed';
      void this.waitForSidebarProjection(state).then(restoreScrollPosition);
      return;
    }

    restoreScrollPosition();
  }

  private captureInitialSidebarState(): void {
    this.initialSidebarExpanded = this.getSidebarExpandedState();
    const scroller = this.getRenderedSelectorElement('[data-testid="dashboard-sidebar-scroll"]');
    this.initialSidebarScrollTop = scroller?.scrollTop ?? null;
  }

  private waitForCompactSidebarState(expanded: boolean): Promise<void> {
    return new Promise(resolve => {
      const isReady = () => {
        const shell = document.querySelector('[data-testid="dashboard-shell"]');
        const collapseButton = document.querySelector('[data-testid="sidebar-collapse-button"]');
        const expandButton = document.querySelector('[data-testid="sidebar-expand-button"]');

        if (!shell) {
          return false;
        }

        const shellVisible = 'offsetParent' in shell && shell.offsetParent !== null;

        if (expanded) {
          return collapseButton !== null && !shellVisible;
        }

        return expandButton !== null && shellVisible;
      };

      if (isReady()) {
        resolve();
        return;
      }

      const observer = new MutationObserver(() => {
        if (!isReady()) {
          return;
        }

        observer.disconnect();
        resolve();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      window.setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 1500);
    });
  }

  private getAdditionalSpotlightStyles(step: TourStep): Record<string, string>[] {
    if (!step.additionalElementIds?.length) {
      return [];
    }

    const styles: Record<string, string>[] = [];
    for (const elementId of step.additionalElementIds) {
      if (this.isCompactViewport() && elementId.startsWith('sidebar-') && !this.isSidebarStep(step)) {
        continue;
      }

      const element = document.getElementById(elementId);
      if (!element) {
        continue;
      }

      const spotlightAnchor = this.getSpotlightAnchorElement(element, elementId);
      if (!this.isElementEffectivelyVisible(spotlightAnchor)) {
        continue;
      }
      const rect = spotlightAnchor.getBoundingClientRect();
      const defaultPadding = step.padding ?? this.getDefaultSpotlightPadding(elementId);
      const additionalPadding = elementId.startsWith('sidebar-')
        ? { top: defaultPadding, right: defaultPadding, bottom: defaultPadding, left: defaultPadding }
        : {
          top: Math.max(step.paddingTop ?? defaultPadding, defaultPadding),
          right: Math.max(step.paddingRight ?? defaultPadding, defaultPadding),
          bottom: Math.max(step.paddingBottom ?? defaultPadding, defaultPadding),
          left: Math.max(step.paddingLeft ?? defaultPadding, defaultPadding)
        };
      const top = Math.max(rect.top - additionalPadding.top, 8);
      const left = Math.max(rect.left - additionalPadding.left, 8);
      const right = Math.min(rect.right + additionalPadding.right, window.innerWidth - 8);
      const bottom = Math.min(rect.bottom + additionalPadding.bottom, window.innerHeight - 8);

      styles.push({
        top: `${top}px`,
        left: `${left}px`,
        width: `${Math.max(right - left, 0)}px`,
        height: `${Math.max(bottom - top, 0)}px`
      });
    }

    return styles;
  }

  private getStepValue(element: HTMLElement, step: TourStep): string {
    const input = step.inputSelector
      ? element.querySelector(step.inputSelector)
      : element.querySelector('input, textarea, select');

    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
      return input.value.trim();
    }

    if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
      return document.activeElement.value.trim();
    }

    return '';
  }

  private applyStepInputState(element: HTMLElement, step: TourStep): void {
    this.restoreActiveInputState();
    this.restoreDisabledElements();

    const input = this.getStepInput(element, step);
    if (!input) {
      this.applyDisabledSelectors(element, step);
      return;
    }

    this.activeInput = input;
    this.activeInputWasDisabled = input.disabled;

    if (typeof step.presetValue === 'string') {
      if (input.value !== step.presetValue) {
        input.value = step.presetValue;
        if (!this.currentStepRestoreOnly) {
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      if (!this.currentStepRestoreOnly) {
        this.tourService.setCapturedValue(step.elementId, step.presetValue);
      }
    }

    if (step.disableInput) {
      input.disabled = true;
    }

    this.applyDisabledSelectors(element, step);
  }

  private restoreActiveInputState(): void {
    if (!this.activeInput) {
      return;
    }

    this.activeInput.disabled = this.activeInputWasDisabled;
    this.activeInput = null;
    this.activeInputWasDisabled = false;
  }

  private getStepInput(element: HTMLElement, step: TourStep): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
    const input = step.inputSelector
      ? element.querySelector(step.inputSelector)
      : element.querySelector('input, textarea, select');

    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
      return input;
    }

    return null;
  }

  private applyDisabledSelectors(element: HTMLElement, step: TourStep): void {
    if (!step.disableSelectors?.length) {
      return;
    }

    const elements = element.querySelectorAll(step.disableSelectors.join(', '));
    for (const item of elements) {
      if (
        item instanceof HTMLButtonElement ||
        item instanceof HTMLInputElement ||
        item instanceof HTMLSelectElement ||
        item instanceof HTMLTextAreaElement
      ) {
        this.disabledElements.push({
          element: item,
          wasDisabled: item.disabled
        });
        item.disabled = true;
      }
    }
  }

  private restoreDisabledElements(): void {
    if (!this.disabledElements.length) {
      return;
    }

    for (const item of this.disabledElements) {
      item.element.disabled = item.wasDisabled;
    }

    this.disabledElements = [];
  }

  private lockPageScroll(): void {
    const rootElement = document.documentElement;
    const body = document.body;

    if (body.classList.contains('demo-tour-scroll-locked')) {
      return;
    }

    this.scrollLockY = window.scrollY;
    rootElement.classList.add('no-scroll');
    rootElement.classList.add('demo-tour-scroll-locked');
    body.classList.add('no-scroll');
    body.classList.add('demo-tour-scroll-locked');
    body.classList.add('demo-tour-active');
    this.syncRuntimeStyles();
  }

  private unlockPageScroll(): void {
    const rootElement = document.documentElement;
    const body = document.body;

    if (!body.classList.contains('demo-tour-scroll-locked')) {
      rootElement.classList.remove('no-scroll');
      rootElement.classList.remove('demo-tour-scroll-locked');
      body.classList.remove('no-scroll');
      body.classList.remove('demo-tour-active');
      return;
    }

    rootElement.classList.remove('no-scroll');
    rootElement.classList.remove('demo-tour-scroll-locked');
    body.classList.remove('no-scroll');
    body.classList.remove('demo-tour-scroll-locked');
    body.classList.remove('demo-tour-active');
    this.syncRuntimeStyles();

    window.scrollTo(0, this.scrollLockY);
  }

  private resetHostStyles(): void {
    this.clearActiveElementStyles();
    this.cancelPendingVisualWork();
    this.tooltipTop = '0px';
    this.tooltipLeft = '0px';
    this.tooltipBottom = 'auto';
    this.progressWidth = '0%';
    this.cutoutRects = [];
    this.loadingVisible = false;
    this.preparingStep = false;
    this.geometryFrozen = false;
    this.lastRenderedGeometry = null;
    this.lastTargetCutoutRects = [];
    this.currentStepRestoreOnly = false;
    this.stepUrls.clear();
    this.completedStepIndexes.clear();
    this.restoreInitialSidebarState();
    void this.setProfileMenuState('closed');
    this.restoreFocusBeforeTour();
    this.syncRuntimeStyles();
  }

  private focusTourDialog(): void {
    requestAnimationFrame(() => {
      if (!this.visible) {
        return;
      }
      const tooltip = document.querySelector('[data-testid="demo-tour-tooltip"]');
      if (tooltip instanceof HTMLElement) {
        tooltip.focus({ preventScroll: true });
      }
    });
  }

  private focusPrimaryTourAction(token: number, step: TourStep): void {
    requestAnimationFrame(() => {
      if (token !== this.stepPreparationToken || this.step !== step || !this.visible || !this.stepReady) {
        return;
      }
      const nextButton = document.querySelector('[data-testid="demo-tour-next"]');
      if (nextButton instanceof HTMLButtonElement) {
        nextButton.focus({ preventScroll: true });
      }
    });
  }

  private trapTourFocus(event: KeyboardEvent): void {
    const tooltip = document.querySelector('[data-testid="demo-tour-tooltip"]');
    if (!(tooltip instanceof HTMLElement)) {
      return;
    }

    const controls = Array.from(tooltip.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
      .filter(control => control.getClientRects().length > 0);
    if (!controls.length) {
      event.preventDefault();
      tooltip.focus({ preventScroll: true });
      return;
    }

    const firstControl = controls[0];
    const lastControl = controls[controls.length - 1];
    const activeControl = document.activeElement;
    if (!(activeControl instanceof HTMLElement) || !controls.includes(activeControl)) {
      event.preventDefault();
      (event.shiftKey ? lastControl : firstControl).focus({ preventScroll: true });
      return;
    }
    if (event.shiftKey && activeControl === firstControl) {
      event.preventDefault();
      lastControl.focus({ preventScroll: true });
      return;
    }
    if (!event.shiftKey && activeControl === lastControl) {
      event.preventDefault();
      firstControl.focus({ preventScroll: true });
    }
  }

  private restoreFocusBeforeTour(): void {
    const previousFocus = this.focusBeforeTour;
    this.focusBeforeTour = null;
    if (previousFocus?.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
  }

  private cancelPendingVisualWork(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.cutoutAnimationFrameId !== null) {
      cancelAnimationFrame(this.cutoutAnimationFrameId);
      this.cutoutAnimationFrameId = null;
    }
    this.cancelGeometryTracking();
  }

  private cancelGeometryTracking(): void {
    if (this.geometryTrackingFrameId !== null) {
      cancelAnimationFrame(this.geometryTrackingFrameId);
      this.geometryTrackingFrameId = null;
    }
    const resolve = this.geometryTrackingResolve;
    this.geometryTrackingResolve = null;
    resolve?.();
  }

  private animateCutoutRects(nextCutoutRects: { top: number; left: number; width: number; height: number; rx: number; ry: number; }[]): void {
    if (this.cutoutAnimationFrameId !== null) {
      cancelAnimationFrame(this.cutoutAnimationFrameId);
      this.cutoutAnimationFrameId = null;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.cutoutRects = nextCutoutRects;
      return;
    }

    if (!this.cutoutRects.length || this.cutoutRects.length !== nextCutoutRects.length) {
      this.cutoutRects = nextCutoutRects;
      return;
    }

    const startRects = this.cutoutRects.map(rect => ({ ...rect }));
    const startedAt = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const progress = Math.min(elapsed / this.cutoutTransitionMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 2);

      this.cutoutRects = nextCutoutRects.map((targetRect, index) => {
        const startRect = getOwnProperty(startRects, index);
        return {
          top: this.interpolateNumber(startRect.top, targetRect.top, easedProgress),
          left: this.interpolateNumber(startRect.left, targetRect.left, easedProgress),
          width: this.interpolateNumber(startRect.width, targetRect.width, easedProgress),
          height: this.interpolateNumber(startRect.height, targetRect.height, easedProgress),
          rx: this.interpolateNumber(startRect.rx, targetRect.rx, easedProgress),
          ry: this.interpolateNumber(startRect.ry, targetRect.ry, easedProgress)
        };
      });
      this.cdr.markForCheck();

      if (progress >= 1) {
        this.cutoutAnimationFrameId = null;
        return;
      }

      this.cutoutAnimationFrameId = requestAnimationFrame(tick);
    };

    this.cutoutAnimationFrameId = requestAnimationFrame(tick);
  }

  private interpolateNumber(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }

  private syncRuntimeStyles(): void {
    const styleSheet = this.getRuntimeStyleSheet();
    if (!styleSheet) {
      return;
    }

    this.upsertRuntimeRule(styleSheet, DemoTourComponent.hostRuntimeSelector, [
      `--tour-tooltip-top: ${this.tooltipTop}`,
      `--tour-tooltip-left: ${this.tooltipLeft}`,
      `--tour-tooltip-bottom: ${this.tooltipBottom}`,
      `--tour-tooltip-width: ${this.tooltipWidth}`,
      `--tour-progress-width: ${this.progressWidth}`
    ]);

    if (document.body.classList.contains('demo-tour-scroll-locked')) {
      this.upsertRuntimeRule(styleSheet, DemoTourComponent.bodyRuntimeSelector, [`top: -${this.scrollLockY}px`]);
      return;
    }

    this.removeRuntimeRule(styleSheet, DemoTourComponent.bodyRuntimeSelector);
  }

  private clearRuntimeStyles(): void {
    const styleSheet = this.getRuntimeStyleSheet();
    if (!styleSheet) {
      return;
    }

    this.removeRuntimeRule(styleSheet, DemoTourComponent.hostRuntimeSelector);
    this.removeRuntimeRule(styleSheet, DemoTourComponent.bodyRuntimeSelector);
  }

  private getRuntimeStyleSheet(): CSSStyleSheet | null {
    if (this.runtimeStyleSheet) {
      return this.runtimeStyleSheet;
    }

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const styleSheet = sheet;
        void styleSheet.cssRules;
        this.runtimeStyleSheet = styleSheet;
        return styleSheet;
      }
      catch {
        continue;
      }
    }

    return null;
  }

  private upsertRuntimeRule(styleSheet: CSSStyleSheet, selector: string, declarations: string[]): void {
    this.removeRuntimeRule(styleSheet, selector);
    styleSheet.insertRule(`${selector} { ${declarations.join('; ')}; }`, styleSheet.cssRules.length);
  }

  private removeRuntimeRule(styleSheet: CSSStyleSheet, selector: string): void {
    for (let index = styleSheet.cssRules.length - 1; index >= 0; index -= 1) {
      const rule = getOwnProperty(styleSheet.cssRules, index);
      if (rule instanceof CSSStyleRule && rule.selectorText === selector) {
        styleSheet.deleteRule(index);
      }
    }
  }

  async next() {
    if (!this.stepReady || this.nextTransitionInProgress) {
      return;
    }

    const activeStep = this.step;
    const transitionToken = this.stepPreparationToken;
    const nextIndex = this.currentIndex + 1;
    const savedNextUrl = this.stepUrls.get(nextIndex);
    this.nextTransitionInProgress = true;
    try {
      if (savedNextUrl && savedNextUrl !== this.router.url) {
        const navigated = await this.router.navigateByUrl(savedNextUrl);
        if (!navigated) {
          this.nextTransitionInProgress = false;
          return;
        }
        await this.waitForAnimationFrames(2);
      }
      else if (activeStep?.triggerSubmitOnNext && this.activeElement && !savedNextUrl) {
        this.triggerStepSubmit(this.activeElement, activeStep);

        const nextStep = this.tourService.getStep(nextIndex);
        if (nextStep) {
          await this.waitForElement(nextStep.elementId);
        }
      }

      if (transitionToken !== this.stepPreparationToken || this.step !== activeStep || !this.visible) {
        return;
      }

      this.pendingPreparationDirection = 'forward';
      this.tourService.next();
    }
    catch {
      this.nextTransitionInProgress = false;
    }
  }

  async previous(): Promise<void> {
    if (!this.visible || this.currentIndex <= 0 || this.nextTransitionInProgress) {
      return;
    }

    if (!this.stepUrls.has(this.currentIndex)) {
      this.stepUrls.set(this.currentIndex, this.router.url);
    }
    const previousIndex = this.currentIndex - 1;
    const previousUrl = this.stepUrls.get(previousIndex);
    const activeStep = this.step;
    this.nextTransitionInProgress = true;
    this.stepReady = false;
    this.loadingVisible = true;
    this.stepPreparationToken += 1;
    const transitionToken = this.stepPreparationToken;
    this.preparingStep = false;
    this.cancelPendingVisualWork();
    this.clearActiveElementStyles();
    this.cdr.markForCheck();

    try {
      if (previousUrl && previousUrl !== this.router.url) {
        const navigated = await this.router.navigateByUrl(previousUrl);
        if (!navigated) {
          this.resumeCurrentStepPreparation(activeStep, transitionToken);
          return;
        }
        await this.waitForAnimationFrames(2);
      }

      if (transitionToken !== this.stepPreparationToken || this.step !== activeStep || !this.visible) {
        return;
      }

      this.pendingPreparationDirection = 'backward';
      this.tourService.prev();
    }
    catch {
      this.resumeCurrentStepPreparation(activeStep, transitionToken);
    }
  }

  private resumeCurrentStepPreparation(step: TourStep | null, transitionToken: number): void {
    if (!step || transitionToken !== this.stepPreparationToken || this.step !== step || !this.visible) {
      return;
    }

    this.nextTransitionInProgress = false;
    this.stepReady = false;
    this.loadingVisible = true;
    this.preparingStep = true;
    this.cdr.markForCheck();
    void this.prepareStep(step, 'forward');
  }

  skip(): void {
    if (!this.visible) {
      return;
    }
    this.stepPreparationToken += 1;
    this.nextTransitionInProgress = false;
    this.stepReady = false;
    this.loadingVisible = false;
    this.preparingStep = false;
    this.cancelPendingVisualWork();
    this.clearActiveElementStyles();
    this.tourService.end();
  }

  private triggerStepSubmit(element: HTMLElement, step: TourStep): void {
    const input = this.getStepInput(element, step);
    const form = input?.closest('form') ?? element.closest('form');
    if (!form) {
      return;
    }

    form.requestSubmit();
  }

  private waitForStepTarget(step: TourStep, timeoutMs = 1500): Promise<void> {
    return new Promise(resolve => {
      if (this.hasStepTarget(step)) {
        resolve();
        return;
      }

      const observer = new MutationObserver(() => {
        if (!this.hasStepTarget(step)) {
          return;
        }

        observer.disconnect();
        resolve();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      window.setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeoutMs);
    });
  }

  private waitForRenderedSelector(selector: string, timeoutMs = 1500): Promise<HTMLElement | null> {
    return new Promise(resolve => {
      const existing = this.getRenderedSelectorElement(selector);
      if (existing) {
        resolve(existing);
        return;
      }

      let settled = false;
      const finish = (element: HTMLElement | null) => {
        if (settled) {
          return;
        }
        settled = true;
        observer.disconnect();
        window.clearTimeout(timeoutId);
        resolve(element);
      };
      const observer = new MutationObserver(() => {
        const element = this.getRenderedSelectorElement(selector);
        if (element) {
          finish(element);
        }
      });
      const timeoutId = window.setTimeout(() => {
        finish(this.getRenderedSelectorElement(selector));
      }, timeoutMs);

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    });
  }

  private getRenderedSelectorElement(selector: string): HTMLElement | null {
    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .find(element => this.isElementEffectivelyVisible(element)) ?? null;
  }

  private hasStepTarget(step: TourStep): boolean {
    const element = this.getStepElement(step);
    if (!element || !this.isElementEffectivelyVisible(element)) {
      return false;
    }
    if (step.waitForSelector) {
      const nestedElement = this.getRenderedSelectorElement(step.waitForSelector);
      if (!nestedElement) {
        return false;
      }
    }
    if (!step.inputSelector) {
      return true;
    }
    return !!this.getStepInput(element, step);
  }

  private isWaitTargetRendered(step: TourStep): boolean {
    if (!step.waitForSelector) {
      return false;
    }
    return !!this.getRenderedSelectorElement(step.waitForSelector);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      window.setTimeout(resolve, ms);
    });
  }

  private waitForAnimationFrames(count: number): Promise<void> {
    return new Promise(resolve => {
      const stepFrame = (remaining: number) => {
        if (remaining <= 0) {
          resolve();
          return;
        }

        requestAnimationFrame(() => {
          stepFrame(remaining - 1);
        });
      };

      stepFrame(count);
    });
  }

  private waitForRouterUrlStability(step: TourStep, token: number): Promise<void> {
    return new Promise(resolve => {
      let previousUrl = this.router.url;
      let stableFrames = 0;
      let frameId = 0;
      let navigationPending = this.router.currentNavigation() !== null;
      let settled = false;

      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        if (frameId) {
          cancelAnimationFrame(frameId);
        }
        window.clearTimeout(timeoutId);
        routerEventsSubscription.unsubscribe();
        resolve();
      };

      const routerEventsSubscription = this.router.events.subscribe(event => {
        if (event instanceof NavigationStart) {
          navigationPending = true;
          stableFrames = 0;
          return;
        }
        if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
          navigationPending = false;
          previousUrl = this.router.url;
          stableFrames = 0;
        }
      });
      const timeoutId = window.setTimeout(finish, 2000);

      const tick = () => {
        if (token !== this.stepPreparationToken || this.step !== step || !this.visible) {
          finish();
          return;
        }

        navigationPending = navigationPending || this.router.currentNavigation() !== null;
        const currentUrl = this.router.url;
        if (navigationPending || currentUrl !== previousUrl) {
          previousUrl = currentUrl;
          stableFrames = 0;
        }
        else {
          stableFrames += 1;
          if (stableFrames >= 3) {
            finish();
            return;
          }
        }

        frameId = requestAnimationFrame(tick);
      };

      frameId = requestAnimationFrame(tick);
    });
  }

  private async scrollStepTargetIntoView(step: TourStep, element: HTMLElement): Promise<void> {
    const target = this.getSpotlightAnchorElement(element, step.elementId);
    const sidebarScroller = target.closest<HTMLElement>('[data-testid="dashboard-sidebar-scroll"]');

    if (!sidebarScroller || !this.isElementRendered(sidebarScroller)) {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      await this.waitForAnimationFrames(2);
      return;
    }

    const alignTarget = () => {
      const scrollerRect = sidebarScroller.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const visibleTop = Math.max(scrollerRect.top + 12, 12);
      const visibleBottom = Math.min(scrollerRect.bottom - 12, window.innerHeight - 12);
      const visibleHeight = Math.max(visibleBottom - visibleTop, 0);
      const desiredTop = visibleTop + Math.max((visibleHeight - targetRect.height) / 2, 0);
      const maximumScrollTop = Math.max(sidebarScroller.scrollHeight - sidebarScroller.clientHeight, 0);
      const desiredScrollTop = sidebarScroller.scrollTop + targetRect.top - desiredTop;

      sidebarScroller.scrollTop = Math.min(Math.max(desiredScrollTop, 0), maximumScrollTop);
    };

    const isWithinVisibleBounds = () => {
      const scrollerRect = sidebarScroller.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const visibleTop = Math.max(scrollerRect.top + 12, 12);
      const visibleBottom = Math.min(scrollerRect.bottom - 12, window.innerHeight - 12);
      return targetRect.top >= visibleTop && targetRect.bottom <= visibleBottom;
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      alignTarget();
      await this.waitForAnimationFrames(2);
      if (isWithinVisibleBounds()) {
        return;
      }
    }

    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    await this.waitForAnimationFrames(2);
  }

  private waitForSidebarControl(timeoutMs = 1500): Promise<boolean> {
    return this.waitForDomCondition(() => this.getSidebarExpandedState() !== null, timeoutMs);
  }

  private waitForSidebarProjection(state: NonNullable<TourStep['sidebarState']>, timeoutMs = 1500): Promise<boolean> {
    const expanded = state === 'expanded';
    const projectionSelector = expanded ? '[data-sidebar-expanded]' : '[data-sidebar-collapsed]';
    const toggleSelector = expanded
      ? '[data-testid="sidebar-collapse-button"]'
      : '[data-testid="sidebar-expand-button"]';

    return this.waitForDomCondition(() => {
      const scroller = this.getRenderedSelectorElement(`${projectionSelector} [data-testid="dashboard-sidebar-scroll"]`);
      const toggle = this.getRenderedSelectorElement(toggleSelector);
      return !!scroller && !!toggle;
    }, timeoutMs);
  }

  private waitForProfileMenuState(state: NonNullable<TourStep['profileMenuState']>, timeoutMs = 1500): Promise<boolean> {
    const shouldBeOpen = state === 'open';
    return this.waitForDomCondition(() => {
      const menu = document.getElementById('profile-dropdown-menu');
      return (menu instanceof HTMLElement && this.isElementRendered(menu)) === shouldBeOpen;
    }, timeoutMs);
  }

  private waitForDomCondition(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
    return new Promise(resolve => {
      if (predicate()) {
        resolve(true);
        return;
      }

      let settled = false;
      const finish = (result: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        observer.disconnect();
        window.clearTimeout(timeoutId);
        resolve(result);
      };
      const observer = new MutationObserver(() => {
        if (predicate()) {
          finish(true);
        }
      });
      const timeoutId = window.setTimeout(() => {
        finish(predicate());
      }, timeoutMs);

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    });
  }

  private getTooltipAnchorElement(step: TourStep): HTMLElement | null {
    const finalElement = this.getStepElement(step);
    if (finalElement && this.isElementEffectivelyVisible(finalElement)) {
      return finalElement;
    }

    if (!step.activateSelector) {
      return null;
    }

    const trigger = this.getRenderedSelectorElement(step.activateSelector);
    if (!trigger) {
      return null;
    }

    const triggerContainer = trigger.closest('[id]');
    if (triggerContainer instanceof HTMLElement && this.isElementRendered(triggerContainer)) {
      return triggerContainer;
    }

    return trigger;
  }

  private trackGeometryForWindow(step: TourStep, durationMs: number, token: number): Promise<void> {
    this.geometryFrozen = false;

    return new Promise(resolve => {
      const startedAt = performance.now();
      let settled = false;

      const finish = (freezeGeometry: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        if (this.geometryTrackingFrameId !== null) {
          cancelAnimationFrame(this.geometryTrackingFrameId);
          this.geometryTrackingFrameId = null;
        }
        if (this.geometryTrackingResolve === cancel) {
          this.geometryTrackingResolve = null;
        }
        if (freezeGeometry) {
          this.geometryFrozen = true;
        }
        resolve();
      };
      const cancel = () => {
        finish(false);
      };

      const tick = () => {
        if (token !== this.stepPreparationToken || this.step !== step || !this.visible) {
          finish(false);
          return;
        }

        this.updatePosition();
        this.cdr.markForCheck();

        if (performance.now() - startedAt >= durationMs) {
          finish(true);
          return;
        }

        this.geometryTrackingFrameId = requestAnimationFrame(tick);
      };

      this.cancelGeometryTracking();
      this.geometryTrackingResolve = cancel;
      this.geometryTrackingFrameId = requestAnimationFrame(tick);
    });
  }

  private waitForStepStability(step: TourStep, element: HTMLElement, maxWaitMs = 2000): Promise<void> {
    return new Promise(resolve => {
      let settleTimer: number | null = null;
      let deadlineTimer: number | null = null;
      const stableAfterMs = 180;

      const observedElements = new Set([element]);
      if (step.waitForSelector) {
        const nested = this.getRenderedSelectorElement(step.waitForSelector);
        if (nested) {
          observedElements.add(nested);
        }
      }
      if (step.inputSelector) {
        const input = this.getStepInput(element, step);
        if (input instanceof HTMLElement) {
          observedElements.add(input);
        }
      }

      const finish = () => {
        if (settleTimer !== null) {
          window.clearTimeout(settleTimer);
          settleTimer = null;
        }
        if (deadlineTimer !== null) {
          window.clearTimeout(deadlineTimer);
          deadlineTimer = null;
        }
        resizeObserver.disconnect();
        mutationObserver.disconnect();
        resolve();
      };

      const scheduleSettle = () => {
        if (settleTimer !== null) {
          window.clearTimeout(settleTimer);
        }
        settleTimer = window.setTimeout(() => {
          finish();
        }, stableAfterMs);
      };

      const resizeObserver = new ResizeObserver(() => {
        scheduleSettle();
      });
      for (const observedElement of observedElements) {
        resizeObserver.observe(observedElement);
      }

      const mutationObserver = new MutationObserver(() => {
        scheduleSettle();
      });
      mutationObserver.observe(element, {
        childList: true,
        subtree: true,
        attributes: true
      });

      deadlineTimer = window.setTimeout(() => {
        finish();
      }, maxWaitMs);

      scheduleSettle();
    });
  }

  private waitForSidebarRectStability(step: TourStep, element: HTMLElement): Promise<void> {
    if (!step.elementId.startsWith('sidebar-')) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      let previousRect = element.getBoundingClientRect();
      let stableFrames = 0;
      let frameId = 0;
      let timeoutId = 0;
      const requiredStableFrames = 4;
      const tolerance = 1;

      const finish = () => {
        if (frameId) {
          cancelAnimationFrame(frameId);
        }
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        resolve();
      };

      const tick = () => {
        const nextRect = element.getBoundingClientRect();
        const heightStable = Math.abs(nextRect.height - previousRect.height) <= tolerance;
        const topStable = Math.abs(nextRect.top - previousRect.top) <= tolerance;
        const widthStable = Math.abs(nextRect.width - previousRect.width) <= tolerance;

        if (heightStable && topStable && widthStable) {
          stableFrames += 1;
        }
        else {
          stableFrames = 0;
        }

        previousRect = nextRect;

        if (stableFrames >= requiredStableFrames) {
          finish();
          return;
        }

        frameId = requestAnimationFrame(tick);
      };

      timeoutId = window.setTimeout(() => {
        finish();
      }, 700);
      frameId = requestAnimationFrame(tick);
    });
  }

  private isElementRendered(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private isElementEffectivelyVisible(element: HTMLElement): boolean {
    if (!this.isElementRendered(element)) {
      return false;
    }

    let current: HTMLElement | null = element;
    while (current) {
      const style = window.getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) {
        return false;
      }
      const clipsVertically = style.overflowY === 'hidden' || style.overflowY === 'clip';
      const clipsHorizontally = style.overflowX === 'hidden' || style.overflowX === 'clip';
      if ((clipsVertically && current.clientHeight === 0) || (clipsHorizontally && current.clientWidth === 0)) {
        return false;
      }
      current = current.parentElement;
    }

    return true;
  }

  private waitForElement(elementId: string): Promise<void> {
    return new Promise(resolve => {
      const existingElement = document.getElementById(elementId);
      if (existingElement instanceof HTMLElement && this.isElementRendered(existingElement)) {
        resolve();
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.getElementById(elementId);
        if (!(element instanceof HTMLElement) || !this.isElementRendered(element)) {
          return;
        }

        observer.disconnect();
        resolve();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      window.setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 1500);
    });
  }
}
