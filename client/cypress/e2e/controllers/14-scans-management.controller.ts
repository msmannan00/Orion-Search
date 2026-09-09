export function fillPrimaryScanInput(value: string) {
  void cy.get('[data-testid="scan-primary-input"]').filter(':visible').first().should('be.visible').type('{selectall}{backspace}').type(value);
}

export function fillSecondaryScanInput(value: string) {
  void cy.get('[data-testid="scan-secondary-input"]').filter(':visible').first().should('be.visible').type('{selectall}{backspace}').type(value);
}

export function clickSearch() {
  void cy.get('[data-testid="scan-search-button"]').filter(':visible').first().should('be.enabled').click();
}

export function makeFileInputInteractable() {
  void cy.get('[data-testid="scan-file-input"]').first().should('exist').invoke('removeClass', 'hidden').invoke('attr', 'style', 'display:block;position:fixed;left:8px;top:8px;opacity:1;z-index:9999;');
}
