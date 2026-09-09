import { AfterViewInit, Directive, DoCheck, ElementRef, inject, Input, OnDestroy, Renderer2 } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Directive({
  selector: 'input[appPasswordToggle]',
  standalone: true,
})
export class PasswordToggleDirective implements AfterViewInit, DoCheck, OnDestroy {
  private readonly inputElementRef = inject(ElementRef) as ElementRef<HTMLInputElement>;
  private readonly renderer = inject(Renderer2);
  private readonly translationService = inject(TranslationService);
  private readonly eyeMarkup = `<path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/>`;
  private readonly eyeSlashMarkup = `<path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"/><path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/>`;
  private buttonElement?: HTMLButtonElement;
  private iconElement?: SVGSVGElement;
  private parentElement?: HTMLElement;
  private mutationObserver?: MutationObserver;
  private removeClickListener?: () => void;
  private removeInputListener?: () => void;
  private removeChangeListener?: () => void;
  private removeFocusListener?: () => void;
  private removeCopyListener?: () => void;
  private removeCutListener?: () => void;
  private isVisible = false;
  private lastInputValue = '';
  private lastDisabledState = false;

  @Input() appPasswordToggle: 'dark' | '' = '';

  ngAfterViewInit(): void {
    const inputElement = this.inputElementRef.nativeElement;
    const parentElement = inputElement.parentElement;
    if (!parentElement) {
      return;
    }
    this.parentElement = parentElement;

    this.renderer.setAttribute(inputElement, 'type', 'password');

    const buttonElement = this.renderer.createElement('button');
    if (!(buttonElement instanceof HTMLButtonElement)) {
      return;
    }
    const buttonClass = [
      'absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      this.appPasswordToggle === 'dark'
        ? 'text-[var(--color-text3)] hover:text-[var(--color-text1)]'
        : 'text-[#5d6f85] hover:text-[#172235]',
    ].join(' ');

    this.renderer.setAttribute(buttonElement, 'type', 'button');
    this.renderer.setAttribute(buttonElement, 'class', buttonClass);

    const iconElement = this.renderer.createElement('svg', 'svg') as SVGSVGElement;
    this.renderer.setAttribute(iconElement, 'viewBox', '0 0 16 16');
    this.renderer.setAttribute(iconElement, 'aria-hidden', 'true');
    this.renderer.setAttribute(iconElement, 'focusable', 'false');
    this.renderer.setAttribute(iconElement, 'class', 'block h-4 w-4 fill-current');
    this.renderer.appendChild(buttonElement, iconElement);

    this.buttonElement = buttonElement;
    this.iconElement = iconElement;
    this.removeClickListener = this.renderer.listen(buttonElement, 'click', (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (inputElement.disabled) {
        return;
      }
      this.toggleVisibility();
    });
    this.removeInputListener = this.renderer.listen(inputElement, 'input', () => {
      this.syncButtonState();
    });
    this.removeChangeListener = this.renderer.listen(inputElement, 'change', () => {
      this.syncButtonState();
    });
    this.removeFocusListener = this.renderer.listen(inputElement, 'focus', () => {
      this.syncButtonState();
    });
    this.removeCopyListener = this.renderer.listen(inputElement, 'copy', (event: ClipboardEvent) => {
      event.preventDefault();
    });
    this.removeCutListener = this.renderer.listen(inputElement, 'cut', (event: ClipboardEvent) => {
      event.preventDefault();
    });

    this.syncButtonState();
    this.mutationObserver = new MutationObserver(() => {
      this.syncButtonState();
    });
    this.mutationObserver.observe(inputElement, { attributes: true, attributeFilter: ['disabled'] });
  }

  ngDoCheck(): void {
    const inputElement = this.inputElementRef.nativeElement;
    if (inputElement.value !== this.lastInputValue || inputElement.disabled !== this.lastDisabledState) {
      this.syncButtonState();
    }
  }

  ngOnDestroy(): void {
    this.removeClickListener?.();
    this.removeInputListener?.();
    this.removeChangeListener?.();
    this.removeFocusListener?.();
    this.removeCopyListener?.();
    this.removeCutListener?.();
    this.mutationObserver?.disconnect();
    if (this.buttonElement?.parentElement) {
      this.renderer.removeChild(this.buttonElement.parentElement, this.buttonElement);
    }
  }

  private toggleVisibility(): void {
    const inputElement = this.inputElementRef.nativeElement;
    const selectionStart = inputElement.selectionStart;
    const selectionEnd = inputElement.selectionEnd;

    this.isVisible = !this.isVisible;
    this.renderer.setAttribute(inputElement, 'type', this.isVisible ? 'text' : 'password');
    this.updateIcon();

    inputElement.focus({ preventScroll: true });
    if (selectionStart !== null && selectionEnd !== null) {
      inputElement.setSelectionRange(selectionStart, selectionEnd);
    }
  }

  private syncButtonState(): void {
    if (!this.buttonElement) {
      return;
    }
    const inputElement = this.inputElementRef.nativeElement;
    const isEmpty = inputElement.value.length === 0;
    const isAttached = this.buttonElement.parentElement !== null;
    this.lastInputValue = inputElement.value;
    this.lastDisabledState = inputElement.disabled;
    if (isEmpty && this.isVisible) {
      this.isVisible = false;
      this.renderer.setAttribute(inputElement, 'type', 'password');
    }

    if (isEmpty && isAttached) {
      this.renderer.removeChild(this.buttonElement.parentElement, this.buttonElement);
    }
    else if (!isEmpty && !isAttached && this.parentElement) {
      this.renderer.appendChild(this.parentElement, this.buttonElement);
    }

    this.renderer.setProperty(this.buttonElement, 'disabled', inputElement.disabled);
    this.updateIcon();
  }

  private updateIcon(): void {
    if (!this.buttonElement || !this.iconElement) {
      return;
    }
    this.renderer.setAttribute(this.buttonElement, 'aria-label', this.translationService.translate(this.isVisible ? 'Hide password' : 'Show password'));
    this.renderer.setProperty(this.iconElement, 'innerHTML', this.isVisible ? this.eyeSlashMarkup : this.eyeMarkup);
  }
}
