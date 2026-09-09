const SIDEBAR_GROUP_ROUTE_PREFIX: Record<string, string> = {
  admin: 'profile',
  'General Intelligence': 'strategic',
  'Data Breach': 'breach',
  Defacement: 'defacement',
  Social: 'social',
  Exploit: 'exploit',
  Feed: 'feed',
  'Stealer logs': 'stealerlogs',
  'Web Scans': 'scanner',
  'Entity Lookup': 'api',
};

const SIDEBAR_SUBITEM_TEST_ID_ALIAS: Record<string, Record<string, string>> = {
  'Web Scans': {
    'Basic Scan': 'network-scan',
    'Port Scan': 'network-scan',
  },
};

function getSidebarGroupTestId(title: string): string {
  const routePrefix = SIDEBAR_GROUP_ROUTE_PREFIX[title];
  expect(routePrefix, `routePrefix mapping for "${title}"`).to.not.equal(undefined);
  return `sidebar-group-${routePrefix}`;
}

export const DIRECTORY_NETWORK_OPTION = {label: 'Onion', value: 'onion'};
export const DIRECTORY_INDEX_OPTION = {label: 'Leak', value: 'leak'};
export const DIRECTORY_CONTENT_OPTION = {label: 'Forums', value: 'forums'};

export function openSidebarGroup(title: string) {
  const groupTestId = getSidebarGroupTestId(title);
  cy.get(`[data-testid="${groupTestId}"]`).then(($group) => {
    void cy.wrap($group).scrollIntoView();
    let group = $group.parent('div');
    let sub = group.find('> ul');
    if (!sub.length) {
      void cy.wrap($group).click({ force: true });
      return;
    }
    let isClosed = !sub.length || getComputedStyle(sub[0] as HTMLElement).pointerEvents === 'none';
    if (isClosed) {
      void cy.wrap($group).find(`[data-testid="${groupTestId}-toggle"]`).click();
    }
    void cy.wrap(sub).should(($ul) => {
      expect(getComputedStyle($ul[0] as HTMLElement).pointerEvents).not.to.equal('none');
    });
  });
}

export function clickSidebarSubItem(groupTitle: string, itemTitle: string) {
  const aliasedTestId = SIDEBAR_SUBITEM_TEST_ID_ALIAS[groupTitle]?.[itemTitle];
  const routePrefix = SIDEBAR_GROUP_ROUTE_PREFIX[groupTitle];

  if (aliasedTestId) {
    void cy.get(`[data-testid="sidebar-subitem-${routePrefix}-${aliasedTestId}"]`)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
    return;
  }

  void cy.contains(`[data-testid^="sidebar-subitem-${routePrefix}-"]`, new RegExp(`^\\s*${itemTitle}\\s*$`))
    .scrollIntoView()
    .should('be.visible')
    .click({ force: true });
}

export function getHeatmapComponent(): Cypress.Chainable<HeatmapComponentHarness> {
  return cy.get('app-world-heatmap', { timeout: 10000 }).should('exist').then(($host) => {
    const host = $host[0] as AngularDebugHost;
    return cy.window().then((win) => {
      const ngApi = (win as Window & { ng?: AngularDebugApi }).ng;
      if (ngApi?.getComponent) {
        return ngApi.getComponent(host) as HeatmapComponentHarness;
      }
      const ctx = host.__ngContext__;
      expect(ctx, 'Angular context fallback').to.not.equal(undefined);
      const comp = (ctx || []).find((value) => {
        const candidate = value as { constructor?: { name?: string } } | null;
        return candidate?.constructor?.name === 'WorldHeatmapComponent';
      });
      expect(comp, 'WorldHeatmapComponent in ngContext').to.not.equal(undefined);
      return comp as HeatmapComponentHarness;
    });
  });
}

export function openCountryReportFromMap() {
  void cy.get('[data-testid="world-heatmap-map"] path.country').should('have.length.greaterThan', 0);

  void cy.get('[data-testid="world-heatmap-map"] path.country.has-data')
    .should('have.length.greaterThan', 0)
    .first()
    .scrollIntoView()
    .as('heatmapCountryWithData')
    .click({force: true});

  cy.get('body').then(($body) => {
    if (!$body.find('[data-testid="heatmap-report"]').length) {
      cy.get('@heatmapCountryWithData').then(($el) => {
        const target = $el[0] as unknown as SVGPathElement;
        const rect = target.getBoundingClientRect();
        target.dispatchEvent(
          new MouseEvent('click', {
            clientX: rect.left + Math.max(1, rect.width / 2),
            clientY: rect.top + Math.max(1, rect.height / 2),
            bubbles: true,
            cancelable: true,
            composed: true
          })
        );
      });
    }
  });

  void cy.get('[data-testid="heatmap-report"]').should('be.visible');
}

export function waitForDirectoryRequest() {
  cy.wait('@getDirectory').then((interception) => {
    expect(interception.response?.statusCode).to.eq(200);
  });
}

export function typeVisibleInputSlow(selector: string, value: string, submit = false) {
  void cy.get(selector).filter(':visible').first().should('be.enabled').click({ force: true });
  void cy.get(selector).filter(':visible').first().type('{selectall}{backspace}', { force: true });
  void cy.wait(250);
  void cy.get(selector).filter(':visible').first().type(value, { force: true, delay: 75 });
  void cy.get(selector).filter(':visible').first().should('have.value', value);
  if (submit) {
    void cy.wait(250);
    void cy.get(selector).filter(':visible').first().type('{enter}', { force: true });
  }
}

export function assertDirectoryContentVisible() {
  void cy.scrollDashboardToTop();
  void cy.get('app-directory').should('be.visible');
  cy.get('body').then(($body) => {
    void cy.scrollDashboardToTop();
    const hasTable = $body.find('app-directory-list table tbody tr').length > 0;
    const hasEmptyState = $body.text().includes('No links found!');

    expect(hasTable || hasEmptyState).to.eq(true);
  });
}

export function openDirectoryFilter() {
  void cy.scrollDashboardToTop();
  void cy.get('app-directory #top').should('exist').scrollIntoView({duration: 300, offset: {top: -20, left: 0}});
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="side-filter-close"]:visible').length) {
      return;
    }
    void cy.contains('button', 'Filter').should('be.visible').scrollIntoView().click();
  });
  void cy.get('[data-testid="side-filter-close"]').filter(':visible').first().should('be.visible');
}

export function resetDirectoryFilters() {
  openDirectoryFilter();
  void cy.get('[data-testid="side-filter-reset"]').filter(':visible').first().should('be.visible').click();
  waitForDirectoryRequest();
  void cy.location('search').should('not.include', 'network=');
  void cy.location('search').should('not.include', 'index=');
  void cy.location('search').should('not.include', 'content_type=');
  void cy.location('search').should('not.include', 'daterange=');
  assertDirectoryContentVisible();
}

export function applyDirectoryDropdown(testId: string, option: { label: string; value: string; }, queryKey: string) {
  openDirectoryFilter();
  cy.get(`[data-testid="side-filter-select-${testId}"]`).scrollIntoView().then(($el) => {
    if ($el.is('select')) {
      void cy.wrap($el).select(option.label);
      return;
    }
    const menuId = $el.attr('aria-controls');
    expect(menuId, `side-filter-select-${testId} menu id`).to.not.equal(undefined);
    void cy.wrap($el).click({ force: true });
    void cy.wrap($el).should('have.attr', 'aria-expanded', 'true');
    void cy.get(`#${menuId}`).parent().find('input[type="text"]').should('be.visible').clear();
    void cy.get(`#${menuId}`).parent().find('input[type="text"]').should('be.visible').type(option.label, { force: true }).should('have.value', option.label);
    void cy.contains(`#${menuId} [role="option"]`, option.label, { timeout: 15000 }).click({ force: true });
    void cy.get(`[data-testid="side-filter-select-${testId}"]`).should('have.attr', 'aria-expanded', 'false');
  });
  void cy.get('[data-testid="side-filter-apply"]').scrollIntoView().click();
  waitForDirectoryRequest();
  void cy.location('search').should('include', `${queryKey}=${option.value}`);
  assertDirectoryContentVisible();
}

export function applyDateRange(monthsBack: number) {
  openDirectoryFilter();
  void cy.get('[data-testid="side-filter-date-toggle"]').scrollIntoView().click();

  for (let i = 0; i < monthsBack; i += 1) {
    void cy.get('[data-testid="side-filter-date-prev-month"]').scrollIntoView().click();
  }

  void cy.get('[data-testid="side-filter-date-day-1"]').filter(':visible').first().scrollIntoView().click();
  void cy.get('[data-testid="side-filter-date-day-25"]').filter(':visible').first().scrollIntoView().click();
  void cy.get('[data-testid="side-filter-apply"]').scrollIntoView().click();
  waitForDirectoryRequest();
  void cy.location('search').should('include', 'daterange=');
}

export function assertFreeModeDashboardChrome() {
  void cy.location('pathname').should('eq', '/dashboard/strategic/all');
  void cy.get('[data-testid="dashboard-body"]').should('be.visible');

  cy.window().then((win) => {
    expect(win.localStorage.getItem('mobileDemo')).to.equal('true');
  });

  void cy.get('[data-testid="dashboard-main"]').should('be.visible');
  void cy.get('[data-testid="dashboard-sidebar"]').should('be.visible');
  void cy.get('[data-testid="dashboard-sidebar-component"]').should('be.visible');
  void cy.get('[data-testid="dashboard-container"]').should('be.visible');
  void cy.get('[data-testid="dashboard-body"]').should('be.visible');
  void cy.get('[data-testid="dashboard-header"]').should('not.exist');
  void cy.get('[data-testid="profile-menu"]').should('not.exist');
  void cy.get('[data-testid="sidebar-expand-button"], [data-testid="sidebar-collapse-button"]')
    .filter(':visible')
    .should('have.length.at.least', 1);

  void cy.get('[data-testid="dashboard-sidebar"] app-graph-sidebar-shell [data-sidebar-expanded] > div.overflow-y-auto, [data-testid="dashboard-sidebar"] app-graph-sidebar-shell [data-sidebar-collapsed] > div.overflow-y-auto')
    .filter(':visible')
    .first()
    .scrollTo('bottom', { ensureScrollable: false });

  void cy.get('[data-testid="dashboard-sidebar"]').within(() => {
    void cy.get('.opacity-20')
      .filter(':visible')
      .should('have.length.at.least', 1);
  });
}
import type { AngularDebugApi, AngularDebugHost, HeatmapComponentHarness } from '../model/03-flow.model';
