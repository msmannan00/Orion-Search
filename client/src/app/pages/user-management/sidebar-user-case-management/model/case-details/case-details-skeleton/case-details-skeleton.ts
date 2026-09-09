import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-case-details-skeleton',
  imports: [CommonModule],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './case-details-skeleton.html'
})
export class CaseDetailsSkeletonComponent {
  readonly skeletonActions = [1, 2, 3];
}
