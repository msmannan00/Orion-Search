import { stubExtensionPresence } from './08-social-extension.controller';

export const PLATFORM_CARD = '[data-testid="social-platform-card"]';
const CRAWL_PANEL = '[data-testid="social-tab-panel-crawl"]';
export const GRAPH_ROOT = '[data-testid="social-user-graph-root"]';
export const GRAPH_FIND = '[data-testid="social-user-graph-find"]';
export const GRAPH_FIND_INPUT = '[data-testid="social-user-graph-find-input"]';
export const SCAN_TIMEOUT = 180000;
export const FETCH_TIMEOUT = 120000;
const API_MOCKS = '../backend/tests/mock/api';
const ELASTIC_MOCKS = '../backend/tests/mock/elastic';

export const SOCIAL_USERNAME = 'superman0011';
export const SOCIAL_PLATFORM = /twitter/i;
export const SOCIAL_DOMAIN = 'twitter.com';
const CRAWL_TYPES = ['details', 'posts', 'videos', 'images', 'followers', 'repositories'];

function asRecord(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

export function findStealerRow(rows: JQuery, limit?: number) {
  const candidates = limit ? [...rows].slice(0, limit) : [...rows];
  return candidates.find((row) => {
    const domain = row.querySelector('[title]')?.getAttribute('title') || '';
    return (row.textContent || '').includes(SOCIAL_USERNAME) && isStealerDomain(domain);
  });
}

function isStealerDomain(value: string) {
  try {
    const host = new URL(value.includes('://') ? value : `https://${value}`).hostname.replace(/^www\./, '');
    return host === SOCIAL_DOMAIN || host.endsWith(`.${SOCIAL_DOMAIN}`);
  } catch {
    return false;
  }
}

function loadMock<T = unknown>(root: string, filename: string) {
  return cy.readFile(`${root}/${filename}`, { log: false }) as Cypress.Chainable<T>;
}

function crawlItemsFor(type: string, mocks: Record<string, unknown>): unknown[] | null {
  const items = (name: string, key: string) => (asRecord(asRecord(mocks[name])['result'])[key] ?? []) as unknown[];
  switch (type) {
    case 'posts':
      return items('posts', 'posts');
    case 'videos':
      return items('videos', 'videos');
    case 'images':
      return items('images', 'images');
    case 'followers':
      return items('followers', 'followers');
    case 'repositories':
      return [{ resource_id: 'repo-1', name: 'orion-recon', url: 'https://github.com/superman0011/orion-recon', description: 'Recon helpers for Orion.', language: 'TypeScript', stars: 128, forks: 12 }];
    case 'connections':
      return items('followers', 'followers').map((entry, index) => {
        const record = asRecord(entry);
        const handle = typeof entry === 'string' ? entry : String(record['handle'] ?? record['username'] ?? `connection-${index}`);
        return {
          resource_id: `connection-${handle}`,
          handle,
          title: handle,
          url: `https://twitter.com/${handle}`,
          type: 'connections',
          parent_url: `https://twitter.com/${SOCIAL_USERNAME}/status/1`,
        };
      });
    default:
      return null;
  }
}

function reconProfilesFrom(mock: unknown) {
  return ((asRecord(mock)['result'] ?? []) as unknown[]).map((entry, index) => {
    const entryRecord = asRecord(entry);
    const meta = asRecord(entryRecord['meta'] ?? entryRecord['metadata']);
    const ids = asRecord(asRecord(entryRecord['data'])['ids']);
    const platform = String(meta['platform'] ?? 'platform');
    const username = String(meta['username'] ?? index);
    return {
      id: `${platform.toLowerCase()}:${username}`,
      meta: { platform, username, url: String(meta['url'] ?? ''), status: meta['status'] ?? 'active' },
      profile_details: {
        real_name: String(ids['fullname'] ?? ''),
        bio: String(ids['bio'] ?? ''),
        total_followers: String(ids['follower_count'] ?? ''),
        crawl_type: CRAWL_TYPES,
      },
    };
  });
}

function graphDocumentFor(username: string) {
  return {
    user_id: 'cypress',
    profile_username: username,
    config: { disallowed: [] },
    profiles: [{
      id: `twitter:${username}`,
      meta: { platform: 'Twitter', username, url: `https://twitter.com/${username}` },
      profile_details: { real_name: 'Clark Kent', bio: 'Daily Planet field reporter' },
      resources: [
        { id: 'followers', resources: [{ handle: 'loislane', url: 'https://twitter.com/loislane' }] },
        { id: 'connections', resources: [{ handle: 'dailyplanet', url: 'https://twitter.com/dailyplanet', parent_url: 'https://twitter.com/superman0011/status/1' }] },
      ],
    }],
  };
}

let loadedMocks: Record<string, unknown> = {};

function replyWithCrawlMock(request: { body?: Record<string, unknown>; reply(response: unknown): void }, type: string) {
  if (type === 'details') {
    const details = JSON.parse(JSON.stringify(asRecord(loadedMocks['profile'])['result'] ?? {})) as Record<string, unknown>;
    details['profile'] = { ...asRecord(details['profile']), crawl_type: CRAWL_TYPES };
    request.reply({ statusCode: 200, body: { status: 'done', result: details } });
    return;
  }
  const items = crawlItemsFor(type, loadedMocks);
  request.reply({ statusCode: 200, body: items === null ? { status: 'idle' } : { status: 'done', result: { items, has_more: false } } });
}

export function stubSlowCrawlSection(slowType: string, delay = 30000) {
  void cy.intercept('POST', '**/api/social/profile', (request) => {
    const type = String(request.body?.type ?? '');
    if (request.body?.command === 'cancel') {
      request.reply({ statusCode: 200, body: { status: 'done' } });
      return;
    }
    if (type === slowType) {
      request.reply({ statusCode: 200, delay, body: { status: 'done', result: { items: [], has_more: false } } });
      return;
    }
    replyWithCrawlMock(request, type);
  }).as('socialCrawl');
}

export function stubBulkCrawlSection(bulkType: string, count: number) {
  const items = Array.from({ length: count }, (_, index) => ({
    resource_id: `bulk-${index}`,
    id: `bulk-${index}`,
    caption: `Bulk ${bulkType} entry ${index}`,
    title: `Bulk ${bulkType} entry ${index}`,
    handle: `bulk_handle_${index}`,
    url: `https://twitter.com/${SOCIAL_USERNAME}/status/${index}`,
    datetime: '2026-06-13T10:00:00Z',
  }));
  void cy.intercept('POST', '**/api/social/profile', (request) => {
    const type = String(request.body?.type ?? '');
    if (request.body?.command === 'cancel') {
      request.reply({ statusCode: 200, body: { status: 'done' } });
      return;
    }
    if (type === bulkType) {
      request.reply({ statusCode: 200, body: { status: 'done', result: { items, has_more: false } } });
      return;
    }
    replyWithCrawlMock(request, type);
  }).as('socialCrawl');
}

export function setupSocialStubs() {
  stubExtensionPresence(true);

  const mocks: Record<string, unknown> = {};
  loadedMocks = mocks;
  const remember = (key: string, filename: string) => loadMock(ELASTIC_MOCKS, filename).then((mock) => {
    mocks[key] = mock;
  });

  void remember('profile', 'social_profile.json');
  void remember('posts', 'social_posts.json');
  void remember('videos', 'social_videos.json');
  void remember('images', 'social_online_images.json');
  void remember('followers', 'social_followers.json');

  loadMock(ELASTIC_MOCKS, 'social_recon.json').then((mock) => {
    void cy.intercept('POST', '**/api/social/recon', { statusCode: 200, body: { job_id: 'cypress', result: reconProfilesFrom(mock) } }).as('socialRecon');
  });
  loadMock(ELASTIC_MOCKS, 'social_online_presence.json').then((mock) => {
    void cy.intercept('POST', '**/api/social/metadata', { statusCode: 200, body: mock }).as('socialOnlinePresence');
  });
  loadMock(ELASTIC_MOCKS, 'social_stealer_logs.json').then((mock) => {
    void cy.intercept('POST', '**/api/search/stealer/ioc', { statusCode: 200, body: mock }).as('socialStealerLogs');
  });
  loadMock(API_MOCKS, 'dynamic_wanted.json').then((mock) => {
    void cy.intercept('POST', '**/api/dynamic/wanted', { statusCode: 200, body: mock }).as('socialWanted');
  });

  void cy.intercept('POST', '**/api/social/profile', (request) => {
    const type = String(request.body?.type ?? '');
    if (request.body?.command === 'cancel') {
      request.reply({ statusCode: 200, body: { status: 'done' } });
      return;
    }
    replyWithCrawlMock(request, type);
  }).as('socialCrawl');

  void cy.intercept('POST', '**/api/social/connections', (request) => {
    const query = String(request.body?.query ?? '').toLowerCase();
    const items = (crawlItemsFor('connections', mocks) ?? []) as unknown[];
    const filtered = query ? items.filter((item) => JSON.stringify(item).toLowerCase().includes(query)) : items;
    request.reply({ statusCode: 200, body: { result: { items: filtered, total: filtered.length } } });
  }).as('socialConnections');

  void cy.intercept('POST', '**/api/social/graph/data', (request) => {
    const usernames = (request.body?.usernames ?? []) as string[];
    request.reply({ statusCode: 200, body: { result: usernames.map(graphDocumentFor) } });
  }).as('socialGraphData');

  void cy.intercept('POST', '**/api/social/recon/status', { statusCode: 200, body: { status: 'pending', progress: 90, step: 'Scanning' } });
  void cy.intercept('POST', '**/api/search/social', { statusCode: 200, body: { Result: [], Total_Hits: 0 } });
  void cy.intercept('POST', '**/api/phone/universal_search', { statusCode: 200, body: { cards_data: [] } }).as('socialPhone');
  void cy.intercept('GET', '**/api/social/data', { statusCode: 200, body: { status: 'done', result: [] } });
  void cy.intercept('GET', '**/api/social/data/*', { statusCode: 200, body: { profiles: [], count: 0 } });
  void cy.intercept('POST', '**/api/social/data', { statusCode: 200, body: { status: 'done' } });
  void cy.intercept('GET', '**/api/graph/session/tabs*', { statusCode: 200, body: { tabs: [], extra: { usernames: [] } } });
  void cy.intercept('POST', '**/api/graph/session/upsert*', { statusCode: 200, body: { status: 'done' } }).as('socialGraphSave');
}

export function assertCrawlTabs() {
  const tabs: Array<[string, string, string]> = [
    ['posts', '[data-testid="social-feed-list"]', '[data-testid="social-feed-post"]'],
    ['videos', '[data-testid="social-media-grid"]', '[data-testid="social-media-tile"], [data-testid="social-media-placeholder"]'],
    ['images', '[data-testid="social-media-grid"]', '[data-testid="social-media-tile"], [data-testid="social-media-placeholder"]'],
    ['followers', '[data-testid="social-people-list"]', '[data-testid="social-people-card"]'],
    ['repositories', '[data-testid="social-work-list"]', '[data-testid="social-work-row"]'],
  ];
  tabs.forEach(([key, list, item]) => {
    clickTab(key);
    void cy.get('[data-testid="social-crawl-section-fetch"]', { timeout: FETCH_TIMEOUT }).first().click();
    void cy.wait('@socialCrawl', { timeout: FETCH_TIMEOUT });
    void cy.get(CRAWL_PANEL, { timeout: FETCH_TIMEOUT }).should('be.visible');
    void cy.get(list, { timeout: FETCH_TIMEOUT }).should('be.visible');
    void cy.get(item).should('have.length.greaterThan', 0);
    void cy.get('[data-testid="social-crawl-fresh-band"], [data-testid="social-crawl-stale-band"]').should('have.length.greaterThan', 0);
  });
  void cy.get('[data-testid="social-work-row"]').first().should('contain.text', 'orion-recon').and('contain.text', 'TypeScript');
  void cy.docsScreenshot('social-followers-popup');
}

export function stubPhoneIntelligence() {
  void cy.intercept('POST', '**/api/phone/universal_search', {
    statusCode: 200,
    delay: 700,
    body: {
      name: 'Clark Kent',
      formatted_address: 'Metropolis, DE',
      emails: ['clark.kent@dailyplanet.test'],
      knowledge_graph: { description: 'Field reporter at the Daily Planet.' },
    },
  }).as('socialPhone');
}

export function clickTab(key: string) {
  void cy.get(`[data-testid="social-fetch-tab"][data-tab-key="${key}"]`, { timeout: FETCH_TIMEOUT }).scrollIntoView().click();
}
