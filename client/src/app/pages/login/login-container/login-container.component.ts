import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/authetication/auth.service';
import { Subscription } from 'rxjs';
import { AppService } from '../../../services/core/app/app.service';
import QRCode from 'qrcode';
import { HeaderComponent } from '../../../shared/partials/header/login-header/header.component';
import { PasswordToggleDirective } from '../../../shared/directive/password-toggle.directive';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { isSignupHost } from '../../../shared/utils/auth-host.util';

@Component({
  selector: 'app-login-container',
  standalone: true,
  imports: [FormsModule, CommonModule, HeaderComponent, PasswordToggleDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './login-container.component.html',
})
export class LoginContainerComponent implements OnInit, OnDestroy {
  private static readonly DEFAULT_LOGO_SRC = '/assets/images/shared/logo-wide-light.svg';
  private static readonly DEFAULT_AUTH_DASHBOARD_SRC = '/assets/images/shared/auth_dashboard_map.png';
  private authSubscription!: Subscription;
  private tempToken: string | null = null;
  private pendingUsername: string | null = null;

  user = { mail: '', password: '' };
  errorMessage: string | null = null;
  authenticated = true;
  copied = false;
  twofaRequired = false;
  otpCode = '';
  otpUri: string | null = null;
  otpDataUrl: string | null = null;
  otpSecret: string | null = null;
  isMobile = false;
  autoDemoLogin = false;
  brandingResolved = false;
  showSignupLink = false;

  constructor(public authService: AuthService, private router: Router, protected appService: AppService, private route: ActivatedRoute) { }

  ngOnInit() {
    this.appService.loadConfig().subscribe(() => {
      this.brandingResolved = true;
      this.showSignupLink = isSignupHost(window.location.hostname,
        this.appService.getConfig().appSettings.app_url);
    });
    this.authSubscription = this.authService.authState$.subscribe(authState => {
      if (authState.isAuthenticated) {
        this.appService.loadSession(true).subscribe(() => {
          const user = this.appService.userSessionData().user;
          const passwordResetToken = user.password_reset_token ?? this.authService.passwordResetToken;
          if (user.password_reset_required && passwordResetToken) {
            this.router.navigate(['/reset', passwordResetToken], { replaceUrl: true }).then();
            return;
          }
          const mailRedirect = this.validMailSsoRedirect();
          if (mailRedirect) {
            window.location.assign(mailRedirect);
            return;
          }
          this.router.navigate(['dashboard'], { replaceUrl: true }).then();
        });
      }
      else {
        this.authenticated = false;
      }
    });
    this.route.queryParams.subscribe(params => {
      const isScreenMobile = window.innerWidth <= 480;
      this.isMobile = isScreenMobile;
      let mode = params.mode;
      if (!mode && params.redirect) {
        const tree = this.router.parseUrl(params.redirect);
        mode = tree.queryParams.mode;
      }
      if (mode === 'free') {
        localStorage.setItem('mobileDemo', 'true');
        this.autoDemoLogin = true;
        this.demoLogin();
      }
    });
  }

  private validMailSsoRedirect(): string | null {
    const rawRedirect = this.route.snapshot.queryParamMap.get('redirect');
    if (!rawRedirect) {
      return null;
    }
    try {
      const redirect = new URL(rawRedirect, window.location.origin);
      if (redirect.origin !== window.location.origin
        || redirect.pathname !== '/api/sso/mail/authorize') {
        return null;
      }
      return `${redirect.pathname}${redirect.search}`;
    }
    catch {
      return null;
    }
  }

  getLoginLogoSrc(): string {
    if (!this.brandingResolved) {
      return '';
    }
    return this.appService.getConfig().appSettings.logo_wide_light || LoginContainerComponent.DEFAULT_LOGO_SRC;
  }

  getDashboardPreviewSrc(): string {
    return this.appService.getConfig().appSettings.auth_dashboard_icon || LoginContainerComponent.DEFAULT_AUTH_DASHBOARD_SRC;
  }

  isDefaultDashboardPreview(): boolean {
    const configuredPreview = this.appService.getConfig().appSettings.auth_dashboard_icon;
    return !configuredPreview || configuredPreview.includes('auth_dashboard_icon_default.png');
  }

  isLightTheme(): boolean {
    return typeof document !== 'undefined' && document.body.classList.contains('light-theme');
  }

  copyToClipboard(text: string): void {
    void navigator.clipboard.writeText(text).then(() => {
      this.copied = true;
    });
  }

  onSubmit(form: NgForm) {
    this.errorMessage = null;
    if (!form.valid) {
      return;
    }
    this.authService.login(this.user.mail, this.user.password).subscribe({
      next: (res) => {
        if (res?.twofa_required) {
          this.twofaRequired = true;
          this.pendingUsername = res.username ?? this.user.mail;
          this.tempToken = res.temp_token ?? null;
          this.otpUri = res.provisioning_uri ?? null;
          this.otpSecret = res.twofa_secret ?? null;
          this.otpDataUrl = null;
          if (this.otpUri) {
            void QRCode.toDataURL(this.otpUri).then(dataUrl => {
              this.otpDataUrl = dataUrl;
            }).catch(() => {
              this.otpDataUrl = null;
            });
          }
        }
      },
      error: err => {
        this.errorMessage = err?.error?.detail ?? err?.message ?? 'Login failed';
      }
    });
  }

  submitOtp() {
    this.errorMessage = null;
    if (!this.tempToken || !this.pendingUsername) {
      return;
    }
    this.authService
      .verifyTwofa(this.otpCode, this.tempToken, this.pendingUsername)
      .subscribe({
        next: () => {
          if (!this.authService.isAuthenticated()) {
            return;
          }
        },
        error: (err) => {
          this.errorMessage =
                    err?.error?.detail ??
                        err?.message ??
                        'Login failed';
        }
      });
  }

  goToSignUp() {
    this.router.navigate(['/signup']).then();
  }

  goToForgot() {
    this.router.navigate(['/reset']).then();
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  demoLogin() {
    this.authService.demoLogin();
  }

  resendMail() {
    this.authService.signup_verification(this.user.mail, this.user.password).subscribe({
      next: () => {
        sessionStorage.setItem('allow_welcome_once', '1');
        this.router.navigate(['/welcome']).then();
      },
      error: (err) => {
        const vErr = err?.error?.validation_errors?.[0];
        this.errorMessage = vErr?.message ?? err?.error?.detail ?? 'Signup failed';
      }
    });
  }
}
