import { getComposerLineCount } from './composer-metrics.util';

export abstract class ComposerLayoutHost {
  composerRows = 1;
  composerScrollable = false;
  composerExpanded = false;

  protected applyComposerResize(textarea: HTMLTextAreaElement | null | undefined): void {
    if (!textarea) {
      return;
    }
    const lineCount = getComposerLineCount(textarea);
    this.composerRows = Math.min(5, lineCount);
    this.composerScrollable = lineCount > 5;
    this.composerExpanded = this.composerRows > 1;
  }
}
