import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-social-breadcrumb',
  templateUrl: './social-breadcrumb.component.html',
  standalone: true,
  imports: [NgOptimizedImage, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialBreadcrumbComponent {
  profileLabel = input<string | null>(null);
  backClicked = output();
}
