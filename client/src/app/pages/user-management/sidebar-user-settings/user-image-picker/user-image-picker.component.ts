import { Component, effect, input, output, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-user-image-picker',
  imports: [NgClass, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './user-image-picker.component.html'
})
export class UserImagePickerComponent {
  private previewObjectUrl?: string;

  readonly imageUrlInput = input<string | undefined>(undefined, { alias: 'imageUrl' });
  selectedFile?: File;
  selectedImage?: string;
  readonly id = input('');
  imageUrl!: string;
  readonly defaultImage = input<string>('/api/s/static/tenant/logo_url_default.png');
  readonly wide = input(false);
  readonly onImageSelected = output<File>();
  readonly onClear = output<string>();

  constructor() {
    effect(() => {
      const imageUrl = this.imageUrlInput();
      if (imageUrl !== undefined) {
        this.imageUrl = imageUrl;
        this.selectedImage = imageUrl || this.defaultImage();
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
    }
    this.previewObjectUrl = URL.createObjectURL(file);
    this.selectedFile = file;
    this.selectedImage = this.previewObjectUrl;
    this.onImageSelected.emit(file);
  }

  deleteImage(event?: Event) {
    event?.stopPropagation();
    this.onClear.emit(this.id());
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = undefined;
    }
    this.selectedFile = undefined;
    this.selectedImage = this.defaultImage();
    this.imageUrl = this.defaultImage();
  }

  hasCustomImage(): boolean {
    const image = this.selectedImage ?? this.imageUrl ?? '';
    if (!image) {
      return false;
    }
    const defaults = [
      'default.png',
      '/default',
      'logo_url_default.png',
      'logo_wide_light_default.png',
      'logo_wide_dark_default.png',
      'auth_dashboard_icon_default.png'
    ];
    return !defaults.some(token => image.endsWith(token));
  }
}
