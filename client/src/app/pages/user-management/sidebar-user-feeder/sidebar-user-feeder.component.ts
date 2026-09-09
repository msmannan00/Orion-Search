import { NgClass } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { FeederRuleOption, FeederScriptItem } from './model/feeder.model';
import { FeederService } from './feeder.service';
import { SidebarUserFeederAddComponent } from './add/sidebar-user-feeder-add.component';
import { SidebarUserFeederViewComponent } from './view/sidebar-user-feeder-view.component';
import { supportsFileUploadForRuleType, supportsValueUploadForRuleType } from './feeder-rule.utils';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { UiDropdownComponent, UiDropdownOption } from '../../../shared/partials/ui-dropdown/ui-dropdown.component';
import { VERIFIED_SOCIAL_PLATFORM_KEYS } from '../../social-cti/constants/social-platform.constants';

@Component({
  selector: 'app-sidebar-user-feeder',
  standalone: true,
  imports: [NgClass, SidebarUserFeederAddComponent, SidebarUserFeederViewComponent, TranslatePipe, UiDropdownComponent],
  templateUrl: './sidebar-user-feeder.component.html',
  styleUrls: ['./sidebar-user-feeder.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SidebarUserFeederComponent implements OnInit {
  private readonly socialRuleGroupKey = '__social_media__';
  private readonly supportedSocialRuleKeys = new Set<string>(VERIFIED_SOCIAL_PLATFORM_KEYS);

  activeTab: 'add' | 'view' | 'values' = 'add';
  highlightedScript: FeederScriptItem | null = null;
  rules: FeederRuleOption[] = [];
  selectedRuleKey = '';
  selectedSocialRuleKey = '';
  isCatalogLoading = true;
  formError = '';

  constructor(private feederService: FeederService, private route: ActivatedRoute, private router: Router, private translationService: TranslationService) {}

  ngOnInit(): void {
    this.selectedRuleKey = this.route.snapshot.queryParamMap.get('rule') ?? '';
    this.loadCatalog();
  }

  get selectedRule(): FeederRuleOption | undefined {
    return this.rules.find((rule) => rule.key === this.effectiveSelectedRuleKey);
  }

  get selectedRuleType(): string {
    return this.selectedRule?.rule_type ?? '';
  }

  get isSocialRuleSelected(): boolean {
    return this.selectedRuleKey === this.socialRuleGroupKey;
  }

  get effectiveSelectedRuleKey(): string {
    return this.isSocialRuleSelected ? (this.selectedSocialRuleKey || this.socialRules[0]?.key || '') : this.selectedRuleKey;
  }

  get socialRules(): FeederRuleOption[] {
    return this.rules.filter(rule => this.isSupportedSocialRule(rule));
  }

  get ruleDropdownOptions(): UiDropdownOption[] {
    this.translationService.version();
    const options = this.rules.filter(rule => !this.isSocialRule(rule)).map(rule => ({
      key: rule.key,
      label: this.getRuleLabel(rule.key),
    }));
    if (this.socialRules.length) {
      options.push({ key: this.socialRuleGroupKey, label: this.translationService.translate('Social Media') });
    }
    return options;
  }

  get socialRuleDropdownOptions(): UiDropdownOption[] {
    this.translationService.version();
    return this.socialRules.map(rule => ({
      key: rule.key,
      label: this.getRuleLabel(rule.key),
    }));
  }

  hasScriptTab(): boolean {
    return supportsFileUploadForRuleType(this.selectedRuleType);
  }

  hasValuesTab(): boolean {
    return supportsValueUploadForRuleType(this.selectedRuleType);
  }

  setActiveTab(tab: 'add' | 'view' | 'values'): void {
    this.highlightedScript = null;
    this.activeTab = tab;
  }

  onScriptUploaded(script: FeederScriptItem): void {
    this.highlightedScript = script;
    this.activeTab = 'view';
    this.loadCatalog();
  }

  onRuleChange(): void {
    this.highlightedScript = null;
    this.ensureValidActiveTab();
    this.syncRuleQueryParam();
  }

  onRuleSelect(ruleKey: string | null): void {
    if (!ruleKey || this.selectedRuleKey === ruleKey) {
      return;
    }
    if (ruleKey === this.socialRuleGroupKey) {
      this.selectedRuleKey = ruleKey;
      this.selectedSocialRuleKey = this.selectedSocialRuleKey || this.socialRules[0]?.key || '';
      this.activeTab = this.hasScriptTab() ? 'view' : this.hasValuesTab() ? 'values' : 'add';
      this.onRuleChange();
      return;
    }
    this.selectedRuleKey = ruleKey;
    this.selectedSocialRuleKey = '';
    this.onRuleChange();
  }

  onSocialRuleSelect(ruleKey: string | null): void {
    if (!ruleKey || this.selectedSocialRuleKey === ruleKey) {
      return;
    }
    this.highlightedScript = null;
    this.selectedSocialRuleKey = ruleKey;
    this.ensureValidActiveTab();
    this.syncRuleQueryParam();
  }

  getRuleLabel(ruleKey: string): string {
    return this.translationService.translate(this.humanizeKey(ruleKey));
  }

  private loadCatalog(): void {
    this.isCatalogLoading = true;
    this.feederService.getCatalog()
      .pipe(finalize(() => {
        this.isCatalogLoading = false;
      }))
      .subscribe({
        next: (response) => {
          this.rules = response?.rules ?? [];
          this.syncSocialRuleSelectionFromSelectedRule();
          if (!this.selectedRuleKey && this.rules.length > 0) {
            this.selectedRuleKey = this.rules.find(rule => !this.isSocialRule(rule))?.key ?? this.socialRuleGroupKey;
          }
          if (this.selectedRuleKey && this.selectedRuleKey !== this.socialRuleGroupKey && !this.rules.some((rule) => rule.key === this.selectedRuleKey)) {
            this.selectedRuleKey = this.rules.find(rule => !this.isSocialRule(rule))?.key ?? '';
          }
          this.ensureSocialRuleSelection();
          this.ensureValidActiveTab();
          this.syncRuleQueryParam();
          this.formError = '';
        },
        error: (error) => {
          this.formError = error?.error?.detail ?? this.translationService.translate('Failed to load feeder categories');
        }
      });
  }

  private humanizeKey(value: string): string {
    return value
      .replace(/_collector$/g, '')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  private ensureValidActiveTab(): void {
    if (!this.hasScriptTab() && this.activeTab === 'view') {
      this.activeTab = this.hasValuesTab() ? 'values' : 'add';
      return;
    }
    if (!this.hasValuesTab() && this.activeTab === 'values') {
      this.activeTab = 'view';
    }
  }

  private syncRuleQueryParam(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { rule: this.effectiveSelectedRuleKey || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private isSocialRule(rule: FeederRuleOption): boolean {
    return (rule.path ?? '').toLowerCase() === 'social/platform';
  }

  private isSupportedSocialRule(rule: FeederRuleOption): boolean {
    return this.isSocialRule(rule) && this.supportedSocialRuleKeys.has((rule.key || '').toLowerCase());
  }

  private syncSocialRuleSelectionFromSelectedRule(): void {
    const selectedSocialRule = this.rules.find(rule => rule.key === this.selectedRuleKey && this.isSocialRule(rule));
    if (!selectedSocialRule) {
      return;
    }
    this.selectedSocialRuleKey = this.isSupportedSocialRule(selectedSocialRule) ? selectedSocialRule.key : (this.socialRules[0]?.key || '');
    this.selectedRuleKey = this.socialRuleGroupKey;
  }

  private ensureSocialRuleSelection(): void {
    if (!this.isSocialRuleSelected) {
      return;
    }
    if (!this.socialRules.length) {
      this.selectedRuleKey = this.rules.find(rule => !this.isSocialRule(rule))?.key ?? '';
      this.selectedSocialRuleKey = '';
      return;
    }
    if (!this.socialRules.some(rule => rule.key === this.selectedSocialRuleKey)) {
      this.selectedSocialRuleKey = this.socialRules[0].key;
    }
  }
}
