
import { CommonModule } from '@angular/common';
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ExportChoiceOption } from '../../model/report/export-choice.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-export-choice-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './export-choice-modal.component.html'
})
export class ExportChoiceModalComponent {
  readonly visible = input(false);
  readonly title = input('Export Report');
  readonly subtitle = input('Choose export format:');
  readonly options = input<ExportChoiceOption[]>([]);
  readonly overlayTestId = input('graph-report-export-overlay');
  readonly modalTestId = input('graph-report-export-modal');
  readonly closeTestId = input('graph-report-export-close');
  readonly closed = output<undefined>();
  readonly optionSelected = output<string>();

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('export-choice-overlay')) {

      this.closed.emit(undefined);
    }
  }

  select(value: string): void {
    this.optionSelected.emit(value);
  }

  isLightTheme(): boolean {
    return document.body.classList.contains('light-theme');
  }
}
