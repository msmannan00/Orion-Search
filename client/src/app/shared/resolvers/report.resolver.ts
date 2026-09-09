import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { ReportRouteUtil } from '../utils/report-route.util';
@Injectable({
  providedIn: 'root'
})
export class ReportResolver implements Resolve<unknown> {
  constructor(private apiService: ApiService, private router: Router) {
  }

  resolve(route: ActivatedRouteSnapshot): Observable<unknown> {
    const category_1 = route.parent?.url[0]?.path ?? '';
    const category_2 = route.url[0]?.path || '';
    const hash = route.paramMap.get('m_hash');
    const lang = route.queryParamMap.get('lang');
    let apiUrl = ReportRouteUtil.getReportDetailEndpointForRoute(category_1, category_2, hash);
    if (!apiUrl) {
      this.router.navigate(['/']).then();
      return of(null);
    }
    if (lang) {
      apiUrl += `?lang=${lang}`;
    }
    return this.apiService.get<unknown>(apiUrl).pipe(catchError(() => {
      this.router.navigate(['/']).then();
      return of(null);
    }));
  }
}
