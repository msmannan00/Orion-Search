import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { AppService } from '../../../services/core/app/app.service';
import type { TocItem } from './model/project-privacy.model';
export type { TocItem } from './model/project-privacy.model';




const TOC: TocItem[] = [
  { id: 'scope', label: 'Scope and responsibility' },
  { id: 'collect', label: 'Information we collect' },
  { id: 'intelligence', label: 'Investigative data' },
  { id: 'use', label: 'How we use information' },
  { id: 'legal-bases', label: 'Legal bases' },
  { id: 'sharing', label: 'How information is shared' },
  { id: 'integrations', label: 'Integrations and external sources' },
  { id: 'cookies', label: 'Cookies and local storage' },
  { id: 'retention', label: 'Data retention' },
  { id: 'security', label: 'Security' },
  { id: 'transfers', label: 'International transfers' },
  { id: 'rights', label: 'Your rights and choices' },
  { id: 'children', label: 'Children’s privacy' },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact us' },
];

@Component({
  selector: 'app-project-privacy',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './project-privacy.component.html',
})
export class ProjectPrivacyComponent implements OnInit, AfterViewInit, OnDestroy {
  private previousTheme: string | null = null;
  private observer: IntersectionObserver | null = null;

  readonly appName: string;
  readonly logoSrc: string;
  readonly fallbackLogo = '/assets/images/shared/logo-wide-light.svg';
  readonly contactEmail = 'privacy@orionintelligence.org';
  readonly lastUpdated = 'August 28, 2026';
  readonly year = 2026;
  readonly toc = TOC;
  activeId = '';

  constructor(private appService: AppService) {
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
