import { NgClass } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, timer } from 'rxjs';
import { expand, finalize, switchMap, takeWhile } from 'rxjs/operators';
import { EmptyQueryComponent } from '../../../shared/partials/empty-query/empty-query.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiService } from '../../../shared/services/api.service';
import type { PhoneLookupResponse, PhoneLookupResult } from './model/phone-lookup.model';
export type { PhoneLookupResponse,PhoneLookupResult } from './model/phone-lookup.model';






@Component({
  selector: 'app-phone-lookup',
  standalone: true,
  imports: [FormsModule, NgClass, TranslatePipe, EmptyQueryComponent],
  styleUrls: ['./phone-lookup.component.css'],
  templateUrl: './phone-lookup.component.html'
})
export class PhoneLookupComponent implements OnInit {
  query = '';
  loading = false;
  queryTriggered = false;
  errorMessage = '';
  result: PhoneLookupResult | null = null;
  progress = 0;
  currentStep = '';

  get progressValue(): number {
    const progress = Number(this.progress);
    return Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
  }

  get hasEntityIdentification(): boolean {
    return [
      this.result?.name,
      this.result?.formatted_address,
      this.result?.rating,
      this.result?.website,
      this.result?.phone_numbers?.length
    ].some(Boolean);
  }

  get hasKnowledgeGraph(): boolean {
    const knowledgeGraph = this.result?.knowledge_graph;
    return knowledgeGraph && typeof knowledgeGraph === 'object'
      ? Object.keys(knowledgeGraph).length > 0
      : !!knowledgeGraph;
  }

  get hasOpenSourceFootprints(): boolean {
    return [
      this.hasKnowledgeGraph,
      this.result?.emails?.length,
      this.result?.web_footprints?.length
    ].some(Boolean);
  }

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q')?.trim();
    if (q) {
      this.query = q;
      this.analyzeText(null);
    }
  }

  analyzeText(event: Event | null): void {
    if (event) {
      event.preventDefault();
    }
    const value = this.query.trim();
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
    this.progress = 5;
    this.currentStep = 'Initializing scan...';

    const payload = { text: { query: value } };
    const scanReq = () => this.api.post<PhoneLookupResponse>('phone/universal_search', payload);

    scanReq().pipe(expand(res => (res?.status === 'pending' || res?.status === 'processing' ? timer(3000).pipe(switchMap(() => scanReq())) : EMPTY)), takeWhile(res => res?.status === 'pending' || res?.status === 'processing', true), finalize(() => {
      this.loading = false;
    })).subscribe({
      next: res => {
        this.handleScanResponse(res);
      },
      error: err => {
        this.errorMessage = err?.error?.detail ?? err?.message ?? 'OSINT Analysis failed.';
      }
    });
  }

  private handleScanResponse(res: PhoneLookupResponse): void {
    if (res.status === 'pending' || res.status === 'processing') {
      this.progress = res.progress ?? 10;
      this.currentStep = res.step?.replace(/_/g, ' ') ?? 'Extracting Intelligence...';
      return;
    }

    this.loading = false;
    if (res.status === 'error') {
      this.errorMessage = res.message ?? res.error_message ?? 'Scan failed to retrieve data.';
      return;
    }

    this.progress = 100;
    this.result = res.result ?? res;
  }
}
