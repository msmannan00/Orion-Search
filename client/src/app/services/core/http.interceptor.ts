import { HttpErrorResponse, HttpEvent, HttpEventType, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError, TimeoutError, Subject } from 'rxjs';
import { catchError, finalize, timeout, takeUntil, tap } from 'rxjs/operators';
import { LoadingService } from '../../shared/services/loading.service';
import { MessageNotificationService } from '../message_notification/message-notification.service';
import { AuthService } from '../authetication/auth.service';
import { AppService } from './app/app.service';
let activeRequests = 0;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let maintenancePageLoading = false;
const inFlightCancels = new Map<string, Subject<void>>();
const GLOBAL_TIMEOUT = 150000;
const WARMING_UP_DETAILS = new Set([
  'Service Not Ready',
  'Tenant service unavailable',
]);
const STATUS_MEANINGS: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  408: 'Request Timeout',
  409: 'Conflict',
  424: 'Mail Configuration Failed',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};
export const httpInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const loadingService = inject(LoadingService);
  const msg = inject(MessageNotificationService);
  const injector = inject(Injector);
  const authReq = req.clone({ withCredentials: true });
  const key = authReq.url.startsWith('api/') ? authReq.url : null;
  let cancel$: Subject<void> | null = null;
  if (key) {
    const existing = inFlightCancels.get(key);
    if (existing) {
      existing.next();
      existing.complete();
    }
    cancel$ = new Subject<void>();
    inFlightCancels.set(key, cancel$);
  }
  if (activeRequests === 0) {
    loadingService.show();
  }
  activeRequests++;
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  const setWarmingUp = (warming: boolean) => {
    const appService = injector.get(AppService, null);
    if (appService && appService.backendWarmingUp() !== warming) {
      appService.backendWarmingUp.set(warming);
    }
  };
  return next(authReq).pipe(cancel$ ? takeUntil(cancel$) : (s) => s, timeout<HttpEvent<unknown>>(GLOBAL_TIMEOUT), tap({
    next: (event) => {
      if (event.type === HttpEventType.Response) {
        setWarmingUp(false);
      }
    },
  }), finalize(() => {
    if (key) {
      const current = inFlightCancels.get(key);
      if (current === cancel$) {
        inFlightCancels.delete(key);
      }
    }
    activeRequests--;
    if (activeRequests === 0) {
      hideTimeout = setTimeout(() => {
        loadingService.hide();
        hideTimeout = null;
      }, 1000);
    }
  }), catchError((error) => {
    if (error instanceof HttpErrorResponse && error.status === 503 && !authReq.url.includes('admin/backups/status')) {
      const errorBody = error.error && typeof error.error === 'object' ? error.error as Record<string, unknown> : null;
      const detail = String(errorBody?.detail ?? '');
      if (WARMING_UP_DETAILS.has(detail)) {
        setWarmingUp(true);
        return throwError(() => error);
      }
      const isGatewayMaintenance = !detail || (error.headers?.get('content-type') ?? '').includes('text/html');
      if (isGatewayMaintenance) {
        if (!maintenancePageLoading) {
          maintenancePageLoading = true;
          window.location.reload();
        }
        return throwError(() => error);
      }
    }
    const authService = injector.get(AuthService, null);
    const isSessionProbe = authReq.url.includes('api/get/tenant/node');
    if (error instanceof HttpErrorResponse && error.status === 401 && isSessionProbe) {
      authService?.clearAuthentication();
      return throwError(() => error);
    }
    if (authService?.isAuthenticated()) {
      if (error instanceof HttpErrorResponse && authReq.url.includes('api/search')) {
        const errorBody = error.error && typeof error.error === 'object' ? error.error as Record<string, unknown> : null;
        const detail = String(errorBody?.detail ?? '');
        if (error.status === 404 && /document not found/i.test(detail)) {
          msg.show('Report Expired');
          return throwError(() => error);
        }
      }
      if (error instanceof HttpErrorResponse && error.status === 0) {
        msg.show('Cannot connect to server');
        return throwError(() => error);
      }
      let message = error instanceof HttpErrorResponse ? STATUS_MEANINGS[error.status] || 'Error' : 'Error';
      if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
        const keys = Object.keys(error.error);
        if (keys.length === 1) {
          const errorValue = (error.error as Record<string, unknown>)[keys[0]];
          if (typeof errorValue === 'string') {
            message = errorValue;
          }
          else {
            try {
              message = JSON.stringify(errorValue) ?? '';
            }
            catch {
              message = 'Request failed';
            }
          }
        }
      }
      const silentLogoutMessages = new Set([
        'Token has expired',
        'Logged out due to multiple active sessions',
      ]);
      const isSilentLogout = silentLogoutMessages.has(message);
      const isPublicCaseShareRequest = error instanceof HttpErrorResponse && authReq.url.includes('public/case-shares/');
      const isExtensionRequest = authReq.url.includes('api/extension/');
      if (error instanceof HttpErrorResponse && !isPublicCaseShareRequest && !isExtensionRequest && (error.status === 401 || isSilentLogout)) {
        authService.clearAuthentication();
        localStorage.clear();
        sessionStorage.clear();
        router.navigate(['/login']).then();
      }
      if (isSilentLogout) {
        msg.show(message);
      }
    }
    else if (error instanceof HttpErrorResponse && error.status === 401 && !authReq.url.includes('api/extension/')) {
      authService?.clearAuthentication();
      localStorage.clear();
      sessionStorage.clear();
      router.navigate(['/login']).then();
    }
    if (error instanceof TimeoutError) {
      return throwError(() => new HttpErrorResponse({
        error: 'Request timed out',
        status: 408,
        statusText: 'Request Timeout',
        url: authReq.url,
      }));
    }
    return throwError(() => error);
  }));
};
