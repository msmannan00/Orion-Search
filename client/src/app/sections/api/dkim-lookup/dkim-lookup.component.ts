import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-dkim-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dkim-lookup.component.html'
})
export class DkimLookupComponent implements OnInit {
  domain: string = '';
  selector: string = '';
  loading: boolean = false;
  discovering: boolean = false;
  queryTriggered: boolean = false;
  result: any = null;
  errorMessage: string = '';
  discoveredSelectors: string[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {}

  discoverSelectors(): void {
    if (!this.domain.trim()) {
      this.errorMessage = "Please enter a Domain to find selectors.";
      return;
    }

    this.discovering = true;
    this.errorMessage = '';
    this.discoveredSelectors = [];
    this.result = null;

    const payload = {
      text: {
        domain: this.domain.trim(),
        selector: ''
      }
    };

    this.api.post('/api/phone/dkim_check', payload).subscribe({
      next: (res: any) => {
        this.discovering = false;
        const data = res?.result ?? res;

        if (data && data.status === 'success' && data.selectors) {
          this.discoveredSelectors = data.selectors;
          if (this.discoveredSelectors.length === 0) {
            this.errorMessage = "No historical selectors found for this domain.";
          }
        }
        else {
          this.errorMessage = data?.error_message ?? 'Failed to discover selectors.';
        }
      },
      error: (err: any) => {
        this.discovering = false;
        this.errorMessage = err.error?.detail ?? 'An error occurred while finding selectors.';
      }
    });
  }

  selectSelector(sel: string) {
    this.selector = sel;
  }

  analyzeText(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    if (!this.domain.trim() || !this.selector.trim()) {
      this.errorMessage = "Please enter both Domain and Selector.";
      return;
    }

    this.loading = true;
    this.queryTriggered = true;
    this.result = null;
    this.errorMessage = '';

    const payload = {
      text: {
        domain: this.domain.trim(),
        selector: this.selector.trim()
      }
    };

    this.api.post('/api/phone/dkim_check', payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res && res.result && res.result.status === 'success') {
          this.result = res.result;
        }
        else if (res && res.status === 'success') {
          this.result = res;
        }
        else {
          this.errorMessage = res?.result?.error_message ?? res?.error_message ?? 'No valid DKIM record found.';
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.detail ?? 'An error occurred while fetching DKIM record.';
      }
    });
  }
}
