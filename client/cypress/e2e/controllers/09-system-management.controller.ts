export function openSystemSettings() {
  void cy.get('[data-testid="sidebar-subitem-profile-system-settings"]').filter(':visible').first().scrollIntoView().click();
  void cy.url().should('include', 'system-settings');
}

export function openTenantBrandingSettings() {
  void cy.get('[data-testid="system-settings-tab-branding"]').should('be.visible').click();
}

export function fillSystemMailConfiguration(server: string, port: string) {
  void cy.get('[data-testid="system-settings-account-mail"]')
    .scrollIntoView()
    .should('be.visible')
    .clear()
    .type('cypress-mailer@example.test');
  void cy.get('[data-testid="system-settings-account-mail-password"]')
    .scrollIntoView()
    .should('be.visible')
    .clear()
    .type('1#VSC&cuad)d', {log: false});
  void cy.get('[data-testid="system-settings-account-smtp-server"]')
    .scrollIntoView()
    .should('be.visible')
    .clear()
    .type(server);
  void cy.get('[data-testid="system-settings-account-smtp-port"]')
    .scrollIntoView()
    .should('be.visible')
    .clear()
    .type(port);
}

export function ensureSystemSettingsEditing() {
  void cy.get('[data-testid="system-settings-mail-save"]').scrollIntoView().should('be.visible').and('not.be.disabled');
}
