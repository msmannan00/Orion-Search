import { Component, effect, input, ChangeDetectionStrategy } from '@angular/core';

import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-result-list',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './result-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ResultListComponent {
  readonly listItemsInput = input<string[]>([], { alias: 'listItems' });
  filteredItems: string[] = [];
  copiedIndex: number | null = null;
  expandedIndex: number | null = null;
  readonly activeTab = input('');

  constructor() {
    effect(() => {
      this.filteredItems = this.listItemsInput().filter(item => item.length >= 2);
      this.expandedIndex = null;
    });
  }

  handleItemClick(text: string, index: number): void {
    if (this.isRowLayout()) {
      this.expandedIndex = this.expandedIndex === index ? null : index;
      return;
    }
    this.copyText(text, index);
  }

  copyText(text: string, index: number): void {
    void navigator.clipboard.writeText(text).then(() => {
      this.copiedIndex = index;
      setTimeout(() => {
        this.copiedIndex = null;
      }, 1500);
    });
  }

  isRowLayout(): boolean {
    const tab = this.activeTab().toLowerCase();
    return tab.includes('comment') || tab.includes('repl');
  }

  isExpanded(index: number): boolean {
    return this.expandedIndex === index;
  }

  getRowLabel(index: number): string {
    return `${this.activeTab().toLowerCase().includes('repl') ? 'Reply' : 'Comment'} ${index + 1}`;
  }
}
