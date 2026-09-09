import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AlertService } from '../services/alerts.service';
import { LicenseService } from '../../../../services/licenses/licenses.service';
import { NgClass } from '@angular/common';
import { AppService } from '../../../../services/core/app/app.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-alert-scan-loading',
  imports: [NgClass, TranslatePipe],
  templateUrl: './alert-scan-loading.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./alert-scan-loading.component.css'],
})
export class AlertScanLoadingComponent {
  constructor(private alertService: AlertService, protected licenseService: LicenseService, private appService: AppService) { }

  get isLightTheme(): boolean {
    return this.appService.userSessionData()?.user?.theme === 'light-theme';
  }

  cancelScan() {
    this.alertService.cancelScanIOCs();
  }
}
