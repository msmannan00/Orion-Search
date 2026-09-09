import {
  FETCH_TIMEOUT,
  GRAPH_FIND,
  GRAPH_FIND_INPUT,
  GRAPH_ROOT,
  PLATFORM_CARD,
  SCAN_TIMEOUT,
  SOCIAL_DOMAIN,
  SOCIAL_PLATFORM,
  SOCIAL_USERNAME,
  assertCrawlTabs,
  clickTab,
  findStealerRow,
  setupSocialStubs,
  stubBulkCrawlSection,
  stubPhoneIntelligence,
  stubSlowCrawlSection
} from './controllers/08-social-management.controller';
import {
  assertInstallPrompt,
  assertPlatformLoadFailure,
  assertSessionCapacityReached,
  assertSessionProfiles,
  assertSignedOutPrompt,
  assertUnsupportedBrowserPrompt,
  setupManageProfilesAtCapacityStubs,
  setupManageProfilesFailureStubs,
  setupManageProfilesStubs,
  visitWithSignedOutExtension,
  visitWithUnsupportedBrowser,
  visitWithoutExtension
} from './controllers/08-social-extension.controller';

function scanUsername(username = SOCIAL_USERNAME, platform: string | RegExp = SOCIAL_PLATFORM) {
  void cy.get('[data-testid="social-scan-input"]').clear().type(username);
  void cy.get('[data-testid="social-scan-submit"]').should('not.be.disabled').click();
  void cy.wait('@socialRecon', { timeout: FETCH_TIMEOUT });
  void cy.contains('[data-testid="social-history-job"]', username, { timeout: SCAN_TIMEOUT })
    .should('contain.text', 'Results Ready')
    .click();
  void cy.contains(PLATFORM_CARD, platform, { timeout: FETCH_TIMEOUT }).scrollIntoView().should('be.visible');
}

function openProfile(platform: string | RegExp = SOCIAL_PLATFORM) {
  void cy.contains(PLATFORM_CARD, platform, { timeout: FETCH_TIMEOUT }).scrollIntoView().within(() => {
    void cy.get('[data-testid="social-profile-overview-button"]').click();
  });
  void cy.get('[data-testid="social-header-back"]').should('be.visible');
}

describe('Orion Intelligence - Social Intel Management Flow', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    setupSocialStubs();

    cy.viewport(Number(Cypress.config('viewportWidth')) || 1920, Number(Cypress.config('viewportHeight')) || 1080);
    cy.visit('/dashboard/social-intel');
    cy.get('[data-testid="social-graph-root"]').should('be.visible');
    cy.get('[data-testid="social-header-breadcrumb"]').should('contain.text', 'Social');
    cy.get('[data-testid="social-scan-control"]').should('be.visible');
    cy.get('[data-testid="social-scan-input"]').should('have.attr', 'placeholder', 'Search username or handle...');
    cy.get('[data-testid="social-scan-submit"]').should('contain.text', 'Search');
    cy.get('[data-testid="social-list-view"]').should('be.visible');
  });

  after(() => {
    cy.logout();
  });

  it('scans a username and covers the result list, exposure signals and wanted list', () => {
    scanUsername();
    cy.docsScreenshot('social-intel');

    cy.get('[data-testid="social-header-breadcrumb-root"]').should('be.visible');
    cy.get('[data-testid="social-header-breadcrumb-current"]').should('be.visible');
    cy.get('[data-testid="social-image-upload-trigger"]').should('have.attr', 'title', 'Scan by image');
    cy.get('[data-testid="social-image-file-input"]').should('have.attr', 'accept').and('include', 'image/');

    cy.contains('[data-testid="social-sidebar-platform-row"]', SOCIAL_PLATFORM, { timeout: FETCH_TIMEOUT }).scrollIntoView().click();
    cy.get('[data-testid="social-platform-search"]').clear().type('twitter');
    cy.get('[data-testid="social-sidebar-platform-row"]').should('have.length.greaterThan', 0).each(($row) => {
      expect(($row.text() || '').toLowerCase()).to.include('twitter');
    });
    cy.get('[data-testid="social-platform-search"]').clear();

    cy.get('[data-testid="social-list-platform-open-link"]').first()
      .should('have.attr', 'target', '_blank')
      .and('have.attr', 'rel').and('include', 'noopener');

    cy.docsScreenshot('social-intel-list-view');

    cy.get('[data-testid="social-stealerlog-section"]').should('be.visible');
    cy.wait('@socialStealerLogs', { timeout: FETCH_TIMEOUT });
    cy.get('[data-testid="social-dashboard-stealer-exposure"]', { timeout: FETCH_TIMEOUT })
      .should('be.visible')
      .and('contain.text', 'Exposure found');
    cy.get('[data-testid="social-dashboard-stealer-row"]').should('have.length.greaterThan', 0).then(($rows) => {
      assert.exists(findStealerRow($rows, 3), `a top stealer row is on ${SOCIAL_DOMAIN}`);
    });

    cy.get('[data-testid="social-dashboard-stealer-download"]').click();
    cy.get('[data-testid="social-dashboard-stealer-export-overlay"]').should('exist');
    cy.get('[data-testid="social-dashboard-stealer-export-modal"]').should('be.visible');
    cy.get('[data-testid="social-dashboard-stealer-export-close"]').click();
    cy.get('[data-testid="social-dashboard-stealer-export-modal"]').should('not.exist');

    cy.get('[data-testid="social-wanted-list-section"]', { timeout: FETCH_TIMEOUT }).within(() => {
      cy.get('[data-testid="social-wanted-search-input"]').clear().type('John Doe');
      cy.get('[data-testid="social-wanted-search-button"]').should('not.be.disabled').click();
    });
    cy.wait('@socialWanted', { timeout: FETCH_TIMEOUT });
    cy.get('[data-testid="social-wanted-result-row"]', { timeout: FETCH_TIMEOUT })
      .should('have.length.greaterThan', 0)
      .first()
      .should('contain.text', 'Johnathan Andrew Doe')
      .and('contain.text', 'red_notice');

    cy.get('[data-testid="social-wanted-clear-button"]').click();
    cy.get('[data-testid="social-wanted-search-input"]').should('have.value', '');
    cy.get('[data-testid="social-wanted-empty"]', { timeout: FETCH_TIMEOUT }).should('be.visible');

    cy.get('[data-testid="social-list-manage-profiles"]').first().click();
    cy.get('[data-testid="social-manage-profiles-overlay"]').should('be.visible');
    cy.get('[data-testid="social-manage-profiles-modal"]').should('be.visible');
    cy.docsScreenshot('social-manage-profiles');

    cy.get('[data-testid="social-manage-profiles-filter"]').clear().type('definitely-not-a-platform');
    cy.get('[data-testid="social-manage-profiles-no-matches"]', { timeout: FETCH_TIMEOUT }).should('be.visible');
    cy.get('[data-testid="social-manage-profile-card"]').should('not.exist');

    cy.get('[data-testid="social-manage-profiles-filter"]').clear().type('twitter');
    cy.get('[data-testid="social-manage-profile-card"]', { timeout: FETCH_TIMEOUT }).should('have.length.greaterThan', 0);
    cy.get('[data-testid="social-manage-profile-switch"]').first().should('have.attr', 'role', 'switch');
    cy.get('[data-testid="social-manage-profiles-select-all"]').should('be.disabled');
    cy.get('[data-testid="social-manage-profiles-deselect-all"]').click();
    cy.get('[data-testid="social-manage-profiles-select-all"]').should('not.be.disabled').click();
    cy.get('[data-testid="social-manage-profiles-update-graph"]').should('be.visible');

    cy.get('[data-testid="social-manage-profiles-close"]').click();
    cy.get('[data-testid="social-manage-profiles-modal"]').should('not.exist');
  });

  it('switches between normal and darkweb result sources', () => {
    cy.intercept('POST', '**/api/social/recon', {
      statusCode: 200,
      body: {
        job_id: 'cypress',
        result: [
          { id: 'twitter:superman0011', meta: { platform: 'Twitter', username: SOCIAL_USERNAME, url: 'https://twitter.com/superman0011', status: 'active' }, profile_details: { real_name: 'Clark Kent' } },
          { id: 'telegram:superman0011', meta: { platform: 'Telegram', username: SOCIAL_USERNAME, url: 'https://t.me/superman0011', status: 'active' }, profile_details: { real_name: 'Clark Kent' } },
        ],
      },
    }).as('socialRecon');

    scanUsername();

    cy.get('[data-testid="social-result-source-tabs"]', { timeout: FETCH_TIMEOUT }).should('be.visible');
    cy.get('[data-testid="social-result-source-tabs"]').contains('button', 'Darkweb').click();
    cy.contains(PLATFORM_CARD, /telegram/i, { timeout: FETCH_TIMEOUT }).should('be.visible');
    cy.get('[data-testid="social-result-source-tabs"]').contains('button', 'Normal').click();
    cy.contains(PLATFORM_CARD, SOCIAL_PLATFORM, { timeout: FETCH_TIMEOUT }).should('be.visible');
  });

  it('queries stealer logs only for the username on the opened profile', () => {
    const scanUsernameValue = 'investigation_root';
    const openedUsername = 'opened_profile_handle';
    cy.intercept('POST', '**/api/social/recon', {
      statusCode: 200,
      body: {
        job_id: 'cypress',
        result: [{
          id: `youtube:${openedUsername}`,
          meta: { platform: 'YouTube', username: openedUsername, url: `https://www.youtube.com/@${openedUsername}`, status: 'active' },
          profile_details: { real_name: 'Opened Profile', is_parsed: true },
          stealer_logs: [{ m_username: 'wrong_cached_handle', m_domain: 'youtube.com' }],
          exposure_signals: { query: scanUsernameValue, records: [{ m_username: 'wrong_cached_handle', m_domain: 'youtube.com' }] },
        }],
      },
    }).as('socialRecon');
    cy.intercept('POST', '**/api/search/stealer/ioc', (request) => {
      request.reply({
        statusCode: 200,
        body: { Result: [{ m_username: request.body.user, m_domain: 'unrelated.example', m_password: '********' }] },
      });
    }).as('socialStealerLogs');

    scanUsername(scanUsernameValue, /youtube/i);
    cy.wait('@socialStealerLogs', { timeout: FETCH_TIMEOUT }).then(({ request }) => {
      expect(request.body.ioc).to.eq(`m_username:${scanUsernameValue}`);
      expect(request.body.user).to.eq(scanUsernameValue);
      expect(request.body.url).to.eq('');
    });

    openProfile(/youtube/i);
    clickTab('stealerLogs');
    cy.wait('@socialStealerLogs', { timeout: FETCH_TIMEOUT }).then(({ request }) => {
      expect(request.body.ioc).to.eq(`m_username:${openedUsername}`);
      expect(request.body.user).to.eq(openedUsername);
      expect(request.body.url).to.eq('');
      expect(request.body.ioc).not.to.contain('m_domain');
      expect(request.body.ioc).not.to.contain('youtube.com');
    });
    cy.get('[data-testid="social-stealerlog-row"]', { timeout: FETCH_TIMEOUT })
      .should('contain.text', openedUsername)
      .and('contain.text', 'unrelated.example')
      .and('not.contain.text', 'wrong_cached_handle');
  });

  it('covers the scan history panel, phone intelligence and a failed scan retry', () => {
    stubPhoneIntelligence();
    scanUsername();

    cy.get('[data-testid="home-menu-history-heading"]').should('contain.text', 'Scan History');
    cy.get('[data-testid="graph-sidebar-collapse"]').click();
    cy.get('[data-testid="social-collapsed-history-job"]', { timeout: FETCH_TIMEOUT }).should('have.length.greaterThan', 0);
    cy.get('[data-testid="graph-sidebar-expand"]').click();
    cy.get('app-home-menu [data-sidebar-expanded]').should('be.visible');

    cy.contains('[data-testid="social-history-job"]', SOCIAL_USERNAME).find('button[title="Delete Profile"]').first().click({ force: true });
    cy.get('[data-testid="confirmation-popup"]', { timeout: FETCH_TIMEOUT }).should('contain.text', SOCIAL_USERNAME);
    cy.get('[data-testid="confirmation-yes-button"]').should('be.visible');
    cy.get('app-confirmation-popup [data-role="backdrop"]').click('topLeft');
    cy.get('[data-testid="confirmation-popup"]').should('not.exist');
    cy.contains('[data-testid="social-history-job"]', SOCIAL_USERNAME).should('be.visible');

    cy.get('[data-testid="social-phone-lookup-section"]', { timeout: FETCH_TIMEOUT }).should('be.visible');
    cy.get('[data-testid="social-phone-search-input"]').clear().type('15550100');
    cy.get('[data-testid="social-phone-search-button"]').should('not.be.disabled').click();
    cy.get('[data-testid="social-phone-loading"]').should('be.visible');
    cy.wait('@socialPhone', { timeout: FETCH_TIMEOUT }).then(({ request }) => {
      expect(String(request.body.text.query)).to.contain('15550100');
    });
    cy.get('[data-testid="social-phone-entity"]', { timeout: FETCH_TIMEOUT }).should('contain.text', 'Clark Kent');
    cy.get('[data-testid="social-phone-footprints"]').should('contain.text', 'Field reporter at the Daily Planet.');
    cy.get('[data-testid="social-phone-clear-button"]').click();
    cy.get('[data-testid="social-phone-search-input"]').should('have.value', '');

    cy.intercept('POST', '**/api/social/recon', { statusCode: 200, body: { status: 'failed', message: 'Scan failed' } }).as('socialRecon');
    cy.intercept('POST', '**/api/social/recon/status', { statusCode: 200, body: { status: 'failed', message: 'Scan failed' } });

    cy.get('[data-testid="social-scan-input"]').clear().type('failing_target');
    cy.get('[data-testid="social-scan-submit"]').click();
    cy.contains('[data-testid="social-history-job"]', 'failing_target', { timeout: SCAN_TIMEOUT })
      .should('contain.text', 'Scan failed')
      .find('[data-testid="social-history-retry"]')
      .should('have.attr', 'title', 'Retry Scan')
      .click();
    cy.wait('@socialRecon', { timeout: FETCH_TIMEOUT });
  });

  it('covers every profile fetch tab and its reload controls', () => {
    scanUsername();
    openProfile();
    cy.get('[data-testid="social-header-breadcrumb-profile"]').should('contain.text', SOCIAL_USERNAME);

    cy.get('[data-testid="social-tab-panel-details"]', { timeout: FETCH_TIMEOUT }).should('contain.text', 'Clark Kent');
    cy.get('[data-testid="social-details-reload"]').click();
    cy.wait('@socialCrawl', { timeout: FETCH_TIMEOUT }).then(({ request }) => {
      expect(request.body.type).to.eq('details');
      expect(request.body.username).to.eq(SOCIAL_USERNAME);
    });
    cy.docsScreenshot('social-summary-popup');

    assertCrawlTabs();
  });

  it('covers the crawl section, connections, online presence and stealer log tabs', () => {
    scanUsername();
    openProfile();

    clickTab('posts');
    cy.get('[data-testid="social-crawl-section-fetch"]', { timeout: FETCH_TIMEOUT }).first().click();
    cy.wait('@socialCrawl', { timeout: FETCH_TIMEOUT }).then(({ request }) => {
      expect(request.body.username).to.eq(SOCIAL_USERNAME);
      expect(request.body.command).to.eq('crawl');
    });
    cy.get('[data-testid="social-crawl-resource-card"], [data-testid="social-feed-post"]').should('have.length.greaterThan', 0);

    clickTab('connections');
    cy.get('[data-testid="social-connections-cap-note"]', { timeout: FETCH_TIMEOUT })
      .find('[data-testid="social-crawl-section-fetch"]')
      .click();
    cy.get('[data-testid="social-connections-search"]', { timeout: FETCH_TIMEOUT }).type('loislane');
    cy.wait('@socialConnections', { timeout: FETCH_TIMEOUT }).then(({ request }) => {
      expect(request.body.query).to.eq('loislane');
    });
    cy.get('[data-testid="social-tab-panel-crawl"]', { timeout: FETCH_TIMEOUT })
      .should('contain.text', 'loislane')
      .and('not.contain.text', 'jimmyolsen');

    clickTab('onlinePresence');
    cy.get('[data-testid="social-online-presence-input"]', { timeout: FETCH_TIMEOUT }).clear().type(SOCIAL_USERNAME);
    cy.get('[data-testid="social-online-presence-submit"]').should('not.be.disabled').click();
    cy.wait('@socialOnlinePresence', { timeout: FETCH_TIMEOUT });
    cy.get('[data-testid="social-online-presence-result"]', { timeout: FETCH_TIMEOUT })
      .should('have.length.greaterThan', 0)
      .first()
      .should('contain.text', 'superman0011 on GitHub');
    cy.get('[data-testid="social-online-presence-reload"]').click();
    cy.wait('@socialOnlinePresence', { timeout: FETCH_TIMEOUT });
    cy.get('[data-testid="social-tab-panel-online-presence"]').should('be.visible');
    cy.docsScreenshot('social-metadata-results');

    clickTab('stealerLogs');
    cy.get('[data-testid="social-tab-panel-stealer-logs"]', { timeout: FETCH_TIMEOUT }).should('be.visible');
    cy.get('[data-testid="social-stealerlog-table"]').should('be.visible');
    cy.get('[data-testid="social-stealerlog-row"]').should('have.length.greaterThan', 0).then(($rows) => {
      assert.exists(findStealerRow($rows), `a stealer row is on ${SOCIAL_DOMAIN}`);
    });
    cy.get('[data-testid="social-stealer-logs-reload"]').click();
    cy.wait('@socialStealerLogs', { timeout: FETCH_TIMEOUT });

    cy.get('[data-testid="social-stealerlog-download"]').click();
    cy.get('[data-testid="social-stealerlog-export-overlay"]').should('exist');
    cy.get('[data-testid="social-stealerlog-export-modal"]').should('be.visible');
    cy.get('[data-testid="social-stealerlog-export-close"]').click();
    cy.get('[data-testid="social-stealerlog-export-modal"]').should('not.exist');
  });

  it('blocks the profile tabs behind the fetch gate when nothing is crawled yet', () => {
    scanUsername();
    cy.intercept('POST', '**/api/social/profile', { statusCode: 200, body: { status: 'idle' } }).as('socialCrawl');
    openProfile();
    cy.get('[data-testid="social-profile-fetch-gate"]', { timeout: FETCH_TIMEOUT }).should('be.visible');
    cy.get('[data-testid="social-header-back"]').click();
  });

  it('builds a relationship graph and returns to the profile list', () => {
    scanUsername();

    cy.get('[data-testid="social-result-source-graph"]').click();
    cy.get(GRAPH_ROOT, { timeout: FETCH_TIMEOUT }).should('be.visible');
    cy.get('[data-testid="social-user-graph-canvas"]').find('canvas').should('exist');
    cy.get('[data-testid="social-list-view"]').should('not.exist');
    cy.docsScreenshot('social-relationship-graph');

    cy.wait('@socialGraphData', { timeout: FETCH_TIMEOUT }).then(({ request }) => {
      expect(request.body.usernames).to.include(SOCIAL_USERNAME);
      expect(request.body.limit).to.eq(200);
    });

    cy.contains('[data-testid="social-history-job"]', SOCIAL_USERNAME).click();
    cy.get(GRAPH_ROOT).should('be.visible');
    cy.get(PLATFORM_CARD).should('not.exist');

    cy.get(GRAPH_FIND_INPUT).clear().type('nobody-should-match-this');
    cy.get(GRAPH_FIND).should('contain.text', 'Add @nobody-should-match-this');
    cy.get(GRAPH_FIND_INPUT).clear().type(SOCIAL_USERNAME.slice(0, 6));
    cy.get(GRAPH_FIND).find('ul li button', { timeout: FETCH_TIMEOUT }).first().should('contain.text', SOCIAL_USERNAME).click();

    cy.get('[data-testid="social-graph-node-panel"]', { timeout: FETCH_TIMEOUT }).should('contain.text', SOCIAL_USERNAME).within(() => {
      cy.contains('Twitter').should('be.visible');
      cy.get('button[title="Remove from graph"]').click();
    });
    cy.wait('@socialGraphSave', { timeout: FETCH_TIMEOUT }).then(({ request }) => {
      expect(request.body.extra.usernames).not.to.include(SOCIAL_USERNAME);
    });
    cy.get(GRAPH_ROOT).should('contain.text', 'Pick a user in the sidebar');

    cy.get('[data-testid="social-result-source-graph"]').click();
    cy.get('[data-testid="social-list-view"]', { timeout: FETCH_TIMEOUT }).should('be.visible');
  });

  it('renders the empty result state when a scan returns no platforms', () => {
    cy.intercept('POST', '**/api/social/recon', { statusCode: 200, body: { job_id: 'cypress', result: [] } }).as('socialRecon');

    cy.get('[data-testid="social-scan-input"]').clear().type('nobody_at_all');
    cy.get('[data-testid="social-scan-submit"]').should('not.be.disabled').click();
    cy.wait('@socialRecon', { timeout: FETCH_TIMEOUT });
    cy.contains('[data-testid="social-history-job"]', 'nobody_at_all', { timeout: SCAN_TIMEOUT })
      .should('contain.text', 'Results Ready')
      .click();

    cy.get('[data-testid="social-list-empty"]', { timeout: FETCH_TIMEOUT }).should('be.visible');
    cy.get('[data-testid="social-profile-empty-card"]').should('be.visible');
    cy.get('[data-testid="social-list-empty-manage-profiles"]').should('be.disabled');
    cy.get('[data-testid="social-platform-search-empty"]').should('be.disabled');
    cy.get(PLATFORM_CARD).should('not.exist');
  });

  it('reports clean stealer and phone lookups with explicit empty states', () => {
    cy.intercept('POST', '**/api/search/stealer/ioc', { statusCode: 200, body: { Result: [] } }).as('socialStealerLogs');
    cy.intercept('POST', '**/api/phone/universal_search', { statusCode: 200, delay: 300, body: {} }).as('socialPhone');

    scanUsername();

    cy.wait('@socialStealerLogs', { timeout: FETCH_TIMEOUT });
    cy.get('[data-testid="social-dashboard-stealer-empty"]', { timeout: FETCH_TIMEOUT })
      .should('be.visible')
      .and('contain.text', 'No record found');
    cy.get('[data-testid="social-dashboard-stealer-row"]').should('not.exist');

    cy.get('[data-testid="social-phone-search-input"]').clear().type('15550199');
    cy.get('[data-testid="social-phone-search-button"]').should('not.be.disabled').click();
    cy.wait('@socialPhone', { timeout: FETCH_TIMEOUT });
    cy.get('[data-testid="social-phone-empty"]', { timeout: FETCH_TIMEOUT })
      .should('be.visible')
      .and('contain.text', 'No record found');
    cy.get('[data-testid="social-phone-entity"]').should('not.exist');
  });

  it('stops an in-flight section sync from the crawl band', () => {
    scanUsername();
    openProfile();
    stubSlowCrawlSection('posts');

    clickTab('posts');
    cy.get('[data-testid="social-crawl-section-fetch"]', { timeout: FETCH_TIMEOUT }).first().click();
    cy.get('[data-testid="social-crawl-section-stop"]', { timeout: FETCH_TIMEOUT })
      .should('be.visible')
      .and('contain.text', 'Stop')
      .click();
    cy.wait('@socialCrawl', { timeout: FETCH_TIMEOUT });
    cy.get('[data-testid="social-crawl-section-stop"]').should('not.exist');
    cy.get('[data-testid="social-crawl-section-fetch"]').should('be.visible');
  });

  it('pages a large crawl result through the load more control', () => {
    scanUsername();
    openProfile();
    stubBulkCrawlSection('posts', 62);

    clickTab('posts');
    cy.get('[data-testid="social-crawl-section-fetch"]', { timeout: FETCH_TIMEOUT }).first().click();
    cy.wait('@socialCrawl', { timeout: FETCH_TIMEOUT });
    cy.get('[data-testid="social-feed-post"]', { timeout: FETCH_TIMEOUT }).should('have.length', 50);
    cy.get('[data-testid="social-crawl-load-more"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="social-feed-post"]').should('have.length', 62);
    cy.get('[data-testid="social-crawl-load-more"]').should('not.exist');
  });

  it('opens the post connections popup from a feed post', () => {
    cy.intercept('POST', '**/api/social/recon', {
      statusCode: 200,
      body: {
        job_id: 'cypress',
        result: [{
          id: 'youtube:superman0011',
          meta: { platform: 'YouTube', username: SOCIAL_USERNAME, url: `https://www.youtube.com/@${SOCIAL_USERNAME}`, status: 'active' },
          profile_details: { real_name: 'Clark Kent', crawl_type: ['details', 'posts'] },
        }],
      },
    }).as('socialRecon');

    scanUsername(SOCIAL_USERNAME, /youtube/i);
    openProfile(/youtube/i);

    clickTab('posts');
    cy.get('[data-testid="social-crawl-section-fetch"]', { timeout: FETCH_TIMEOUT }).first().click();
    cy.wait('@socialCrawl', { timeout: FETCH_TIMEOUT });
    cy.get('[data-testid="social-feed-post"]', { timeout: FETCH_TIMEOUT }).should('have.length.greaterThan', 0);

    cy.get('[data-testid="social-feed-view-connections"]').first().click({ force: true });
    cy.get('[data-testid="social-feed-connections-popup"][open]', { timeout: FETCH_TIMEOUT }).should('be.visible');
    cy.wait('@socialConnections', { timeout: FETCH_TIMEOUT }).then(({ request }) => {
      expect(request.body.query).to.eq('');
      expect(request.body.post_url).to.contain('/status/');
    });

    cy.get('[data-testid="social-feed-connections-popup"][open]')
      .find('[data-testid="social-feed-connections-search"]')
      .type('loislane');
    cy.wait('@socialConnections', { timeout: FETCH_TIMEOUT }).then(({ request }) => {
      expect(request.body.query).to.eq('loislane');
    });
    cy.get('[data-testid="social-feed-connections-popup"][open]').should('contain.text', 'loislane');
  });

  it('covers sidebar collapse and header back navigation', () => {
    cy.get('app-home-menu [data-sidebar-expanded]').should('be.visible');
    cy.get('[data-testid="graph-sidebar-collapse"]').should('have.attr', 'aria-label', 'Collapse sidebar').click();
    cy.get('app-home-menu [data-sidebar-expanded]').should('not.exist');
    cy.get('app-home-menu [data-sidebar-collapsed]').should('be.visible');
    cy.get('[data-testid="graph-sidebar-expand"]').should('have.attr', 'aria-label', 'Expand sidebar').click();
    cy.get('app-home-menu [data-sidebar-expanded]').should('be.visible');
    cy.get('[data-testid="social-header-back"]').click();
    cy.location('pathname').should('match', /^\/dashboard\/(home|profile\/homepage)/);
  });
});

describe('Orion Intelligence - Social Extension', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('offers the signed downloads when no extension is installed', () => {
    visitWithoutExtension('/dashboard/manage-profiles');
    assertInstallPrompt();
    cy.docsScreenshot('social-extension-install');
  });

  it('waits for sign-in when the extension is installed but signed out', () => {
    visitWithSignedOutExtension('/dashboard/manage-profiles');
    assertSignedOutPrompt();
  });

  it('explains the unsupported browser case', () => {
    visitWithUnsupportedBrowser('/dashboard/manage-profiles');
    assertUnsupportedBrowserPrompt();
  });
});

describe('Orion Intelligence - Social Extension Session Profiles', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    setupManageProfilesStubs();
  });

  after(() => {
    cy.logout();
  });

  it('manages captured platform sessions', () => {
    cy.visit('/dashboard/manage-profiles');
    assertSessionProfiles();
  });
});

describe('Orion Intelligence - Social Extension Session Limits', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('blocks a new capture once every session slot is used', () => {
    setupManageProfilesAtCapacityStubs();
    cy.visit('/dashboard/manage-profiles');
    assertSessionCapacityReached();
  });

  it('surfaces a platform load failure', () => {
    setupManageProfilesFailureStubs();
    cy.visit('/dashboard/manage-profiles');
    assertPlatformLoadFailure();
  });
});
