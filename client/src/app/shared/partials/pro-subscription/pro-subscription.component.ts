import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-pro-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule, NgClass, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './pro-subscription.component.html'
})
export class ProSubscriptionComponent {
  selectedSubscription = 'monthly-highlighted';
  userName = '';
  userPhone = '';
  userEmail = '';
  submitted = false;
  readonly permanent = input(false);
  readonly close = output<undefined>();

  constructor(private api: ApiService, private router: Router) {
  }

  closePopup() {

    this.close.emit(undefined);
  }

  submitForm() {
    const payload = {
      plan: this.selectedSubscription,
      name: this.userName,
      phone: this.userPhone,
      email: this.userEmail
    };
    this.api.post('subscription/request', payload).subscribe(() => {
      this.submitted = true;
      this.router.navigate(['/notification'], {
        state: {
          title: 'Subscription Request Sent',
          description: 'Thank you for choosing Dark Web Shield Pro. Our team has received your subscription request and will contact you shortly with the next steps.'
        }
      }).then();
    });
  }
}
