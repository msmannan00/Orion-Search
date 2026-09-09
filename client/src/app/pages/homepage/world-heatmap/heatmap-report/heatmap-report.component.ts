
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { CountryInsightReport } from '../../model/country-insight.model';

@Component({
  selector: 'app-heatmap-report',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './heatmap-report.component.html'
})
export class HeatmapReportComponent {
  readonly reports = input<CountryInsightReport[]>([]);
  readonly loading = input(false);
  readonly loadingMore = input(false);
  readonly hasMore = input(false);
  readonly close = output<undefined>();
  readonly loadMore = output<undefined>();

  closePopup(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.close.emit(undefined);
  }

  onLoadMore(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.loadMore.emit(undefined);
  }
}
