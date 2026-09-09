import { Component, HostListener, input, output, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-recovery-key-popup',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div data-testid="recovery-key-popup-overlay" class="[&&]:!z-[9999] [&&]:!bg-[rgba(2,6,23,0.64)] [body.light-theme_&&]:!bg-[rgba(15,23,42,0.24)] backdrop-blur-[4px] overflow-y-auto [animation:uiModalOverlayFade_200ms_ease-out_both] [&.items-center]:[align-items:safe_center] fixed inset-0 z-[1200] flex items-center justify-center p-4" (click)="close()">
      <section data-testid="recovery-key-popup" role="dialog" aria-modal="true" aria-labelledby="recovery-key-popup-title" class="ui-graph-popup-panel [&&]:!border-[#2c3a4a] [&&]:!bg-[#1b2a3b] [&&]:!text-[#e1e8f0] [&&]:!shadow-[0_12px_40px_rgba(0,0,0,0.40)] origin-top [animation:slideUp_0.2s_ease-out_both] [body.light-theme_&&]:!border-[#d2deec] [body.light-theme_&&]:!bg-[#f7fbff] [body.light-theme_&&]:!text-[#172235] [body.light-theme_&&]:!shadow-[0_10px_28px_rgba(15,23,42,0.14)] ui-popup-shell [&&]:!border [&&]:!border-[#2c3a4a] [&&]:!bg-[#1b2a3b] [&&]:!text-[#e1e8f0] [&&]:!shadow-[0_12px_40px_rgba(0,0,0,0.40)] [animation:slideUp_0.2s_ease-out_both] [body.light-theme_&&]:!border-[#d2deec] [body.light-theme_&&]:!bg-[#f7fbff] [body.light-theme_&&]:!text-[#172235] [body.light-theme_&&]:!shadow-[0_10px_28px_rgba(15,23,42,0.14)] w-full max-w-[520px] overflow-hidden rounded-xl border border-[var(--color-border)] shadow-[0_30px_80px_rgba(2,6,23,0.65)]" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h3 id="recovery-key-popup-title" class="!text-[var(--color-text1)] text-[16px] font-semibold">{{ 'Recovery Key' | translate }}</h3>
            <p class="mt-0.5 text-[12px] leading-5 text-[var(--color-text4)]">{{ 'Save it now. It will not be shown again.' | translate }}</p>
          </div>
          <button type="button" class="ui-popup-close inline-flex items-center justify-center p-0 leading-none text-[#ccc] [width:var(--ui-popup-close-width,42px)] [height:var(--ui-popup-close-height,42px)] [border-radius:var(--ui-popup-close-radius,8px)] [font-size:var(--ui-popup-close-font-size,28px)] [transition-property:color,background-color] [transition-duration:var(--ui-popup-close-duration,180ms)] [transition-timing-function:ease] hover:[&&]:!bg-[var(--color-blue-700)] hover:[&&]:!text-[var(--color-blue-640)] [.light-theme_&]:!text-[#667085] [.light-theme_&]:hover:!bg-[#eef5ff] [.light-theme_&]:hover:!text-[#1f2e47] inline-flex [--ui-popup-close-height:36px] [--ui-popup-close-width:36px] shrink-0 items-center justify-center [--ui-popup-close-font-size:18px]" [attr.aria-label]="'common.actions.close' | translate" (click)="close()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="px-5 py-5">
          <div class="break-all rounded-lg border border-[var(--color-border)] bg-[var(--color-blue-700)] p-3 text-sm text-[var(--color-text1)]">{{ recoveryKey() }}</div>
          <div class="mt-5 flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
          <button type="button" class="inline-flex items-center justify-center border text-sm font-semibold leading-none [height:var(--ui-btn-height,36px)] [padding:var(--ui-btn-py,0)_var(--ui-btn-px,16px)] [border-radius:var(--ui-btn-radius,10px)] [transition-property:var(--ui-btn-transition-properties,background-color,border-color,color)] [transition-duration:var(--ui-btn-transition-duration,160ms)] [transition-timing-function:ease] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(87_165_235/30%)] border-[var(--color-border)] bg-[var(--color-blue-820)] text-[var(--color-text2)] hover:bg-[var(--color-blue-810)]" (click)="copy()">{{ (copied ? 'Copied!' : 'Copy') | translate }}</button>
            <button type="button" class="inline-flex appearance-none items-center justify-center border-0 text-sm font-semibold leading-none [height:var(--ui-btn-height,36px)] [padding:var(--ui-btn-py,0)_var(--ui-btn-px,16px)] [border-radius:var(--ui-btn-radius,10px)] [transition-property:var(--ui-btn-transition-properties,background-color,border-color,color)] [transition-duration:var(--ui-btn-transition-duration,160ms)] [transition-timing-function:ease] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(87_165_235/30%)] bg-[linear-gradient(92.32deg,#4ea2f1_2.58%,#2c7ac5)] text-white hover:bg-[linear-gradient(92.32deg,#3f96e8_2.58%,#236eb7)]" (click)="close()">{{ 'Close' | translate }}</button>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class RecoveryKeyPopupComponent {
  readonly recoveryKey = input.required<string>();
  readonly closed = output();
  copied = false;

  @HostListener('document:keydown.escape')
  close() {
    this.closed.emit();
  }

  copy() {
    void navigator.clipboard.writeText(this.recoveryKey()).then(() => this.copied = true);
  }
}
