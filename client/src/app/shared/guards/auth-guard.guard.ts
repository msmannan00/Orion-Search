import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../services/authetication/auth.service';
import { AppService } from '../../services/core/app/app.service';
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router, private appService: AppService) { }

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const urlTree = this.router.parseUrl(state.url);
    const currentPath = '/' + (urlTree.root.children.primary?.segments.map(segment => segment.path).join('/') || '');
    if (this.authService.getIsMobileDemo() && currentPath !== '/dashboard/strategic/all') {
      this.router.navigate(['/dashboard/strategic/all'], { queryParams: { ...urlTree.queryParams, page: 1 } }).then();
      return false;
    }
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { redirect: state.url } }).then();
      return false;
    }
    const user = this.appService.userSessionData().user;
    if (user.password_reset_required && user.password_reset_token && !currentPath.startsWith('/reset')) {
      this.router.navigate(['/reset', user.password_reset_token], { replaceUrl: true, state: { forcedPasswordReset: true } }).then();
      return false;
    }
    return true;
  }
}
