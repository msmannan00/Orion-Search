import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MessageNotificationService } from '../../../services/message_notification/message-notification.service';
import { TooltipDirective } from '../../directive/tooltip-directive.directive';
import { IocCategory } from '../../model/tenant/tenant.model';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ConfirmationPopupComponent } from '../confirmation-popup/confirmation-popup.component';
import { getFirstFileFromInputEvent, readFileAsText } from '../../utils/file-input.util';
import { downloadIocCsvTemplate, IOC_CSV_MAX_FILE_SIZE_BYTES, isCsvFile, mergeIocCsvValues, parseIocCsv } from '../../utils/ioc-csv.util';

@Component({
  selector: 'app-tenant-ioc-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipDirective, ConfirmationPopupComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './tenant-ioc-selector.component.html',
})
export class TenantIocSelectorComponent implements OnChanges {
  @ViewChild('categoryScroll', { static: false }) categoryScroll!: ElementRef;
  selectedCategoryId = '';
  isConfirmationOpen = false;
  iocSearchText = '';
  isIocCsvUploading = false;

  @Input() iocs: IocCategory[] = [];
  @Input() disabled = false;
  @Input() permissionWarning = "You don't have permission to manage IOCs outside your domain. Ask your network administrator.";

  @Output() iocsChanged = new EventEmitter<IocCategory[]>();

  constructor(private messageNotificationService: MessageNotificationService) {
  }

  ngOnChanges(): void {
    this.ensureSelectedCategory();
  }

  getFilteredIocs(): IocCategory[] {
    const search = this.iocSearchText.trim().toLowerCase();
    if (!search) {
      return this.iocs || [];
    }
    return (this.iocs || []).filter(ioc => ioc.name.toLowerCase().includes(search));
  }

  onCategoryClick(categoryId: string): void {
    this.selectedCategoryId = categoryId;
  }

  addIoc(value: string): void {
    if (this.disabled) {
      this.messageNotificationService.show(this.permissionWarning);
      return;
    }
    const normalized = value.trim();
    if (!normalized || !this.selectedCategoryId) {
      return;
    }
    const category = this.iocs.find(c => c.ioc_id === this.selectedCategoryId);
    if (category && !category.values.includes(normalized)) {
      category.values.push(normalized);
      this.iocsChanged.emit(this.iocs);
    }
  }

  onIocCsvSelected(event: Event): void {
    if (this.disabled) {
      this.messageNotificationService.show(this.permissionWarning);
      return;
    }
    const selectedFile = getFirstFileFromInputEvent(event);
    if (!selectedFile) {
      return;
    }

    selectedFile.input.value = '';

    if (!isCsvFile(selectedFile.file)) {
      this.messageNotificationService.show('Only CSV files are allowed.');
      return;
    }

    if (selectedFile.file.size > IOC_CSV_MAX_FILE_SIZE_BYTES) {
      this.messageNotificationService.show('IOC CSV file size must be 1 MB or less.');
      return;
    }

    this.isIocCsvUploading = true;
    void readFileAsText(selectedFile.file)
      .then((content) => {
        try {
          const parsedCsv = parseIocCsv(content);
          const addedCount = mergeIocCsvValues(this.iocs, parsedCsv);
          if (addedCount === 0) {
            this.messageNotificationService.show('No new IOC values found in the uploaded file.');
            this.isIocCsvUploading = false;
            return;
          }

          this.ensureSelectedCategory();
          this.iocsChanged.emit(this.iocs);
          this.messageNotificationService.show(`${addedCount} IOC value${addedCount === 1 ? '' : 's'} imported.`, 'success');
        }
        catch(error) {
          this.messageNotificationService.show(error instanceof Error ? error.message : 'Failed to import IOC CSV file.');
          this.isIocCsvUploading = false;
        }
      })
      .finally(() => {
        this.isIocCsvUploading = false;
      });
  }

  downloadIocTemplate(): void {
    downloadIocCsvTemplate();
  }

  removeIoc(iocId: string, value: string): void {
    if (this.disabled) {
      this.messageNotificationService.show(this.permissionWarning);
      return;
    }
    const ioc = this.iocs.find(item => item.ioc_id === iocId);
    if (ioc) {
      ioc.values = ioc.values.filter(item => item !== value);
      this.iocsChanged.emit(this.iocs);
    }
  }

  scrollLeft(): void {
    this.categoryScroll?.nativeElement?.scrollBy({ left: -250, behavior: 'smooth' });
  }

  scrollRight(): void {
    this.categoryScroll?.nativeElement?.scrollBy({ left: 250, behavior: 'smooth' });
  }

  hasIocsWithValues(): boolean {
    return this.iocs?.some(ioc => ioc.values.length > 0) ?? false;
  }

  clearAllIocs(value: boolean): void {
    if (this.disabled) {
      this.isConfirmationOpen = false;
      this.messageNotificationService.show(this.permissionWarning);
      return;
    }
    if (value) {
      this.iocs.forEach(ioc => {
        ioc.values = [];
      });
      this.iocsChanged.emit(this.iocs);
    }
    this.isConfirmationOpen = false;
  }

  openConfirmationPopup(): void {
    if (this.disabled) {
      this.messageNotificationService.show(this.permissionWarning);
      return;
    }
    this.isConfirmationOpen = true;
  }

  private ensureSelectedCategory(): void {
    if (!this.selectedCategoryId || !this.iocs?.some(ioc => ioc.ioc_id === this.selectedCategoryId)) {
      this.selectedCategoryId = this.iocs?.[0]?.ioc_id || '';
    }
  }
}
