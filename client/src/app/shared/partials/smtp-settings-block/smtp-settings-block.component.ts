import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PasswordToggleDirective } from '../../directive/password-toggle.directive';
import { SmtpSettingsForm } from './model/smtp-settings.model';
import { ApiService } from '../../services/api.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-smtp-settings-block',
  standalone: true,
  imports: [CommonModule, FormsModule, PasswordToggleDirective, TranslatePipe],
  host: { class: 'block sm:col-span-2' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './smtp-settings-block.component.html'
})
export class SmtpSettingsBlockComponent implements OnChanges {
  private apiService = inject(ApiService);
  private hostElement = inject<ElementRef<Element>>(ElementRef);

  isVerifyingMail = false;
  mailConfigurationStatus = '';
  verifyError = false;

  @Input({ required: true }) form!: SmtpSettingsForm;
  @Input() isDirty = false;
  @Input() errorState = false;

  @Output() save = new EventEmitter<void>();
  @Output() settingsChange = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.errorState?.currentValue) {
      this.scrollToError();
    }
  }

  verifyMailConfiguration() {
    if (this.isVerifyingMail) {
      return;
    }
    this.isVerifyingMail = true;
    this.mailConfigurationStatus = '';
    this.verifyError = false;
    this.apiService.post<unknown>('system/mail/verify', {}).subscribe({
      next: () => {
        this.mailConfigurationStatus = 'working';
        this.isVerifyingMail = false;
      },
      error: () => {
        this.mailConfigurationStatus = 'not working';
        this.verifyError = true;
        this.isVerifyingMail = false;
        this.scrollToError();
      }
    });
  }

  onFormChange(): void {
    this.mailConfigurationStatus = '';
    this.verifyError = false;
    this.settingsChange.emit();
  }

  private scrollToError(): void {
    setTimeout(() => {
      this.hostElement.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
