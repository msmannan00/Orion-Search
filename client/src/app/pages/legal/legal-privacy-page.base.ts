import { AfterViewInit, Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { AppService } from '../../services/core/app/app.service';
import { LegalTocItem } from './model/legal-privacy-page.model';

@Directive()
export abstract class LegalPrivacyPage implements OnInit, AfterViewInit, OnDestroy {
  private previousTheme: string | null = null;
  private observer: IntersectionObserver | null = null;

  protected readonly appService = inject(AppService);

  readonly fallbackLogo = '/assets/images/shared/logo-wide-light.svg';
  readonly appName: string;
  readonly logoSrc: string;
  readonly contactEmail = 'privacy@orionintelligence.org';
  readonly lastUpdated = 'August 28, 2026';
  readonly year = 2026;
  activeId = '';

  abstract readonly toc: readonly LegalTocItem[];

  constructor() {
    const cfg = this.appService.getConfig()?.appSettings;
    this.appName = cfg?.app_name || 'Orion Intelligence';
    this.logoSrc = cfg?.logo_wide_light || this.fallbackLogo;
  }

  ngOnInit() {
    this.previousTheme = document.body.classList.contains('dark-theme')
      ? 'dark-theme'
      : document.body.classList.contains('light-theme')
        ? 'light-theme'
        : null;
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  }

  ngAfterViewInit() {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const onIntersect = (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.activeId = entry.target.id;
        }
      }
    };
    this.observer = new IntersectionObserver(onIntersect, { rootMargin: '-88px 0px -68% 0px', threshold: 0 });
    for (const item of this.toc) {
      const el = document.getElementById(item.id);
      if (el) {
        this.observer.observe(el);
      }
    }
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.observer = null;
    document.body.classList.remove('light-theme');
    if (this.previousTheme) {
      document.body.classList.add(this.previousTheme);
    }
  }

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onLogoError(event: Event) {
    const image = event.target;
    if (image instanceof HTMLImageElement && !image.src.endsWith(this.fallbackLogo)) {
      image.src = this.fallbackLogo;
    }
  }
}
