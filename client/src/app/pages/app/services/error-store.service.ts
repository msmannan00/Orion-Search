import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ErrorHandlerComponent } from '../../../shared/partials/error-handler/error-handler.component';
@Injectable({ providedIn: 'root' })
export class ErrorStoreService {
  private errorSubject = new BehaviorSubject<boolean>(false);

  error$: Observable<boolean> = this.errorSubject.asObservable();

  constructor(private router: Router) {
    this.setupRouterListener();
  }

  setError() {
    this.errorSubject.next(true);
  }

  clearError() {
    this.errorSubject.next(false);
  }

  private setupRouterListener() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        let route = this.router.routerState.snapshot.root;
        while (route.firstChild) {
          route = route.firstChild;
        }
        const isErrorRoute = route.component === ErrorHandlerComponent;
        if (isErrorRoute) {
          this.setError();
        }
        else {
          this.clearError();
        }
      });
  }
}
