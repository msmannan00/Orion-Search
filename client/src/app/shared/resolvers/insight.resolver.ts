import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { InsightCallbackModel } from '../../pages/homepage/model/stats_insight.model';
@Injectable({ providedIn: 'root' })
export class InsightResolver implements Resolve<InsightCallbackModel> {
  private cache$?: Observable<InsightCallbackModel>;

  constructor(private apiService: ApiService) { }

  resolve(): Observable<InsightCallbackModel> {
    this.cache$ ??= this.apiService.get<InsightCallbackModel>('insight').pipe(shareReplay(1));
    return this.cache$;
  }
}
