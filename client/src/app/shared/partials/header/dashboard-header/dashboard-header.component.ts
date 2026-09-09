import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfileComponent } from '../../profile/profile.component';
import { NavigationEnd, Router, UrlTree } from '@angular/router';
import { filter } from 'rxjs';
import { NgClass, NgOptimizedImage } from '@angular/common';
import { AppService } from '../../../../services/core/app/app.service';
import { AuthService } from '../../../../services/authetication/auth.service';
import { SupportComponent } from "../../support/support.component";
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [FormsModule, ProfileComponent, NgClass, NgOptimizedImage, SupportComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard-header.component.html',
})
export class DashboardHeaderComponent implements OnInit {
  breadcrumb: { path: string; label: string; }[] = [];
  supportPopup = false;

  constructor(public authService: AuthService, private router: Router, protected appService: AppService) {
  }

  ngOnInit() {
    this.updateBreadcrumb(this.router.url);
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateBreadcrumb(event.urlAfterRedirects);
      });
  }

  updateBreadcrumb(url: string) {
    const urlTree: UrlTree = this.router.parseUrl(url);
    const segments = urlTree.root.children.primary?.segments.map((segment) => segment.path) ?? [];
    const formatLabel = (segment: string) => segment === 'netint' ? 'Network Intel' : segment === 'ai' ? 'AI' : segment;
    this.breadcrumb = segments.length > 1
      ? segments.slice(1).map((segment) => ({ path: segment, label: formatLabel(segment) }))
      : segments.map((segment) => ({ path: segment, label: formatLabel(segment) }));
  }

  goBack() {
    const currentUrlTree: UrlTree = this.router.parseUrl(this.router.url);
    const queryParams = currentUrlTree.queryParams;
    if (this.router.url.includes('/profile/user/')) {
      const backUrl = sessionStorage.getItem('profileUserBackUrl');
      if (backUrl) {
        sessionStorage.removeItem('profileUserBackUrl');
        this.router.navigateByUrl(backUrl).then();
        return;
      }
    }
    if (this.router.url.includes('/profile/ai')) {
      this.router.navigate(['/dashboard/profile/homepage'], { queryParams }).then();
      return;
    }
    if (this.router.url.includes('/profile/case-management/admin-alerts/')) {
      this.router.navigate(['/dashboard/profile/case-management'], { queryParams: { mode: 'alerts' } }).then();
      return;
    }
    if (this.router.url.includes('profile/consolidated/all') || this.router.url.includes('profile/alerts')) {
      this.router.navigate(['/dashboard/profile/homepage'], { queryParams }).then();
      return;
    }
    if (this.router.url.includes('/profile/consolidated') || this.router.url.includes('/profile/alerts')) {
      sessionStorage.setItem('skipConsolidatedBackFetchOnce', '1');
      this.router.navigate(['/dashboard/profile/consolidated/all'], { queryParams }).then();
      return;
    }
    if (this.router.url.includes('/consolidated')) {
      sessionStorage.setItem('skipConsolidatedBackFetchOnce', '1');
      this.router.navigate(['/dashboard/consolidated/all'], { queryParams }).then();
      return;
    }
    if (this.router.url.includes('/social/chat/all')) {
      this.router.navigate(['/dashboard/social/all'], { queryParams }).then();
      return;
    }
    if (this.breadcrumb[0].label == 'ctigraph') {
      this.router.navigate(['/dashboard'], { queryParams }).then();
      return;
    }
    if (this.breadcrumb.length > 2) {
      const secondLastPath = '/dashboard/' + this.breadcrumb.slice(0, -1).map(crumb => crumb.path).join('/');
      const secondLastUrlTree = this.router.createUrlTree([secondLastPath], { queryParams });
      const secondLastUrl = this.router.serializeUrl(secondLastUrlTree);
      this.router.navigateByUrl(secondLastUrl).then();
    }
  }

  navigateToCrumb(index: number) {
    if (this.breadcrumb.length > 2) {
      const currentUrlTree: UrlTree = this.router.parseUrl(this.router.url);
      const queryParams = currentUrlTree.queryParams;
      const basePath = '/dashboard/' + this.breadcrumb.slice(0, index + 1).map((crumb) => crumb.path).join('/');
      if (this.router.url.includes('/profile/case-management/admin-alerts/') && basePath.includes('/profile/case-management')) {
        this.router.navigate(['/dashboard/profile/case-management'], { queryParams: { mode: 'alerts' } }).then();
        return;
      }
      if (basePath.includes('/consolidated/all')) {
        sessionStorage.setItem('skipConsolidatedBackFetchOnce', '1');
      }
      const fullPathTree: UrlTree = this.router.createUrlTree([basePath], { queryParams });
      const fullPath = this.router.serializeUrl(fullPathTree);
      this.router.navigateByUrl(fullPath).then();
    }
  }

  supportOpenPopup() {
    this.supportPopup = true;
  }

  supportClosePopup() {
    this.supportPopup = false;
  }
}
