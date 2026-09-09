import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../header/login-header/header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [HeaderComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './notification.component.html'
})
export class NotificationComponent {
  title = 'Your Trial Has Ended';
  description = 'Your trial period has ended. To continue enjoying full access, please upgrade your subscription.';

  constructor(private router: Router) {
    const nav = this.router.currentNavigation();
    const state = nav?.extras?.state;
    if (state) {
      this.title = state.title ?? this.title;
      this.description = state.description ?? this.description;
    }
    else {
      this.router.navigate(['/']).then();
    }
  }

  goHome() {
    this.router.navigate(['/']).then();
  }
}
