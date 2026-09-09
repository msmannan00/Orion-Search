import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { ApiService } from '../../shared/services/api.service';
import { Router } from '@angular/router';
import { AuthModel } from './model/auth.model';
import { TokenRefreshService } from './token-refresh.service';
import { HttpHeaders } from '@angular/common/http';
import { AppStorageService } from '../core/app/app-storage.service';
import { AppService } from '../core/app/app.service';
import type { LoginResponse, LoginSession } from './model/auth.interfaces.model';
export type { LoginResponse, LoginSession } from './model/auth.interfaces.model';





@Injectable({ providedIn: 'root' })
export class AuthService {
  private authState = new BehaviorSubject<AuthModel>({ isAuthenticated: false, isValidated: true, error: null });

  passwordResetToken: string | null = null;

  constructor(private appService: AppService, private appStorageService: AppStorageService, private apiService: ApiService, private router: Router, private tokenRefreshService: TokenRefreshService) {
    this.authState.next(this.loadAuthState());
    if (this.isAuthenticated()) {
      this.startTokenRefresh();
    }
  }

  get authState$(): Observable<AuthModel> {
    return this.authState.asObservable();
  }

  login(mail: string, password: string, isDemo = false): Observable<LoginResponse> {
    if (this.appService.isMobileMode()) {
      localStorage.setItem('mobileDemo', 'true');
    }
    const body = new URLSearchParams();
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    let route = 'token?cookie_only=true';
    if (isDemo) {
      route = 'token/demo?cookie_only=true';
    }
    else {
      body.set('username', mail);
      body.set('password', password);
    }
    return this.apiService.post<LoginResponse>(route, body.toString(), { headers }).pipe(tap({
      next: (response) => {
        if (response.twofa_required) {
          this.denyAccess('2FA required');
          return;
        }
        if (!this.applyLoginResponse(response)) {
          return;
        }
      },
      error: (error) => {
        if (error?.error?.detail === 'Verification pending.') {
          this.authState.next({
            isAuthenticated: false,
            isValidated: false,
            error: 'Access denied!',
          });
        }
        else {
          this.denyAccess('Access denied!');
        }
      },
    }));
  }

  verifyTwofa(code: string, tempToken: string, _: string): Observable<LoginResponse | null> {
    void _;
    if (!tempToken) {
      return new Observable((observer) => {
        observer.next(null);
        observer.complete();
      });
    }
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tempToken}`,
    });
    return this.apiService.post<LoginResponse>('token/2fa/verify?cookie_only=true', { code }, { headers }).pipe(tap({
      next: (response) => {
        if (!this.applyLoginResponse(response, 'Invalid 2FA code')) {
          return;
        }
      },
      error: () => {
        this.denyAccess('Invalid 2FA code');
      },
    }));
  }

  logout(): void {
    this.apiService.post('logout', {}).subscribe({ error: () => void 0 });
    this.appStorageService.clearActiveSession();
    this.tokenRefreshService.stopTokenRefresh();
    this.authState.next({
      isAuthenticated: false,
      isValidated: true,
      error: null,
    });
    this.router.navigate(['/login']).then(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('onboarding', String(false));
      this.appStorageService.clearStorage();
      this.appService.clearAll();
      this.appService.loadConfig().subscribe();
    });
  }

  demoLogin(): void {
    this.login('_', '_', true).subscribe(() => void 0);
  }

  signup(username: string, email: string, password: string): Observable<unknown> {
    return this.apiService.post('signup', { username, email, password });
  }

  signup_verification(mail: string, password: string): Observable<unknown> {
    return this.apiService.post('signup/verificaion', { username: mail, password });
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.apiService.post('forgot', { email });
  }

  recoverAccount(recoveryKey: string): Observable<unknown> {
    return this.apiService.post('recover', { recovery_key: recoveryKey });
  }

  updatePassword(token: string, password: string): Observable<unknown> {
    return this.apiService.post('updatePassword', { token, password });
  }

  getIsMobileDemo(): boolean {
    return localStorage.getItem('mobileDemo') === 'true' &&
      typeof window !== 'undefined' &&
      window.innerWidth <= 900;
  }

  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
  }

  getSessionStatus(): {
        isAuthenticated: boolean;
        hasSession: boolean;
        } {
    const isAuthenticated = this.isAuthenticated();
    const hasSession = !!this.appService.userSessionData().user.username &&
            !!this.appService.userSessionData().user.role &&
            !!this.appService.userSessionData().user.verificationDate;
    return { isAuthenticated, hasSession };
  }

  private denyAccess(error: string): void {
    this.clearAuthentication(error);
  }

  public clearAuthentication(error: string | null = null): void {
    this.appStorageService.clearActiveSession();
    this.tokenRefreshService.stopTokenRefresh();
    this.authState.next({
      isAuthenticated: false,
      isValidated: true,
      error,
    });
  }

  private setAuthenticated(): void {
    this.authState.next({
      isAuthenticated: true,
      isValidated: true,
      error: null,
    });
  }

  private loadAuthState(): AuthModel {
    const isAuthenticated = !!this.appService.userSessionData().user.username;
    return {
      isValidated: true,
      isAuthenticated,
      error: null,
    };
  }

  private startTokenRefresh(): void {
    if (this.isAuthenticated()) {
      this.tokenRefreshService.startTokenRefresh(() => this.refreshToken());
    }
  }

  refreshToken(): Observable<void> {
    if (!this.isAuthenticated()) {
      return new Observable((observer) => {
        observer.next();
        observer.complete();
      });
    }
    return this.apiService
      .post<{
            session?: LoginSession;
        }>('token/refresh?cookie_only=true', {})
      .pipe(tap((response) => {
        if (response?.session) {
          this.setAuthenticated();
        }
      }), map(() => void 0));
  }

  private applyLoginResponse(response: LoginResponse, deniedMessage = 'Access denied!'): boolean {
    if (!response?.session) {
      this.denyAccess(deniedMessage);
      return false;
    }
    const sessionData = response?.session || {};
    if (sessionData?.role === 'crawler') {
      this.denyAccess(deniedMessage);
      return false;
    }
    this.passwordResetToken = sessionData.password_reset_required ? sessionData.password_reset_token ?? null : null;
    this.setAuthenticated();
    this.startTokenRefresh();
    return true;
  }

}
