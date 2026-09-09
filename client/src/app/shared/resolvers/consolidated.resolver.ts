import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { ReportRouteUtil } from '../utils/report-route.util';
@Injectable({
  providedIn: 'root'
})
export class ReportConsolidatedResolver implements Resolve<unknown> {
  constructor(private apiService: ApiService, private router: Router) {
  }

  resolve(route: ActivatedRouteSnapshot): Observable<unknown> {
    const index = route.queryParamMap.get('ci') ?? '';
    const hash = route.paramMap.get('m_hash');
    const lang = route.queryParamMap.get('lang');
    let apiUrl = ReportRouteUtil.getConsolidatedReportDetailEndpoint(index, hash);
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
