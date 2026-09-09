import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuditLogCallbackModel } from '../model/auditlog.model';
import { ApiService } from '../../../../shared/services/api.service';
import { ListService } from '../../../../shared/directive/base.listing.directive';
@Injectable({ providedIn: 'root' })
export class AuditlogService implements ListService {
  private auditDataSubject = new BehaviorSubject<AuditLogCallbackModel | null>(null);
  private currentPageSubject = new BehaviorSubject<number>(1);
  private lastParams: unknown = { page: 1 };

  auditData$ = this.auditDataSubject.asObservable();
  currentPage$ = this.currentPageSubject.asObservable();

  constructor(private apiService: ApiService) { }

  setCurrentPage(page: number): void {
    if (page > 0) {
      this.currentPageSubject.next(page);
    }
  }

  reload(params?: unknown): void {
    this.lastParams = params ?? this.lastParams;
    this.apiService.post<AuditLogCallbackModel>('audit/logs', params).subscribe(data => {
      this.auditDataSubject.next(data);
    });
  }

  deleteAuditLog(id: string): void {
    this.apiService.delete<{ success: boolean }>(`audit/${id}/delete`).subscribe(() => {
      this.reload(this.lastParams);
    });
  }
}
