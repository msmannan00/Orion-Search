import { Component, HostListener, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PasswordSchemaFilter } from '../../../../shared/model/stealerlogs-filter/stealerlogs-filters';
import { AppService } from '../../../../services/core/app/app.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-password-schema',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './password-schema.component.html'
})
export class PasswordSchemaComponent {
  filter: PasswordSchemaFilter = { minLength: null, maxLength: null, hasAlphabets: false, hasNumbers: false, hasSpecialChars: false };
  readonly isOpen = input(false);
  readonly close = output<undefined>();
  readonly search = output<PasswordSchemaFilter>();

  constructor(private appService: AppService) {}

  get isLightTheme(): boolean {
    return this.appService.userSessionData()?.user?.theme === 'light-theme';
  }

  onSearch() {
    this.normalizeRange();
    this.search.emit(this.filter);

    this.close.emit(undefined);
  }

  onClose() {

    this.close.emit(undefined);
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent) {
    const eventTargetElement = event.target;
    if (this.isOpen() && eventTargetElement instanceof HTMLElement && eventTargetElement.classList.contains('password-schema-overlay')) {

      this.close.emit(undefined);
    }
  }

  normalizeRange() {
    if (this.filter.minLength !== null && this.filter.minLength < 0) {
      this.filter.minLength = 0;
    }
    if (this.filter.maxLength !== null && this.filter.maxLength < 0) {
      this.filter.maxLength = 0;
    }
    if (this.filter.minLength !== null &&
          this.filter.maxLength !== null) {
      if (this.filter.minLength > this.filter.maxLength) {
        this.filter.maxLength = this.filter.minLength;
      }
    }
  }
}
