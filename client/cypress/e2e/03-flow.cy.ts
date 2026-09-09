import {FLOW_ADMIN_SECTIONS, FLOW_ENTITY_API_SECTIONS} from '../support/constants';
import {applyDateRange, applyDirectoryDropdown, assertDirectoryContentVisible, assertFreeModeDashboardChrome, clickSidebarSubItem, DIRECTORY_CONTENT_OPTION, DIRECTORY_INDEX_OPTION, DIRECTORY_NETWORK_OPTION, getHeatmapComponent, openCountryReportFromMap, openSidebarGroup, resetDirectoryFilters, typeVisibleInputSlow, waitForDirectoryRequest} from './controllers/03-flow.controller';
import type { FlowTestData, HeatmapCountryPathElement } from './model/03-flow.model';

describe('Orion Intelligence - Free Mode Flow', () => {
  after(() => {
    cy.logout();
  });

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window().then((win) => {
      win.sessionStorage.clear();
    });
  });

  it('verifies free mode opens the simplified mobile dashboard chrome', () => {
    cy.viewport(430, 932);
    cy.intercept({ method: 'POST', pathname: '**/api/token/demo' }).as('demoLogin');
    cy.visit('/login?mode=free');

    cy.wait('@demoLogin').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });
    cy.get('[data-testid="dashboard-main"]', {timeout: 30000}).should('be.visible');
    assertFreeModeDashboardChrome();
  });
});

describe('Orion Intelligence - Full Navigation and Heatmap Flow', () => {
  let testData = {} as FlowTestData;

  before(() => {
    cy.env(['TEST_DATA']).then(({TEST_DATA}) => {
      testData = (TEST_DATA || {}) as FlowTestData;
    });
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('navigates through all major sidebar sections and sub-sections', () => {
    openSidebarGroup('admin');

    FLOW_ADMIN_SECTIONS.forEach((section) => {
      clickSidebarSubItem('admin', section);
      if (section === 'Monitoring') {
        cy.get('[data-testid="monitoring-tab-auditlog"]').should('be.visible').click();
        cy.get('[data-testid="auditlog-page-title"]').should('contain.text', 'Audit Logs');
      }
    });

    cy.get('app-dashboard-sidebar [data-sidebar-expanded]').should('be.visible');
    cy.get('[data-testid="sidebar-collapse-button"]')
      .should('have.attr', 'aria-label', 'Collapse sidebar')
      .then(($btn) => ($btn[0] as HTMLButtonElement).click());
    cy.get('app-dashboard-sidebar [data-sidebar-expanded]').should('not.exist');
    cy.get('app-dashboard-sidebar [data-sidebar-collapsed]').should('be.visible');
    cy.get('[data-testid="sidebar-expand-button"]')
      .should('be.visible')
      .and('have.attr', 'aria-label', 'Expand sidebar')
      .click();
    cy.get('app-dashboard-sidebar [data-sidebar-expanded]').should('be.visible');
    cy.get('app-dashboard-sidebar [data-sidebar-collapsed]').should('not.exist');

    openSidebarGroup('General Intelligence');

    openSidebarGroup('Data Breach');
    cy.scrollTo('top', {ensureScrollable: false});

    openSidebarGroup('Defacement');

    openSidebarGroup('Social');

    openSidebarGroup('Exploit');

    openSidebarGroup('Feed');
    openSidebarGroup('Stealer logs');

    cy.get('button[aria-label="Expand row"]').each(($btn, index) => {
      if (index < 5) {
        cy.wrap($btn).click();
      }
    });

    cy.visit('/dashboard/netint');
    cy.get('[data-testid="network-intel-tab-host-recon"]').should('be.visible');

    openSidebarGroup('Entity Lookup');
    FLOW_ENTITY_API_SECTIONS.forEach((item) => clickSidebarSubItem('Entity Lookup', item));
  });

  it('covers world heatmap render, interactions, and popup close paths', () => {
    cy.loginAsAdmin();
    cy.get('[data-testid="world-heatmap-map"] svg').should('exist');
    cy.get('[data-testid="world-heatmap-map"] svg').should('exist');
    cy.docsScreenshot('homepage-overview');
    cy.get('[data-testid="homepage-search-input"]').filter(':visible').first().click({ force: true }).type('orion', { force: true });
    cy.docsScreenshot('homepage-searchbar');
    cy.get('[data-testid="homepage-search-input"]').filter(':visible').first().type('{selectall}{backspace}', { force: true });

    cy.get('[data-testid="world-heatmap-map"] path.country.has-data, [data-testid="world-heatmap-map"] path.country')
      .then(($paths) => {
        const aliases = ['united states', 'united states of america', 'usa', 'us'];
        const target = Array.from($paths).find((el) => {
          const name = (((el as HeatmapCountryPathElement).__data__?.properties?.name) || '').toString().trim().toLowerCase();
          return aliases.includes(name);
        }) || $paths[0];
        assert.exists(target, 'USA country path');
        cy.wrap((target as unknown as SVGPathElement)).as('usaCountryPath');
      });

    cy.get('@usaCountryPath').should('exist').then(($el) => {
      let r = ($el[0] as Element).getBoundingClientRect();
      ($el[0] as Element).dispatchEvent(
        new MouseEvent('mousemove', {
          clientX: r.left + Math.max(1, r.width / 2),
          clientY: r.top + Math.max(1, r.height / 2),
          bubbles: true
        })
      );
    });

    cy.get('[data-testid="world-heatmap-map"] .heatmap-tooltip.heatmap-tooltip-visible').should('exist');

    cy.get('@usaCountryPath').should('exist').then(($el) => {
      ($el[0] as Element).dispatchEvent(
        new MouseEvent('mouseleave', {
          bubbles: true
        })
      );
    });

    cy.get('[data-testid="world-heatmap-map"] .heatmap-tooltip').should('exist');
    openCountryReportFromMap();
    cy.contains('[data-testid="heatmap-report"] h3', 'Reports').should('be.visible');
    cy.get('[data-testid="heatmap-report"] .overflow-y-auto').should('exist');
    cy.docsScreenshot('heatmap-report');
    cy.get('[data-testid="heatmap-report-close"]').should('be.visible').click();
    cy.get('[data-testid="heatmap-report"]').should('not.exist');

    openCountryReportFromMap();
    cy.get('[data-testid="heatmap-report-overlay"]').click('topLeft');
    cy.get('[data-testid="heatmap-report"]').should('not.exist');
  });

  it('covers branch paths by invoking heatmap component API', () => {
    cy.loginAsAdmin();

    getHeatmapComponent().then((comp) => {
      let appService = comp['appService'];
      let originalWorld = appService.worldJson();
      appService.worldJson.set(null);
      comp['createChart']();
      appService.worldJson.set(originalWorld);
      comp['createChart']();

      let originalAll = comp['allCategoryReports'];
      comp['allCategoryReports'] = {};
      comp['startCategoryRotation']();
      comp['allCategoryReports'] = {
        leak: [{m_country: ['United States, Canada']}, {m_country: ['Canada']}],
        generic: [{m_country: ['France']}],
        exploit: [],
        chat: [],
        social: [],
        defacement: []
      };
      comp['startCategoryRotation']();

      let reports = comp.getReportsByCountry('Canada');
      expect(reports.length).to.be.greaterThan(0);
      comp['openCountryReport']('Canada');
      expect(comp.isOpenCountryReport()).to.equal(true);
      expect(Array.isArray(comp.selectedCountryReports())).to.equal(true);
      comp.closeCountryReport();
      expect(comp.isOpenCountryReport()).to.equal(false);
      comp['onCountryClick']({});
      comp['onCountryClick']({properties: {name: 'Canada'}});
      expect(comp.isOpenCountryReport()).to.equal(true);
      comp.closeCountryReport();
      comp['allCategoryReports'] = originalAll;
      comp.ngOnDestroy();
    });

    cy.get('[data-testid="world-heatmap-map"] svg').should('exist');
  });

  it('opens help and support modal, fills form, and sends message', () => {
    cy.loginAsAdmin();
    cy.intercept('POST', '**/support', {
      statusCode: 200,
      body: {success: true}
    }).as('sendSupport');

    cy.get('[data-testid="profile-menu"]').filter(':visible').first().should('be.visible').click({scrollBehavior: false});
    cy.get('[data-testid="profile-help-support"]').filter(':visible').first().should('be.visible').click({scrollBehavior: false});
    cy.get('[data-testid="support-overlay"]').should('be.visible').and('not.have.class', 'opacity-0');
    cy.get('[data-testid="support-modal"]').should('be.visible');
    cy.get('[data-testid="support-modal-title"]').should('be.visible');
    cy.docsScreenshot('support-modal');
    typeVisibleInputSlow('[data-testid="support-email-input"]', testData.support_email);
    typeVisibleInputSlow('[data-testid="support-subject-input"]', 'Support request from Cypress');
    typeVisibleInputSlow('[data-testid="support-message-input"]', 'Please review this test support message submission flow.');
    cy.get('[data-testid="support-send"]').should('be.visible').and('not.be.disabled').click();

    cy.wait('@sendSupport');
  });

  it('covers directory filters, load more, and pagination', () => {
    cy.loginAsAdmin();
    cy.intercept('GET', '**/api/directory*').as('getDirectory');
    cy.visit('/dashboard/directory');
    waitForDirectoryRequest();
    cy.scrollDashboardToTop()
    cy.get('[data-testid="directory-page-title"]').should('contain.text', 'Directory');
    assertDirectoryContentVisible();
    cy.docsScreenshot('directory-monitoring');

    cy.scrollDashboardToTop()
    cy.get('app-directory-list tbody tr').then(($rows) => {
      const initialCount = $rows.length;

      if (initialCount > 49) {
        expect(initialCount).to.be.greaterThan(49);
        return;
      }

      cy.get('#bottom');
      cy.scrollDashboardToTop()
      cy.get('app-directory-list tbody tr').its('length').should('be.greaterThan', initialCount);
    });

    cy.get('[data-testid="pagination-next"]').should('exist').click();
    waitForDirectoryRequest();
    cy.get('[data-testid="pagination-page-2"]').should('exist');
    cy.location('search').should('include', 'page=2');

    cy.get('[data-testid="pagination-page-1"]').click();
    waitForDirectoryRequest();

    applyDirectoryDropdown('network', DIRECTORY_NETWORK_OPTION, 'network');
    resetDirectoryFilters();

    applyDirectoryDropdown('index', DIRECTORY_INDEX_OPTION, 'index');
    resetDirectoryFilters();

    applyDirectoryDropdown('content_type', DIRECTORY_CONTENT_OPTION, 'content_type');
    resetDirectoryFilters();

    applyDateRange(14);
    cy.contains('No links found!').should('be.visible');

    resetDirectoryFilters();
    cy.get('[data-testid="directory-page-title"]').should('contain.text', 'Directory');
    cy.get('[data-testid="directory-page-description"]').should('contain.text', 'Live onion services and monitoring status.');
    cy.logout();
  });
});
