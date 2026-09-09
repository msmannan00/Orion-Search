import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from "../../shared/partials/header/login-header/header.component";
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { AppService } from '../../services/core/app/app.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-welcome',
  imports: [HeaderComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './welcome.component.html',
})
export class WelcomeComponent implements OnInit {
  hasToken = false;
  accessUrl: string | null = null;
  isLightTheme = false;
  message = "Your registration has been submitted! We've received your information and are now reviewing your request. You will receive an email notification once your account has been approved by an administrator.";
  heading = "Thank you for registering with ";

  constructor(private router: Router, private route: ActivatedRoute, public apiService: ApiService, private appService: AppService) {
    this.heading += appService.getConfig().appSettings.app_name + "!"
  }

  private applyTheme(theme: 'light-theme' | 'dark-theme') {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(theme);
    this.isLightTheme = theme === 'light-theme';
  }

  ngOnInit() {
    const theme = this.appService.userSessionData()?.user?.theme ?? 'dark-theme';
    this.applyTheme(theme);

    const token = this.route.snapshot.paramMap.get('token');
    if (typeof token === 'string') {
      this.hasToken = true;
      this.apiService.post<{ message?: string; access_url?: string | null }>(`verify/${token}`, null).subscribe({
        next: (res) => {
          this.heading = "Verification Successful!";
          this.message = res.message ?? "Your email has been verified successfully. You may continue onboarding.";
          this.accessUrl = res.access_url ?? null;
        },
        error: (err) => {
          this.heading = "Verification Failed!";
          if (err.status === 400) {
            this.message = "Your verification link has expired. Please request a new one.";
          }
          else if (err.status === 404) {
            this.message = "Invalid verification link. Please check your email again.";
          }
          else {
            this.message = "Something went wrong. Please try again later.";
          }
        }
      });
    }
  }

  goToLogin() {
    if (this.accessUrl) {
      window.location.assign(this.accessUrl);
      return;
    }
    this.router.navigate(['/login']).then();
  }
}
