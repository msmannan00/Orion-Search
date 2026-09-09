
import type { TooltipPointerEvent } from './model/threat-lens-tooltip.model';
export type { TooltipPointerEvent } from './model/threat-lens-tooltip.model';


export class ThreatLensTooltipRenderer {
  private static readonly TOOLTIP_CLASS = 'threat-lens-tooltip fixed left-[var(--threat-lens-tooltip-left,0)] top-[var(--threat-lens-tooltip-top,0)] z-[2147483000] max-w-[340px] rounded-[8px] border border-[rgb(74_222_128_/_32%)] bg-[#172235] px-[10px] py-[6px] text-[12px] font-semibold text-[#eef7f1] shadow-[0_12px_30px_rgb(2_6_23_/_45%)] [backdrop-filter:blur(8px)] pointer-events-none [&[hidden]]:!hidden [body.light-theme_&]:border-[#b9dbc7] [body.light-theme_&]:bg-[rgb(249_251_255_/_98%)] [body.light-theme_&]:text-[#172235]';
  private static readonly CONTENT_CLASS = 'threat-lens-tooltip__content grid gap-[6px] px-[10px] py-[8px] text-[11px] leading-[1.35]';
  private static readonly ARC_TITLE_CLASS = 'threat-lens-tooltip__arc-title mb-[10px] text-[11px] font-bold uppercase tracking-[0.08em] text-white [body.light-theme_&]:text-[#172235]';
  private static readonly COUNTRY_TITLE_CLASS = 'threat-lens-tooltip__country-title mb-[10px] text-[11px] font-bold uppercase tracking-[0.08em] text-white [body.light-theme_&]:text-[#172235]';
  private static readonly ROW_CLASS = 'threat-lens-tooltip__row mt-[6px] flex min-w-0 items-baseline justify-between gap-[12px]';
  private static readonly LABEL_CLASS = 'threat-lens-tooltip__label shrink-0 text-[11px] text-[rgb(203_213_225_/_72%)] [body.light-theme_&]:text-[#5f738f]';
  private static readonly VALUE_CLASS = 'threat-lens-tooltip__value min-w-0 max-w-[210px] overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[12px] font-bold text-[#bbf7d0] [body.light-theme_&]:text-[#146f52]';
  private tooltipEl: HTMLDivElement | null = null;
  private tooltipPlacement: 'above' | 'below' = 'below';

  constructor(private readonly translate: (key: string) => string = key => key) {}

  init(): void {
    if (typeof window === 'undefined' || this.tooltipEl) {
      return;
    }

    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = ThreatLensTooltipRenderer.TOOLTIP_CLASS;
    this.tooltipEl.hidden = true;
    document.body.appendChild(this.tooltipEl);
  }

  destroy(): void {
    this.tooltipEl?.remove();
    this.tooltipEl = null;
  }

  showIpScan(event: unknown, attributes: Record<string, unknown>): void {
    if (!this.tooltipEl) {
      return;
    }

    const ip = typeof attributes.ip === 'string' ? attributes.ip : this.translate('Unknown IP');
    const network = typeof attributes.network === 'string' ? attributes.network : '';
    const accuracyRadius = this.toFiniteNumber(attributes.accuracyRadius);
    const tooltipContent = document.createElement('div');
    tooltipContent.className = `${ThreatLensTooltipRenderer.CONTENT_CLASS} threat-lens-tooltip__content--ip min-w-[190px]`;

    const title = document.createElement('div');
    title.className = ThreatLensTooltipRenderer.ARC_TITLE_CLASS;
    title.textContent = this.translate('Approximate location');

    tooltipContent.append(title, this.buildTooltipRow(this.translate('IP address'), ip));
    if (network) {
      tooltipContent.append(this.buildTooltipRow(this.translate('Network'), network));
    }
    if (accuracyRadius !== undefined) {
      tooltipContent.append(this.buildTooltipRow(this.translate('Approx. radius'), this.formatKm(accuracyRadius)));
    }
    this.show(event, tooltipContent);
  }

  showIpCluster(event: unknown, attributes: Record<string, unknown>): void {
    if (!this.tooltipEl) {
      return;
    }

    const count = Number(attributes.count ?? 0);
    const networkCount = Number(attributes.networkCount ?? 0);
    const accuracyRadius = this.toFiniteNumber(attributes.accuracyRadius);
    const accuracyMin = this.toFiniteNumber(attributes.accuracyMin);
    const accuracyMax = this.toFiniteNumber(attributes.accuracyMax);
    const records = Array.isArray(attributes.records) ? attributes.records : [];
    const tooltipContent = document.createElement('div');
    tooltipContent.className = `${ThreatLensTooltipRenderer.CONTENT_CLASS} threat-lens-tooltip__content--ip min-w-[190px]`;

    const title = document.createElement('div');
    title.className = ThreatLensTooltipRenderer.ARC_TITLE_CLASS;
    title.textContent = this.translate('Stacked approximate IPs');

    tooltipContent.append(title);
    tooltipContent.append(this.buildTooltipRow(this.translate('Why stacked'), String(attributes.stackReason ?? this.translate('Same MaxMind coordinate'))));
    tooltipContent.append(this.buildTooltipRow(this.translate('IP records'), String(count || records.length)));
    if (networkCount > 0) {
      tooltipContent.append(this.buildTooltipRow(this.translate('Prefixes'), String(networkCount)));
    }
    if (accuracyMin !== undefined && accuracyMax !== undefined) {
      tooltipContent.append(this.buildTooltipRow(this.translate('Approx. radius'), this.formatKmRange(accuracyMin, accuracyMax)));
    }
    else if (accuracyRadius !== undefined) {
      tooltipContent.append(this.buildTooltipRow(this.translate('Approx. radius'), this.formatKm(accuracyRadius)));
    }
    const sampleIps = records
      .map((record) => String(record?.ip ?? '').trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    if (sampleIps) {
      tooltipContent.append(this.buildTooltipRow(this.translate('Sample'), sampleIps));
    }
    this.show(event, tooltipContent);
  }

  showCountry(event: unknown, countryName: string): void {
    if (!this.tooltipEl) {
      return;
    }

    const tooltipContent = document.createElement('div');
    tooltipContent.className = `${ThreatLensTooltipRenderer.CONTENT_CLASS} threat-lens-tooltip__content--country min-w-[180px]`;

    const countryTitle = document.createElement('div');
    countryTitle.className = ThreatLensTooltipRenderer.COUNTRY_TITLE_CLASS;
    countryTitle.textContent = countryName;

    tooltipContent.append(countryTitle);
    this.show(event, tooltipContent, 'above');
  }

  move(event: unknown): void {
    if (!this.tooltipEl) {
      return;
    }

    const pointer = event && typeof event === 'object' ? event as TooltipPointerEvent : {};
    const x = Number(pointer.native?.clientX ?? pointer.clientX ?? pointer.touches?.[0]?.clientX ?? pointer.x ?? 0);
    const y = Number(pointer.native?.clientY ?? pointer.clientY ?? pointer.touches?.[0]?.clientY ?? pointer.y ?? 0);
    const width = this.tooltipEl.offsetWidth;
    const height = this.tooltipEl.offsetHeight;
    const preferredLeft = this.tooltipPlacement === 'above' ? x - width / 2 : x + 10;
    const preferredTop = this.tooltipPlacement === 'above' ? y - height - 10 : y + 10;
    const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - width - 8));
    const top = Math.max(8, Math.min(preferredTop, window.innerHeight - height - 8));
    this.tooltipEl.style.setProperty('--threat-lens-tooltip-left', `${left}px`);
    this.tooltipEl.style.setProperty('--threat-lens-tooltip-top', `${top}px`);
  }

  hide(): void {
    if (this.tooltipEl) {
      this.tooltipEl.hidden = true;
    }
  }

  private show(event: unknown, content: HTMLDivElement, placement: 'above' | 'below' = 'below'): void {
    this.tooltipPlacement = placement;
    this.tooltipEl?.replaceChildren(content);
    if (this.tooltipEl) {
      this.tooltipEl.hidden = false;
    }
    this.move(event);
  }

  private buildTooltipRow(label: string, value: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = ThreatLensTooltipRenderer.ROW_CLASS;

    const labelEl = document.createElement('span');
    labelEl.className = ThreatLensTooltipRenderer.LABEL_CLASS;
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = ThreatLensTooltipRenderer.VALUE_CLASS;
    valueEl.textContent = value;

    row.append(labelEl, valueEl);

    return row;
  }

  private toFiniteNumber(value: unknown): number | undefined {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  private formatKm(value: number): string {
    if (value >= 100) {
      return `${Math.round(value)} km`;
    }
    return `${Math.round(value * 10) / 10} km`;
  }

  private formatKmRange(min: number, max: number): string {
    if (Math.abs(max - min) < 0.1) {
      return this.formatKm(max);
    }
    return `${this.formatKm(min)}-${this.formatKm(max)}`;
  }

}
