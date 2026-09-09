import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ScrollService } from '../../shared/services/scroll.service';
@Injectable({
  providedIn: 'root'
})
export class SelectionStoreService {
  private selectedSectionSubject = new BehaviorSubject<string | null>(null);
  private selectedOptionSubject = new BehaviorSubject<string | null>(null);

  selectedSection$ = this.selectedSectionSubject.asObservable();
  selectedOption$ = this.selectedOptionSubject.asObservable();
  first_trigger = true;

  constructor(private router: Router, private scroll_service: ScrollService) {
    this.setInitialSelectionFromUrl(this.router.url);
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.url.startsWith('/dashboard')) {
          this.setInitialSelectionFromUrl(event.url);
        }
        else {
          this.resetSelection();
        }
      });
  }

  private setInitialSelectionFromUrl(url: string) {
    const pathOnly = url.split('?')[0].split('#')[0];
    const segments = pathOnly.split('/').filter(Boolean);
    if (pathOnly.startsWith('/dashboard/') && !pathOnly.includes('//') && segments.length >= 2 && segments.length <= 4 && !pathOnly.endsWith('/')) {
      let section = segments[1];
      let option = segments[2];
      const currentSection = this.getSelectedSection();
      const currentOption = this.selectedOptionSubject.value;
      const shouldRedirectToHome = !this.first_trigger &&
                (!currentSection && !currentOption);
      this.first_trigger = false;
      if ((!option && section !== 'home' && section !== 'directory' && section !== 'netint') || (currentSection === section && currentOption === option)) {
        return;
      }
      if (this.router.url.includes('/profile/consolidated') || this.router.url.includes('/profile/alerts') || this.router.url.includes('/profile/addCustomAlert')) {
        this.setSelectedOption('Dashboard');
        return;
      }
      if (shouldRedirectToHome && this.router.url !== '/dashboard/home') {
        this.router.navigate(['/dashboard', 'home'], {
          replaceUrl: true,
          queryParams: {},
          queryParamsHandling: '',
        }).then();
        this.scroll_service.resetOnReload(true);
        return;
      }
      const capitalizedSection = section === 'netint'
        ? 'NETINT'
        : section === 'apt-intel'
          ? 'APT Intel'
          : section.charAt(0).toUpperCase() + section.slice(1);
      this.setSelectedSection(capitalizedSection);
      if (this.router.url.includes('profile') && option == "homepage") {
        option = "Homepage";
      }
      if (option) {
        const capitalizedOption = option.charAt(0).toUpperCase() + option.slice(1);
        this.setSelectedOption(capitalizedOption);
      }
      else {
        this.setSelectedOption('');
      }
    }
  }

  setSelectedSection(section: string) {
    this.selectedSectionSubject.next(section);
    this.selectedOptionSubject.next(null);
    localStorage.setItem('selectedSection', section);
  }

  setSelectedOption(option: string) {
    this.selectedOptionSubject.next(option);
    localStorage.setItem('selectedOption', option);
  }

  getSelectedSection(): string | null {
    return this.selectedSectionSubject.value;
  }

  private resetSelection() {
    this.selectedSectionSubject.next(null);
    this.selectedOptionSubject.next(null);
    localStorage.removeItem('selectedSection');
    localStorage.removeItem('selectedOption');
  }
}
