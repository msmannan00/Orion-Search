import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe, NgClass, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { LowerPipe } from '../../../../shared/pipes/lower.pipe';
import { SelectionStoreService } from '../../../../services/dashboard/selection.service';
import { LicenseService } from '../../../../services/licenses/licenses.service';
import { SidebarHomepageService } from '../../../../services/dashboard/sidebar.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { Category } from '../../../../shared/constants/pages';

@Component({
  selector: 'app-dashboard-sidebar-items',
  standalone: true,
  imports: [NgClass, NgOptimizedImage, AsyncPipe, RouterLink, TooltipDirective, LowerPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard-sidebar-items.component.html',
})
export class DashboardSidebarItemsComponent {
  readonly title = input('');
  readonly icon = input('');
  readonly items = input<string[]>([]);
  readonly category = input.required<Category>();
  readonly routePrefix = input('');
  readonly tooltip = input('');
  readonly sectionSelected = output<Category>();
  readonly optionSelected = output<string>();

  constructor(protected selectionStore: SelectionStoreService, protected licenseService: LicenseService, private sidebarHomepageService: SidebarHomepageService) {
  }

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

  replaceDashWithSpace(value: string): string {
    if (!value) {
      return '';
    }
    return value.replace(/-/g, ' ');
  }
}
