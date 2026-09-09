export function openAndAssertReportModal(title: string) {
  void cy.get('[data-testid="cti-export-report"]').filter(':visible').first().click();
  void cy.contains(title).should('be.visible');
  void cy.get('[data-testid="graph-report-export-modal"]').filter(':visible').first().should('be.visible');
  void cy.get('[data-testid="graph-report-export-report"]').filter(':visible').first().should('exist');
  void cy.get('[data-testid="graph-report-export-json"]').filter(':visible').first().should('exist');
  void cy.get('[data-testid="graph-report-export-csv"]').filter(':visible').first().should('exist');
}

export function selectCtiFilterType(label: string) {
  const key = label.toLowerCase() === 'cluster' ? 'all' : label.toLowerCase();
  void cy.get(`[data-testid="cti-graph-search-chip-${key}"]`).filter(':visible').first().click();
}

export function waitForToolbarSearchReady() {
  void cy.get('[data-testid="cti-graph-search-input"]').should('be.visible').and('not.be.disabled');
}

export function waitForCtiGraphReady() {
  void cy.get('[data-testid="cti-network-container"]').should('be.visible');
  void cy.get('[data-testid="cti-network-container"] canvas').should('exist');
}

function setConfiguredViewport() {
  void cy.viewport(
    Number(Cypress.config('viewportWidth')) || 1920,
    Number(Cypress.config('viewportHeight')) || 1080
  );
}

export function visitCtiGraph() {
  setConfiguredViewport();
  void cy.visit('/dashboard/ctigraph');
  void cy.location('pathname').should('include', '/dashboard/ctigraph');
  void cy.get('[data-testid="cti-graph-root"]').should('be.visible');
}
