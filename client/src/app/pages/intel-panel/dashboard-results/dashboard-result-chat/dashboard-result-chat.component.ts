import { AfterViewInit, Component, ElementRef, OnInit, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { ChatResultItem } from '../../../../shared/model/results/chat/chat.callback.model';
import { DatePipe, SlicePipe, CommonModule } from '@angular/common';
import { ScrollService } from '../../../../shared/services/scroll.service';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { NormalizeUnicodePipe } from '../../../../shared/pipes/normalize-unicode.pipe';
import { AuthService } from '../../../../services/authetication/auth.service';
import { ProxyController } from '../../../../shared/services/proxy-controller';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-dashboard-result-chat',
  imports: [
    DatePipe,
    SlicePipe,
    TooltipDirective,
    CommonModule,
    NormalizeUnicodePipe,
    RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard-result-chat.component.html'
})
export class DashboardResultChatComponent implements OnInit, AfterViewInit {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly proxied_resource = inject(ProxyController);

  currentUrl = '';
  queryParams: Params = {};
  isCollapsed = true;
  isConsolidatedView = false;
  readonly searchResults = input<ChatResultItem[]>([]);
  readonly isExpandAble = input<boolean>(false);

  constructor(protected authService: AuthService, private router: Router, private route: ActivatedRoute, protected scrollService: ScrollService) {
  }

  ngAfterViewInit() {
    this.scrollService.scrollToSavedPosition();
  }

  ngOnInit() {
    this.currentUrl = this.router.url.split('?')[0];
    this.isConsolidatedView = this.currentUrl.includes('/consolidated/');
    if (this.currentUrl.includes('consolidated')) {
      this.currentUrl = this.currentUrl.replace("/all", "/chat");
    }
    if (this.currentUrl.includes('social')) {
      this.currentUrl = this.currentUrl.replace("/all", "/chat");
    }
    else if (this.currentUrl.includes('discussion')) {
      this.currentUrl = this.currentUrl + '/chat';
    }
    if (this.currentUrl.includes('social') && this.currentUrl.includes('chat') && !this.currentUrl.includes('all')) {
      this.currentUrl = this.currentUrl + '/all';
    }
    this.route.queryParams.subscribe(params => {
      this.queryParams = {
        ...params,
        ci: 'chat'
      };
    });
  }

  getResultDisplayLimit(): number {
    return this.isExpandAble() && this.isCollapsed ? 2 : 30;
  }

  toggleCollapsed(): void {
    const previousLimit = this.getResultDisplayLimit();
    const isExpanding = this.isCollapsed;
    this.isCollapsed = !this.isCollapsed;
    this.scrollToResultIndex(isExpanding ? previousLimit : 0);
  }

  openExternalUrl(url?: string | null) {
    if (!this.authService.getIsMobileDemo() || !url) {
      return;
    }

    this.proxied_resource.open(url);
  }

  private scrollToResultIndex(index: number): void {
    if (index < 0) {
      return;
    }
    setTimeout(() => {
      this.elementRef.nativeElement
        .querySelector<HTMLElement>(`[data-result-index="${index}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }
}
