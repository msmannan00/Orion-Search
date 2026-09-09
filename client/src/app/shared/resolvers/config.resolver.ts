import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { map, catchError, of, Observable } from 'rxjs';
import { ConfigSettings } from '../model/app/config';
import { ApiService } from '../services/api.service';
import { AppService } from '../../services/core/app/app.service';
@Injectable({ providedIn: 'root' })
export class ConfigResolver implements Resolve<boolean> {
  constructor(private appService: AppService, private apiService: ApiService) { }

  resolve(): Observable<boolean> {
    return this.apiService.get<{ settings?: Partial<ConfigSettings['appSettings']> }>('public').pipe(map(response => {
      if (response?.settings) {
        const current = this.appService.configData();
        this.appService.configData.set(new ConfigSettings(response.settings, current.localSettings));
      }
      this.appService.updateFavicon(this.appService.configData().appSettings.logo_url);
      document.title = this.appService.configData().appSettings.app_name;
      return true;
    }), catchError(() => of(false)));
  }
}
