import { Injectable } from '@angular/core';
import { LicenseService } from '../licenses/licenses.service';
import { ScrollService } from '../../shared/services/scroll.service';

@Injectable({
  providedIn: 'root'
})
export class SidebarHomepageService {
  constructor(private scrollService: ScrollService, private licenseService: LicenseService) {}

  getRiskLevel(type: string, risk?: string): string {
    const normalized = (type || '').toLowerCase();
    const alertRisk = this.formatRisk(risk);
    if (alertRisk) {
      return alertRisk;
    }
    if (normalized === 'vulnerability-scanning') {
      return 'Not Found';
    }

    switch (normalized) {
      case 'general':
      case 'seo scanning':
        return 'Low';
      case 'breach':
      case 'exploit':
      case 'feed':
      case 'playstore-scanning':
      case 'social-scanner':
      case 'email-breach':
      case 'stealerlogs':
      case 'software-scanning':
        return 'Critical';
      case 'defacement':
      case 'advanced scanning':
      case 'repo scanning':
        return 'High';
      case 'social':
      case 'discussion':
        return 'Medium';
      default:
        return 'Unknown';
    }
  }

  private formatRisk(value?: string): string {
    const normalized = (value ?? '').trim().toLowerCase();
    if (!normalized) {
      return '';
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  selectSection<T>(category: T, emitter: { emit(value: T): void }) {
    this.scrollService.clearSavedPosition();
    this.scrollService.scrollReportToTop();
    emitter.emit(category);
  }

  selectOption(event: Event, item: string, emitter: { emit(value: string): void }) {
    event.stopPropagation();
    this.scrollService.clearSavedPosition();
    this.scrollService.scrollReportToTop();
    emitter.emit(item);
  }

  requestSubscription(moduleName: string) {
    if (!this.licenseService.canAccess(moduleName) && typeof window !== 'undefined' && window.innerWidth < 900) {
      window.dispatchEvent(new CustomEvent('close-dashboard-sidebar'));
    }
    this.licenseService.demoSubscription(moduleName);
  }
}
