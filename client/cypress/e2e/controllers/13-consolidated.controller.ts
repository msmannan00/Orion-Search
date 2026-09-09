import { typeDashboardSearchSlow } from './04-searching.controller';

const DOMAIN_SCANNER_MODAL_TIMEOUT = 90000;
const DOMAIN_SCANNER_SELECTOR = '[data-testid="domain-scanner-modal"]';
const DOMAIN_SCANNER_TEST_DOMAINS = ['example.com', 'bbc.com', 'cnn.com'];
const DOMAIN_SCANNER_INPUT_SELECTOR = '[data-testid="domain-scanner-input"]';
const IOC_ADVANCED_MODAL_SELECTOR = '[data-testid="ioc-adv-expanded-modal"]';
const IOC_ADVANCED_ROW_SELECTOR = `${IOC_ADVANCED_MODAL_SELECTOR}:visible [data-testid="ioc-adv-row"]:not(.ng-animating)`;
export const CONSOLIDATED_TOGGLE_SELECTOR = '[data-testid="consolidated-section-see-more"]';
export const RESULT_CARD_SELECTOR = '[data-testid="result-card"]';

export function clickConsolidatedSectionToggle(sectionId: string, labelPattern: RegExp) {
  void cy.get(`[data-testid="${sectionId}"]`)
    .contains(CONSOLIDATED_TOGGLE_SELECTOR, labelPattern)
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .should('be.visible')
    .click();
}

function executeIocAdvancedSearch() {
  void cy.get('[data-testid="ioc-adv-execute"]')
    .filter(':visible')
    .first()
    .scrollIntoView()
    .should('be.visible')
    .and('not.be.disabled')
    .click();
}

function getVisibleIocAdvancedRow(index: number) {
  return cy.get(IOC_ADVANCED_ROW_SELECTOR).eq(index);
}

function selectIocAdvancedControl(rowIndex: number, testId: string, nativeValue: string, dropdownLabel: RegExp) {
  getVisibleIocAdvancedRow(rowIndex).find(`[data-testid="${testId}"]`).scrollIntoView().then(($control) => {
    const tagName = ($control[0] as HTMLElement).tagName.toLowerCase();
    if (tagName === 'select') {
      void cy.wrap($control).select(nativeValue);
      return;
    }

    void cy.wrap($control).click({ force: true });
    void cy.contains('[role="option"]', dropdownLabel).filter(':visible').first().click({ force: true });
  });
}

function typeIocAdvancedValue(rowIndex: number, value: string) {
  void getVisibleIocAdvancedRow(rowIndex)
    .find('[data-testid="ioc-adv-value-input"]')
    .scrollIntoView()
    .clear()
    .type(value);
}

function clickIocAdvancedRowButton(rowIndex: number, testId: string) {
  void getVisibleIocAdvancedRow(rowIndex)
    .find(`[data-testid="${testId}"]`)
    .scrollIntoView()
    .should('be.visible')
    .and('not.be.disabled')
    .click({ force: true });
}

function openIocAdvancedBuilder() {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="ioc-basic-search-input"]:visible').length > 0) {
      void cy.get('[data-testid="ioc-advanced-toggle"]').filter(':visible').first().scrollIntoView().click();
    }
  });

  cy.get('body').then(($body) => {
    if ($body.find(IOC_ADVANCED_ROW_SELECTOR).length === 0) {
      void cy.get('[data-testid="ioc-adv-expand"]').filter(':visible').first().scrollIntoView().click({ force: true });
    }
  });

  void cy.get(IOC_ADVANCED_ROW_SELECTOR).should('have.length.at.least', 1);
}

export function openHomepageAndSearch(query = '{enter}') {
  void cy.get('[data-testid="sidebar-group-profile"]').should('be.visible').click();
  void cy.get('[data-testid="sidebar-subitem-profile-homepage"]').filter(':visible').first().should('be.visible').click();
  void cy.startInterceptTracking();
  void cy.get('[data-testid="homepage-search-input"]').should('be.visible').click().type(query);
  void cy.waitForIntercepts();
}

export function switchToDeepSearchTab() {
  void cy.get('[data-testid="consolidated-tab-deep-search"]').scrollIntoView().should('be.visible').click({ force: true });
}

export function switchToIocsTab() {
  void cy.get('[data-testid="consolidated-tab-iocs"]').scrollIntoView().should('be.visible').click({ force: true });
}

export function selectIocResultTab(tab: 'stealers' | 'threats') {
  const selector = `[data-testid="ioc-tab-${tab}"]`;
  cy.get('body').then(($body) => {
    if ($body.find(`${selector}:visible`).length > 0) {
      void cy.get(selector).filter(':visible').first().scrollIntoView().click({ force: true });
    }
  });
}

export function expandThreatRowsIfAvailable(maxRows = 3) {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="ioc-tab-threats"]:visible').length === 0) {
      return;
    }

    selectIocResultTab('threats');
    void cy.get('[data-testid="ioc-threat-table"]').scrollIntoView();
    cy.get('[data-testid="ioc-threat-table"]').find('[data-testid="ioc-threat-row"]').should('have.length.greaterThan', 0).then(($rows) => {
      const count = Math.min(maxRows, $rows.length);
      for (let i = 0; i < count; i += 1) {
        void cy.get('[data-testid="ioc-threat-table"]')
          .find('[data-testid="ioc-threat-row"]')
          .eq(i)
          .scrollIntoView()
          .find('[data-testid="ioc-threat-row-toggle"]')
          .first()
          .click({ force: true });
      }
    });
  });
}

export function searchInIocs(query: string) {
  void cy.get('[data-testid="consolidated-tab-iocs"]').scrollIntoView().click({ force: true });
  void cy.closeSideFilter()
  void cy.get('[data-testid="dashboard-body"]').scrollTo('top', {ensureScrollable: false});
  cy.get('[data-testid="ioc-basic-search-input"]')
    .should('have.length.at.least', 1)
    .then(($inputs) => {
      const visible = $inputs.filter(':visible');
      const target = visible.length ? visible[0] : $inputs[0];
      void cy.wrap(target)
        .scrollIntoView()
        .should('exist')
        .click()
        .type('{selectAll}{backspace}');

      void cy.startInterceptTracking();
      if (query && query.length > 0) {
        void cy.wrap(target)
          .type(query, {delay: 0})
          .type('{enter}');
      } else {
        void cy.wrap(target).type('{enter}');
      }
      void cy.waitForIntercepts();
    });
}

export function ensureDomainScannerModalOpen() {
  cy.get(`[data-testid="consolidated-open-domain-scanner"], ${DOMAIN_SCANNER_SELECTOR}`).then(($els) => {
    const isModalVisible = $els.filter(`${DOMAIN_SCANNER_SELECTOR}:visible`).length > 0;
    if (!isModalVisible) {
      void cy.get('[data-testid="consolidated-open-domain-scanner"]')
        .scrollIntoView()
        .should('be.visible')
        .click();
    }
  });
  void cy.get(DOMAIN_SCANNER_SELECTOR, {timeout: DOMAIN_SCANNER_MODAL_TIMEOUT}).should('exist');
  void cy.get(DOMAIN_SCANNER_INPUT_SELECTOR, {timeout: DOMAIN_SCANNER_MODAL_TIMEOUT}).should('be.visible');
}

export function openFirstReportAndGoBack() {
  void cy.get('[data-testid="open-report"]').filter(':visible').first().scrollIntoView().should('be.visible').click();
  void cy.url().should('include', '/dashboard/profile/consolidated');
  cy.location('search').then((search) => {
    void cy.startInterceptTracking();
    void cy.get('[data-testid="dashboard-header-back"]')
      .filter(':visible')
      .first()
      .scrollIntoView()
      .click();
    void cy.waitForIntercepts({ timeout: 60000, idleMs: 250 });
    cy.get('body').then(($body) => {
      if (!$body.find('[data-testid="consolidated-tab-deep-search"]:visible').length) {
        void cy.visit(`/dashboard/profile/consolidated/all${search || '?tab=Deep%20Search'}`);
      }
    });
    void cy.get('[data-testid="consolidated-tab-deep-search"]')
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
  });
}

export function runDomainScannerFlow() {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="consolidated-tab-iocs"]').length === 0) {
      void cy.visit('/dashboard/profile/consolidated/all?page=1&tab=IOCs');
      return;
    }

    void cy.get('[data-testid="consolidated-tab-iocs"]').scrollIntoView().should('be.visible').click({ force: true });
  });
  ensureDomainScannerModalOpen();
  void cy.get('[data-testid="domain-scanner-tab-subdomains"]').scrollIntoView().should('be.visible').click({ force: true });
  void cy.get('[data-testid="domain-scanner-live-toggle"]').should('exist').parents('label').first().click();
  void cy.get(DOMAIN_SCANNER_INPUT_SELECTOR).scrollIntoView().should('be.visible').clear().type('abcderfghh');
  void cy.get('[data-testid="domain-scanner-search-subdomains"]').click();
  void cy.get('[data-testid="domain-scanner-search-subdomains"]').should('not.be.disabled');

  DOMAIN_SCANNER_TEST_DOMAINS.forEach((domain) => {
    void cy.get(DOMAIN_SCANNER_INPUT_SELECTOR).scrollIntoView().should('be.visible').clear().type(domain);
    void cy.get('[data-testid="domain-scanner-search-subdomains"]').click();
    void cy.get('[data-testid="domain-scanner-search-subdomains"]').should('not.be.disabled');
  });

  void cy.get('[data-testid="domain-scanner-tab-ip-lookup"]').scrollIntoView().should('be.visible').click({ force: true });
  void cy.get(DOMAIN_SCANNER_INPUT_SELECTOR).clear().type('1.1.1.1');
  void cy.get('[data-testid="domain-scanner-lookup-ip"]').scrollIntoView().should('be.visible').and('not.be.disabled').click();
  void cy.get('[data-testid="domain-scanner-lookup-ip"]').should('not.be.disabled');

  ensureDomainScannerModalOpen();
  void cy.get('[data-testid="domain-scanner-tab-wayback"]').scrollIntoView().should('be.visible').click({ force: true });
  ensureDomainScannerModalOpen();
  void cy.get(DOMAIN_SCANNER_INPUT_SELECTOR).should('be.visible').clear().type('example.com');
  void cy.get('[data-testid="domain-scanner-search-wayback"]').scrollIntoView().should('be.visible').click();
  void cy.get(DOMAIN_SCANNER_SELECTOR, {timeout: DOMAIN_SCANNER_MODAL_TIMEOUT}).should('exist').within(() => {
    void cy.get('button[aria-label="Close"]').click();
  });
  void cy.get(DOMAIN_SCANNER_SELECTOR, {timeout: DOMAIN_SCANNER_MODAL_TIMEOUT}).should('not.exist');
}

export function applyPasswordSchemeAndValidate() {
  void cy.get('[data-testid="ioc-open-password-scheme"]').first().scrollIntoView().click();
  void cy.get('[data-testid="password-scheme-modal"]').should('be.visible');
  void cy.get('[data-testid="password-scheme-title"]').should('contain.text', 'Password Scheme Filter');

  void cy.get('[data-testid="password-scheme-min-length"]').scrollIntoView().clear().type('8');
  void cy.get('[data-testid="password-scheme-max-length"]').scrollIntoView().clear().type('24');
  void cy.get('[data-testid="password-scheme-has-alphabets"]').scrollIntoView().check();
  void cy.get('[data-testid="password-scheme-has-numbers"]').scrollIntoView().check();
  void cy.get('[data-testid="password-scheme-search"]').scrollIntoView().click();
  void cy.get('[data-testid="password-scheme-modal"]').should('not.exist');

  selectIocResultTab('threats');
  void cy.get('[data-testid="ioc-threat-table"]').scrollIntoView();
  void cy.get('[data-testid="ioc-threat-table"]').find('[data-testid="ioc-threat-row"]').should('have.length.greaterThan', 0);
}

export function openIocFilterPanel() {
  void cy.openSideFilter()
}

function moveDatePickerToMonth(targetLabel: string, attempts = 0): void {
  if (attempts > 24) {
    throw new Error(`Could not navigate date picker to ${targetLabel}`);
  }

  cy.get('[data-testid="side-filter-date-month-label"]').first().invoke('text').then((raw) => {
    const currentLabel = raw.trim();
    if (currentLabel === targetLabel) {
      return;
    }

    const currentDate = new Date(`${currentLabel} 1`);
    const targetDate = new Date(`${targetLabel} 1`);
    const goPrev = currentDate.getTime() > targetDate.getTime();
    const navSelector = goPrev ? '[data-testid="side-filter-date-prev-month"]' : '[data-testid="side-filter-date-next-month"]';
    void cy.get(navSelector).first().scrollIntoView().click();
    moveDatePickerToMonth(targetLabel, attempts + 1);
  });
}

export function applyDateRangeFilter(monthLabel: string, startDay: number, endDay: number) {
  void cy.log(`Filter: applying date range ${monthLabel} (${startDay}-${endDay})`);
  cy.window().then((win) => win.console.log(`Filter: applying date range ${monthLabel} (${startDay}-${endDay})`));
  void cy.scrollDashboardToTop()
  openIocFilterPanel()
  void cy.get('[data-testid="side-filter-date-toggle"]')
    .filter(':visible')
    .first()
    .click();
  moveDatePickerToMonth(monthLabel);
  void cy.get(`[data-testid="side-filter-date-day-${startDay}"]`).filter(':visible').first().scrollIntoView().click();
  void cy.get(`[data-testid="side-filter-date-day-${endDay}"]`).filter(':visible').first().scrollIntoView().click();
  void cy.get('[data-testid="side-filter-apply"]').filter(':visible').first().scrollIntoView().click();
}

export function clearSideFilters() {
  openIocFilterPanel()
  void cy.get('[data-testid="side-filter-reset"]').filter(':visible').first().scrollIntoView().click();
  cy.get('body').then(($body) => {
    const $apply = $body.find('[data-testid="side-filter-apply"]:visible').first();
    if ($apply.length > 0) {
      openIocFilterPanel()
      void cy.wrap($apply).scrollIntoView().click();
    }
  });
}

export function searchDeepFromTop(query: string, waitForNetwork = true) {
  void cy.get('[data-testid="dashboard-body"]').scrollTo('top', {ensureScrollable: false});
  if (waitForNetwork) {
    void cy.intercept('POST', '**/api/search/consolidated').as('consolidatedSearchAfterDeepSearch');
  }
  typeDashboardSearchSlow(query);
  if (waitForNetwork) {
    void cy.wait('@consolidatedSearchAfterDeepSearch', {timeout: 60000});
  }
}

export function setAllInsightsExpanded(expand: boolean) {
  void cy.get('[data-testid^="insights-toggle-"]').each(($toggle) => {
    cy.wrap($toggle).find('[aria-label]').first().invoke('attr', 'aria-label').then((ariaLabel) => {
      const isExpanded = (ariaLabel || '').toLowerCase().includes('collapse');
      if (expand ? !isExpanded : isExpanded) {
        void cy.wrap($toggle).scrollIntoView().click();
      }
    });
  });
}

export function ensureInsightSectionExpanded(toggleTestId: string) {
  cy.get(`[data-testid="${toggleTestId}"]`).find('[aria-label]').first().invoke('attr', 'aria-label').then((ariaLabel) => {
    const isExpanded = (ariaLabel || '').toLowerCase().includes('collapse');
    if (!isExpanded) {
      void cy.get(`[data-testid="${toggleTestId}"]`).scrollIntoView().click();
    }
  });
}

export function runAdvancedFilterFlow() {
  void cy.log('Advanced: open and test real/fake filters with add/delete');
  void cy.get('[data-testid="dashboard-body"]').scrollTo('top', {ensureScrollable: false});

  openIocAdvancedBuilder();
  selectIocAdvancedControl(0, 'ioc-adv-tag-select', 'm_email', /email/i);
  typeIocAdvancedValue(0, 'ydt.sja@gail.ccmm');
  executeIocAdvancedSearch();
  selectIocResultTab('stealers');
  void cy.get('[data-testid="ioc-stealer-table"]').find('[data-testid="ioc-stealer-row"]').should('have.length.greaterThan', 0);

  openIocAdvancedBuilder();
  clickIocAdvancedRowButton(0, 'ioc-adv-add-filter');
  void cy.get(IOC_ADVANCED_ROW_SELECTOR).should('have.length.at.least', 2);

  selectIocAdvancedControl(1, 'ioc-adv-operator-select', '&&', /^(AND|&&)$/i);
  selectIocAdvancedControl(1, 'ioc-adv-tag-select', 'm_email', /email/i);
  typeIocAdvancedValue(1, 'fake-no-result-value-xyz@gmail.com');
  executeIocAdvancedSearch();

  selectIocResultTab('stealers');
  void cy.get('[data-testid="ioc-stealer-table"]').should(($shell) => {
    const rowCount = $shell.find('[data-testid="ioc-stealer-row"]').length;
    const emptyCount = $shell.find('.ui-ioc-table-empty').length;
    expect(rowCount === 0 || emptyCount > 0).to.eq(true);
  });

  openIocAdvancedBuilder();
  void cy.get(IOC_ADVANCED_ROW_SELECTOR).should('have.length.at.least', 2);
  clickIocAdvancedRowButton(1, 'ioc-adv-delete-filter');
  void cy.get(IOC_ADVANCED_ROW_SELECTOR).should('have.length', 1);
  executeIocAdvancedSearch();
  selectIocResultTab('stealers');
  void cy.get('[data-testid="ioc-stealer-table"]').should(($shell) => {
    const rowCount = $shell.find('[data-testid="ioc-stealer-row"]').length;
    const emptyCount = $shell.find('.ui-ioc-table-empty').length;
    expect(rowCount > 0 || emptyCount > 0).to.eq(true);
  });

  void cy.get('[data-testid="ioc-advanced-toggle"]').filter(':visible').first().scrollIntoView().click();
  void cy.get(IOC_ADVANCED_MODAL_SELECTOR).should('not.exist');
  void cy.get('[data-testid="ioc-basic-search-input"]').filter(':visible').first().should('be.visible');
}
