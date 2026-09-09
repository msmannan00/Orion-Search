import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass, NgOptimizedImage } from '@angular/common';
import { DefacementModel, GenericModel, InsightCallbackModel, InsightMetric, LeakModel } from '../model/stats_insight.model';
import { TooltipDirective } from '../../../shared/directive/tooltip-directive.directive';
import { LatestDocument, LatestDocumentCallbackModel } from '../model/document_insight.model';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { InsightCacheService } from '../services/insight-cache.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { asUnknownRecord, getOwnProperty } from '../../../shared/utils/type-guards.util';

@Component({
  selector: 'app-home-insight',
  templateUrl: './home-insight.component.html',
  imports: [NgOptimizedImage, NgClass, TooltipDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
})
export class HomeInsightComponent implements OnInit {
  private readonly statIconAliases: Record<string, string> = { actor_coverage: 'top_team', countries_tagged: 'unique_base_urls', indexed_urls: 'url_document_count', known_domains: 'unique_base_urls', languages_tagged: 'common_types', organizations_tagged: 'top_team', top_actor: 'top_team', victim_records: 'document_count' };

  protected readonly String = String;

  insights: InsightCallbackModel = { general: {} as GenericModel, leak: {} as LeakModel, defacement: {} as DefacementModel };
  latestDocuments: LatestDocumentCallbackModel = { generic_model: [], leak_model: [], defacement_model: [], chat_model: [], exploit_model: [] };
  models: ("general" | "leak" | "defacement")[] = ["general", "leak", "defacement"];
  latestDocumentModelKeys: string[] = [];
  isLoading = true;
  readonly loadingCards = [1, 2, 3, 4];

  constructor(private router: Router, private route: ActivatedRoute, protected licenseService: LicenseService, private insightCacheService: InsightCacheService) {
  }

  ngOnInit() {
    const data = this.route.snapshot.data.insights;
    if (data) {
      this.applyInsightData(data);
      return;
    }
    this.insightCacheService.getInsight().subscribe(data => {
      this.applyInsightData(data);
    });
  }

  private applyInsightData(data: unknown): void {
    const response = asUnknownRecord(data);
    this.insights = {
      general: {} as GenericModel,
      leak: {} as LeakModel,
      defacement: {} as DefacementModel,
      ...asUnknownRecord(response.insights),
    };
    const latestDocuments = asUnknownRecord(response.latestDocument);
    this.latestDocuments = {
      generic_model: [],
      leak_model: [],
      defacement_model: [],
      chat_model: [],
      exploit_model: [],
      ...latestDocuments,
    };
    this.latestDocumentModelKeys = Object.keys(this.latestDocuments).filter(key => ['leak_model', 'chat_model', 'defacement_model'].includes(key) &&
            getOwnProperty(this.latestDocuments, key) &&
            getOwnProperty(this.latestDocuments, key).length > 0);
    this.isLoading = false;
  }

  getKeys(obj: GenericModel | LeakModel | DefacementModel): string[] {
    return obj ? Object.keys(obj) : [];
  }

  getStatIcon(key: string, metric?: InsightMetric): string {
    const labelKey = (metric?.key ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return getOwnProperty(this.statIconAliases, labelKey) ?? key;
  }

  formatModelKey(key: string): string {
    return key
      .replace('_model', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getResultItems(modelKey: string): LatestDocument[] {
    const model = this.latestDocuments[modelKey as keyof LatestDocumentCallbackModel];
    return Array.isArray(model) ? model.slice(0, 4) : [];
  }

  openReport(modelKey: string, hash: string, title: string) {
    const route = this.getModelRoute(modelKey, hash, title);
    this.router.navigateByUrl(route).then();
  }

  getModelRoute(modelKey: string, hash: string, title: string): string {
    let model = this.formatModelKey(modelKey).toLowerCase();
    if (model === 'generic') {
      model = 'general';
    }
    const base = this.router.url.split('?')[0];
    const segments = base.split('/');
    segments.pop();
    const newBase = segments.join('/');
    return `${newBase}/consolidated/${model}/${hash}?ci=${model}&q=${title}`;
  }
}
