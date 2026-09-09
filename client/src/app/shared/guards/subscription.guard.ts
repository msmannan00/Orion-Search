import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { SubscriptionService } from '../../services/dashboard/subscription.service';
import { AppService } from '../../services/core/app/app.service';
@Injectable({
  providedIn: 'root'
})
export class subscriptionGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService, private appService: AppService) { }

  canActivate(): boolean {
    if (this.subscriptionService.accountExpirable() && !(this.subscriptionService.isDemo()) || (this.appService.userSessionData().user.license.length > 0 && "enterprise" == this.appService.userSessionData().user.license.at(0))) {
      return true;
    }
    return true;
  }
}
