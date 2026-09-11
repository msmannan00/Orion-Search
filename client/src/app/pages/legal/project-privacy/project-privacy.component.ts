import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { LegalPrivacyPage } from '../legal-privacy-page.base';
import type { TocItem } from './model/project-privacy.model';
export type { TocItem } from './model/project-privacy.model';




const TOC: TocItem[] = [
  { id: 'scope', label: 'Scope and responsibility' },
  { id: 'collect', label: 'Information we collect' },
  { id: 'intelligence', label: 'Investigative data' },
  { id: 'use', label: 'How we use information' },
  { id: 'legal-bases', label: 'Legal bases' },
  { id: 'sharing', label: 'How information is shared' },
  { id: 'integrations', label: 'Integrations and external sources' },
  { id: 'cookies', label: 'Cookies and local storage' },
  { id: 'retention', label: 'Data retention' },
  { id: 'security', label: 'Security' },
  { id: 'transfers', label: 'International transfers' },
  { id: 'rights', label: 'Your rights and choices' },
  { id: 'children', label: 'Children’s privacy' },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact us' },
];

@Component({
  selector: 'app-project-privacy',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './project-privacy.component.html',
})
export class ProjectPrivacyComponent extends LegalPrivacyPage {
  readonly toc = TOC;
}
