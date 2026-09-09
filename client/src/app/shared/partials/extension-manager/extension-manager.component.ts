import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SocialExtensionService } from '../../services/social-extension.service';
import { ExtensionState } from '../../model/extension/extension.model';

@Component({
  selector: 'app-social-extension-manager',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './extension-manager.component.html',
})
export class SocialExtensionManagerComponent {
  private readonly extensionService = inject(SocialExtensionService);

  readonly mode = input<ExtensionState>('install');
  readonly firefoxSteps = ['Click Install for Firefox.', 'Approve the browser prompt to add it.', 'Open the popup and sign in to Orion.'];
  readonly chromeWebStoreUrl = 'https://chromewebstore.google.com/detail/orion-social/ledhnhjfmgbmglkifmcnakimopejlghi';
  readonly chromeSteps = ['Click Install for Chrome to open the Chrome Web Store.', 'Select Add to Chrome and confirm the prompt.', 'Open the popup and sign in to Orion.'];

  open(): void {
    this.extensionService.openExtension();
  }

  latestVersion(): string {
    return this.extensionService.latestVersion();
  }

  downloadUrl(browser: 'chrome' | 'firefox'): string {
    return this.extensionService.downloadUrl(browser);
  }

  browserUrl(browser: 'chromium' | 'firefox'): string {
    return browser === 'firefox' ? 'https://www.mozilla.org/firefox/new/' : 'https://www.chromium.org/getting-involved/download-chromium/';
  }
}
