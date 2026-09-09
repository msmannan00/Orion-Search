import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConfirmationPopupComponent } from '../../../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { TenantIocSelectorComponent } from '../../../../../shared/partials/tenant-ioc-selector/tenant-ioc-selector.component';
import { TooltipDirective } from '../../../../../shared/directive/tooltip-directive.directive';
import { IocCategory } from '../../../../../shared/model/tenant/tenant.model';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-tenant-ioc-drawer-content',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipDirective, ConfirmationPopupComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './tenant-ioc-drawer-content.component.html',
})
export class TenantIocDrawerContentComponent extends TenantIocSelectorComponent {
  get selectedCategoryName(): string {
    return this.iocs.find(ioc => ioc.ioc_id === this.selectedCategoryId)?.name ?? '';
  }

  get iocsWithValues(): IocCategory[] {
    return this.iocs.filter(ioc => ioc.values.length > 0);
  }

  get totalValueCount(): number {
    return this.iocs.reduce((total, ioc) => total + ioc.values.length, 0);
  }
}
