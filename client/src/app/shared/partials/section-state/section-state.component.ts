import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type SectionState = 'loading' | 'empty' | 'error' | 'prompt';

@Component({
  selector: 'app-section-state',
  templateUrl: './section-state.component.html',
  standalone: true,
  imports: [TranslatePipe],
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionStateComponent {
  state = input<SectionState>('empty');
  title = input.required<string>();
  description = input('');
  actionLabel = input('');
  actionIcon = input('bi-arrow-clockwise');
  testId = input('');
  actionTestId = input('');
  action = output();
}
