const MANAGER = '[data-testid="social-extension-manager"]';
const TIMEOUT = 30000;
const PLATFORM = 'Twitter';
const SESSION_ID = 'session-1';

export function stubExtensionPresence(connected = true) {
  cy.on('window:before:load', (win) => {
    (win as unknown as { eval(code: string): unknown }).eval(`
      window.addEventListener('message', function (event) {
        var data = event.data;
        if (!data || data.source !== 'orion-app' || data.type !== 'ping') {
          return;
        }
        window.postMessage({ source: 'orion-extension', type: 'presence', connected: ${connected ? 'true' : 'false'} }, '*');
      });
    `);
  });
}

export function stubUnsupportedBrowser() {
  cy.on('window:before:load', (win) => {
    (win as unknown as { eval(code: string): unknown }).eval(`
      Object.defineProperty(navigator, 'userAgent', { get: function () { return 'Mozilla/5.0 OrionCypress/1.0 Safari/605.1.15'; } });
      Object.defineProperty(navigator, 'userAgentData', { get: function () { return undefined; } });
    `);
  });
}

export function visitWithoutExtension(path: string) {
  void cy.visit(path);
  void cy.location('pathname').should('include', path);
}

export function visitWithSignedOutExtension(path: string) {
  stubExtensionPresence(false);
  void cy.visit(path);
  void cy.location('pathname').should('include', path);
}

export function visitWithUnsupportedBrowser(path: string) {
  stubUnsupportedBrowser();
  void cy.visit(path);
  void cy.location('pathname').should('include', path);
}

export function assertSignedOutPrompt() {
  void cy.get(MANAGER, { timeout: TIMEOUT })
    .should('be.visible')
    .and('contain.text', 'Waiting for the Orion extension')
    .and('contain.text', 'The extension is installed but signed out');
  void cy.get('[data-testid="social-extension-download-firefox"]').should('not.exist');
  void cy.get('[data-testid="social-extension-open"]').should('contain.text', 'Sign in').click();
}

export function assertUnsupportedBrowserPrompt() {
  void cy.get(MANAGER, { timeout: TIMEOUT }).should('be.visible');
  void cy.get('[data-testid="social-extension-unsupported"]').should('contain.text', 'Unsupported browser');
  void cy.get('[data-testid="social-extension-get-firefox"]')
    .should('contain.text', 'Get Firefox')
    .and('have.attr', 'href', 'https://www.mozilla.org/firefox/new/');
  void cy.get('[data-testid="social-extension-get-chromium"]')
    .should('contain.text', 'Get Chromium')
    .and('have.attr', 'href', 'https://www.chromium.org/getting-involved/download-chromium/');
  void cy.get('[data-testid="social-extension-download-firefox"]').should('not.exist');
}

export function assertInstallPrompt() {
  void cy.get(MANAGER, { timeout: TIMEOUT })
    .should('be.visible')
    .and('contain.text', 'Orion extension required')
    .and('contain.text', 'Download the signed Orion package for your browser');
  void cy.get('[data-testid="social-extension-open"]').should('not.exist');
  void cy.get('[data-testid="social-extension-download-firefox"]')
    .should('contain.text', 'Install for Firefox')
    .and('have.attr', 'href', '/ext/firefox/orion-social-firefox.xpi');
  void cy.get('[data-testid="social-extension-download-chrome"]')
    .should('contain.text', 'Install for Chrome')
    .and('have.attr', 'href', 'https://chromewebstore.google.com/detail/orion-social/ledhnhjfmgbmglkifmcnakimopejlghi')
    .and('have.attr', 'target', '_blank');
  void cy.get(MANAGER).find('a[data-testid^="social-extension-download-"]').first()
    .should('have.attr', 'data-testid', 'social-extension-download-firefox');
  void cy.get('[data-testid="social-extension-steps-firefox"]').find('li').should('have.length', 3);
  void cy.get('[data-testid="social-extension-steps-chrome"]').find('li').should('have.length', 3);
  void cy.get('[data-testid="social-extension-steps-chrome"]').should('contain.text', 'Chrome Web Store');
}

export function setupManageProfilesStubs() {
  stubExtensionPresence(true);
  void cy.intercept('POST', '**/api/manage-profiles/platforms', {
    statusCode: 200,
    body: { status: 'done', result: { items: [{ platform: PLATFORM, base: 'https://twitter.com' }, { platform: 'Github', base: 'https://github.com' }] } },
  });
  void cy.intercept('POST', '**/api/manage-profiles/sessions', {
    statusCode: 200,
    body: { status: 'done', result: { platforms: { [PLATFORM.toLowerCase()]: [{ id: SESSION_ID, capturedAt: '2026-06-14T10:00:00Z', username: 'superman0011', verified: true, verifiedAt: '2026-06-14T10:05:00Z' }] } } },
  });
  void cy.intercept('POST', '**/api/manage-profiles/session', { statusCode: 200, body: { status: 'done', result: { platform: PLATFORM, saved: true } } }).as('sessionFetch');
  void cy.intercept('POST', '**/api/manage-profiles/session/verify', { statusCode: 200, body: { status: 'done', result: { verified: true, username: 'superman0011' } } }).as('sessionVerify');
  void cy.intercept('DELETE', '**/api/manage-profiles/session/**', { statusCode: 200, body: {} }).as('sessionDelete');
}

export function setupManageProfilesFailureStubs() {
  stubExtensionPresence(true);
  void cy.intercept('POST', '**/api/manage-profiles/platforms', { statusCode: 500, body: { detail: 'platform lookup failed' } });
  void cy.intercept('POST', '**/api/manage-profiles/sessions', { statusCode: 200, body: { status: 'done', result: { platforms: {} } } });
}

export function assertPlatformLoadFailure() {
  void cy.get('[data-testid="manage-profiles-page"]', { timeout: TIMEOUT })
    .should('contain.text', 'Unable to load platforms. Try again.');
  void cy.get('[data-testid="manage-profiles-platform"]').should('not.exist');
  void cy.get(MANAGER).should('not.exist');
}

export function setupManageProfilesAtCapacityStubs() {
  stubExtensionPresence(true);
  void cy.intercept('POST', '**/api/manage-profiles/platforms', {
    statusCode: 200,
    body: { status: 'done', result: { items: [{ platform: PLATFORM, base: 'https://twitter.com' }] } },
  });
  void cy.intercept('POST', '**/api/manage-profiles/sessions', {
    statusCode: 200,
    body: {
      status: 'done',
      result: {
        platforms: {
          [PLATFORM.toLowerCase()]: Array.from({ length: 10 }, (_, index) => ({
            id: `session-${index + 1}`,
            capturedAt: '2026-06-14T10:00:00Z',
            username: `superman00${index + 1}`,
            verified: index % 2 === 0,
            verifiedAt: index % 2 === 0 ? '2026-06-14T10:05:00Z' : '',
          })),
        },
      },
    },
  });
}

export function assertSessionCapacityReached() {
  void cy.contains('[data-testid="manage-profiles-platform"]', PLATFORM, { timeout: TIMEOUT }).within(() => {
    void cy.get('[data-testid="manage-profiles-session-count"]').should('contain.text', '10/10').and('contain.text', 'saved');
    void cy.get('[data-testid="manage-profiles-session-fetch"]').should('be.disabled').and('contain.text', 'Max reached');
  });
  void cy.contains('[data-testid="manage-profiles-platform"]', PLATFORM).click();
  void cy.get('[data-testid="manage-profiles-session-list"]', { timeout: TIMEOUT })
    .find('[data-testid="manage-profiles-session-verify"]')
    .should('have.length', 10);
}

export function assertSessionProfiles() {
  void cy.get('[data-testid="manage-profiles-page"]', { timeout: TIMEOUT }).should('contain.text', 'Manage Profiles');
  void cy.get('[data-testid="manage-profiles-platform"]').should('have.length.greaterThan', 0);
  void cy.docsScreenshot('social-manage-profiles-page');

  void cy.contains('[data-testid="manage-profiles-platform"]', PLATFORM).within(() => {
    void cy.get('[data-testid="manage-profiles-session-count"]').should('contain.text', '1/10').and('contain.text', 'saved');
    void cy.get('[data-testid="manage-profiles-session-fetch"]').should('contain.text', 'Fetch session').click();
  });
  cy.wait('@sessionFetch', { timeout: TIMEOUT }).then(({ request }) => {
    expect(request.body.platform).to.eq(PLATFORM);
    expect(request.body.url).to.eq('https://twitter.com');
  });

  void cy.contains('[data-testid="manage-profiles-platform"]', PLATFORM).click();
  void cy.get('[data-testid="manage-profiles-session-list"]', { timeout: TIMEOUT }).should('contain.text', 'superman0011');

  void cy.get('[data-testid="manage-profiles-session-verify"]').first().click({ force: true });
  cy.wait('@sessionVerify', { timeout: TIMEOUT }).then(({ request }) => {
    expect(request.body.session_id).to.eq(SESSION_ID);
  });

  void cy.get('[data-testid="manage-profiles-session-edit"]').first().click({ force: true });
  cy.wait('@sessionFetch', { timeout: TIMEOUT }).then(({ request }) => {
    expect(request.body.session_id).to.eq(SESSION_ID);
  });

  void cy.get('[data-testid="manage-profiles-session-delete"]').first().click({ force: true });
  void cy.get('[data-testid="confirmation-popup"]', { timeout: TIMEOUT }).should('be.visible');
  void cy.get('[data-testid="confirmation-warning-icon"]').should('be.visible');
  void cy.get('[data-testid="confirmation-yes-button"]').should('contain.text', 'Delete').click();
  cy.wait('@sessionDelete', { timeout: TIMEOUT }).then(({ request }) => {
    expect(request.url).to.contain(SESSION_ID);
  });
}
