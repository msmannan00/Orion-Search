import {
  applyDateRangeFilter,
  applyPasswordSchemeAndValidate,
  clickConsolidatedSectionToggle,
  clearSideFilters,
  CONSOLIDATED_TOGGLE_SELECTOR,
  ensureInsightSectionExpanded,
  expandThreatRowsIfAvailable,
  openFirstReportAndGoBack,
  openHomepageAndSearch,
  RESULT_CARD_SELECTOR,
  runAdvancedFilterFlow,
  runDomainScannerFlow,
  searchDeepFromTop,
  searchInIocs,
  selectIocResultTab,
  setAllInsightsExpanded,
  switchToDeepSearchTab,
  switchToIocsTab
} from './controllers/13-consolidated.controller';

function expandIocRows(tableTestId: string, rowTestId: string, toggleTestId: string, maxRows = 3) {
  const tableSelector = `[data-testid="${tableTestId}"]`;
  const rowSelector = `[data-testid="${rowTestId}"]`;
  const toggleSelector = `[data-testid="${toggleTestId}"]`;

  cy.get(tableSelector).find(rowSelector).should('have.length.greaterThan', 0).then(($rows) => {
    const count = Math.min(maxRows, $rows.length);
    for (let i = 0; i < count; i += 1) {
      void cy.get(tableSelector)
        .find(rowSelector)
        .eq(i)
        .scrollIntoView()
        .find(toggleSelector)
        .first()
        .click({ force: true });
    }
  });
}

function assertNoThreatRows() {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="ioc-tab-threats"]:visible').length > 0) {
      selectIocResultTab('threats');
      void cy.get('[data-testid="ioc-threat-table"]')
        .find('[data-testid="ioc-threat-row"]')
        .should('have.length', 0);
      return;
    }

    void cy.get('[data-testid="ioc-threat-table"]').should('not.exist');
  });
}

describe('Consolidated - IOC Basic Flow', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it('opens Deep Search section', () => {
    const consolidatedSections = [
      'consolidated-section-social',
      'consolidated-section-tracking',
      'consolidated-section-news',
      'consolidated-section-leak',
    ];

    openHomepageAndSearch('{enter}');
    switchToDeepSearchTab();
    cy.get('[data-testid="consolidated-tab-deep-search"]')
      .should('be.visible')
      .and('have.attr', 'data-tab', 'Deep Search');
    searchDeepFromTop('data');
    cy.get('[data-testid="result-card"]').should('exist');
    cy.docsScreenshot('consolidated-results');

    cy.get('body').then(($body) => {
      const hasDefacementReport = $body.find('[data-testid="defacement-report"]').length > 0;
      if (!hasDefacementReport) {
        return;
      }

      cy.get('[data-testid="defacement-report"]').within(() => {
        cy.get('[data-testid="defacement-report-title"]').should('contain.text', 'IP Threat Report');
        cy.get('[data-testid="defacement-report-chip"]').contains(/databases\s*\(\d+\)/i).scrollIntoView().should('exist');
        cy.get('[data-testid="defacement-report-chip"]').contains(/phishing\s*\(\d+\)/i).scrollIntoView().should('exist');
      });

      cy.get('[data-testid="defacement-report-toggle-icon"]')
        .first()
        .then(($icon) => {
          const isExpanded = (($icon.attr('class') || '') as string).includes('rotate-90');
          if (!isExpanded) {
            cy.wrap($icon)
              .closest('[data-testid="defacement-report-toggle"]')
              .scrollIntoView()
              .click();
          }
        });

      cy.get('[data-testid="defacement-report-card"]').then(($allCards) => {
        const cards = [...$allCards].filter((el) => el.textContent?.includes('IOC THREAT'));
        if (cards.length < 3) {
          return;
        }
        for (let i = 0; i < 3; i += 1) {
          const card = cards[i];
          cy.wrap(card).scrollIntoView().should('contain.text', 'Web Server');
          cy.wrap(card).should('contain.text', 'Attacker');
          cy.wrap(card).should('contain.text', 'Team');
          cy.wrap(card).should('contain.text', 'IP(s)');
          cy.wrap(card).should('contain.text', 'URL');
        }
      });

      cy.get('[data-testid="defacement-report-toggle"]')
        .first()
        .scrollIntoView()
        .click();
      cy.get('[data-testid="defacement-report-card-title"]').should('not.exist');

      cy.get('[data-testid="defacement-report-toggle"]')
        .first()
        .scrollIntoView()
        .click();
      cy.get('[data-testid="defacement-report-card-title"]').should('be.visible');
    });

    cy.get('[data-testid="insights-section-keyword"]').should('be.visible');
    cy.get('[data-testid^="insights-keyword-item-"]').should('have.length.greaterThan', 0);
    cy.get('[data-testid="insights-section-coverage"]').should('be.visible');
    cy.get('[data-testid^="insights-coverage-item-"]').should('have.length.greaterThan', 0);
    setAllInsightsExpanded(true);
    cy.get('[data-testid="insights-section-threat-actor"]').scrollIntoView().should('be.visible');
    cy.docsScreenshot('consolidated-insights');

    cy.get('[data-testid="insights-section-threat-actor"]').should('be.visible');
    ensureInsightSectionExpanded('insights-toggle-threat-actor');
    cy.get('[data-testid="insights-section-threat-actor"] [data-testid^="insights-threat-item-"]')
      .should('have.length.greaterThan', 0)
      .then(($before) => {
      const beforeCount = $before.length;
      expect(beforeCount).to.be.greaterThan(0);

      const firstItemText = ($before[0]?.textContent || '').trim();
      const keyword = (firstItemText.split(/\s+/).find((part) => part.length >= 3) || 'data').toLowerCase();

      cy.get('[data-testid="insights-threat-search-input"]')
        .scrollIntoView()
        .clear()
        .type(keyword);
      cy.get('[data-testid="insights-section-threat-actor"] [data-testid^="insights-threat-item-"]').should(($after) => {
        expect($after.length).to.be.greaterThan(0);
        expect($after.length).to.be.at.most(beforeCount);
      });

      cy.get('[data-testid="insights-threat-search-input"]')
        .scrollIntoView()
        .clear()
        .type('zzzzzzzzzz-no-match');
      cy.get('[data-testid="insights-section-threat-actor"] [data-testid^="insights-threat-item-"]').should('have.length', 0);

      cy.get('[data-testid="insights-threat-search-input"]').scrollIntoView().clear();
    });

    consolidatedSections.forEach((sectionId) => {
      const sectionSelector = `[data-testid="${sectionId}"]`;

      cy.get(sectionSelector).scrollIntoView().should('be.visible');
      cy.get(sectionSelector).find('[data-testid^="consolidated-section-count-"]').should('be.visible');

      cy.get(sectionSelector).then(($section) => {
        const hasPagination = $section.find(CONSOLIDATED_TOGGLE_SELECTOR).length > 0;
        if (!hasPagination) {
          return;
        }

        cy.get(sectionSelector).find(RESULT_CARD_SELECTOR).then(($cardsBefore) => {
          const before = $cardsBefore.length;
          clickConsolidatedSectionToggle(sectionId, /see\s+more/i);

          cy.get(sectionSelector).find(RESULT_CARD_SELECTOR).then(($cardsAfterExpand) => {
            const expanded = $cardsAfterExpand.length;
            expect(expanded).to.be.at.least(before);

            clickConsolidatedSectionToggle(sectionId, /see\s+less/i);
            cy.get(sectionSelector).find(RESULT_CARD_SELECTOR).its('length').should('be.at.most', expanded);
          });
        });
      });
    });

    cy.get('[data-testid="side-filter-open"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="side-filter-close"]').filter(':visible').first().should('be.visible').click();
    applyDateRangeFilter('January 2026', 13, 16);
    cy.get('[data-testid="result-card"]').should('exist');
    clearSideFilters();
    cy.get('[data-testid="result-card"]').should('exist');
    cy.get('[data-testid="side-filter-open"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="side-filter-close"]').filter(':visible').first().should('be.visible').click();
    applyDateRangeFilter('March 2026', 1, 2);
    clearSideFilters();
    cy.get('[data-testid="result-card"]').should('exist');

    cy.get('[data-testid="dashboard-body"]').scrollTo('top', {ensureScrollable: false});
    searchDeepFromTop('example.com');

    cy.get('[data-testid="consolidated-scan-title"]').should('contain.text', 'Threats Scans Report:');
    cy.get('[data-testid="consolidated-scan-openweb-title"]').should('be.visible');
    cy.get('[data-testid="consolidated-scan-liveapi-title"]').should('be.visible');

    cy.get('[data-testid="consolidated-scan-openweb-detail"]')
      .first()
      .should('have.attr', 'href')
      .and('include', '/dashboard/scanner/');
    cy.get('[data-testid="consolidated-scan-openweb-detail"]')
      .first()
      .invoke('removeAttr', 'target')
      .scrollIntoView()
      .click();
    cy.url().should('include', '/dashboard/scanner/network-scan');
    openHomepageAndSearch('{enter}');
    switchToDeepSearchTab();
    cy.get('[data-testid="dashboard-body"]').scrollTo('top', {ensureScrollable: false});
    searchDeepFromTop('example.test');
    cy.get('[data-testid="consolidated-scan-title"]').should('contain.text', 'Threats Scans Report:');

    cy.get('[data-testid="consolidated-section-social"]').scrollIntoView().should('be.visible');
    openFirstReportAndGoBack();

    cy.get('[data-testid="side-filter-open"]').scrollIntoView().click();
    cy.get('[data-testid="side-filter-select-network"]').scrollIntoView().then(($trigger) => {
      const menuId = $trigger.attr('aria-controls');
      expect(menuId, 'side-filter network menu id').to.not.equal(undefined);
      cy.wrap($trigger).click({ force: true });
      cy.wrap($trigger).should('have.attr', 'aria-expanded', 'true');
      cy.contains(`#${menuId} [role="option"]`, /^Clearnet$/i, { timeout: 15000 }).click({ force: true });
    });
    cy.get('[data-testid="side-filter-apply"]').scrollIntoView().click();
    cy.get('[data-testid="result-card"]').should('have.length.greaterThan', 0);

    cy.get('[data-testid="result-card"]').then(($cards) => {
      const cardWithNetwork = [...$cards].find((el) => (el.textContent || '').includes('Network:'));
      expect(cardWithNetwork, 'result card with Network field').to.not.equal(undefined);
      cy.wrap(cardWithNetwork as HTMLElement)
        .should('contain.text', 'Network:')
        .and('contain.text', 'clearnet');
    });
  });

  it('opens IOCs and clicks first 3 rows in Stealers and Threats', () => {
    openHomepageAndSearch('{enter}');
    switchToIocsTab();

    selectIocResultTab('stealers');
    cy.get('[data-testid="ioc-stealer-table"]').should('be.visible');

    expandIocRows('ioc-stealer-table', 'ioc-stealer-row', 'ioc-stealer-row-toggle');

    expandThreatRowsIfAvailable();

    cy.scrollDashboardToTop()
    searchInIocs('ydt.sja@gail.ccmm');
    selectIocResultTab('stealers');
    cy.get('[data-testid="ioc-stealer-table"]').should('be.visible');
    cy.get('[data-testid="ioc-stealer-table"]').should(($table) => {
      const rowCount = $table.find('[data-testid="ioc-stealer-row"]').length;
      const emptyCount = $table.find('.ui-ioc-table-empty').length;
      expect(rowCount > 0 || emptyCount > 0).to.eq(true);
    }).then(($table) => {
      const $rows = $table.find('[data-testid="ioc-stealer-row"]');
      if ($rows.length > 0) {
        cy.wrap($rows)
          .first()
          .find('[data-testid="ioc-stealer-row-toggle"]')
          .first()
          .scrollIntoView()
          .click();
        cy.get('[data-testid="ioc-expanded-email-value"]')
          .filter(':visible')
          .should('have.length.greaterThan', 0)
          .first()
          .should('contain.text', 'ydt.sja@gail.ccmm');
      }
      else {
        expect($table.find('.ui-ioc-table-empty').length).to.be.greaterThan(0);
      }
    });


    searchInIocs('data');
    selectIocResultTab('threats');
    cy.get('[data-testid="ioc-threat-table"]').scrollIntoView();
    cy.get('[data-testid="ioc-threat-table"]').should(($table) => {
      const rowCount = $table.find('[data-testid="ioc-threat-row"]').length;
      const emptyCount = $table.find('.ui-ioc-table-empty').length;
      expect(rowCount > 0 || emptyCount > 0).to.eq(true);
    }).then(($table) => {
      const $rows = $table.find('[data-testid="ioc-threat-row"]');
      if ($rows.length > 0) {
        cy.wrap($rows)
          .first()
          .find('[data-testid="ioc-threat-row-toggle"]')
          .first()
          .scrollIntoView()
          .click();
        cy.get('[data-testid="ioc-expanded-telemetry-title"]')
          .filter(':visible')
          .should('have.length.greaterThan', 0);
      }
      else {
        expect($table.find('.ui-ioc-table-empty').length).to.be.greaterThan(0);
      }
    });

    cy.get('[data-testid="ioc-download-results"]').first().scrollIntoView().click();
    cy.get('[data-testid="graph-report-export-csv"]').should('be.visible').click();
    applyPasswordSchemeAndValidate();

    cy.get('[data-testid="ioc-basic-tag-m_email"]')
      .scrollIntoView()
      .should('be.visible')
      .click();
    searchInIocs('abc');

    cy.get('[data-testid="ioc-basic-error"]').should('exist');
    selectIocResultTab('stealers');
    cy.get('[data-testid="ioc-stealer-table"]')
      .find('[data-testid="ioc-stealer-row"]')
      .should('have.length', 0);

    searchInIocs('');
    applyDateRangeFilter('January 2026', 13, 16);
    selectIocResultTab('threats');
    cy.get('[data-testid="ioc-threat-table"]')
      .find('[data-testid="ioc-threat-row"]')
      .should('have.length.greaterThan', 0);

    applyDateRangeFilter('March 2026', 1, 2);
    assertNoThreatRows();

    searchInIocs('');
    clearSideFilters();
    runAdvancedFilterFlow();
  });

  it('opens domain scanner and runs Subdomains, IP Lookup, and Wayback scans', () => {
    openHomepageAndSearch('{enter}');
    runDomainScannerFlow();
  });
});

it('runs Cross Search card in consolidated Deep Search', () => {
  cy.loginAsAdmin();

  openHomepageAndSearch('{enter}');
  switchToDeepSearchTab();
  searchDeepFromTop('hacking', false);

  cy.get('[data-testid="dashboard-body"]', { timeout: 60000 }).should('exist');

  cy.get('[data-testid="onion-search-report"]', { timeout: 60000 })
    .scrollIntoView()
    .should('be.visible')
    .within(() => {
      cy.get('[data-testid="onion-search-report-title"]')
        .should('contain.text', 'See Results From Other Search Engines');
    });

  cy.get('[data-testid="onion-search-report-title"]')
    .scrollIntoView()
    .click();

  cy.get('body', { timeout: 120000 }).then(($body) => {
    const hasEngineCards = $body.find('[data-testid="onion-search-report-card"]').length > 0;

    if (hasEngineCards) {
      cy.get('[data-testid="onion-search-report-card"]')
        .should('have.length.at.least', 1);
    } else {
      cy.contains(/searching across search engines|loading|no successful cross-search suggestions|cross search failed/i, {
        timeout: 120000,
      }).should('exist');
    }
  });
});
