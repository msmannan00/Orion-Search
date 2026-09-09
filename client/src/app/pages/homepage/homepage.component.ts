import { AfterViewInit, Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HomeSearchComponent } from './home-search/home-search.component';
import { AppService } from '../../services/core/app/app.service';
@Component({
  selector: 'app-index',
  standalone: true,
  imports: [HomeSearchComponent,],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './homepage.component.html',
})
export class HomepageComponent implements OnInit, AfterViewInit {
  constructor(private router: Router, private appService: AppService) {
  }

  ngOnInit() {
    const role = this.appService.userSessionData().user.role;
    if (role == "profile" || role == "admin") {
      this.router.navigate(['dashboard/profile/homepage']).then();
    }
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url.includes('#')) {
          this.scrollToElement();
        }
      });
  }

  ngAfterViewInit() {
    if (this.router.url.includes('#')) {
      this.scrollToElement();
    }
  }

  scrollToElement() {
    document.getElementById('analytics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
