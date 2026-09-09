import { Component, HostListener, OnInit, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertAllIoc, AlertModel } from '../../../../shared/model/company-profile/node.model';
import { FormsModule } from '@angular/forms';
import { AppService } from '../../../../services/core/app/app.service';
import { ApiService } from '../../../../shared/services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { MessageNotificationService } from '../../../../services/message_notification/message-notification.service';
import { overlayAnimation, popupAnimation } from '../../../../shared/animations/popup.animations';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';
import { LicenseService } from '../../../../services/licenses/licenses.service';
@Component({
  selector: 'app-add-custom-alert',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './add-custom-alert.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [overlayAnimation, popupAnimation],
})
export class AddCustomAlertComponent implements OnInit {
  protected readonly decodeURIComponent = decodeURIComponent;

  iocDropdownOpen = false;
  alert: AlertModel = { type: '', status: 'active', title: '', description: '', url: '', source: '', all_ioc: [], content_types: [], first_seen: new Date(), last_seen: new Date(), ioc_type: '', ioc_value: '' };
  formError = '';
  alertTypes = [ { key: 'general', label: 'General' }, { key: 'breach', label: 'Breach' }, { key: 'exploit', label: 'Exploit' }, { key: 'social', label: 'Social' }, { key: 'defacement', label: 'Defacement' } ];
  readonly heading = input<string>('');
  readonly description = input<string>('');
  readonly edit = input<boolean>(false);
  readonly editAlertData = input<AlertModel | null>(null);
  readonly cancle = output<boolean>();

  constructor(public appService: AppService, public apiService: ApiService, public router: Router, public route: ActivatedRoute, private messageNotificationService: MessageNotificationService, private licenseService: LicenseService, private translationService: TranslationService) { }

  get allowedIocTypes() {
    return this.appService.entities();
  }

  ngOnInit(): void {
    if (this.edit()) {
      const editAlertData = this.editAlertData();
      if (!editAlertData) {
        return;
      }
      this.alert = {
        ...editAlertData,
        all_ioc: editAlertData.all_ioc ?? [],
        ioc_type: editAlertData.ioc_type ??
                      editAlertData.all_ioc?.[0]?.name ??
                      '',
        ioc_value: editAlertData.ioc_value ?? ''
      };
      const existingBucket = this.alert.all_ioc?.[0];
      if (!this.alert.ioc_value && existingBucket?.values?.length) {
        this.alert.ioc_value = existingBucket.values[0];
      }
    }
    else {
      this.route.url
        .pipe(map(segments => segments && segments.length > 0 ? segments[segments.length - 1].path : ''))
        .subscribe(lastSegment => {
          this.alert.type = lastSegment;
        });
    }
    this.alert.all_ioc ??= [];
    this.syncAllIoc();
  }

  onIOCTypeChange(newValue: string) {
    this.alert.ioc_type = newValue;
    this.formError = '';
    this.syncAllIoc();
    this.iocDropdownOpen = false;
  }

  onIocValueChange(newValue: string) {
    this.alert.ioc_value = newValue;
    this.formError = '';
    this.syncAllIoc();
  }

  private syncAllIoc() {
    const name = this.alert.ioc_type ?? '';
    const value = (this.alert.ioc_value ?? '').trim();
    if (!name || !value) {
      this.alert.all_ioc = [];
      return;
    }
    const bucket: AlertAllIoc = { name, values: [value] };
    this.alert.all_ioc = [bucket];
  }

  private isValidUrl(u: string): boolean {
    try {
      const url = new URL(u);
      return url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch {
      return false;
    }
  }

  private validateForm(): string {
    const title = (this.alert.title ?? '').trim();
    const desc = (this.alert.description ?? '').trim();
    const source = (this.alert.source ?? '').trim();
    const url = (this.alert.url ?? '').trim();
    if (!this.alert.type) {
      return 'Please select an alert type.';
    }
    if (!title) {
      return 'Please enter a title for the alert.';
    }
    if (title.length < 3) {
      return 'The title must be at least 3 characters long.';
    }
    if (!desc) {
      return 'Please provide a description for the alert.';
    }
    if (desc.length < 5) {
      return 'The description must be at least 5 characters long.';
    }
    if (!source) {
      return 'Please specify the source of this alert.';
    }
    if (source.length < 2) {
      return 'The source must be at least 2 characters long.';
    }
    if (!url) {
      return 'Please enter a reference URL.';
    }
    if (!this.isValidUrl(url)) {
      return 'Please enter a valid URL starting with http:// or https://.';
    }
    return '';
  }

  saveAlert() {
    this.formError = this.validateForm();
    if (this.formError) {
      return;
    }
    this.alert.licenses = this.licenseService.getAlertLicenses(this.alert.type);
    const endpoint = this.edit() ? 'alert/update' : 'alert/add';
    this.apiService.post(endpoint, this.alert).subscribe({
      next: () => {
        this.cancleAlert(true);
      },
      error: err => {
        this.messageNotificationService.show(err?.error?.detail ?? this.translationService.translate('Alert operation failed'));
      }
    });
  }

  toggleIocDropdown(event: Event) {
    event.stopPropagation();
    this.iocDropdownOpen = !this.iocDropdownOpen;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.iocDropdownOpen = false;
  }

  cancleAlert(refresh: boolean) {
    this.cancle.emit(refresh);
  }

  getIOCTypeLabel(selectedKey: string): string {
    if (!selectedKey) {
      return 'Select IOC Type';
    }
    const item = this.allowedIocTypes.find(x => x.key === selectedKey);
    return item ? item.title : 'Select IOC Type';
  }

}
