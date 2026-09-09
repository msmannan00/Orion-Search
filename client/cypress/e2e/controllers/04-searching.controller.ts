const SIDEBAR_GROUP_ROUTE_PREFIX: Record<string, string> = {
  Profile: 'profile',
  'General Intelligence': 'strategic',
  Defacement: 'defacement',
  Social: 'social',
  Exploit: 'exploit',
  'Actors & Malware': 'apt-intel',
  Feed: 'feed',
  'Stealer logs': 'stealerlogs',
  'Web Scans': 'scanner',
  'Entity Lookup': 'api',
  Dump: 'dump',
};

function getSidebarGroupTestId(title: string): string {
  const routePrefix = SIDEBAR_GROUP_ROUTE_PREFIX[title];
  assert.exists(routePrefix, `routePrefix mapping for "${title}"`);
  return `sidebar-group-${routePrefix}`;
}

function ensureSidebarExpanded() {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="sidebar-expand-button"]:visible').length) {
      void cy.get('[data-testid="sidebar-expand-button"]').click();
    }
  });
  void cy.get('[data-testid="sidebar-collapse-button"]').should('be.visible');
}

export function openSidebarGroup(title: string) {
  ensureSidebarExpanded();
  const groupTestId = getSidebarGroupTestId(title);
  cy.get(`[data-testid="${groupTestId}"]`).scrollIntoView().should('be.visible').then(($group) => {
    const sub = $group.parent('div').find('> ul');
    void cy.wrap($group).click({ force: true });
    if (!sub.length) {
      return;
    }
    void cy.wrap(sub).should(($ul) => {
      expect(getComputedStyle($ul[0] as HTMLElement).pointerEvents).not.to.equal('none');
    });
  });
}

export function waitForSearchReady() {
  void cy.get('app-loading-form').should('not.exist');
}

export function typeDashboardSearchSlow(value: string) {
  const selector = 'input[data-testid="dashboard-general-input"][name="q"]';
  void cy.scrollDashboardToTop();
  waitForSearchReady();
  void cy.scrollDashboardToTop();
  void cy.typeSlow(selector, value, { submit: true });
}

export function typeInputSlow(selector: string, value: string, submit = true) {
  void cy.typeSlow(selector, value, { submit });
}

export function clickOpenReport() {
  void cy.get('[data-testid="open-report"]').filter(':visible').filter(':has(img[src*="redirect.svg"])').first().should('be.visible').invoke('removeAttr', 'target').click();
}

export function clickOpenExploitReport() {
  void cy.get('[data-testid="open-report"]').filter(':visible').first().scrollIntoView().should('be.visible').invoke('removeAttr', 'target').click({ force: true });
}

export function clickOpenDefacementReport() {
  void cy.get('[data-testid="defacement-group-card"]').first().find('button').scrollIntoView().should('be.visible').click({ force: true });
  void cy.get('[data-testid="defacement-record-sidebar"] a').first().invoke('removeAttr', 'target').click({ force: true });
}

export function openDefacementReportAndValidate() {
  clickOpenDefacementReport();
  void cy.get('body', {timeout: 60000}).should(($body) => {
    const hasJsonViewer = $body.find('app-json-api-viewer').length > 0;
    const hasDefacementReport = $body.find('app-report-defacement').length > 0;
    expect(hasJsonViewer || hasDefacementReport, 'defacement report opened').to.eq(true);
  });
}

export function exerciseJsonViewerOnce() {
  cy.window().then((win) => {
    win.scrollTo(0, win.document.documentElement.scrollHeight);
    const dashboardBody = win.document.querySelector('[data-testid="dashboard-body"]') as HTMLElement | null;
    if (dashboardBody) {
      dashboardBody.scrollTop = dashboardBody.scrollHeight;
    }
  });

  void cy.get('app-json-api-viewer').should('exist').and('be.visible');
  void cy.contains('app-json-api-viewer span', 'Json Response').should('be.visible').click();
  void cy.get('app-json-api-viewer app-json-viewer').should('exist');

  const expandableRowSelector = 'app-json-api-viewer app-json-viewer li:has(> div.group + div.ml-5)';

  void cy.get(expandableRowSelector).first().scrollIntoView().should('be.visible').find('> div.ml-5').should('exist');
  cy.get(expandableRowSelector).first().find('> div.group .text-\\[14px\\]').invoke('text').then((keyText) => {
    const normalizedKey = keyText.trim();

    void cy.contains('app-json-api-viewer app-json-viewer li > div.group .text-\\[14px\\]', normalizedKey)
      .closest('li')
      .as('jsonExpandableRow');

    void cy.get('@jsonExpandableRow').scrollIntoView().find('> div.group').should('be.visible').click();
    void cy.contains('app-json-api-viewer app-json-viewer li > div.group .text-\\[14px\\]', normalizedKey)
      .closest('li')
      .find('> div.ml-5')
      .should('not.exist');

    void cy.contains('app-json-api-viewer app-json-viewer li > div.group .text-\\[14px\\]', normalizedKey)
      .closest('li')
      .scrollIntoView()
      .find('> div.group')
      .should('be.visible')
      .click();

    void cy.contains('app-json-api-viewer app-json-viewer li > div.group .text-\\[14px\\]', normalizedKey)
      .closest('li')
      .find('> div.ml-5')
      .should('exist');
  });
}

export function openFirstReportAndValidateNavigationOrModal() {
  cy.location('pathname').then((pathBefore) => {
    clickOpenReport();

    cy.get('body').then(($body) => {
      if ($body.find('app-json-api-viewer').length) {
        void cy.get('app-json-api-viewer').should('be.visible');
        void cy.get('body').type('{esc}');
        return;
      }

      void cy.location('pathname').should('not.eq', pathBefore);
    });
  });
}
