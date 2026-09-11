import { Component, ChangeDetectionStrategy } from '@angular/core';
import { delay, Observable } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { AsyncPipe, NgClass } from '@angular/common';
@Component({
  selector: 'app-loader',
  standalone: true,
  templateUrl: './loader.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    AsyncPipe,
    NgClass
  ],
})
export class LoaderComponent {
  isLoading$: Observable<boolean>;

  constructor(private loadingService: LoadingService) {
    this.isLoading$ = this.loadingService.loading$.pipe(delay(0));
  }
}
