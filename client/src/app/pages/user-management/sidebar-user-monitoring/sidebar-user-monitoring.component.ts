import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppService } from '../../../services/core/app/app.service';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuditlogComponent } from '../auditlog/auditlog.component';
import { SidebarUserEventManagementComponent } from '../sidebar-user-event-management/sidebar-user-event-management.component';
import { SidebarUserLogManagerComponent } from '../sidebar-user-log-manager/sidebar-user-log-manager.component';
import { MonitoringTab, MonitoringTabId } from './model/monitoring-tab.models';

@Component({
  selector: 'app-sidebar-user-monitoring',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AuditlogComponent, SidebarUserEventManagementComponent, SidebarUserLogManagerComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './sidebar-user-monitoring.component.html',
})
export class SidebarUserMonitoringComponent implements OnInit {
  activeTab: MonitoringTabId | '' = '';

  constructor(private route: ActivatedRoute, private router: Router, private appService: AppService, private licenseService: LicenseService) {
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const requestedTab = params.get('tab') as MonitoringTabId | null;
      if (!requestedTab && this.activeTab && this.visibleTabs.some(tab => tab.id === this.activeTab)) {
        return;
      }
      const fallbackTab = this.visibleTabs[0]?.id || '';
      const nextTab = this.visibleTabs.some(tab => tab.id === requestedTab) ? requestedTab ?? fallbackTab : fallbackTab;
      this.activeTab = nextTab;
      if (nextTab && requestedTab !== nextTab) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { tab: nextTab },
          queryParamsHandling: 'merge',
          replaceUrl: true
        }).then();
      }
    });
  }

  get visibleTabs(): MonitoringTab[] {
    const tabs: MonitoringTab[] = [];
    if (this.licenseService.isAdmin()) {
      tabs.push({ id: 'log-manager', label: 'Log Manager' });
    }
    if (this.licenseService.isAdmin() || this.licenseService.isMaintainer()) {
      tabs.push({ id: 'auditlog', label: 'Auditlog' });
    }
    if (this.canAccessEventManagement()) {
      tabs.push({ id: 'event-management', label: 'Event Management' });
    }
    return tabs;
  }

  selectTab(tab: MonitoringTabId): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab, page: 1 },
      queryParamsHandling: 'merge'
    }).then();
  }

  private canAccessEventManagement(): boolean {
    return (this.licenseService.isAdmin() || this.licenseService.isMaintainer()) &&
      this.appService.userSessionData().tenant.eventManagementEnabled === true;
  }
}
