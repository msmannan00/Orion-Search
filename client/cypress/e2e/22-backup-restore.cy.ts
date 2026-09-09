import {
  clearAllBackups,
  createInstantBackup,
  getBackupFilenames,
  getBackupRows,
  openBackupRestore,
  openScheduledBackupSettings,
  restoreBackupViaTestApi,
  setScheduledBackupToggle,
} from './controllers/22-backup-restore.controller';

const MAX_BACKUPS = 2;

describe('Backup & Restore - Admin Management Flow', () => {
  after(() => {
    cy.logout();
  });

  it('toggles scheduled backup, restores the latest instant backup, and rotates the oldest backup at the backup limit', () => {
    cy.loginAsAdmin();
    openBackupRestore();
    clearAllBackups();

    cy.intercept('POST', '**/api/public/update').as('updateScheduledBackup');
    openScheduledBackupSettings();
    setScheduledBackupToggle(true);
    cy.wait('@updateScheduledBackup', {timeout: 60000}).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.get('[data-testid="scheduled-backup-toggle"]').should('be.checked');
    cy.docsScreenshot('backup-restore-scheduled-toggle-on');

    openBackupRestore();
    createInstantBackup();
    getBackupRows().should('have.length', 1);

    createInstantBackup();
    getBackupRows().should('have.length', 2);
    cy.docsScreenshot('backup-restore-two-instant-backups');

    getBackupFilenames().then((filenames) => {
      const latestFilename = filenames[0];

      restoreBackupViaTestApi();
      cy.docsScreenshot('backup-restore-restore-success');

      getBackupFilenames().should('include', latestFilename);
    });

    getBackupRows().should('have.length', MAX_BACKUPS);

    cy.intercept('POST', '**/api/admin/backups/instant').as('createBackupAtLimit');
    cy.get('[data-testid="instant-backup-button"]').should('be.visible').and('not.be.disabled').click();
    cy.contains('[data-testid="confirmation-popup"]', `You already have ${MAX_BACKUPS} backups`).should('be.visible');
    cy.contains('[data-testid="confirmation-popup"]', 'The oldest backup will be deleted if you proceed').should('be.visible');
    cy.docsScreenshot('backup-restore-limit-warning-popup');
    cy.get('[data-testid="confirmation-yes-button"]').click();
    cy.wait('@createBackupAtLimit', {timeout: 60000}).its('response.statusCode').should('be.oneOf', [200, 201]);
    getBackupRows().should('have.length', MAX_BACKUPS);

    cy.logout();
  });
});
