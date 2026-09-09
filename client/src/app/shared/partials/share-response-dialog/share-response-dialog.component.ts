import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, Input, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { TooltipDirective } from '../../directive/tooltip-directive.directive';
import { ResultRowHelperService } from '../../services/result-row-helper.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import type { ShareDestination, ShareTarget } from './model/share-response-dialog.model';
export type { ShareDestination, ShareTarget } from './model/share-response-dialog.model';






const SHARE_DESTINATIONS: ShareDestination[] = [
  { target: 'telegram', label: 'Telegram', icon: 'bi-telegram', iconClass: 'text-sky-300 group-hover:text-sky-200 [body.light-theme_&]:text-sky-700 [body.light-theme_&]:group-hover:text-sky-800' },
  { target: 'x', label: 'X', icon: 'bi-twitter-x', iconClass: 'text-white/75 group-hover:text-white [body.light-theme_&]:text-slate-600 [body.light-theme_&]:group-hover:text-slate-900' },
  { target: 'linkedin', label: 'LinkedIn', icon: 'bi-linkedin', iconClass: 'text-blue-300 group-hover:text-blue-200 [body.light-theme_&]:text-blue-700 [body.light-theme_&]:group-hover:text-blue-800' },
  { target: 'reddit', label: 'Reddit', icon: 'bi-reddit', iconClass: 'text-orange-300 group-hover:text-orange-200 [body.light-theme_&]:text-orange-700 [body.light-theme_&]:group-hover:text-orange-800' },
  { target: 'email', label: 'Email', icon: 'bi-envelope-fill', iconClass: 'text-amber-300 group-hover:text-amber-200 [body.light-theme_&]:text-amber-700 [body.light-theme_&]:group-hover:text-amber-800' },
];

@Component({
  selector: 'app-share-response-dialog',
  standalone: true,
  imports: [CommonModule, TooltipDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './share-response-dialog.component.html',
})
export class ShareResponseDialogComponent implements AfterViewInit, OnDestroy {
  protected readonly destinations = SHARE_DESTINATIONS;
  protected readonly copied = signal(false);
  protected readonly visible = signal(false);

  @Input() text = '';
  @Input() title = 'Share';
  @Input() description = 'Send this text or copy it.';
  @Input() emailSubject = 'Shared response';

  constructor(private readonly resultRowHelper: ResultRowHelperService, private readonly host: ElementRef<HTMLElement>, @Inject(DOCUMENT) private readonly document: Document) {}

  ngAfterViewInit(): void {
    this.document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }

  protected get shareText(): string {
    return this.text.trim();
  }

  protected get characterCount(): number {
    return this.shareText.length;
  }

  open(event?: MouseEvent): void {
    event?.stopPropagation();
    if (!this.shareText) {
      return;
    }
    this.copied.set(false);
    this.visible.set(true);
  }

  close(): void {
    this.copied.set(false);
    this.visible.set(false);
  }

  copyText(): void {
    const text = this.shareText;
    if (!text) {
      return;
    }
    this.resultRowHelper.copyToClipboard(text).subscribe((ok) => {
      if (ok) {
        this.copied.set(true);
        window.setTimeout(() => {
          this.copied.set(false);
        }, 1400);
      }
    });
  }

  canNativeShare(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as Navigator & { share?: (data: ShareData) => Promise<void>; }).share;
  }

  shareViaNative(): void {
    const text = this.shareText;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void>; };
    if (!text || !nav.share) {
      return;
    }
    void nav.share({ text }).then(() => {
      this.close();
    }).catch(() => undefined);
  }

  shareUrl(target: ShareTarget): string {
    const encoded = encodeURIComponent(this.shareText);
    if (target === 'telegram') {
      return `https://t.me/share/url?url=&text=${encoded}`;
    }
    if (target === 'x') {
      return `https://twitter.com/intent/tweet?text=${encoded}`;
    }
    if (target === 'linkedin') {
      return `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`;
    }
    if (target === 'reddit') {
      return `https://www.reddit.com/submit?title=${encodeURIComponent(this.emailSubject)}&text=${encoded}`;
    }
    return `mailto:?subject=${encodeURIComponent(this.emailSubject)}&body=${encoded}`;
  }
}
