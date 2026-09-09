import { Injectable } from '@angular/core';
import { AppService } from '../../../services/core/app/app.service';

@Injectable({ providedIn: 'root' })
export class ExportBrandingService {
  constructor(private appService: AppService) {
  }

  getTenantName(): string {
    return String(this.appService.getConfig()?.appSettings?.app_name || '').trim() || 'Tenant';
  }

  getTenantLogoUrl(): string {
    const settings = this.appService.getConfig()?.appSettings;
    const darkLogo = String(settings?.logo_wide_dark || '').trim();
    const lightLogo = String(settings?.logo_wide_light || '').trim();
    return darkLogo.endsWith('logo_wide_dark_default.png')
      ? lightLogo || darkLogo
      : darkLogo || lightLogo || String(settings?.logo_url || '').trim();
  }

  addTenantJsonMetadata(data: unknown): unknown {
    const tenantName = this.getTenantName();
    const brandedData = this.replaceExportSchemaBrand(data);
    if (Array.isArray(brandedData)) {
      return { tenant_name: tenantName, records: brandedData };
    }
    if (brandedData && typeof brandedData === 'object') {
      const record = brandedData as Record<string, unknown>;
      const metadataKey = record.type === 'bundle' ? 'x_tenant_name' : 'tenant_name';
      return { ...record, [metadataKey]: tenantName };
    }
    return { tenant_name: tenantName, value: brandedData };
  }

  replaceSystemBrand(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }
    return value.replace(/^Orion(?=\s+(?:Alerts?|Scanner|Search|Network|Dynamic|Intelligence)\b)/i, this.getTenantName());
  }

  private replaceExportSchemaBrand(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(item => this.replaceExportSchemaBrand(item));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key.replace(/^x_orion(?=_|$)/i, 'x_tenant'),
        this.replaceExportSchemaBrand(item)
      ]));
    }
    if (typeof value === 'string' && /^orion:/i.test(value)) {
      return `${this.getTenantSlug()}:${value.slice(value.indexOf(':') + 1)}`;
    }
    return this.replaceSystemBrand(value);
  }

  private getTenantSlug(): string {
    return this.getTenantName()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'tenant';
  }

  loadTenantLogoDataUrl(): Promise<string | null> {
    const logoUrl = this.getTenantLogoUrl();
    if (!logoUrl) {
      return Promise.resolve(null);
    }
    if (/^data:image\/(png|jpe?g|webp);/i.test(logoUrl)) {
      return Promise.resolve(logoUrl);
    }

    return fetch(logoUrl, { credentials: 'same-origin', cache: 'no-store' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Unable to load tenant logo (${response.status})`);
        }
        return response.blob();
      })
      .then(blob => this.blobToPdfDataUrl(blob))
      .catch(() => null);
  }

  private blobToPdfDataUrl(blob: Blob): Promise<string | null> {
    if (/^image\/(png|jpe?g|webp)$/i.test(blob.type)) {
      return this.blobToDataUrl(blob);
    }

    return new Promise(resolve => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1200;
        const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      image.src = objectUrl;
    });
  }

  private blobToDataUrl(blob: Blob): Promise<string | null> {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  }
}
