import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { LegalPrivacyPage } from '../legal-privacy-page.base';
import type { TocItem } from './model/extension-privacy.model';
export type { TocItem } from './model/extension-privacy.model';




const TOC: TocItem[] = [
  { id: 'scope', label: 'Who this policy covers' },
  { id: 'what', label: 'What the extension does' },
  { id: 'collect', label: 'Information we access and collect' },
  { id: 'use', label: 'How the information is used' },
  { id: 'storage', label: 'Where your data is sent and stored' },
  { id: 'not', label: 'What the extension does not do' },
  { id: 'permissions', label: 'Browser permissions' },
  { id: 'retention', label: 'Retention and your control' },
  { id: 'security', label: 'Security' },
  { id: 'children', label: 'Children’s privacy' },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact us' },
];

@Component({
  selector: 'app-extension-privacy',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './extension-privacy.component.html',
})
export class ExtensionPrivacyComponent extends LegalPrivacyPage {
  readonly extensionName = 'Orion Social';
  readonly toc = TOC;
}
