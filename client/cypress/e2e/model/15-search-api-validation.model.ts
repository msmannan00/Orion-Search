export type SearchEndpoint16 = 'strategic' | 'breach' | 'defacement' | 'social' | 'exploit';

export interface ExpectedSearchResult16 {
  title?: string;
  linkAddress?: string | string[];
  date?: string | null;
  responseDate?: string | null;
  description?: string | null;
  baseUrl?: string | string[];
  team?: string;
  webUrl?: string | string[];
  queryMatches: string[];
}

export interface DirectSearchCase16 {
  section: string;
  route: string;
  endpoint: SearchEndpoint16;
  searchQuery: string;
  expected: ExpectedSearchResult16;
}

export interface DateRangeSelection16 {
  monthLabel: string;
  startDay: number;
  endDay: number;
}

export interface SidebarFilterCase16 extends DirectSearchCase16 {
  selectTestId?: string;
  option?: string;
  requestField: string;
  requestValue: string;
  filterKind?: 'dropdown' | 'daterange';
  dateRange?: DateRangeSelection16;
  responseFields?: string[];
  responseValue?: string;
}

export interface SidebarFilterGroup16 {
  section: string;
  cases: SidebarFilterCase16[];
}

export interface AdvancedEntityFilterCase16 {
  section: string;
  route: string;
  endpoint: SearchEndpoint16;
  category: string;
  requestField: string;
  value: string;
  searchQuery?: string;
  expected: ExpectedSearchResult16;
  responseFields?: string[];
  responseValue?: string;
}

export interface SearchInterception16 extends Record<string, unknown> {
  request: Record<string, unknown> & {
    body: Record<string, unknown>;
  };
  response?: Record<string, unknown> & {
    body: unknown;
    statusCode: number;
  };
}
