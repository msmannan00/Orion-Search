import { ChangeDetectorRef, Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { JsonViewerComponent } from './json-viewer/json-viewer.component';
import { TooltipDirective } from '../../directive/tooltip-directive.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-json-api-viewer',
  standalone: true,
  imports: [CommonModule, NgClass, JsonViewerComponent, JsonViewerComponent, TooltipDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './json-api-viewer.component.html',
})
export class JsonApiViewerComponent {
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  isExpanded = false;
  copied = false;
  readonly jsonData = input<unknown>();

  constructor(private cdr: ChangeDetectorRef) {}

  toggleContent(): void {
    this.isExpanded = !this.isExpanded;
  }

  copyJson(event: MouseEvent): void {
    event.stopPropagation();
    const jsonData = this.jsonData();
    if (jsonData == null) {
      return;
    }
    const payload = JSON.stringify(jsonData, null, 2);
    void navigator.clipboard?.writeText(payload).then(() => {
      this.copied = true;
      this.cdr.detectChanges();
      if (this.copyTimer) {
        clearTimeout(this.copyTimer);
      }
      this.copyTimer = setTimeout(() => {
        this.copied = false;
        this.cdr.detectChanges();
      }, 1400);
    });
  }
}
