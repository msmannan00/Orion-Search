import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { popupAnimation } from '../../../shared/animations/popup.animations';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { UiDropdownComponent, UiDropdownOption } from '../../../shared/partials/ui-dropdown/ui-dropdown.component';
import { GraphAdvancedFilterModel, GraphSearchMode, GraphSearchOptionModel } from '../model/graph-builder.model';

@Component({
  selector: 'app-graph-advanced-builder-popup',
  standalone: true,
  imports: [FormsModule, TranslatePipe, UiDropdownComponent],
  templateUrl: './advanced-builder-popup.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [popupAnimation],
})
export class GraphAdvancedBuilderPopupComponent {
  readonly filters = input<GraphAdvancedFilterModel[]>([]);
  readonly searchOptions = input<GraphSearchOptionModel[]>([]);
  readonly whereOperatorOptions = input<UiDropdownOption[]>([]);
  readonly joinOperatorOptions = input<UiDropdownOption[]>([]);
  readonly clusterValueOptions = input<UiDropdownOption[]>([]);
  readonly maxFilters = input(8);
  readonly closed = output();
  readonly execute = output();
  readonly addFilter = output();
  readonly removeFilter = output<string>();
  readonly operatorChange = output<{ filter: GraphAdvancedFilterModel; operator: string | null; index: number; }>();
  readonly optionChange = output<{ filter: GraphAdvancedFilterModel; optionKey: string | null; }>();
  readonly clusterValueChange = output<{ filter: GraphAdvancedFilterModel; value: string | null; }>();

  getOperatorOptions(index: number): UiDropdownOption[] {
    return index === 0 ? this.whereOperatorOptions() : this.joinOperatorOptions();
  }

  getOperatorValue(filter: GraphAdvancedFilterModel, index: number): string {
    return index === 0 ? '__where__' : filter.operator;
  }

  getOption(optionKey: string): GraphSearchOptionModel {
    return this.searchOptions().find(option => option.key === optionKey) ?? this.searchOptions()[0];
  }

  isClusterOption(optionKey: string): boolean {
    return this.getOption(optionKey)?.mode === GraphSearchMode.Cluster;
  }

  getClusterValue(filter: GraphAdvancedFilterModel): string {
    return filter.value ?? this.getOption(filter.optionKey)?.clusterValue ?? this.clusterValueOptions()[0]?.key ?? '';
  }

  onBackdrop(event: MouseEvent): void {
    const eventTargetElement = event.target;
    if (eventTargetElement instanceof HTMLElement && eventTargetElement.dataset.role === 'backdrop') {
      this.closed.emit();
    }
  }
}
