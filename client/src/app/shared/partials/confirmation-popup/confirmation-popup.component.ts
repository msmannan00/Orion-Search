import { NgClass } from '@angular/common';
import { booleanAttribute, Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FocusDirective } from '../../directive/focus.directive';
import { popupAnimation } from '../../animations/popup.animations';
import { TranslatePipe } from '../../pipes/translate.pipe';
@Component({
  selector: 'app-confirmation-popup',
  imports: [
    FocusDirective,
    NgClass,
    TranslatePipe
  ],
  templateUrl: './confirmation-popup.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [popupAnimation],
})
export class ConfirmationPopupComponent {
  readonly message = input('Are you sure you want to perform this action?');
  readonly confirmLabel = input('confirmation.yesConfirm');
  readonly warning = input(false, { transform: booleanAttribute });
  readonly showCancel = input(true, { transform: booleanAttribute });
  readonly confirmed = output<boolean>();

  onBackdrop(event: MouseEvent) {
    const eventTargetElement = event.target;
    if (eventTargetElement instanceof HTMLElement && eventTargetElement.dataset.role === 'backdrop') {
      this.confirmed.emit(false);
    }
  }

  onYes() {
    this.confirmed.emit(true);
  }

  onNo() {
    this.confirmed.emit(false);
  }
}
