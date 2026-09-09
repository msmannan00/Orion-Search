import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/authetication/auth.service';
import { AppService } from '../../services/core/app/app.service';
import { areAllPasswordRequirementsMet, buildUsernameSuggestions, buildUsernameSuggestionText, createEmptyPasswordChecks, evaluatePasswordInput, PasswordChecks, PasswordStrength } from '../../shared/utils/auth-form.util';
import { PasswordToggleDirective } from '../../shared/directive/password-toggle.directive';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { isSignupHost } from '../../shared/utils/auth-host.util';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, CommonModule, NgClass, PasswordToggleDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './signup.component.html'
})
export class SignupComponent implements OnInit {
  private static readonly DEFAULT_LOGO_SRC = '/assets/images/shared/logo-wide-light.svg';
  private static readonly DEFAULT_AUTH_DASHBOARD_SRC = '/assets/images/shared/auth_dashboard_map.png';

  user = { username: '', mail: '', password: '' };
  errorMessage: string | null = null;
  passwordStrength: PasswordStrength = null;
  showPasswordMeter = false;
  passwordChecks: PasswordChecks = createEmptyPasswordChecks();
  currentUnmetCheck: string | null = null;
  isMobile = false;
  usernamePattern = /^[A-Za-z][A-Za-z0-9_-]{7,19}$/;
  usernameSuggestion = '';
  brandingResolved = false;

  constructor(private router: Router, public auth_service: AuthService, private route: ActivatedRoute, protected appService: AppService) { }

  ngOnInit(): void {
    this.appService.loadConfig().subscribe(() => {
      if (!isSignupHost(window.location.hostname, this.appService.getConfig().appSettings.app_url)) {
        this.router.navigate(['/login'], { replaceUrl: true }).then();
        return;
      }
      this.brandingResolved = true;
    });
    this.route.queryParams.subscribe(() => {
      this.isMobile = window.innerWidth <= 480;
    });
  }

  getSignupLogoSrc(): string {
    if (!this.brandingResolved) {
      return '';
    }
    return this.appService.getConfig().appSettings.logo_wide_light || SignupComponent.DEFAULT_LOGO_SRC;
  }

  getDashboardPreviewSrc(): string {
    return this.appService.getConfig().appSettings.auth_dashboard_icon || SignupComponent.DEFAULT_AUTH_DASHBOARD_SRC;
  }

  validateUsername(): boolean {
    if (this.usernamePattern.test(this.user.username)) {
      this.usernameSuggestion = '';
      return true;
    }
    const suggestions = buildUsernameSuggestions(this.user.username, this.usernamePattern);
    this.usernameSuggestion = buildUsernameSuggestionText(suggestions);
    this.errorMessage = 'Invalid username';
    return false;
  }

  validateFields() {
    if (!this.validateUsername()) {
      return false;
    }
    const emailPattern = /^[\w.-]+@[\w.-]+\.\w+$/;
    if (!emailPattern.test(this.user.mail)) {
      this.errorMessage = 'Please enter a valid email address';
      return false;
    }
    this.errorMessage = null;
    return true;
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

  onSubmit(form: NgForm) {
    if (!this.validateFields() || !form.valid) {
      return;
    }
    this.auth_service.signup(this.user.username, this.user.mail, this.user.password).subscribe({
      next: () => {
        sessionStorage.setItem('allow_welcome_once', '1');
        this.router.navigate(['/welcome']).then();
      },
      error: (err) => {
        this.errorMessage = err?.error?.detail ?? 'Signup failed';
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']).then();
  }
}
