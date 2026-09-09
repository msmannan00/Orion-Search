import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/authetication/auth.service';
import { NgForm, FormsModule } from '@angular/forms';
import { HeaderComponent } from "../header/login-header/header.component";
import { PasswordChecks, PasswordStrength, areAllPasswordRequirementsMet, createEmptyPasswordChecks, evaluatePasswordInput } from "../../utils/auth-form.util";
import { AppService } from '../../../services/core/app/app.service';
import { PasswordToggleDirective } from '../../directive/password-toggle.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, HeaderComponent, CommonModule, PasswordToggleDirective, TranslatePipe]
})
export class ResetPasswordComponent implements OnInit {
  @ViewChild('forgotForm') form?: NgForm;
  email = '';
  recoveryKey = '';
  recoveryMode = false;
  password = '';
  errorMessage: string | null = null;
  responseError = false;
  hasToken = false;
  token = '';
  confirmPassword = 'asdsadasd';
  forcedPasswordReset = false;
  passwordStrength: PasswordStrength = null;
  showPasswordMeter = false;
  passwordChecks: PasswordChecks = createEmptyPasswordChecks();
  currentUnmetCheck: string | null = null;

  constructor(private router: Router, private route: ActivatedRoute, public auth_service: AuthService, private appService: AppService) {
  }

  onPasswordInput(password: string) {
    const evaluation = evaluatePasswordInput(password);
    this.showPasswordMeter = evaluation.showPasswordMeter;
    this.passwordChecks = evaluation.passwordChecks;
    this.currentUnmetCheck = evaluation.currentUnmetCheck;
    this.passwordStrength = evaluation.passwordStrength;
  }

  get allPasswordRequirementsMet(): boolean {
    return areAllPasswordRequirementsMet(this.passwordChecks);
  }

  setRecoveryMode(recoveryMode: boolean) {
    this.recoveryMode = recoveryMode;
    this.form?.resetForm();
    this.email = '';
    this.recoveryKey = '';
    this.errorMessage = null;
    this.responseError = false;
  }

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (typeof token === 'string') {
      this.token = token;
      this.hasToken = true;
    }
    this.forcedPasswordReset = this.auth_service.isAuthenticated();
  }

  onSubmit(form: NgForm) {
    this.errorMessage = '';
    if (form.valid) {
      if (this.hasToken) {
        if (this.password !== this.confirmPassword) {
          this.errorMessage = "Password and confirm password do not match";
          return;
        }
        this.auth_service.updatePassword(this.token, this.password).subscribe({
          next: () => {
            this.responseError = false;
            if (this.forcedPasswordReset) {
              this.appService.loadSession(true).subscribe(() => {
                this.router.navigate(['dashboard'], { replaceUrl: true }).then();
              });
              return;
            }
            this.router.navigate(['login'], { replaceUrl: true }).then();
          },
          error: (err) => {
            this.responseError = true;
            if (err.status === 404) {
              this.errorMessage = "Invalid link";
            }
            else if (err.status === 400) {
              this.errorMessage = "New password must be different from the old one.";
            }
            else {
              this.errorMessage = "Something went wrong. Please try again later.";
            }
          }
        });
      }
      else {
        const request = this.recoveryMode
          ? this.auth_service.recoverAccount(this.recoveryKey)
          : this.auth_service.forgotPassword(this.email);
        request.subscribe({
          next: () => {
            this.responseError = false;
            this.router.navigate(['notification'], {
              state: {
                title: 'Password Reset Email Sent',
                description: 'A password reset link has been sent to your registered email address. Please check your inbox to continue.'
              }
            }).then();
          },
          error: (err) => {
            this.responseError = true;
            if (this.recoveryMode) {
              this.errorMessage = err?.error?.detail ?? "Invalid recovery key";
            }
            else {
              this.errorMessage = "Something went wrong. Please try again later.";
            }
          }
        });
      }
    }
  }
}
