import { Injectable, inject } from '@angular/core';
import { LicenseService } from '../../services/licenses/licenses.service';
import { DashboardService } from '../../services/dashboard/dashboard.service';
import { ProxyController } from './proxy-controller';
@Injectable({
  providedIn: 'root'
})
export class ScrollService {
  private readonly proxied_resource = inject(ProxyController);
  private readonly resultWindowScrollPositionKey = 'resultWindowScrollPosition';
  private readonly resultContainerScrollPositionKey = 'resultContainerScrollPosition';
  private readonly resultDocumentScrollPositionKey = 'resultDocumentScrollPosition';
  private readonly resultBodyScrollPositionKey = 'resultBodyScrollPosition';
  private readonly resultDashboardBodyScrollPositionKey = 'resultDashboardBodyScrollPosition';

  constructor(protected licenseService: LicenseService, protected dashboardService: DashboardService) {
    this.resetOnReload();
  }

  public clearSavedPosition(): void {
    sessionStorage.removeItem(this.resultWindowScrollPositionKey);
    sessionStorage.removeItem(this.resultContainerScrollPositionKey);
    sessionStorage.removeItem(this.resultDocumentScrollPositionKey);
    sessionStorage.removeItem(this.resultBodyScrollPositionKey);
    sessionStorage.removeItem(this.resultDashboardBodyScrollPositionKey);
  }

  public resetOnReload(ingore = false): void {
    const navEntries = performance.getEntriesByType?.('navigation') as PerformanceNavigationTiming[];
    const isHardReload = navEntries?.[0]?.type === 'reload';
    if (isHardReload || ingore) {
      this.clearSavedPosition();
      window.scrollTo(0, 0);
    }
  }

  openCTI(event: MouseEvent, itemId: string): void {
    if (!this.licenseService.canUseCtiGraph()) {
      this.dashboardService.showSubscription.set(true);
      return;
    }
    event.stopPropagation();
    if (itemId) {
      const baseUrl = `${window.location.origin}/dashboard/ctigraph`;
      const params = new URLSearchParams({
        selectedType: 'document', singleInput: itemId
      });
      const fullUrl = `${baseUrl}?${params.toString()}`;
      this.proxied_resource.open(fullUrl);
    }
  }

  scrollReportToTop(): void {
    const dashboardBody = document.querySelector('[data-testid="dashboard-body"]');
    const dashboardContainer = document.getElementById('dashboard-container');
    const documentElement = document.documentElement;
    const body = document.body;

    const resetTop = () => {
      if (dashboardBody) {
        dashboardBody.scrollTop = 0;
      }
      if (dashboardContainer) {
        dashboardContainer.scrollTop = 0;
      }
      if (documentElement) {
        documentElement.scrollTop = 0;
      }
      if (body) {
        body.scrollTop = 0;
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    resetTop();
    requestAnimationFrame(() => {
      resetTop();
    });
    setTimeout(() => {
      resetTop();
    }, 50);
    setTimeout(() => {
      resetTop();
    }, 150);
  }

  saveCurrentPosition(_itemId = ''): void {
    void _itemId;
    const dashboardContainer = document.getElementById('dashboard-container');
    const dashboardBody = document.querySelector('[data-testid="dashboard-body"]');
    const documentElement = document.documentElement;
    const body = document.body;
    const windowPosition = window.scrollY;
    const containerPosition = dashboardContainer?.scrollTop ?? 0;
    const documentPosition = documentElement?.scrollTop ?? 0;
    const bodyPosition = body?.scrollTop ?? 0;
    const dashboardBodyPosition = dashboardBody?.scrollTop ?? 0;
    sessionStorage.setItem(this.resultWindowScrollPositionKey, String(windowPosition));
    sessionStorage.setItem(this.resultContainerScrollPositionKey, String(containerPosition));
    sessionStorage.setItem(this.resultDocumentScrollPositionKey, String(documentPosition));
    sessionStorage.setItem(this.resultBodyScrollPositionKey, String(bodyPosition));
    sessionStorage.setItem(this.resultDashboardBodyScrollPositionKey, String(dashboardBodyPosition));
  }

  scrollToSavedPosition(): void {
    const savedWindowPosition = sessionStorage.getItem(this.resultWindowScrollPositionKey);
    const savedContainerPosition = sessionStorage.getItem(this.resultContainerScrollPositionKey);
    const savedDocumentPosition = sessionStorage.getItem(this.resultDocumentScrollPositionKey);
    const savedBodyPosition = sessionStorage.getItem(this.resultBodyScrollPositionKey);
    const savedDashboardBodyPosition = sessionStorage.getItem(this.resultDashboardBodyScrollPositionKey);
    if (
      savedWindowPosition === null &&
        savedContainerPosition === null &&
        savedDocumentPosition === null &&
        savedBodyPosition === null &&
        savedDashboardBodyPosition === null
    ) {
      return;
    }

    const windowPosition = parseInt(savedWindowPosition ?? '0', 10);
    const containerPosition = parseInt(savedContainerPosition ?? '0', 10);
    const documentPosition = parseInt(savedDocumentPosition ?? '0', 10);
    const bodyPosition = parseInt(savedBodyPosition ?? '0', 10);
    const dashboardBodyPosition = parseInt(savedDashboardBodyPosition ?? '0', 10);
    const applyScroll = () => {
      const dashboardContainer = document.getElementById('dashboard-container');
      const dashboardBodyElement = document.querySelector<HTMLElement>('[data-testid="dashboard-body"]');
      const documentElement = document.documentElement;
      const body = document.body;
      if (dashboardContainer) {
        dashboardContainer.scrollTop = containerPosition;
      }
      if (dashboardBodyElement) {
        dashboardBodyElement.scrollTop = dashboardBodyPosition;
      }
      if (documentElement) {
        documentElement.scrollTop = documentPosition;
      }
      if (body) {
        body.scrollTop = bodyPosition;
      }
      window.scrollTo({ top: windowPosition, behavior: 'auto' });
    };

    applyScroll();
    requestAnimationFrame(() => {
      applyScroll();
    });
  }
}
