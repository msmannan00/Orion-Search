import { AfterViewInit, Component, ElementRef, OnInit, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { HelperService } from '../../../../shared/services/helper.service';
import { GeneralResultItem } from '../../../../shared/model/results/general/general.callback.model';
import { LeakResultItem } from '../../../../shared/model/results/leak/leak.callback.model';
import { ScrollService } from '../../../../shared/services/scroll.service';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { AuthService } from '../../../../services/authetication/auth.service';
import { LicenseService } from '../../../../services/licenses/licenses.service';
import { isWithinDays as isWithinDaysUtil } from '../../../../shared/utils/intel-report.util';
import { ProxyController } from '../../../../shared/services/proxy-controller';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-dashboard-results-general-grid',
  templateUrl: './dashboard-results-general.component.html',
  imports: [RouterLink, DatePipe, TooltipDirective, CommonModule, NgClass, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true
})
export class DashboardResultsGeneralComponent implements AfterViewInit, OnInit {
  private highlightCache = new Map<string, string>();
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly proxied_resource = inject(ProxyController);

  protected readonly window = window;

  currentUrl = '';
  queryParams: Params = {};
  isCollapsed = true;
  isFreeStrategic = false;
  isConsolidatedView = false;
  readonly query = input.required<string>();
  readonly type = input.required<string>();
  readonly searchResults = input<(GeneralResultItem | LeakResultItem)[]>([]);
  readonly isExpandAble = input<boolean>(false);

  constructor(private authService: AuthService, private helperService: HelperService, private router: Router, private route: ActivatedRoute, protected scrollService: ScrollService, protected licenseService: LicenseService) {
  }

  ngAfterViewInit() {
    this.scrollService.scrollToSavedPosition();
  }

  highlightWords(text: unknown): string {
    const key = JSON.stringify(text);
    const cached = this.highlightCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const result = this.helperService.highlightWords(typeof text === 'string' ? text : String(text ?? ''));
    this.highlightCache.set(key, result);
    return result;
  }

  ngOnInit() {
    this.currentUrl = this.router.url.split('?')[0];
    this.isConsolidatedView = this.currentUrl.includes('/consolidated/');
    const type = this.type();
    const ci = type === 'leak' ? 'leak' : type === 'tracking' ? 'leak' : type === 'news' ? 'leak' : type === 'apt' ? 'apt' : type === 'malware' ? 'malware' : type === 'general' ? 'general' : type === 'Strategic' ? 'strategic' : 'leak';
    if (this.currentUrl.includes('/consolidated/all') || this.currentUrl.includes('/profile/homepage/all')) {
      this.currentUrl = this.currentUrl.replace('/all', `/${ci}`);
    }
    this.route.queryParams.subscribe(params => {
      this.queryParams = {
        ...params,
        ci
      };
    });
    const params = new URLSearchParams(window.location.search);
    const isFree = params.get('mode') === 'free';
    const url = window.location.href.toLowerCase();
    const hasStrategic = url.includes('strategic');
    this.isFreeStrategic = isFree && hasStrategic;
  }

  isWithinDays(dateString = '', days: number): boolean {
    return isWithinDaysUtil(dateString, days);
  }

  isMobileMode(): boolean {
    return this.authService.getIsMobileDemo();
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

  getDisplayTags(item: GeneralResultItem | LeakResultItem): string[] {
    if (item.m_content_type?.length) {
      return item.m_content_type;
    }
    if (item.rank_index === 'apt_model') {
      return ['APT'];
    }
    if (item.rank_index === 'malware_model') {
      return ['Malware Bazaar'];
    }
    return [];
  }

  getDisplayContent(item: GeneralResultItem | LeakResultItem): string {
    return item.m_important_content || item.m_content || '';
  }

  getDisplayUrl(item: GeneralResultItem | LeakResultItem): string {
    return item.m_url ?? item.m_source_url ?? item.m_base_url ?? '';
  }

  getReportLink(item: GeneralResultItem | LeakResultItem): string[] {
    let url = this.currentUrl;
    if (url.includes('/apt-intel/all')) {
      url = url.replace('/all', item.rank_index === 'malware_model' ? '/malware' : '/apt');
    }
    if (url.includes('/threat-intel/all')) {
      url = url.replace('/all', item.rank_index === 'malware_model' ? '/malware' : '/apt');
    }
    return [url, item.m_hash];
  }

  openExternalUrl(url?: string | null): void {
    if (!this.isMobileMode() || !url) {
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
