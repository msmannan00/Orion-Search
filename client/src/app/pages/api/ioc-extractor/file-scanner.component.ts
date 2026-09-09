import { CommonModule, NgClass, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxPrintModule } from 'ngx-print';
import { EMPTY, timer } from 'rxjs';
import { expand, finalize, switchMap, takeWhile } from 'rxjs/operators';
import { TooltipDirective } from '../../../shared/directive/tooltip-directive.directive';
import { FILE_SCAN_EXPORT_OPTIONS } from '../../../shared/model/report/export-choice.model';
import { GraphReportPayload } from '../../../shared/model/report/report-export.model';
import { ExportChoiceModalComponent } from '../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiService } from '../../../shared/services/api.service';
import { ExportBrandingService } from '../../../shared/services/export/export-branding.service';
import { ReportExportService } from '../../../shared/services/report-export.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { asUnknownRecord, getOwnProperty } from '../../../shared/utils/type-guards.util';
import { APK_SCAN_ENDPOINT, IOC_EXTRACT_ENDPOINT, MAX_FILE_SIZE_APK } from './file-scanner.constants';
import type { FileScanResponse } from './model/file-scanner.model';
import { ScannerResultItem } from './model/file-scanner.model';
import { ScannerResultSection } from './model/file-scanner.model';
export type { FileScanResponse } from './model/file-scanner.model';




@Component({
  selector: 'app-ioc-extractor',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    NgxPrintModule,
    NgOptimizedImage,
    TooltipDirective,
    FormsModule, TranslatePipe, ExportChoiceModalComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './file-scanner.component.html'
})
export class FileScannerComponent {
  private readonly translationService = inject(TranslationService);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  type = 'filescan';
  title = 'File Analysis';
  description = 'Upload a file to extract Indicators of Compromise (IOCs) or analyze APK';
  selectedFile: File | null = null;
  fileName = '';
  fileSize = '';
  isLoading = false;
  isFetched = false;
  hasError = false;
  errorMessage = '';
  isFileSizeError = false;
  scanResult: Record<string, unknown> | null = null;
  resultSections: ScannerResultSection[] = [];
  progress = signal(0);
  currentStep = '';
  copiedValue = signal<string | null>(null);
  isExportChoiceOpen = false;
  readonly reportExportOptions = FILE_SCAN_EXPORT_OPTIONS;

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router, private exportBranding: ExportBrandingService, private reportExportService: ReportExportService) {
    this.route.data.subscribe(data => {
      this.type = data.type ?? this.type;
      this.title = data.title ?? this.title;
      this.description = data.description ?? this.description;
    });
  }

  onFileSelected(event: Event): void {
    const inputElement = event.target;
    if (!(inputElement instanceof HTMLInputElement)) {
      return;
    }
    if (inputElement.files?.[0]) {
      this.handleFileSelect(inputElement.files[0]);
    }
  }

  handleFileSelect(file: File): void {
    this.hasError = false;
    this.errorMessage = '';
    this.isFileSizeError = false;

    if (file.size > MAX_FILE_SIZE_APK) {
      this.hasError = true;
      this.isFileSizeError = true;
      this.errorMessage = `${this.translate('File size exceeds 30MB.')} ${this.translate('Your file is')} ${this.formatFileSize(file.size)}.`;
      this.resetFileInput();
      this.isFetched = true;
      return;
    }

    this.selectedFile = file;
    this.fileName = file.name;
    this.fileSize = this.formatFileSize(file.size);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { file: encodeURIComponent(file.name) },
      queryParamsHandling: 'merge'
    }).catch(() => void 0);
    this.scanFile(this.type === 'apk');
  }

  private scanFile(isApk: boolean): void {
    if (!this.selectedFile) {
      this.hasError = true;
      this.errorMessage = this.translate('Please select a file to upload.');
      this.isFetched = true;
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    const endpoint = isApk ? APK_SCAN_ENDPOINT : IOC_EXTRACT_ENDPOINT;
    this.resetResultState();
    this.isLoading = true;
    this.currentStep = isApk ? 'Analyzing APK...' : 'Uploading file...';

    const upload = () => this.api.post<FileScanResponse>(endpoint, formData);
    upload()
      .pipe(expand(res => (res?.status === 'pending' || res?.status === 'processing')
        ? timer(3000).pipe(switchMap(() => upload()))
        : EMPTY), takeWhile(res => res?.status === 'pending' || res?.status === 'processing', true), finalize(() => this.isLoading = false))
      .subscribe({
        next: res => {
          this.handleScanResponse(res);
        },
        error: err => {
          this.isFetched = true;
          this.hasError = true;
          this.handleError(err);
        }
      });
  }

  private handleScanResponse(res: FileScanResponse): void {
    const nested = asUnknownRecord(res.result);
    if (res.status === 'pending' || res.status === 'processing') {
      const p = res.progress ?? nested.progress;
      if (typeof p === 'number' && Number.isFinite(p)) {
        this.progress.set(Math.max(0, Math.min(100, Math.round(p))));
      }
      const step = res.step ?? nested.step;
      if (typeof step === 'string' && step) {
        this.currentStep = step;
      }
      return;
    }

    this.isFetched = true;
    this.progress.set(100);
    if (res.result == null) {
      this.hasError = true;
      this.errorMessage = this.translate('No valid result received from server.');
      return;
    }
    this.applyServerResult(res.result);
  }

  private applyServerResult(result: unknown): void {
    const record = this.toRecord(result);
    this.scanResult = record ?? { value: result };
    this.resultSections = this.buildResultSections(result);
  }

  private resetResultState(): void {
    this.isFetched = false;
    this.hasError = false;
    this.errorMessage = '';
    this.isFileSizeError = false;
    this.scanResult = null;
    this.resultSections = [];
    this.progress.set(0);
    this.currentStep = '';
  }

  private buildResultSections(result: unknown): ScannerResultSection[] {
    const record = this.toRecord(result);
    if (!record) {
      return this.isVisible(result)
        ? [{ title: 'Result', items: [{ label: 'Value', value: this.stringifyValue(result) }] }]
        : [];
    }

    return Object.entries(record)
      .filter(([key, value]) => key !== 'type' && this.isVisible(value))
      .map(([key, value]) => ({
        title: this.formatLabelKey(key),
        items: this.flattenValue(value)
      }))
      .filter(section => section.items.length > 0);
  }

  private flattenValue(value: unknown, path: string[] = []): ScannerResultItem[] {
    if (!this.isVisible(value)) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.flatMap((item, index) => this.flattenValue(item, path.length ? path : [`Item ${index + 1}`]));
    }

    const record = this.toRecord(value);
    if (!record) {
      return [{
        label: this.formatLabelKey(path[path.length - 1] || 'Value'),
        value: this.stringifyValue(value)
      }];
    }

    return Object.entries(record)
      .flatMap(([key, child]) => this.flattenValue(child, [...path, key]))
      .filter((item, index, items) => index === items.findIndex(match => match.label === item.label && match.value === item.value));
  }

  openExportChoice(): void {
    this.exportReport();
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen = false;
  }

  selectExport(type: string): void {
    if (type === 'json') {
      this.exportReport();
    }
    else if (type === 'csv' || type === 'report') {
      this.exportStructuredReport(type);
    }
    this.closeExportChoice();
  }

  private exportReport(): void {
    if (!this.scanResult) {
      return;
    }
    const exportData = this.exportBranding.addTenantJsonMetadata({
      ...this.scanResult,
      exported_at: new Date().toISOString()
    });
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const filenameBase = (this.getDisplayFileName() || 'report').replace(/[^a-z0-9.-]/gi, '_');
    const mode = this.getDisplayFileType().toLowerCase() || 'file';
    const dt = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = URL.createObjectURL(blob);
    a.download = `${filenameBase}-${mode}-report-${dt}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  private exportStructuredReport(type: 'csv' | 'report'): void {
    if (!this.scanResult) {
      return;
    }
    const payload: GraphReportPayload = {
      graphKind: 'cti',
      title: `${this.title || 'File Scan'} Report`,
      sessionName: this.getDisplayFileName() || 'file-scan',
      generatedAtIso: new Date().toISOString(),
      nodes: [],
      edges: [],
      summary: {
        file_name: this.getDisplayFileName() || '-',
        file_type: this.getDisplayFileType() || '-',
        sections: this.resultSections.length,
        fields: this.resultSections.reduce((sum, section) => sum + section.items.length, 0)
      },
      tables: this.resultSections.map(section => ({
        title: section.title,
        values: section.items.reduce<Record<string, string>>((acc, item) => {
          acc[item.label] = item.value;
          return acc;
        }, {})
      }))
    };
    this.reportExportService.exportByType(payload, type === 'csv' ? 'csv' : 'doc_pdf');
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  closeError(): void {
    this.hasError = false;
    this.errorMessage = '';
    this.isFileSizeError = false;
    this.isFetched = false;
  }

  private resetFileInput(): void {
    this.selectedFile = null;
    this.fileName = '';
    this.fileSize = '';
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  private handleError(err: unknown): void {
    const error = asUnknownRecord(err);
    const nestedError = asUnknownRecord(error.error);
    if (error.status === 413) {
      this.errorMessage = this.fileSize
        ? `${this.translate('File size exceeds 30MB.')} ${this.translate('Your file is')} ${this.fileSize}.`
        : this.translate('File size exceeds 30MB.');
      this.isFileSizeError = true;
      return;
    }
    this.errorMessage = String(nestedError.detail ?? error.message ?? this.translate('Upload failed.'));
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${Math.round((bytes / Math.pow(k, index)) * 100) / 100} ${getOwnProperty(sizes, index)}`;
  }

  isLastSectionRow(section: ScannerResultSection, index: number): boolean {
    const count = section.items.length;
    return index === count - 1 || (index === count - 2 && count % 2 === 0);
  }

  getDisplayFileName(): string {
    const metadata = asUnknownRecord(this.scanResult?.metadata);
    const nestedMetadata = asUnknownRecord(metadata.metadata);
    const ioc = asUnknownRecord(this.scanResult?.ioc);
    const antivirus = asUnknownRecord(this.scanResult?.antivirus);
    return this.getFirstString([
      metadata.file_name,
      nestedMetadata.resourceName,
      ioc.filename,
      antivirus.file_name,
      this.scanResult?.original_filename,
      this.fileName
    ]) || 'file';
  }

  getDisplayFileType(): string {
    const ioc = asUnknownRecord(this.scanResult?.ioc);
    return this.getFirstString([
      this.scanResult?.type,
      ioc.file_type
    ]) || 'file';
  }

  getDisplayMetricValue(): string {
    return this.resultSections.reduce((sum, section) => sum + section.items.length, 0).toLocaleString();
  }

  private formatLabelKey(key: string): string {
    return key
      .replace(/^m_/, '')
      .replace(/[:._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Value';
  }

  private stringifyValue(value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (Array.isArray(value)) {
      return value
        .filter(item => this.isVisible(item))
        .map(item => this.stringifyValue(item))
        .join(', ');
    }
    if (this.toRecord(value)) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private getFirstString(values: unknown[]): string {
    const found = values.find(value => this.isVisible(value));
    if (Array.isArray(found)) {
      return this.stringifyValue(found[0]);
    }
    return found == null ? '' : String(found);
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private isVisible(value: unknown): boolean {
    if (value == null) {
      return false;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized !== '' && normalized !== 'null' && normalized !== 'undefined' && normalized !== 'not available';
    }
    if (Array.isArray(value)) {
      return value.some(item => this.isVisible(item));
    }
    const record = this.toRecord(value);
    if (record) {
      return Object.values(record).some(item => this.isVisible(item));
    }
    return true;
  }

  copyValue(value: string): void {
    void navigator.clipboard.writeText(value).then(() => {
      this.copiedValue.set(value);
      setTimeout(() => {
        this.copiedValue.set(null);
      }, 1500);
    });
  }

  private translate(key: string): string {
    return this.translationService.translate(key);
  }
}
