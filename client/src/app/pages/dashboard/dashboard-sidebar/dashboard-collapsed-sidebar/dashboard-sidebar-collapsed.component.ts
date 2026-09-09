import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { LowerPipe } from '../../../../shared/pipes/lower.pipe';
import { sidebarItemTooltips } from '../../../../shared/constants/shared-enums';
import { LicenseService } from '../../../../services/licenses/licenses.service';
import { SidebarHomepageService } from '../../../../services/dashboard/sidebar.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { Category } from '../../../../shared/constants/pages';
import { SelectionStoreService } from '../../../../services/dashboard/selection.service';
import { getOwnProperty } from '../../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-dashboard-sidebar-collapsed',
  standalone: true,
  imports: [NgClass, AsyncPipe, RouterLink, TooltipDirective, LowerPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard-sidebar-collapsed.component.html',
})
export class SidebarSectionComponent {
  protected readonly itemTooltips = sidebarItemTooltips;

  readonly title = input('');
  readonly icon = input('');
  readonly items = input<string[]>([]);
  readonly category = input.required<Category>();
  readonly routePrefix = input('');
  readonly selectionStore = input.required<SelectionStoreService>();
  readonly tooltip = input('');
  readonly sectionSelected = output<Category>();
  readonly optionSelected = output<string>();

  constructor(protected licenseService: LicenseService, private sidebarHomepageService: SidebarHomepageService) {}

  selectSection() {
    this.sidebarHomepageService.selectSection(this.category(), this.sectionSelected);
  }

  selectOption(event: Event, item: string) {
    this.sidebarHomepageService.selectOption(event, item, this.optionSelected);
  }

  requestSubscription(moduleName: string) {
    this.sidebarHomepageService.requestSubscription(moduleName);
  }

  visibleItems(): string[] {
    return this.items();
  }

  getItemTooltip(item: string): string {
    const mapped = getOwnProperty(this.itemTooltips, item);
    if (mapped) {
      return mapped;
    }
    return item.replace(/-/g, ' ');
  }

  getItemIcon(item: string): string {
    const normalized = item.toLowerCase().replace(/\s+/g, '-');
    const iconAliases: Record<string, string> = {
      apt: 'mitre',
      malware: 'phishing',
      iocs: 'ioc',
      'file-scanner': 'archive',
      'text-analysis': 'phishing',
      'crypto-scanner': 'cryptocurrency',
      feeder: 'account',
    };
    const mapped = getOwnProperty(iconAliases, normalized) ?? normalized;
    return `/assets/images/sidebar/sub_${mapped}.svg`;
  }
}
