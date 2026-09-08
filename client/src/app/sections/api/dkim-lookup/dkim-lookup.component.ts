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
  queryTriggered: boolean = false;
  result: any = null;
  errorMessage: string = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {}

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
