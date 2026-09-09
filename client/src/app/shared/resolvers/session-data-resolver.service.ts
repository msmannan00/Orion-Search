import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { userSessionData } from '../model/company-profile/node.model';
import { AppService } from '../../services/core/app/app.service';
@Injectable({ providedIn: 'root' })
export class NodeResolver implements Resolve<userSessionData | null> {
  constructor(private apiService: ApiService, private appService: AppService) {
  }

  resolve(): Observable<userSessionData | null> {
    return this.apiService
      .post<userSessionData>('get/tenant/node', {})
      .pipe(catchError(() => {
        return of(null);
      }), tap(sessionData => {
        if (sessionData) {
          this.appService.userSessionData.set(sessionData);
        }
      }), shareReplay(1));
  }
}
