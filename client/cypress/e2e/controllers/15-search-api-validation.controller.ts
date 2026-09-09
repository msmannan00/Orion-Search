
import type { AdvancedEntityFilterCase16, DateRangeSelection16, DirectSearchCase16, ExpectedSearchResult16, SearchEndpoint16, SearchInterception16, SidebarFilterCase16, SidebarFilterGroup16 } from '../model/15-search-api-validation.model';
export type { AdvancedEntityFilterCase16, DateRangeSelection16, DirectSearchCase16, ExpectedSearchResult16, SearchEndpoint16, SidebarFilterCase16, SidebarFilterGroup16 } from '../model/15-search-api-validation.model';

type SearchRecord16 = Record<string, unknown>;














const API_BASE_16 = '**/api/search';
const SEARCH_INPUT_16 = 'input[data-testid="dashboard-general-input"][name="q"]';

export const DIRECT_SEARCH_CASES: DirectSearchCase16[] = [
  {
    section: 'General Intelligence',
    route: '/dashboard/strategic/all',
    endpoint: 'strategic',
    searchQuery: 'underground market - prepaid & cloned cards',
    expected: {
      title: 'underground market - prepaid & cloned cards, amazon gift, paypal',
      linkAddress: 'http://2222fxq4xfkvilzdihu5ybce7ztf66fr6c7ub3enabg5iya2f34ac5id.onion/paypal-accounts.php',
      date: null,
      responseDate: null,
      description: 'copyright 2026 - underground marketwe',
      queryMatches: ['underground market', 'prepaid', 'cloned cards'],
    },
  },
  {
    section: 'Data Breach',
    route: '/dashboard/breach/all',
    endpoint: 'breach',
    searchQuery: 'Wold Architects and Engineers',
    expected: {
      title: 'Wold Architects and Engineers',
      linkAddress: 'http://3ev4metjirohtdpshsqlkrqcmxq6zu3d7obrdhglpy5jpbr7whmlfgqd.onion/',
      date: 'Jan 24, 2026',
      responseDate: '2026-01-24',
      description: 'A full-service planning, architecture & engineering firm',
      queryMatches: ['Wold Architects', 'Engineers'],
    },
  },
  {
    section: 'Defacement',
    route: '/dashboard/defacement/all',
    endpoint: 'defacement',
    searchQuery: 'joindarkside.pro',
    expected: {
      baseUrl: 'https://tweetfeed.live/',
      team: 'CarlyGriggs13',
      date: 'Jan 24, 2026',
      responseDate: '2026-01-24',
      webUrl: ['joindarkside.pro', 'https://joindarkside.pro'],
      queryMatches: ['joindarkside.pro'],
    },
  },
  {
    section: 'Social',
    route: '/dashboard/social/all',
    endpoint: 'social',
    searchQuery: 'UNLIMITED PHONE NUMBERS FOR FREE',
    expected: {
      title: 'HOW TO CREATE UNLIMITED PHONE NUMBERS FOR FREE EXCLUSIVE LEAK 2026',
      linkAddress: 'https://xreactor.org/threads/how-to-create-unlimited-phone-numbers-for-free-exclusive-leak-2026.33161/',
      date: 'Jun 12, 2025',
      responseDate: '2025-06-12',
      description: null,
      queryMatches: ['UNLIMITED PHONE NUMBERS', 'FREE'],
    },
  },
  {
    section: 'Exploit',
    route: '/dashboard/exploit/all',
    endpoint: 'exploit',
    searchQuery: 'CVE-2025-57819 FreePBX',
    expected: {
      title: 'Exploit for SQL Injection in Sangoma Freepbx CVE-2025-57819 CVE-2025-61678',
      linkAddress: 'https://sploitus.com/exploit?id=A52A5B67-31DB-5B86-B528-C2F4F2A57FB3',
      date: 'Jun 19, 2026',
      responseDate: '2026-06-19',
      description: 'Exploit for SQL Injection in Sangoma Freepbx CVE-2025-57819 CVE-2025-61678',
      queryMatches: ['CVE-2025-57819', 'FreePBX'],
    },
  },
  {
    section: 'Feed',
    route: '/dashboard/feed/news',
    endpoint: 'breach',
    searchQuery: 'Armenia probes alleged sale of 8 million gov',
    expected: {
      title: 'Armenia probes alleged sale of 8 million government records on hacker forum',
      linkAddress: 'https://therecord.media/armenia-probes-alleged-sale-government-records',
      date: 'Jan 12, 2026',
      responseDate: '2026-01-12',
      description: 'Hackers are offering for sale what they claim is a large trove of Armenian government-related data',
      queryMatches: ['Armenia', '8 million', 'gov'],
    },
  },
];

const GENERAL_DATE_EXPECTED: ExpectedSearchResult16 = {
  ...DIRECT_SEARCH_CASES[0].expected,
  responseDate: '2026-01-24',
};

const EXPLOIT_CVE_EXPECTED: ExpectedSearchResult16 = {
  title: 'CVE-2017-0120',
  linkAddress: 'https://raw.githubusercontent.com/trickest/cve/main/2017/CVE-2017-0120.md',
  date: 'Jun 20, 2026',
  responseDate: '2026-06-20',
  description: 'Uniscribe Information Disclosure Vulnerability',
  queryMatches: ['CVE-2017-0120', 'Uniscribe'],
};

const EXPLOIT_SENTRY_EXPECTED: ExpectedSearchResult16 = {
  title: 'Ivanti Sentry OS Command Injection Vulnerability',
  linkAddress: 'https://www.cve.org/CVERecord?id=CVE-2026-10520',
  date: 'Jun 11, 2026',
  responseDate: '2026-06-11',
  description: 'Ivanti Sentry OS Command Injection Vulnerability',
  queryMatches: ['CWE-78', 'Sentry'],
};

const EXPLOIT_LANGFLOW_EXPECTED: ExpectedSearchResult16 = {
  title: 'Langflow: BaseFileComponent-based nodes arbitrary file read with RCE exploit',
  linkAddress: 'https://github.com/advisories/GHSA-ccv6-r384-xp75',
  date: 'Jun 19, 2026',
  responseDate: '2026-06-19',
  description: 'Langflow: BaseFileComponent-based nodes arbitrary file read with RCE exploit',
  queryMatches: ['Langflow', 'pip'],
};

const EXPLOIT_VCR_EXPECTED: ExpectedSearchResult16 = {
  title: 'VCR.py: Arbitrary code execution via unsafe YAML deserialization of cassette files',
  linkAddress: 'https://github.com/advisories/GHSA-rpj2-4hq8-938g',
  date: 'Jun 19, 2026',
  responseDate: '2026-06-19',
  description: 'VCR.py: Arbitrary code execution via unsafe YAML deserialization of cassette files',
  queryMatches: ['VCR.py', 'example.com'],
};

const EXPLOIT_SMTP_EXPECTED: ExpectedSearchResult16 = {
  title: 'Authenticated SMTP users may spoof other identities due to ambiguous \\u201cFrom\\u201d header interpretation',
  linkAddress: 'https://www.kb.cert.org/vuls/id/517845',
  date: 'Oct 28, 2025',
  responseDate: '2025-10-28',
  description: null,
  queryMatches: ['attacker@example.com'],
};

export const SIDEBAR_FILTER_GROUPS: SidebarFilterGroup16[] = [
  {
    section: 'General Intelligence',
    cases: [
      {
        ...DIRECT_SEARCH_CASES[0],
        selectTestId: 'side-filter-select-network',
        option: 'Onion',
        requestField: 'network',
        requestValue: 'onion',
        responseFields: ['m_network'],
        responseValue: 'onion',
      },
      {
        ...DIRECT_SEARCH_CASES[0],
        selectTestId: 'side-filter-select-safe',
        option: 'No',
        requestField: 'safe',
        requestValue: 'no',
      },
      {
        ...DIRECT_SEARCH_CASES[0],
        expected: GENERAL_DATE_EXPECTED,
        requestField: 'daterange',
        requestValue: '2026-01-23,2026-01-24',
        filterKind: 'daterange',
        dateRange: { monthLabel: 'January 2026', startDay: 23, endDay: 24 },
        responseFields: ['m_creation_date'],
        responseValue: '2026-01-24',
      },
      {
        ...DIRECT_SEARCH_CASES[0],
        selectTestId: 'side-filter-select-m_content_type',
        option: 'Marketplaces',
        requestField: 'm_content_type',
        requestValue: 'marketplaces',
        responseFields: ['m_content_type'],
        responseValue: 'marketplaces',
      },
    ],
  },
  {
    section: 'Data Breach',
    cases: [
      {
        ...DIRECT_SEARCH_CASES[1],
        selectTestId: 'side-filter-select-network',
        option: 'Onion',
        requestField: 'network',
        requestValue: 'onion',
        responseFields: ['m_network'],
        responseValue: 'onion',
      },
      {
        ...DIRECT_SEARCH_CASES[1],
        requestField: 'daterange',
        requestValue: '2026-01-23,2026-01-24',
        filterKind: 'daterange',
        dateRange: { monthLabel: 'January 2026', startDay: 23, endDay: 24 },
        responseFields: ['m_date', 'm_creation_date'],
        responseValue: '2026-01-24',
      },
      {
        ...DIRECT_SEARCH_CASES[1],
        selectTestId: 'side-filter-select-content',
        option: 'Leak',
        requestField: 'content',
        requestValue: 'leak',
        responseFields: ['content_type'],
        responseValue: 'leak',
      },
    ],
  },
  {
    section: 'Defacement',
    cases: [
      {
        ...DIRECT_SEARCH_CASES[2],
        selectTestId: 'side-filter-select-network',
        option: 'Clearnet',
        requestField: 'network',
        requestValue: 'clearnet',
      },
      {
        ...DIRECT_SEARCH_CASES[2],
        requestField: 'daterange',
        requestValue: '2026-01-23,2026-01-24',
        filterKind: 'daterange',
        dateRange: { monthLabel: 'January 2026', startDay: 23, endDay: 24 },
        responseFields: ['m_date'],
        responseValue: '2026-01-24',
      },
      {
        ...DIRECT_SEARCH_CASES[2],
        selectTestId: 'side-filter-select-content',
        option: 'scam',
        requestField: 'content',
        requestValue: 'scam',
      },
    ],
  },
  {
    section: 'Social',
    cases: [
      {
        ...DIRECT_SEARCH_CASES[3],
        selectTestId: 'side-filter-select-network',
        option: 'Clearnet',
        requestField: 'network',
        requestValue: 'clearnet',
        responseFields: ['m_network'],
        responseValue: 'clearnet',
      },
      {
        ...DIRECT_SEARCH_CASES[3],
        requestField: 'daterange',
        requestValue: '2025-06-11,2025-06-12',
        filterKind: 'daterange',
        dateRange: { monthLabel: 'June 2025', startDay: 11, endDay: 12 },
        responseFields: ['m_date'],
        responseValue: '2025-06-12',
      },
      {
        ...DIRECT_SEARCH_CASES[3],
        selectTestId: 'side-filter-select-content',
        option: 'Leak',
        requestField: 'content',
        requestValue: 'leak',
        responseFields: ['content_type'],
        responseValue: 'leak',
      },
    ],
  },
  {
    section: 'Exploit',
    cases: [
      {
        ...DIRECT_SEARCH_CASES[4],
        selectTestId: 'side-filter-select-network',
        option: 'Clearnet',
        requestField: 'network',
        requestValue: 'clearnet',
        responseFields: ['m_network'],
        responseValue: 'clearnet',
      },
      {
        ...DIRECT_SEARCH_CASES[4],
        requestField: 'daterange',
        requestValue: '2026-06-18,2026-06-19',
        filterKind: 'daterange',
        dateRange: { monthLabel: 'June 2026', startDay: 18, endDay: 19 },
        responseFields: ['m_date', 'm_creation_date'],
        responseValue: '2026-06-19',
      },
      {
        ...DIRECT_SEARCH_CASES[4],
        selectTestId: 'side-filter-select-content',
        option: 'CVE',
        requestField: 'content',
        requestValue: 'cve',
        responseFields: ['m_content_type', 'content_type'],
        responseValue: 'cve',
      },
      {
        ...DIRECT_SEARCH_CASES[4],
        selectTestId: 'side-filter-select-m_severity',
        option: 'Unknown',
        requestField: 'm_severity',
        requestValue: 'unknown',
        responseFields: ['m_severity'],
        responseValue: 'unknown',
      },
      {
        ...DIRECT_SEARCH_CASES[4],
        selectTestId: 'side-filter-select-m_risk',
        option: 'Critical',
        requestField: 'm_risk',
        requestValue: 'critical',
        responseFields: ['m_risk'],
        responseValue: 'critical',
      },
      {
        ...DIRECT_SEARCH_CASES[4],
        selectTestId: 'side-filter-select-m_remote_type',
        option: 'Unknown',
        requestField: 'm_remote_type',
        requestValue: 'unknown',
        responseFields: ['m_remote_type'],
        responseValue: 'unknown',
      },
      {
        ...DIRECT_SEARCH_CASES[4],
        selectTestId: 'side-filter-select-m_platform',
        option: 'Unknown',
        requestField: 'm_platform',
        requestValue: 'unknown',
        responseFields: ['m_platform'],
        responseValue: 'unknown',
      },
      {
        section: 'Exploit',
        route: '/dashboard/exploit/all',
        endpoint: 'exploit',
        searchQuery: 'CVE-2017-0120 Uniscribe',
        expected: EXPLOIT_CVE_EXPECTED,
        selectTestId: 'side-filter-select-m_cve',
        option: 'CVE-2017-0120',
        requestField: 'm_cve',
        requestValue: 'cve-2017-0120',
        responseFields: ['m_cve'],
        responseValue: 'cve-2017-0120',
      },
      {
        section: 'Exploit',
        route: '/dashboard/exploit/all',
        endpoint: 'exploit',
        searchQuery: 'Ivanti Sentry CWE-78',
        expected: EXPLOIT_SENTRY_EXPECTED,
        selectTestId: 'side-filter-select-m_cwe',
        option: 'CWE-78',
        requestField: 'm_cwe',
        requestValue: 'cwe-78',
        responseFields: ['m_cwe'],
        responseValue: 'cwe-78',
      },
      {
        section: 'Exploit',
        route: '/dashboard/exploit/all',
        endpoint: 'exploit',
        searchQuery: 'Ivanti Sentry CWE-78',
        expected: EXPLOIT_SENTRY_EXPECTED,
        selectTestId: 'side-filter-select-m_product',
        option: 'Sentry',
        requestField: 'm_product',
        requestValue: 'sentry',
        responseFields: ['m_product'],
        responseValue: 'sentry',
      },
      {
        section: 'Exploit',
        route: '/dashboard/exploit/all',
        endpoint: 'exploit',
        searchQuery: 'Langflow pip RCE',
        expected: EXPLOIT_LANGFLOW_EXPECTED,
        selectTestId: 'side-filter-select-m_tags',
        option: 'pip',
        requestField: 'm_tags',
        requestValue: 'pip',
        responseFields: ['m_tags'],
        responseValue: 'pip',
      },
    ],
  },
  {
    section: 'Feed',
    cases: [
      {
        ...DIRECT_SEARCH_CASES[5],
        selectTestId: 'side-filter-select-network',
        option: 'Clearnet',
        requestField: 'network',
        requestValue: 'clearnet',
        responseFields: ['m_network'],
        responseValue: 'clearnet',
      },
      {
        ...DIRECT_SEARCH_CASES[5],
        requestField: 'daterange',
        requestValue: '2026-01-11,2026-01-12',
        filterKind: 'daterange',
        dateRange: { monthLabel: 'January 2026', startDay: 11, endDay: 12 },
        responseFields: ['m_date', 'm_creation_date'],
        responseValue: '2026-01-12',
      },
      {
        ...DIRECT_SEARCH_CASES[5],
        selectTestId: 'side-filter-select-content',
        option: 'News',
        requestField: 'content',
        requestValue: 'news',
        responseFields: ['m_content_type', 'content_type'],
        responseValue: 'news',
      },
    ],
  },
];

export const ADVANCED_ENTITY_FILTER_CASES: AdvancedEntityFilterCase16[] = [
  {
    section: 'Exploit',
    route: '/dashboard/exploit/all',
    endpoint: 'exploit',
    category: 'Emails',
    requestField: 'm_email',
    value: 'attacker@example.com',
    searchQuery: 'attacker@example.com SMTP',
    expected: EXPLOIT_SMTP_EXPECTED,
    responseFields: ['m_email'],
    responseValue: 'attacker@example.com',
  },
  {
    section: 'Exploit',
    route: '/dashboard/exploit/all',
    endpoint: 'exploit',
    category: 'Domains',
    requestField: 'm_domain',
    value: 'example.com',
    searchQuery: 'VCR.py example.com',
    expected: EXPLOIT_VCR_EXPECTED,
    responseFields: ['m_domain'],
    responseValue: 'example.com',
  },
  {
    section: 'Exploit',
    route: '/dashboard/exploit/all',
    endpoint: 'exploit',
    category: 'URLs',
    requestField: 'm_url',
    value: 'https://www.kb.cert.org/vuls/id/517845',
    searchQuery: 'attacker@example.com SMTP',
    expected: EXPLOIT_SMTP_EXPECTED,
    responseFields: ['m_url'],
    responseValue: 'https://www.kb.cert.org/vuls/id/517845',
  },
  {
    section: 'Exploit',
    route: '/dashboard/exploit/all',
    endpoint: 'exploit',
    category: 'CVE & CWE',
    requestField: 'm_cve',
    value: 'CWE-502',
    searchQuery: 'VCR.py CWE-502',
    expected: EXPLOIT_VCR_EXPECTED,
    responseFields: ['m_cwe'],
    responseValue: 'CWE-502',
  },
  {
    section: 'Exploit',
    route: '/dashboard/exploit/all',
    endpoint: 'exploit',
    category: 'Country',
    requestField: 'm_country',
    value: 'united states',
    searchQuery: 'Ivanti Sentry CWE-78',
    expected: EXPLOIT_SENTRY_EXPECTED,
    responseFields: ['m_country'],
    responseValue: 'united states',
  },
];

function resetSearchStorage16(win: Window) {
  win.localStorage.setItem('entityfilterCategories', '{}');
  win.localStorage.setItem('entityFilterCondition', 'true');
  win.localStorage.setItem('matchType', 'or');
  win.localStorage.setItem('advance_setting_toggle', 'true');
}

function waitForSearchReady16() {
  void cy.get('app-loading-form').should('not.exist');
  void cy.get('.ui-shimmer', { timeout: 60000 }).should('not.exist');
  void cy.get(SEARCH_INPUT_16).first().should('be.visible').and('be.enabled');
}

function visitSearchSection16(route: string) {
  void cy.visit(`${route}?page=1`, {
    onBeforeLoad: resetSearchStorage16,
  });
  void cy.location('pathname').should('eq', route);
  waitForSearchReady16();
}

function searchAlias16(endpoint: SearchEndpoint16, alias: string) {
  void cy.intercept('POST', `${API_BASE_16}/${endpoint}`).as(alias);
}

function aliasKey16(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '');
}

function typeDashboardSearch16(value: string) {
  void cy.scrollDashboardToTop();
  waitForSearchReady16();
  void cy.get(SEARCH_INPUT_16).first()
    .type(`{selectall}{backspace}${value}`, { force: true });
  submitDashboardSearch16();
}

function submitDashboardSearch16() {
  void cy.scrollDashboardToTop();
  cy.get('body').then(($body) => {
    const submitButton = $body.find('[data-testid="dashboard-search-submit"]:visible').first();
    if (submitButton.length > 0) {
      void cy.wrap(submitButton).scrollIntoView().should('be.visible').click({ force: true });
      return;
    }
    void cy.get(SEARCH_INPUT_16).first().type('{enter}', { force: true });
  });
}

function normalize16(value: unknown): string {
  return displayText16(value)
    .replace(/\\u201c/g, '"')
    .replace(/\\u201d/g, '"')
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function displayText16(value: unknown): string {
  return String(value ?? '')
    .replace(/\\u201c/g, '“')
    .replace(/\\u201d/g, '”');
}

function normalizeUrl16(value: unknown): string {
  return normalize16(value).replace(/\/$/, '');
}

function values16(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(item => values16(item));
  }
  return [String(value ?? '').trim()].filter(Boolean);
}

function record16(value: unknown): SearchRecord16 {
  return value as SearchRecord16;
}

function fieldValues16(item: unknown, fields: string[]): string[] {
  const itemRecord = record16(item);
  return fields
    .flatMap(field => values16(itemRecord[field]))
    .filter(Boolean);
}

function resultItems16(body: unknown): unknown[] {
  const bodyRecord = record16(body);
  const dataRecord = record16(bodyRecord['data']);
  const hitsRecord = record16(bodyRecord['hits']);
  if (Array.isArray(bodyRecord['Result'])) {
    return bodyRecord['Result'];
  }
  if (Array.isArray(bodyRecord['result'])) {
    return bodyRecord['result'];
  }
  if (Array.isArray(dataRecord['Result'])) {
    return dataRecord['Result'];
  }
  if (Array.isArray(hitsRecord['hits'])) {
    return hitsRecord['hits'].map((hit: unknown) => record16(hit)['_source'] || hit);
  }
  return [];
}

function expectedList16(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function hasExpectedText16(item: unknown, fields: string[], expected: string): boolean {
  const normalizedExpected = normalize16(expected);
  return fieldValues16(item, fields).some(value => normalize16(value) === normalizedExpected);
}

function hasExpectedUrl16(item: unknown, fields: string[], expected: string): boolean {
  const normalizedExpected = normalizeUrl16(expected);
  return fieldValues16(item, fields).some(value => normalizeUrl16(value) === normalizedExpected);
}

function resultMatchesExpected16(item: unknown, expected: ExpectedSearchResult16): boolean {
  const titleMatches = expected.title
    ? hasExpectedText16(item, ['title', 'm_title', 'm_name', 'name'], expected.title)
    : true;
  const linkMatches = expectedList16(expected.linkAddress).length
    ? expectedList16(expected.linkAddress).some(link => hasExpectedUrl16(item, ['link_address', 'm_url', 'm_url_www', 'url', 'm_origin_url', 'm_message_sharable_link', 'm_channel_url'], link))
    : true;
  const baseUrlMatches = expectedList16(expected.baseUrl).length
    ? expectedList16(expected.baseUrl).some(baseUrl => hasExpectedText16(item, ['base_url', 'm_base_url', 'm_url', 'url'], baseUrl))
    : true;
  const webUrlMatches = expectedList16(expected.webUrl).length
    ? expectedList16(expected.webUrl).some(webUrl => hasExpectedUrl16(item, ['web_url', 'm_url', 'url', 'm_origin_url'], webUrl))
    : true;
  const teamMatches = expected.team
    ? hasExpectedText16(item, ['team', 'm_team', 'm_author', 'm_name'], expected.team)
    : true;
  const dateMatches = expected.responseDate
    ? fieldValues16(item, ['date', 'm_date', 'm_creation_date', 'created_at']).some(date => normalize16(date).includes(normalize16(expected.responseDate)))
    : true;

  return titleMatches && linkMatches && baseUrlMatches && webUrlMatches && teamMatches && dateMatches;
}

function findExpectedResult16(body: unknown, expected: ExpectedSearchResult16): unknown {
  const items = resultItems16(body);
  expect(items.length, 'Search API returned result count').to.be.greaterThan(0);

  const match = items.find(item => resultMatchesExpected16(item, expected));
  expect(match, `static expected result "${expected.title || expected.baseUrl || expected.linkAddress}"`).to.exist;
  return match;
}

function assertQueryEvidence16(item: unknown, expected: ExpectedSearchResult16) {
  const haystack = normalize16(JSON.stringify(item));
  expected.queryMatches.forEach(queryMatch => {
    expect(haystack, `query evidence "${queryMatch}"`).to.include(normalize16(queryMatch));
  });
}

function assertResponseResult16(interception: SearchInterception16, expected: ExpectedSearchResult16): unknown {
  const result = findExpectedResult16(interception.response?.body, expected);
  assertQueryEvidence16(result, expected);
  return result;
}

function assertFilterFields16(result: unknown, fields?: string[], value?: string) {
  if (!fields || !value) {
    return;
  }

  const values = fieldValues16(result, fields).map(fieldValue => normalize16(fieldValue));
  const expectedValue = normalize16(value);
  expect(values.some(fieldValue => fieldValue === expectedValue || fieldValue.includes(expectedValue)), fields.join(',')).to.eq(true);
}

function assertFilteredResponse16(interception: SearchInterception16, filterCase: SidebarFilterCase16) {
  const result = assertResponseResult16(interception, filterCase.expected);
  assertFilterFields16(result, filterCase.responseFields, filterCase.responseValue);
}

function requestValue16(body: unknown, field: string): string {
  const value = record16(body)[field];
  if (Array.isArray(value)) {
    return normalize16(value[0]);
  }
  return normalize16(value);
}

function assertSearchRequest16(interception: SearchInterception16, searchCase: DirectSearchCase16) {
  expect(normalize16(interception.request.body['q']), `${searchCase.section} request q`).to.eq(normalize16(searchCase.searchQuery));
}

function assertSidebarRequest16(interception: SearchInterception16, filterCase: SidebarFilterCase16) {
  expect(normalize16(interception.request.body['q']), `${filterCase.section} filter request q`).to.eq(normalize16(filterCase.searchQuery));
  expect(requestValue16(interception.request.body, filterCase.requestField), `${filterCase.section} request ${filterCase.requestField}`).to.eq(filterCase.requestValue);
}

function waitForMatchingSearch16(alias: string, matches: (interception: SearchInterception16) => boolean, label: string, attempts = 5): Cypress.Chainable<SearchInterception16> {
  return cy.wait(`@${alias}`).then((captured) => {
    const interception = captured as unknown as SearchInterception16;
    if (matches(interception)) {
      return interception;
    }
    if (attempts <= 1) {
      throw new Error(`Expected matching ${label} request was not captured.`);
    }
    return waitForMatchingSearch16(alias, matches, label, attempts - 1);
  }) as unknown as Cypress.Chainable<SearchInterception16>;
}

function matchesQueryRequest16(searchCase: DirectSearchCase16) {
  return (interception: SearchInterception16) => normalize16(interception.request.body['q']) === normalize16(searchCase.searchQuery);
}

function matchesSidebarRequest16(filterCase: SidebarFilterCase16) {
  return (interception: SearchInterception16) => normalize16(interception.request.body['q']) === normalize16(filterCase.searchQuery)
    && requestValue16(interception.request.body, filterCase.requestField) === filterCase.requestValue;
}

function entityFilterValues16(interception: SearchInterception16, field: string): string[] {
  return values16(record16(interception.request.body['entity_filter'])[field]);
}

function matchesEntityFilterRequest16(filterCase: AdvancedEntityFilterCase16) {
  return (interception: SearchInterception16) => {
    const queryMatches = filterCase.searchQuery
      ? normalize16(interception.request.body['q']) === normalize16(filterCase.searchQuery)
      : true;
    const entityMatches = entityFilterValues16(interception, filterCase.requestField)
      .map(value => normalize16(value))
      .includes(normalize16(filterCase.value));
    return queryMatches && entityMatches;
  };
}

function assertRenderedSearchResult16(expected: ExpectedSearchResult16) {
  if (expected.baseUrl || expected.team) {
    if (expected.team) {
      void cy.get('body').should('contain.text', expected.team);
    }
    expected.queryMatches.forEach(queryMatch => {
      void cy.get('body').should('contain.text', queryMatch);
    });
    return;
  }

  void cy.get('[data-testid="result-card"]', { timeout: 20000 }).should('have.length.at.least', 1);
  void cy.contains('[data-testid="result-card"]', displayText16(expected.title), { matchCase: false })
    .scrollIntoView()
    .should('be.visible')
    .within(() => {
      expectedList16(expected.linkAddress).forEach(link => {
        void cy.contains(link).should('exist');
      });
      if (expected.date) {
        void cy.contains(expected.date).should('exist');
      }
    });
}

function openSidebar16() {
  void cy.scrollDashboardToTop();
  void cy.openSideFilter();
  void cy.get('[data-testid="side-filter-apply"]').filter(':visible')
    .first()
    .should('be.visible');
}

function selectSidebarFilterOption16(selectTestId: string, option: string) {
  cy.get(`[data-testid="${selectTestId}"]`)
    .then(($selects) => {
      const $visibleSelect = $selects.filter(':visible').first();
      const $select = $visibleSelect.length ? $visibleSelect : $selects.first();
      expect($select.length, `${selectTestId} trigger`).to.eq(1);

      return cy.wrap($select).scrollIntoView().then(($select) => {
        if ($select.is('select')) {
          void cy.wrap($select).select(option, { force: true });
          return;
        }

        const menuId = $select.attr('aria-controls');
        expect(menuId, `${selectTestId} menu id`).to.exist;
        void cy.wrap($select).click({ force: true });
        void cy.wrap($select).should('have.attr', 'aria-expanded', 'true');
        const typeOption = () => cy.get(`#${menuId}`).parent()
          .find('input')
          .then(($input) => {
            if ($input.length > 0) {
              void cy.wrap($input.first()).clear({ force: true }).type(option, { force: true });
            }
          });

        void typeOption();
        if (selectTestId !== 'side-filter-select-m_cve') {
          void cy.contains(`#${menuId} [role="option"]`, option, { timeout: 15000, matchCase: false }).click({ force: true });
          return;
        }

        const optionSelector = `#${menuId} [role="option"]`;
        const clickOption = (attempt = 1): Cypress.Chainable => cy.wait(2000).then(() => {
          const options = Cypress.$(optionSelector).toArray();
          const match = options
            .find(element => (element.textContent || '').toLowerCase().includes(option.toLowerCase()));
          if (match) {
            return cy.wrap(match).click({ force: true });
          }
          const noResults = options.some(element => (element.textContent || '').toLowerCase().includes('no results'));
          if (!noResults || attempt >= 3) {
            throw new Error(`Expected ${option} in ${optionSelector} after ${attempt} attempts`);
          }
          return typeOption().then(() => clickOption(attempt + 1));
        });
        void clickOption();
      });
    });
}

function moveDatePickerToMonth16(targetLabel: string, attempts = 0): void {
  if (attempts > 24) {
    throw new Error(`Could not navigate date picker to ${targetLabel}`);
  }

  cy.get('[data-testid="side-filter-date-month-label"]').filter(':visible').first().invoke('text').then((raw) => {
    const currentLabel = raw.trim();
    if (currentLabel === targetLabel) {
      return;
    }

    const currentDate = new Date(`${currentLabel} 1`);
    const targetDate = new Date(`${targetLabel} 1`);
    const navSelector = currentDate.getTime() > targetDate.getTime()
      ? '[data-testid="side-filter-date-prev-month"]'
      : '[data-testid="side-filter-date-next-month"]';
    void cy.get(navSelector).filter(':visible').first().scrollIntoView().click({ force: true });
    moveDatePickerToMonth16(targetLabel, attempts + 1);
  });
}

function selectSidebarDateRange16(dateRange: DateRangeSelection16) {
  void cy.get('[data-testid="side-filter-date-toggle"]').filter(':visible').first().scrollIntoView().click({ force: true });
  moveDatePickerToMonth16(dateRange.monthLabel);
  void cy.get(`[data-testid="side-filter-date-day-${dateRange.startDay}"]`).filter(':visible').first().scrollIntoView().click({ force: true });
  void cy.get(`[data-testid="side-filter-date-day-${dateRange.endDay}"]`).filter(':visible').first().scrollIntoView().click({ force: true });
}

function selectSidebarFilter16(filterCase: SidebarFilterCase16) {
  if (filterCase.filterKind === 'daterange') {
    expect(filterCase.dateRange, `${filterCase.section} date range`).to.exist;
    selectSidebarDateRange16(filterCase.dateRange!);
    return;
  }

  expect(filterCase.selectTestId, `${filterCase.section} select test id`).to.exist;
  expect(filterCase.option, `${filterCase.section} option`).to.exist;
  selectSidebarFilterOption16(filterCase.selectTestId!, filterCase.option!);
}

function ensureAdvancedFiltersOpen16() {
  void cy.get(SEARCH_INPUT_16).first().click({ force: true });
  cy.get('[data-testid="dashboard-advance-toggle"]').should('exist')
    .then(($toggle) => {
      if (!($toggle[0] as HTMLInputElement).checked) {
        void cy.wrap($toggle).closest('label').click({ force: true });
      }
    });
  void cy.get(SEARCH_INPUT_16).first().click({ force: true });
  void cy.get('app-search-filters').should('be.visible');
}

function applyEntityFilter16(category: string, value: string) {
  const categoryKey = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  void cy.get('app-search-filters input').first().clear({ force: true }).type(category, { force: true });
  void cy.get(`[data-testid="entity-filter-category-${categoryKey}"]`).should('be.visible')
    .scrollIntoView()
    .click({ force: true });
  void cy.get('[data-testid="entity-filter-value-input"]').scrollIntoView()
    .clear({ force: true })
    .type(value, { force: true });
  void cy.get('[data-testid="entity-filter-add-value"]').should('be.visible')
    .scrollIntoView()
    .click({ force: true });
  void cy.contains('app-search-filters', value).should('be.visible');
}

function clearEntityFilters16() {
  ensureAdvancedFiltersOpen16();
  void cy.get('[data-testid="entity-filter-clear-selection"]').scrollIntoView()
    .click({ force: true });
}

export function assertDirectSearchResult16(searchCase: DirectSearchCase16) {
  const alias = `${searchCase.endpoint}DirectSearch16`;

  visitSearchSection16(searchCase.route);
  searchAlias16(searchCase.endpoint, alias);
  typeDashboardSearch16(searchCase.searchQuery);

  waitForMatchingSearch16(alias, matchesQueryRequest16(searchCase), `${searchCase.section} direct search`).then((interception) => {
    expect(interception.response?.statusCode).to.eq(200);
    assertSearchRequest16(interception, searchCase);
    assertResponseResult16(interception, searchCase.expected);
  });
  assertRenderedSearchResult16(searchCase.expected);
}

export function assertSidebarFilterResult16(filterCase: SidebarFilterCase16) {
  const aliasKey = aliasKey16(`${filterCase.endpoint}-${filterCase.requestField}-${filterCase.requestValue}`);
  const directAlias = `${aliasKey}BeforeSidebar16`;
  const filterAlias = `${aliasKey}SidebarSearch16`;

  visitSearchSection16(filterCase.route);
  searchAlias16(filterCase.endpoint, directAlias);
  typeDashboardSearch16(filterCase.searchQuery);
  waitForMatchingSearch16(directAlias, matchesQueryRequest16(filterCase), `${filterCase.section} pre-filter search`).then((interception) => {
    expect(interception.response?.statusCode).to.eq(200);
    assertResponseResult16(interception, filterCase.expected);
  });

  openSidebar16();
  selectSidebarFilter16(filterCase);
  searchAlias16(filterCase.endpoint, filterAlias);
  void cy.get('[data-testid="side-filter-apply"]').filter(':visible')
    .first()
    .click({ force: true });

  waitForMatchingSearch16(filterAlias, matchesSidebarRequest16(filterCase), `${filterCase.section} sidebar filter`).then((interception) => {
    expect(interception.response?.statusCode).to.eq(200);
    assertSidebarRequest16(interception, filterCase);
    assertFilteredResponse16(interception, filterCase);
  });
  assertRenderedSearchResult16(filterCase.expected);
}

export function assertAdvancedEntityFilterResult16(filterCase: AdvancedEntityFilterCase16) {
  const alias = `${aliasKey16(`${filterCase.endpoint}-${filterCase.requestField}-${filterCase.value}`)}AdvancedEntitySearch16`;

  visitSearchSection16(filterCase.route);
  clearEntityFilters16();
  applyEntityFilter16(filterCase.category, filterCase.value);
  searchAlias16(filterCase.endpoint, alias);
  if (filterCase.searchQuery) {
    typeDashboardSearch16(filterCase.searchQuery);
  }
  else {
    submitDashboardSearch16();
  }

  waitForMatchingSearch16(alias, matchesEntityFilterRequest16(filterCase), `${filterCase.section} ${filterCase.category} filter`).then((interception) => {
    expect(interception.response?.statusCode).to.eq(200);
    expect(entityFilterValues16(interception, filterCase.requestField).map(value => normalize16(value)), `${filterCase.requestField} entity request`).to.include(normalize16(filterCase.value));
    const result = assertResponseResult16(interception, filterCase.expected);
    assertFilterFields16(result, filterCase.responseFields, filterCase.responseValue);
  });
  assertRenderedSearchResult16(filterCase.expected);
}
