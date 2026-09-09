import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TourStep } from '../../../shared/model/demo-tour/demo.tour.model';
import { userMetaData } from '../../../shared/model/company-profile/node.model';
import { AppService } from '../../../services/core/app/app.service';
import { ApiService } from '../../../shared/services/api.service';
import { getOwnProperty } from '../../../shared/utils/type-guards.util';


@Injectable({ providedIn: 'root' })
export class DemoTourService {
  private readonly tourLicensePriority = ['enterprise', 'osint_advanced', 'social_mapper', 'pentester', 'osint_basic', 'feeder', 'maintainer', 'free'];
  private steps: TourStep[] = [];
  private capturedValues = new Map<string, string>();
  private currentStepIndex = new BehaviorSubject<number>(-1);

  currentStep$ = this.currentStepIndex.asObservable();

  constructor(private appService: AppService,private apiService:ApiService, private router: Router){}

  async startTourForCurrentLicense(): Promise<void> {
    await this.appService.loadDemoTourConfig();
    const steps = this.getTourStepsForCurrentLicense();
    if (!steps.length) {
      this.currentStepIndex.next(-1);
      return;
    }
    this.startTour(steps);
  }

  startTour(steps: TourStep[]) {
    this.steps = steps;
    this.capturedValues.clear();
    this.currentStepIndex.next(0);
  }

  next() {
    if (this.currentStepIndex.value < this.steps.length - 1) {
      this.currentStepIndex.next(this.currentStepIndex.value + 1);
    }
    else {
      void this.finish();
    }
  }

  prev() {
    if (this.currentStepIndex.value > 0) {
      this.currentStepIndex.next(this.currentStepIndex.value - 1);
    }
  }

  end() {
    this.appService.userSessionData.update(state => ({
      ...state,
      user: {
        ...state.user,
        demo_tour: true
      }
    }));
    if(this.appService.userSessionData().user.role !== 'demo') {
      this.updateUser();
    }
    this.currentStepIndex.next(-1);
  }

  async finish(): Promise<void> {
    this.end();
    await this.router.navigate(['/dashboard/profile/homepage'], { replaceUrl: true });
  }

  updateUser() {
    const route = "update/current/user";
    const currentUser = this.appService.userSessionData().user;
    const userMeta: userMetaData = {
      username: currentUser.username,
      twofa_enabled: currentUser.twofa_enabled,
      theme: currentUser.theme,
      preferences: currentUser.preferences,
      demo_tour: currentUser.demo_tour
    };
    this.apiService.post(route, userMeta).subscribe();
  }

  getCurrentStep(): TourStep | null {
    return this.steps[this.currentStepIndex.value] || null;
  }

  getStep(index: number): TourStep | null {
    return getOwnProperty(this.steps, index) || null;
  }

  getTotalSteps(): number {
    return this.steps.length;
  }

  setCapturedValue(stepId: string, value: string): void {
    this.capturedValues.set(stepId, value);
  }

  getCapturedValue(stepId: string): string {
    return this.capturedValues.get(stepId) ?? '';
  }

  getCapturedValues(): Record<string, string> {
    return Object.fromEntries(this.capturedValues.entries());
  }

  private getTourStepsForCurrentLicense(): TourStep[] {
    const config = this.appService.demoTourConfig();
    const licenses = (this.appService.userSessionData().user.license ?? []).map(license => license.toLowerCase());
    const selectedLicense = this.tourLicensePriority.find(license => licenses.includes(license) && getOwnProperty(config, license)?.length) ??
      licenses.find(license => getOwnProperty(config, license)?.length);
    const licenseSteps = selectedLicense ? getOwnProperty(config, selectedLicense) : config.default ?? [];
    const auxiliarySteps = ['feeder', 'maintainer']
      .filter(license => license !== selectedLicense && licenses.includes(license))
      .flatMap(license => getOwnProperty(config, license) ?? []);

    const sharedSteps = config.shared ?? [];
    const documentationSteps = this.appService.getConfig().appSettings.home_header_pricing_allowed
      ? config.shared_documentation ?? []
      : [];

    return [...licenseSteps, ...auxiliarySteps, ...sharedSteps, ...documentationSteps]
      .filter(step => !step.showWhenSelector || this.isSelectorRendered(step.showWhenSelector));
  }

  private isSelectorRendered(selector: string): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    return Array.from(document.querySelectorAll(selector))
      .some(element => element.getClientRects().length > 0);
  }
}
