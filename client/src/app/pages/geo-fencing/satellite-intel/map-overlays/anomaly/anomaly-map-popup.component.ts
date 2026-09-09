import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SatelliteAnomalyResponse } from '../../model/satellite-intel-api.models';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector:    'app-anomaly-map-popup',
  standalone:  true,
  imports:     [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './anomaly-map-popup.component.html',
})
export class AnomalyMapPopupComponent {
  anomalyResult: SatelliteAnomalyResponse['result'] | null = null;

  get alertLevel(): string {
    return this.anomalyResult?.alert_level ?? 'unknown';
  }

  get deltaScore(): string {
    const score = this.anomalyResult?.delta_score;
    return Number.isFinite(score) ? `${score}%` : 'unknown';
  }

  get alertClass(): string {
    if (this.alertLevel === 'critical') {
      return 'text-rose-300 [body.light-theme_&]:text-rose-700';
    }
    if (this.alertLevel === 'warning') {
      return 'text-amber-300 [body.light-theme_&]:text-amber-700';
    }
    if (this.alertLevel === 'nominal') {
      return 'text-emerald-300 [body.light-theme_&]:text-emerald-700';
    }
    return 'text-sky-300 [body.light-theme_&]:text-sky-700';
  }
}
