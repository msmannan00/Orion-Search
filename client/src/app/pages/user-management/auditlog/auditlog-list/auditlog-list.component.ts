import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { AuditLogCallbackModel } from '../model/auditlog.model';
import { AuditlogService } from '../services/auditlog.service';
import { AppService } from '../../../../services/core/app/app.service';
import { ConfirmationPopupComponent } from '../../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-auditlog-list',
  imports: [AsyncPipe, DatePipe, ConfirmationPopupComponent, TranslatePipe],
  templateUrl: './auditlog-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./auditlog-list.component.css'],
})
export class AuditlogListComponent {
  auditData$: Observable<AuditLogCallbackModel | null>;
  readonly isLoading = input(true);
  isDeleteConfirmationOpen = false;
  selectedDeleteId = '';

  constructor(public auditService: AuditlogService, private appService: AppService) {
    this.auditData$ = this.auditService.auditData$;
  }

  get currentPage$() {
    return this.auditService.currentPage$;
  }

  isAdmin(): boolean {
    return this.appService.userSessionData().user.role === 'admin';
  }

  openDeleteConfirmation(id: string): void {
    this.selectedDeleteId = id;
    this.isDeleteConfirmationOpen = true;
  }

  deleteAuditLog(confirmed: boolean): void {
    this.isDeleteConfirmationOpen = false;
    if (!confirmed || !this.selectedDeleteId) {
      this.selectedDeleteId = '';
      return;
    }
    this.auditService.deleteAuditLog(this.selectedDeleteId);
    this.selectedDeleteId = '';
  }
}
