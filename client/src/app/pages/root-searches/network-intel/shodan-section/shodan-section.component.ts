import { CommonModule } from '@angular/common';
import { Component, effect, input, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { IpDetail } from '../../../../shared/model/network-intel/network-intel.model';
import { IpDetailComponent } from '../ip-detail/ip-detail.component';
import { NetworkIntelScanService } from '../../../../shared/services/network-intel/network-intel-scan.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-network-intel-shodan-section',
  standalone: true,
  imports: [CommonModule, IpDetailComponent, TranslatePipe],
  templateUrl: './shodan-section.component.html',
  styleUrls: ['./shodan-section.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ShodanSectionComponent {
  readonly errorMessageInput = input<string | null>(null, { alias: 'errorMessage' });
  readonly shodanResultInput = input<IpDetail | null>(null, { alias: 'shodanResult' });
  readonly isScanning = input(false);
  readonly progress = input(0);
  readonly currentStep = input('');
  readonly progressSegments = input<number[]>([]);
  errorMessage: string | null = null;
  readonly hasSearched = input(false);
  shodanResult: IpDetail | null = null;

  constructor(private router: Router, private ui: NetworkIntelScanService) {
    effect(() => {
      this.errorMessage = this.errorMessageInput();
      this.shodanResult = this.shodanResultInput();
    });
  }

  get isEmbeddedInConsolidated(): boolean {
    return this.ui.isEmbeddedInConsolidated(this.router.url);
  }

  get progressValue(): number {
    return this.ui.getProgressValue(this.progress());
  }

  get loadingStepLabel(): string {
    return this.ui.getLoadingStepLabel(this.currentStep());
  }

  get showLoadingSkeleton(): boolean {
    return this.ui.shouldShowLoadingSkeleton(this.hasSearched(), this.shodanResult, this.errorMessage, this.isScanning(), this.progress());
  }

  get cameraPortCount(): number {
    return (this.shodanResult?.ports ?? []).filter((port) => port && ((port.is_camera ?? false) || port.device_type === 'camera')).length;
  }

  get hasCameraSignals(): boolean {
    return !!this.shodanResult?.is_camera || this.cameraPortCount > 0 || (this.shodanResult?.cameras?.length ?? 0) > 0;
  }
}
