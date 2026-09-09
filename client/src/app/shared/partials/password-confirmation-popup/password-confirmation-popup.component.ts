import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { popupAnimation } from '../../animations/popup.animations';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-password-confirmation-popup',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './password-confirmation-popup.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [popupAnimation],
})
export class PasswordConfirmationPopupComponent {
  readonly error = input<string | null>(null);
  readonly confirmed = output<string>();
  readonly closed = output();
  password = '';

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).dataset.role === 'backdrop') {
      this.close();
    }
  }

  confirm(): void {
    this.confirmed.emit(this.password);
  }

  close(): void {
    this.closed.emit();
  }
}
