import { CommonModule } from '@angular/common';
import { Component, inject, Input, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { PublicUserData } from '../models/public-user-data.model';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-report-user-sidebar',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './report-user-sidebar.component.html',
})
export class ReportUserSidebarComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  isMounted = false;
  isVisible = false;
  isLoading = false;
  errorMessage = '';
  userData: PublicUserData | null = null;

  @Input() userId = '';

  get profileImageUrl(): string {
    return this.userId ? `/api/s/static/user/${this.userId}` : '/api/s/static/user/default';
  }

  open(userId: string): void {
    if (!userId) {
      return;
    }
    this.userId = userId;
    this.isMounted = true;
    this.isVisible = false;
    window.requestAnimationFrame(() => {
      this.loadUser();
    });
    window.requestAnimationFrame(() => {
      this.isVisible = true;
    });
  }

  closeSidebar(): void {
    this.isVisible = false;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = '/api/s/static/user/default';
  }

  openDetails(): void {
    if (!this.userId) {
      return;
    }
    const userId = this.userId;
    sessionStorage.setItem('profileUserBackUrl', this.router.url);
    this.closeSidebar();
    void this.router.navigate(['/dashboard/profile/user', userId]);
  }

  private loadUser(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.userData = null;
    this.apiService.get<PublicUserData>(`user/${this.userId}/get`).subscribe({
      next: (response) => {
        this.userData = response;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load user details.';
        this.isLoading = false;
      },
    });
  }

  onPanelTransitionEnd(): void {
    if (this.isVisible) {
      return;
    }
    this.isMounted = false;
    this.userId = '';
    this.isLoading = false;
    this.errorMessage = '';
    this.userData = null;
  }
}
