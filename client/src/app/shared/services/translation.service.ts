import { effect, Injectable, inject, signal } from '@angular/core';
import { AppService } from '../../services/core/app/app.service';
import { LANGUAGE_OPTIONS } from '../constants/shared-enums';
import { getOwnProperty } from '../utils/type-guards.util';


@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly appService = inject(AppService);
  private readonly defaultLocale = 'en';
  private fallbackTranslations: Record<string, string> = {};
  private initialized = false;
  private translations: Record<string, string> = {};

  readonly version = signal(0);

  constructor() {
    effect(() => {
      const language = this.getPreferredLocale();
      if (this.initialized) {
        void this.setLocale(language);
      }
    });
  }

  async initialize(): Promise<void> {
    this.fallbackTranslations = await this.loadLocale(this.defaultLocale);
    this.initialized = true;
    await this.setLocale(this.getPreferredLocale());
  }

  async setLocale(locale: string): Promise<void> {
    const language = (locale || this.defaultLocale).trim().toLowerCase();
    this.translations = language === this.defaultLocale
      ? this.fallbackTranslations
      : await this.loadLocale(language);

    document.documentElement.lang = language;
    document.documentElement.dir = this.isRtl(language) ? 'rtl' : 'ltr';
    this.version.update(value => value + 1);
  }

  translate(key: string | null | undefined): string {
    const normalizedKey = (key ?? '').replace(/\s+/g, ' ').trim();
    if (!normalizedKey) {
      return '';
    }
    const spaceKey = normalizedKey.replace(/-/g, ' ');
    return getOwnProperty(this.translations, normalizedKey)
      ?? getOwnProperty(this.translations, spaceKey)
      ?? getOwnProperty(this.fallbackTranslations, normalizedKey)
      ?? getOwnProperty(this.fallbackTranslations, spaceKey)
      ?? normalizedKey;
  }

  private async loadLocale(locale: string): Promise<Record<string, string>> {
    try {
      const response = await fetch(`/assets/translate/${locale}.json`);
      if (!response.ok) {
        return {};
      }
      return await response.json() as Record<string, string>;
    }
    catch {
      return {};
    }
  }

  private isRtl(locale: string): boolean {
    return ['ar'].includes(locale);
  }

  private getPreferredLocale(): string {
    const userLanguage = this.appService.userSessionData()?.user?.preferences?.language;
    const systemLanguage = this.appService.configData().appSettings.language_allowed;
    const language = typeof userLanguage === 'string' && userLanguage.trim() ? userLanguage : systemLanguage;
    const code = (language || this.defaultLocale).trim().toLowerCase();
    return LANGUAGE_OPTIONS.some(option => option.code === code) ? code : this.defaultLocale;
  }

  public getSupportedLanguage(language: string, fallbackLanguage = this.getSystemLanguage()): string {
    const code = language;
    if (this.isSupportedLanguage(code)) {
      return code;
    }
    const fallback = fallbackLanguage;
    return this.isSupportedLanguage(fallback) ? fallback : 'en';
  }

  public getSystemLanguage(): string {
    const code = this.appService.getConfig()?.appSettings?.language_allowed;
    return this.isSupportedLanguage(code) ? code : 'en';
  }

  public isSupportedLanguage(language: string): boolean {
    const code = language;
    return LANGUAGE_OPTIONS.some(option => option.code === code);
  }
}
