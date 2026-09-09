import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { EmptyQueryComponent } from '../../../shared/partials/empty-query/empty-query.component';
import { ValuePresentationBase } from '../../../shared/utils/value-presentation.base';
import { ChatWidgetComponent } from '../../root-searches/ai-workspace/chat-widget/chat-widget.component';
import { AppService } from '../../../services/core/app/app.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AiToolRoutingService } from '../../../shared/services/ai-tool-routing.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { TextAnalysisResult } from './model/text-analysis.model';


@Component({
  selector: 'app-text-analysis',
  standalone: true,
  imports: [FormsModule, NgClass, EmptyQueryComponent, ChatWidgetComponent, TranslatePipe],
  styleUrls: ['./text-analysis.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './text-analysis.component.html'
})
export class TextAnalysisComponent extends ValuePresentationBase implements OnInit {
  private readonly translationService = inject(TranslationService);

  text = '';
  submittedText = '';
  loading = false;
  queryTriggered = false;
  expanded = true;
  result: TextAnalysisResult | null = null;
  errorMessage = '';
  trackByIndex = (index: number) => index;

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router, protected appService: AppService, private aiToolRoutingService: AiToolRoutingService) {
    super();
  }

  get aiToolType(): string {
    return this.aiToolRoutingService.getTypeForApiType('text-analysis');
  }

  get aiWelcomeMessage(): string {
    return this.aiToolRoutingService.getMessageForApiType('text-analysis');
  }

  ngOnInit(): void {
    const queryText = this.route.snapshot.queryParamMap.get('q')?.trim();
    if (queryText) {
      this.text = queryText;
      this.analyzeText(null);
    }
  }

  get hasResult(): boolean {
    return !!this.result;
  }

  get resultEntries(): { key: string; value: unknown }[] {
    if (!this.result) {
      return [];
    }
    const summary = {
      status: this.result.status,
      text_length: this.result.text_length,
      truncated: this.result.truncated,
      urls_found: this.result.urls_found,
      spam_confidence: this.result.spam?.confidence,
      verdict_safe: this.result.verdict?.safe,
      threats: this.result.verdict?.threats,
      unsafe_urls: this.unsafeUrlCount
    };
    return this.getFlattenedObjectEntries(summary).filter(entry => !this.isEmptyDisplayValue(entry.value));
  }

  get primaryDetectionLabel(): string {
    if (!this.result) {
      return 'No analysis';
    }
    const spamDetected = this.result.spam?.is_spam === true;
    const phishingDetected = this.isPhishingDetected;
    if (spamDetected && phishingDetected) {
      return 'Spam and phishing detected';
    }
    if (phishingDetected) {
      return 'Phishing detected';
    }
    if (spamDetected) {
      return 'Spam detected';
    }
    if (this.result.verdict?.safe === false) {
      return 'Threat detected';
    }
    return 'No spam or phishing detected';
  }

  get detectionTypeLabel(): string {
    if (!this.result) {
      return 'not available';
    }
    const labels: string[] = [];
    if (this.result.spam?.is_spam === true) {
      labels.push('Spam');
    }
    if (this.isPhishingDetected) {
      labels.push('Phishing');
    }
    if (labels.length > 0) {
      return labels.join(' + ');
    }
    return this.result.verdict?.safe === false ? 'Threat' : 'Clean';
  }

  get primaryDetectionClass(): Record<string, boolean> {
    const detected = this.isThreatDetected;
    return {
      'border-rose-400/35 bg-rose-500/10 text-rose-100 [body.light-theme_&]:border-rose-200 [body.light-theme_&]:bg-rose-50 [body.light-theme_&]:text-rose-800': detected,
      'border-emerald-400/30 bg-emerald-500/10 text-emerald-100 [body.light-theme_&]:border-emerald-200 [body.light-theme_&]:bg-emerald-50 [body.light-theme_&]:text-emerald-800': !detected
    };
  }

  get isThreatDetected(): boolean {
    return this.result?.spam?.is_spam === true || this.isPhishingDetected || this.result?.verdict?.safe === false;
  }

  get spamLabel(): string {
    return this.result?.spam?.label ?? 'not available';
  }

  get spamConfidenceLabel(): string {
    const confidence = this.result?.spam?.confidence;
    if (confidence === undefined || confidence === null) {
      return 'not available';
    }
    return String(confidence);
  }

  get riskLabel(): string {
    if (!this.result) {
      return 'not available';
    }
    if (this.result.verdict?.safe === false) {
      return 'Threat detected';
    }
    return 'Safe';
  }

  get urlResults(): NonNullable<TextAnalysisResult['url_results']> {
    return Array.isArray(this.result?.url_results) ? this.result.url_results : [];
  }

  get unsafeUrlCount(): number {
    return this.urlResults.filter(item => item.is_safe === false).length;
  }

  get isPhishingDetected(): boolean {
    if (!this.result) {
      return false;
    }
    const spamLabel = this.result.spam?.label?.toLowerCase() ?? '';
    const threats = Array.isArray(this.result.verdict?.threats) ? this.result.verdict.threats : [];
    return this.unsafeUrlCount > 0 || spamLabel.includes('phish') || threats.some(threat => threat.toLowerCase().includes('phish'));
  }

  analyzeText(event: SubmitEvent | null): void {
    if (event) {
      event.preventDefault();
    }
    const value = this.text.trim();
    if (!value) {
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: value },
      queryParamsHandling: 'merge',
      replaceUrl: true
    }).then();
    this.loading = true;
    this.queryTriggered = true;
    this.result = null;
    this.errorMessage = '';
    this.expanded = true;
    const payload = { text: value, job_id: Date.now().toString() };
    this.http.post<unknown>('/api/nexus/analyze-text', payload)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: res => {
          this.submittedText = value;
          this.result = this.normalizeResult(res);
        },
        error: err => {
          this.errorMessage = err?.error?.detail ?? err?.message ?? this.translationService.translate('Text analysis failed.');
        }
      });
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  private normalizeResult(res: unknown): TextAnalysisResult {
    const record: Partial<TextAnalysisResult> = (res && typeof res === 'object')
      ? res
      : { status: 'unknown' };
    return {
      ...record,
      title: this.buildTitle(record)
    };
  }

  private buildTitle(record: Partial<TextAnalysisResult>): string {
    const urlResults = Array.isArray(record.url_results) ? record.url_results : [];
    const hasUnsafeUrl = urlResults.some(item => item.is_safe === false);
    const spamLabel = record.spam?.label?.toLowerCase() ?? '';
    const threats = Array.isArray(record.verdict?.threats) ? record.verdict.threats : [];
    const hasPhishingSignal = hasUnsafeUrl || spamLabel.includes('phish') || threats.some(threat => threat.toLowerCase().includes('phish'));
    if (record.spam?.is_spam === true && hasPhishingSignal) {
      return 'Spam and phishing detected';
    }
    if (hasPhishingSignal) {
      return 'Phishing detected';
    }
    if (record.spam?.is_spam === true) {
      return 'Spam detected';
    }
    if (record.verdict?.safe === false) {
      return 'Threat detected';
    }
    return 'No spam or phishing detected';
  }
}
