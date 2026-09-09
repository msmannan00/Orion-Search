import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { AppService } from '../../services/core/app/app.service';
import { TenantModel } from '../model/tenant/tenant.model';
@Injectable({ providedIn: 'root' })
export class IocResolver implements Resolve<TenantModel | null> {
  constructor(private apiService: ApiService, private appService: AppService) { }

  resolve(): Observable<TenantModel | null> {
    return this.apiService.post<TenantModel>('get/tenant', {}).pipe(tap(_tenantData => {
      this.appService.tenantData.set(_tenantData);
    }), catchError(() => {
      return of(null);
    }));
  }
}
