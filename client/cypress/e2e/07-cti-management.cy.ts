import {
  openAndAssertReportModal,
  selectCtiFilterType,
  visitCtiGraph,
  waitForToolbarSearchReady,
  waitForCtiGraphReady
} from './controllers/07-cti-management.controller';

describe('Orion Intelligence - CTI Graph Management Flows', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('runs CTI graph flow with filters, search, and export report actions', () => {
    visitCtiGraph();
    selectCtiFilterType('Cluster');
    waitForCtiGraphReady();
    waitForToolbarSearchReady();
    cy.docsScreenshot('cti-graph');
    cy.get('[data-testid="cti-graph-search-input"]').clear().type('leak{enter}');
    waitForCtiGraphReady();
    openAndAssertReportModal('Export CTI Report');
  });

  it('covers CTI toolbar toggles', () => {
    visitCtiGraph();

    cy.get('button[title="Physics"]').filter(':visible').first().click();
    cy.get('button[title="Physics"]').filter(':visible').first().click();
    cy.get('[data-testid="cti-expand-groups-toggle"]').filter(':visible').first().click();
    cy.get('[data-testid="cti-expand-groups-toggle"]').filter(':visible').first().click();
  });

  it('covers CTI sidebar collapse and advanced builder actions', () => {
    visitCtiGraph();

    cy.get('[data-testid="cti-graph-advanced-toggle"]').filter(':visible').first().click();
    cy.get('[data-testid="cti-graph-adv-empty-state"]').filter(':visible').should('contain', 'No builder values selected');
    cy.get('[data-testid="cti-graph-adv-clear-all"]').filter(':visible').first().should('be.disabled');
    cy.get('[data-testid="cti-graph-adv-expand"]').filter(':visible').first().should('contain', 'Show filters').click();
    cy.get('[data-testid="cti-graph-adv-expanded-modal"]').filter(':visible').first().should('be.visible');
    cy.get('[data-testid="cti-graph-adv-row"]').filter(':visible').first().should('exist');
    cy.get('[data-testid="cti-graph-adv-field-select"]').filter(':visible').first().click();
    cy.get('.ui-dropdown-menu input').filter(':visible').first().clear().type('Country');
    cy.contains('[role="option"]', 'Country').filter(':visible').first().click();
    cy.get('[data-testid="cti-graph-adv-value-input"]').filter(':visible').first().clear().type('Pakistan');
    cy.get('[data-testid="cti-graph-adv-add-filter"]').filter(':visible').first().click();
    cy.get('[data-testid="cti-graph-adv-row"]').should('have.length.at.least', 2);
    cy.get('[data-testid="cti-graph-adv-operator-select"]').filter(':visible').eq(1).click();
    cy.contains('[role="option"]', 'OR').filter(':visible').first().click();
    cy.get('[data-testid="cti-graph-adv-value-input"]').filter(':visible').eq(1).clear().type('8.8.8.8');
    cy.docsScreenshot('cti-advanced-graph-builder');
    cy.get('[data-testid="cti-graph-adv-expanded-execute"]').filter(':visible').first().click();
    cy.get('[data-testid="cti-graph-adv-filter-chip"]').filter(':visible').should('have.length.at.least', 1);
    cy.get('[data-testid="cti-graph-adv-clear-all"]').filter(':visible').first().should('not.be.disabled').click();
    cy.get('[data-testid="cti-graph-adv-empty-state"]').filter(':visible').should('contain', 'No builder values selected');
    waitForCtiGraphReady();
    cy.get('graph-sidebar [data-sidebar-expanded]').should('be.visible');
    cy.get('[data-testid="graph-sidebar-collapse"]')
      .filter(':visible')
      .first()
      .should('have.attr', 'aria-label', 'Collapse sidebar')
      .click();
    cy.get('graph-sidebar [data-sidebar-expanded]').should('not.exist');
    cy.get('graph-sidebar [data-sidebar-collapsed]').should('be.visible');
    cy.get('[data-testid="graph-sidebar-expand"]')
      .filter(':visible')
      .first()
      .should('have.attr', 'aria-label', 'Expand sidebar')
      .click();
    cy.get('graph-sidebar [data-sidebar-expanded]').should('be.visible');
    cy.get('graph-sidebar [data-sidebar-collapsed]').should('not.exist');
  });

  it('covers CTI report export option selection', () => {
    visitCtiGraph();
    const exportDate = new Date().toISOString().slice(0, 10);
    const exportBase = `cypress/downloads/cti-graph-intelligence-report-${exportDate}`;

    openAndAssertReportModal('Export CTI Report');
    cy.docsScreenshot('cti-export-modal');
    cy.get('[data-testid="graph-report-export-json"]').filter(':visible').first().click();
    cy.get('[data-testid="graph-report-export-modal"]').should('not.exist');
    cy.readFile(`${exportBase}-graph.json`, { timeout: 15000 }).its('title').should('eq', 'CTI Graph Intelligence Report');
    openAndAssertReportModal('Export CTI Report');
    cy.get('[data-testid="graph-report-export-report"]').filter(':visible').first().click();
    cy.get('[data-testid="graph-report-export-modal"]').should('not.exist');
    cy.readFile(`${exportBase}-graph-report.pdf`, 'binary', { timeout: 30000 }).should('contain', '%PDF');
    openAndAssertReportModal('Export CTI Report');
    cy.get('[data-testid="graph-report-export-csv"]').filter(':visible').first().click();
    cy.get('[data-testid="graph-report-export-modal"]').should('not.exist');
  });

  it('attempts CTI graph context menu actions (data-dependent)', () => {
    visitCtiGraph();
    selectCtiFilterType('Cluster');
    waitForCtiGraphReady();

    const attemptContextMenuAtOffsets = (offsetX: number, offsetY: number) => {
      cy.get('[data-testid="cti-network-container"] canvas')
        .filter(':visible')
        .first()
        .should('exist')
        .then(($canvas) => {
          const rect = $canvas[0].getBoundingClientRect();

          cy.wrap($canvas).trigger('contextmenu', {
            button: 2,
            clientX: rect.left + rect.width / 2 + offsetX,
            clientY: rect.top + rect.height / 2 + offsetY,
            force: true
          });
        });
    };

    [
      {x: 0, y: 0},
      {x: 120, y: 0},
      {x: -120, y: 0},
      {x: 0, y: 120},
      {x: 0, y: -120}
    ].forEach((point) => {
      attemptContextMenuAtOffsets(point.x, point.y);
    });

    cy.get('[data-testid="cti-context-menu"]').should('exist');
    cy.docsScreenshot('cti-context-menu');
    cy.window().then((win) => {
      cy.stub(win, 'open').as('ctiReportOpen');
    });
    cy.get('body').then(($body) => {
      const openReport = $body.find('[data-testid="cti-context-open-report"]:visible');
      if (openReport.length > 0) {
        cy.wrap(openReport.first()).click();
        cy.get('@ctiReportOpen').should('have.been.called');
      }
    });
  });

});
