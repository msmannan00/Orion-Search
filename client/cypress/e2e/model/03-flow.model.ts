export interface FlowTestData extends Record<string, unknown> {
  support_email: string;
}

export interface HeatmapCountryReport extends Record<string, unknown> {
  m_country?: string[];
}

export interface HeatmapComponentHarness {
  appService: {
    worldJson: {
      (): unknown;
      set(value: unknown): void;
    };
  };
  allCategoryReports: Record<string, HeatmapCountryReport[]>;
  createChart(): void;
  startCategoryRotation(): void;
  getReportsByCountry(country: string): HeatmapCountryReport[];
  openCountryReport(country: string): void;
  closeCountryReport(): void;
  onCountryClick(feature: unknown): void;
  isOpenCountryReport(): boolean;
  selectedCountryReports(): HeatmapCountryReport[];
  ngOnDestroy(): void;
}

export interface AngularDebugHost extends HTMLElement {
  __ngContext__?: unknown[];
}

export interface AngularDebugApi {
  getComponent?(host: Element): unknown;
}

export interface HeatmapCountryPathElement extends Element {
  __data__?: {
    properties?: {
      name?: unknown;
    };
  };
}
