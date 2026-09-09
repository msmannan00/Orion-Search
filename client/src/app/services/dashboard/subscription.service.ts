import { Injectable } from '@angular/core';
import { AppService } from '../core/app/app.service';
@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  constructor(private appService: AppService) {
  }

  public accountExpirable(): boolean {
    return this.appService.userSessionData().user.role == "admin" || this.checkSubscription();
  }

  public checkSubscription(): boolean {
    return this.appService.userSessionData().user.subscription;
  }

  public isDemo(): boolean {
    const role = this.appService.userSessionData().user.role;
    return role === 'demo';
  }

  public checkAdmin(): boolean {
    const role = this.appService.userSessionData().user.role;
    return role === 'admin';
  }

  public getTrialDaysLeft(): number {
    const verifyDate = this.appService.userSessionData().user.verificationDate;
    if (!verifyDate) {
      return 0;
    }
    const expiry = new Date(verifyDate);
    expiry.setMonth(expiry.getMonth() + 1);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
}
