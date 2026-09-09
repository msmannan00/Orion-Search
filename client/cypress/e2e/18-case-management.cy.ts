import { CASE_MOVE_STATUS_IDS } from './controllers/18-case-management.controller';
import { addCase } from './controllers/18-case-management.controller';
import { addLinkTargetCase } from './controllers/18-case-management.controller';
import { assertCaseHiddenInList } from './controllers/18-case-management.controller';
import { assertCaseVisibleInList } from './controllers/18-case-management.controller';
import { assertNotification } from './controllers/18-case-management.controller';
import { assertVisibleTenantAlertEmails } from './controllers/18-case-management.controller';
import { assignAnalystIfAvailable } from './controllers/18-case-management.controller';
import { caseId } from './controllers/18-case-management.controller';
import { clickHeaderAction } from './controllers/18-case-management.controller';
import { configureTenantForCaseAlerts } from './controllers/18-case-management.controller';
import { linkedCaseId } from './controllers/18-case-management.controller';
import { openCaseAlertsView } from './controllers/18-case-management.controller';
import { openCaseManagement } from './controllers/18-case-management.controller';
import { openCreatedCaseDetails } from './controllers/18-case-management.controller';
import { openCreatedCaseFromList } from './controllers/18-case-management.controller';
import { selectCaseDate } from './controllers/18-case-management.controller';
import { selectCaseFilterDropdown } from './controllers/18-case-management.controller';
import { selector } from './controllers/18-case-management.controller';
import { typeCaseFilterSearch } from './controllers/18-case-management.controller';
import { addUser } from './controllers/05-user-management.controller';
import { setPasswordResetRequired } from './controllers/05-user-management.controller';
import { type ManagedUser } from './model/05-user-management.model';
import { type CaseAlertTenant } from './model/10-tenant-management.model';
import { createTenantAccount } from './controllers/10-tenant-management.controller';
import { loginCaseAlertUser } from './controllers/10-tenant-management.controller';
import { onboardTenantForCaseAlerts } from './controllers/10-tenant-management.controller';
import { openTenantsPage } from './controllers/10-tenant-management.controller';
import { setTenantAlertVisibility } from './controllers/10-tenant-management.controller';

describe('Case Management - Add View Edit Flow', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('creates cases and opens created case details', () => {
    openCaseManagement();
    addCase();
    assignAnalystIfAvailable();
    addLinkTargetCase();
    openCreatedCaseFromList();

    cy.then(() => {
      cy.get(selector('case-details-case-id-value')).should('contain.text', caseId);
    });
    cy.get(selector('case-details-title-value')).should('contain.text', 'Cypress Case Title');
    cy.get(selector('case-details-description-value')).should('contain.text', 'Cypress investigation context');
    cy.get(selector('case-details-type-value')).should('contain.text', 'Fraud');
    cy.get(selector('case-details-intake-source-value')).should('contain.text', 'Soc Alert');
    cy.get(selector('case-details-status-value')).should('contain.text', 'New');
    cy.get(selector('case-details-severity-value')).should('contain.text', 'high');
    cy.get(selector('case-details-priority-value')).should('contain.text', 'high');
    cy.get(selector('case-primary-entity-value')).should('contain.text', 'Cypress Entity');
    cy.docsScreenshot('case-management-view');

    cy.get(selector('case-closure-add'))
      .scrollIntoView()
      .should('be.visible')
      .and('be.disabled');
  });

  it('filters case list by search and dropdown filters', () => {
    openCaseManagement();

    cy.then(() => {
      expect(caseId, 'created case id').not.to.equal('');
      expect(linkedCaseId, 'linked case id').not.to.equal('');

      typeCaseFilterSearch(caseId);
      assertCaseVisibleInList(caseId);
      assertCaseHiddenInList(linkedCaseId);
    });
    cy.docsScreenshot('case-management-filters');

    selectCaseFilterDropdown('case-filter-status', 'New');
    cy.then(() => assertCaseVisibleInList(caseId));
    selectCaseFilterDropdown('case-filter-status', 'Resolved');
    cy.then(() => assertCaseHiddenInList(caseId));
    selectCaseFilterDropdown('case-filter-status', 'All Statuses');

    selectCaseFilterDropdown('case-filter-severity', 'High');
    cy.then(() => assertCaseVisibleInList(caseId));
    selectCaseFilterDropdown('case-filter-severity', 'Critical');
    cy.then(() => assertCaseHiddenInList(caseId));
    selectCaseFilterDropdown('case-filter-severity', 'All Severities');

    selectCaseFilterDropdown('case-filter-priority', 'High');
    cy.then(() => assertCaseVisibleInList(caseId));
    selectCaseFilterDropdown('case-filter-priority', 'Critical');
    cy.then(() => assertCaseHiddenInList(caseId));
    selectCaseFilterDropdown('case-filter-priority', 'All Priorities');

    selectCaseFilterDropdown('case-filter-type', 'Fraud');
    cy.then(() => assertCaseVisibleInList(caseId));
    selectCaseFilterDropdown('case-filter-type', 'Malware');
    cy.then(() => assertCaseHiddenInList(caseId));
    selectCaseFilterDropdown('case-filter-type', 'All Types');

    selectCaseFilterDropdown('case-filter-sort', 'Oldest Updated');
    cy.then(() => assertCaseVisibleInList(caseId));
  });

  it('toggles case list and analytics views', () => {
    openCaseManagement();
    cy.get(selector('case-mode-analytics-button')).click({ force: true });
    cy.get(selector('case-analytics-panel')).should('be.visible');
    cy.docsScreenshot('case-management-analytics');
    cy.get(selector('case-mode-list-button')).click({ force: true });
    cy.get(selector('case-management-table')).should('be.visible');
  });

  it('edits case details and primary entity', () => {
    openCreatedCaseDetails();

    cy.get(selector('case-details-edit')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-details-edit-drawer')).filter(':visible').first().should('be.visible');
    cy.get(selector('case-details-title-input')).should('be.visible').clear().type('Cypress Updated Case Title');
    cy.get(selector('case-details-description-input')).should('be.visible').clear().type('Cypress updated investigation context');
    cy.get(selector('case-details-intake-source-select')).scrollIntoView().should('be.visible').select('email_report');
    cy.get(selector('case-details-severity-select')).scrollIntoView().should('be.visible').select('critical');
    cy.get(selector('case-details-priority-select')).scrollIntoView().should('be.visible').select('critical');
    cy.get(selector('case-details-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Case details updated successfully');
    cy.get(selector('case-details-title-value')).should('contain.text', 'Cypress Updated Case Title');
    cy.get(selector('case-details-description-value')).should('contain.text', 'Cypress updated investigation context');
    cy.get(selector('case-details-intake-source-value')).should('contain.text', 'Email Report');
    cy.get(selector('case-details-status-value')).should('contain.text', 'New');
    cy.get(selector('case-details-severity-value')).should('contain.text', 'critical');
    cy.get(selector('case-details-priority-value')).should('contain.text', 'critical');

    cy.get(selector('case-primary-entity-edit')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-primary-entity-edit-drawer')).filter(':visible').first().should('be.visible');
    cy.get(selector('case-primary-entity-value-input')).scrollIntoView().should('be.visible').clear().type('Cypress Updated Entity');
    cy.get(selector('case-primary-entity-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Primary entity updated successfully');
    cy.get(selector('case-primary-entity-value')).should('contain.text', 'Cypress Updated Entity');
  });

  it('applies status board settings to tracking board', () => {
    const setStatusToggle = (testId: string, checked: boolean) => {
      cy.get(selector(testId)).then(($input) => {
        if ($input.is(':checked') !== checked) {
          cy.wrap($input).click({ force: true });
        }
      });
    };

    const saveStatusBoardSettings = () => {
      cy.intercept('PUT', '**/api/profile/cases/status-board-config/*').as('saveStatusBoardSettings');
      cy.contains('button', 'Save').scrollIntoView().should('be.visible').click({ force: true });
      cy.wait('@saveStatusBoardSettings', { timeout: 60000 }).its('response.statusCode').should('eq', 200);
    };

    cy.then(() => {
      expect(caseId, 'created case id').not.to.equal('');
    });

    cy.visit('/dashboard/profile/case-management/tracking-board/settings');
    cy.get(selector('case-tracking-board-settings-page')).should('be.visible');
    cy.get(selector('status-board-label-intake_review')).clear().type('Triage');
    setStatusToggle('status-board-skippable-intake_review', true);
    setStatusToggle('status-board-enabled-evidence_collection', false);
    saveStatusBoardSettings();

    cy.visit('/dashboard/profile/case-management/tracking-board');
    cy.get(selector('case-tracking-board-page')).should('be.visible');
    cy.get(selector('tracking-column-intake_review')).should('contain.text', 'Triage');
    cy.get(selector('tracking-column-shell-evidence_collection')).should('not.exist');
    cy.get(selector(`case-board-card-${caseId}`), { timeout: 60000 }).scrollIntoView().should('exist');
    cy.get(selector(`case-board-move-${caseId}-under_investigation`)).should('exist');
    cy.get(selector(`case-board-move-${caseId}-evidence_collection`)).should('not.exist');

    cy.visit('/dashboard/profile/case-management/tracking-board/settings');
    cy.get(selector('case-tracking-board-settings-page')).should('be.visible');
    cy.get(selector('status-board-label-intake_review')).clear().type('Intake Review');
    setStatusToggle('status-board-skippable-intake_review', false);
    setStatusToggle('status-board-enabled-evidence_collection', true);
    saveStatusBoardSettings();
  });

  it('adds and edits related entity', () => {
    openCreatedCaseDetails();

    cy.get(selector('case-related-entity-add')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-related-entity-add-drawer')).filter(':visible').first().should('be.visible');
    cy.get(selector('case-related-entity-value-input-0')).scrollIntoView().should('be.visible').type('Cypress Related Domain');
    cy.get(selector('case-related-entity-add-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Related entity added successfully');
    cy.get(selector('case-related-entity-card-0')).scrollIntoView().should('be.visible');
    cy.get(selector('case-related-entity-value-0')).should('contain.text', 'Cypress Related Domain');

    cy.get(selector('case-related-entity-edit-0')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-related-entity-edit-drawer')).filter(':visible').first().should('be.visible');
    cy.get(selector('case-related-entity-value-input-0')).scrollIntoView().should('be.visible').clear().type('Cypress Updated Related Domain');
    cy.get(selector('case-related-entity-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Related entities updated successfully');
    cy.get(selector('case-related-entity-value-0')).should('contain.text', 'Cypress Updated Related Domain');
  });

  it('adds and edits artifacts and task', () => {
    openCreatedCaseDetails();

    cy.get(selector('case-artifact-add')).first().scrollIntoView().click({ force: true });
    cy.get(selector('case-artifact-add-drawer')).filter(':visible').first().should('be.visible');
    cy.get(selector('case-artifact-title-input')).should('be.visible').type('Cypress Evidence Artifact');
    cy.get(selector('case-artifact-type-select')).should('be.visible').select('file');
    cy.get(selector('case-artifact-source-select')).should('be.visible').select('manual');
    selectCaseDate('case-artifact-captured-input', '2026-05-25');
    cy.get(selector('case-artifact-description-input')).should('be.visible').type('Artifact added by Cypress');
    cy.get(selector('case-artifact-file-input')).selectFile('cypress/fixtures/resume-sample.pdf', { force: true });
    cy.get(selector('case-artifact-add-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Artifact added successfully');
    cy.get(selector('case-artifact-card-0')).scrollIntoView().should('be.visible');
    cy.get(selector('case-artifact-title-value-0')).should('contain.text', 'Cypress Evidence Artifact');
    cy.get(selector('case-artifact-file-download-0')).should('be.visible');
    cy.get(selector('case-artifact-file-delete-0')).should('be.visible');

    cy.get(selector('case-artifact-file-verify-0'))
      .should('be.visible')
      .click();

    assertNotification('File integrity verified');

    cy.get(selector('case-artifact-file-integrity-0')).should('contain.text', 'Verified');
    cy.docsScreenshot('case-artifact-integrity');

    cy.get(selector('case-artifact-edit-0')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-artifact-edit-drawer')).filter(':visible').first().within(() => {
      cy.get(selector('case-artifact-file-download-0')).should('not.exist');
      cy.get(selector('case-artifact-file-delete-0')).should('not.exist');
    });
    cy.get(selector('case-artifact-title-input')).should('be.visible').clear().type('Cypress Updated Evidence Artifact');
    cy.get(selector('case-artifact-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Artifacts updated successfully');
    cy.get(selector('case-artifact-title-value-0')).should('contain.text', 'Cypress Updated Evidence Artifact');

    cy.get(selector('case-artifact-add')).first().scrollIntoView().click({ force: true });
    cy.get(selector('case-artifact-add-drawer')).filter(':visible').first().should('be.visible');

    cy.get(selector('case-artifact-title-input')).should('be.visible').type('Cypress Linked Report Artifact');
    cy.get(selector('case-artifact-type-select')).should('be.visible').select('report');

    cy.get(selector('case-artifact-report-source-select')).filter(':visible').first()
      .should('be.visible')
      .select('strategic');

    cy.get(selector('case-artifact-report-search-input')).filter(':visible').first()
      .should('be.visible')
      .type('test');

    cy.get(selector('case-artifact-report-empty')).should('not.exist');

    cy.get(selector('case-artifact-report-option-0')).filter(':visible').first()
      .should('be.visible');
    cy.docsScreenshot('case-linked-report-artifact-search');
    cy.get(selector('case-artifact-report-option-0')).filter(':visible').first()
      .click({ force: true });

    cy.get(selector('case-artifact-add-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Artifact added successfully');

    cy.get(selector('case-artifact-card-1')).scrollIntoView().should('be.visible');
    cy.get(selector('case-artifact-title-value-1')).should('contain.text', 'Cypress Linked Report Artifact');
    cy.get(selector('case-artifact-card-1')).should('contain.text', 'Linked Report');

    cy.get(selector('case-artifact-file-download-0')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-artifact-file-delete-0')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    assertNotification('File deleted successfully');
    cy.get(selector('case-artifact-file-download-0')).should('not.exist');

    cy.get(selector('case-artifact-add')).first().scrollIntoView().click({ force: true });
    cy.get(selector('case-artifact-add-drawer')).filter(':visible').first().should('be.visible');

    cy.get(selector('case-artifact-title-input'))
      .should('be.visible')
      .type('Cypress Raw Alert Artifact');

    cy.get(selector('case-artifact-type-select'))
      .should('be.visible')
      .select('raw_alert');

    cy.get(selector('case-artifact-source-select'))
      .should('be.visible')
      .select('manual');

    cy.get(selector('case-artifact-description-input'))
      .should('be.visible')
      .type('Raw alert artifact added by Cypress');

    cy.get(selector('case-artifact-add-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Artifact added successfully');

    cy.get(selector('case-artifact-card-2'))
      .scrollIntoView()
      .should('be.visible');

    cy.get(selector('case-artifact-title-value-2'))
      .should('contain.text', 'Cypress Raw Alert Artifact');

    cy.get(selector('case-task-add')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-task-add-drawer')).filter(':visible').first().should('be.visible');
    cy.get(selector('case-task-title-input')).should('be.visible').type('Cypress Review Task');
    cy.get(selector('case-task-status-select')).should('be.visible').select('in_progress');
    cy.get(selector('case-task-priority-select')).should('be.visible').select('high');
    selectCaseDate('case-task-due-input', '2026-05-26');
    cy.get(selector('case-task-description-input')).should('be.visible').type('Task added by Cypress');
    cy.get(selector('case-task-add-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    cy.get(selector('case-task-add-drawer')).should('not.exist');
    cy.get(selector('case-task-card-0')).scrollIntoView().should('be.visible');
    cy.get(selector('case-task-title-value-0')).should('contain.text', 'Cypress Review Task');

    cy.get(selector('case-task-edit-0')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-task-edit-drawer')).filter(':visible').first().should('be.visible');
    cy.get(selector('case-task-title-input')).should('be.visible').clear().type('Cypress Updated Review Task');
    cy.get(selector('case-task-status-select')).should('be.visible').select('done');
    cy.get(selector('case-task-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    cy.get(selector('case-task-edit-drawer')).should('not.exist');
    cy.get(selector('case-task-title-value-0')).should('contain.text', 'Cypress Updated Review Task');
    cy.get(selector('case-task-card-0')).should('contain.text', 'Done');
  });

  it('adds and edits linked case', () => {
    openCreatedCaseDetails();

    cy.get(selector('case-linked-case-add')).last().scrollIntoView().should('exist').click({ force: true });
    cy.get(selector('case-linked-case-add-drawer')).filter(':visible').first().should('be.visible');
    cy.then(() => {
      cy.get(selector('case-linked-case-select')).should('be.visible').select(linkedCaseId);
    });
    cy.get(selector('case-linked-case-relationship-select')).should('be.visible').select('related');
    cy.get(selector('case-linked-case-reason-input')).should('be.visible').type('Linked by Cypress');
    cy.get(selector('case-linked-case-add-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Linked case added successfully');
    cy.get(selector('case-linked-case-card-0')).scrollIntoView().should('be.visible');
    cy.then(() => {
      cy.get(selector('case-linked-case-target-value-0')).should('contain.text', linkedCaseId);
    });

    cy.get(selector('case-linked-case-edit-0')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-linked-case-edit-drawer')).filter(':visible').first().should('be.visible');
    cy.get(selector('case-linked-case-relationship-select')).should('be.visible').select('same_actor');
    cy.get(selector('case-linked-case-reason-input')).should('be.visible').clear().type('Updated linked case reason');
    cy.get(selector('case-linked-case-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Linked cases updated successfully');
    cy.get(selector('case-linked-case-card-0')).should('contain.text', 'Same Actor');
    cy.get(selector('case-linked-case-card-0')).should('contain.text', 'Updated linked case reason');
  });

  it('adds comment, exports PDF, shares, and revokes link', () => {
    openCreatedCaseDetails();

    cy.get(selector('report-feedback-comment-input')).scrollIntoView().should('be.visible').type('Cypress analyst note');
    cy.get(selector('report-feedback-comment-save')).should('be.visible').click({ force: true });
    cy.contains(selector('report-feedback-comment-body'), 'Cypress analyst note').scrollIntoView().should('be.visible');
    cy.get(selector('report-feedback-comment-user-name')).should('exist');

    const exportDate = new Date().toISOString().slice(0, 10);
    const exportPath = `${Cypress.config('downloadsFolder')}/cypress-updated-case-title-${exportDate}.pdf`;

    clickHeaderAction('case-details-export-pdf');
    cy.then(() => {
      cy.readFile(exportPath, 'binary', { timeout: 120000 })
        .should((contents) => {
          expect(contents).to.contain('%PDF');
          expect(contents.length).to.be.greaterThan(1000);
        });
    });

    cy.window().then((win) => {
      cy.stub(win, 'open').as('caseShareWindowOpen');
    });

    clickHeaderAction('case-details-share');
    cy.get(selector('confirmation-popup')).should('be.visible').and('contain.text', 'anyone with the link');
    cy.get(selector('confirmation-yes-button')).should('be.visible').click();
    cy.get('@caseShareWindowOpen').should('have.been.calledWithMatch', /\/case-share\/.+token=/, '_blank');
    cy.get('@caseShareWindowOpen').its('firstCall.args.0').then((shareUrl) => {
      cy.visit(String(shareUrl));
      cy.get(selector('case-share-export-pdf'), { timeout: 60000 }).should('be.visible');
      cy.docsScreenshot('case-share-public-view');
      cy.visit(`/dashboard/profile/case-management/case-details?caseId=${caseId}`);
      cy.get(selector('case-details-page')).should('be.visible');
    });

    clickHeaderAction('case-details-revoke-shares');
    cy.get(selector('confirmation-popup')).should('be.visible').and('contain.text', 'expire all previously shared links');
    cy.get(selector('confirmation-yes-button')).should('be.visible').click();
    assertNotification('share links revoked');
  });

  it('moves case from new to resolved', () => {
    openCreatedCaseDetails();

    cy.get(selector('case-details-case-id-value'))
      .should(($value) => {
        expect($value.text().trim()).not.to.equal('');
      })
      .invoke('text')
      .then((text) => {
        const createdCaseId = text.trim();

        cy.visit('/dashboard/profile/case-management/tracking-board');

        cy.get(selector('case-tracking-board-page'))
          .should('be.visible');

        const moves = [
          'Intake Review',
          'Under Investigation',
          'Move back to Intake Review',
          'Under Investigation',
          'Evidence Collection',
          'Verification',
          'Regulatory Action',
          'Legal Review',
          'Resolved'
        ];

        moves.forEach((statusLabel) => {
          cy.get(selector(`case-board-card-${createdCaseId}`), { timeout: 60000 })
            .should('exist')
            .scrollIntoView();
          if (statusLabel === 'Intake Review') {
            cy.docsScreenshot('case-tracking-board');
          }

          cy.get(selector(`case-board-move-${createdCaseId}-${CASE_MOVE_STATUS_IDS[statusLabel]}`))
            .scrollIntoView()
            .should('exist')
            .click({ force: true });

          cy.get(selector('case-move-reason-input'))
            .should('be.visible')
            .clear()
            .type(`Moving case to ${statusLabel}`);
          if (statusLabel === 'Intake Review') {
            cy.docsScreenshot('case-tracking-board-move-reason');
          }

          cy.get(selector('case-move-save'))
            .should('be.visible')
            .click({ force: true });
        });

        cy.visit(`/dashboard/profile/case-management/case-details?caseId=${createdCaseId}`);

        cy.get(selector('case-details-status-value'))
          .should('contain.text', 'Resolved');

        cy.get(selector('case-closure-add'))
          .should('not.be.disabled');
      });
  });

  it('closes case and verifies read-only state', () => {
    openCreatedCaseDetails();

    cy.get(selector('case-closure-add')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-closure-drawer')).filter(':visible').first().should('be.visible');
    cy.get(selector('case-closure-reason-select')).should('be.visible').select('true_positive');
    cy.get(selector('case-closure-summary-input')).should('be.visible').type('Cypress closure summary');
    cy.get(selector('case-closure-resolution-input')).should('be.visible').type('Cypress resolution notes');
    cy.get(selector('case-closure-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

    assertNotification('Case closed successfully');
    cy.get(selector('case-closure-reason-value')).should('contain.text', 'True Positive');
    cy.get(selector('case-closure-summary-value')).should('contain.text', 'Cypress closure summary');
    cy.get(selector('case-closure-resolution-value')).should('contain.text', 'Cypress resolution notes');
    cy.get(selector('case-closure-closed-by-value')).should('not.be.empty');
    cy.get(selector('case-closure-closed-at-value')).should('not.be.empty');

    cy.get(selector('case-closure-drawer')).should('not.exist');
    clickHeaderAction('case-closure-edit');
    cy.get(selector('case-closure-drawer')).filter(':visible').first().should('be.visible');
    cy.get(selector('case-closure-summary-input')).should('be.visible').and('have.value', 'Cypress closure summary');
    cy.get(selector('case-closure-resolution-input')).should('be.visible').and('have.value', 'Cypress resolution notes');
    cy.get(selector('case-closure-cancel')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
    cy.get(selector('case-closure-drawer')).should('not.exist');
    cy.get(selector('case-details-edit')).should('not.exist');
    cy.get(selector('case-primary-entity-edit')).should('not.exist');
    cy.get(selector('case-related-entity-add')).should('not.exist');
    cy.get(selector('case-artifact-add')).should('not.exist');
    cy.get(selector('case-task-add')).should('not.exist');
    cy.get(selector('case-linked-case-add')).should('not.exist');
    cy.docsScreenshot('case-closure-read-only');
  });

  it('archives closed case and shows .then list', () => {
    openCreatedCaseDetails();

    clickHeaderAction('case-details-archive');
    cy.get(selector('case-details-archive-confirmation')).should('exist');
    cy.get(selector('confirmation-popup')).should('contain.text', 'archive this case');
    cy.get(selector('confirmation-yes-button')).should('be.visible').click();

    assertNotification('Case archived successfully');
    cy.get(selector('case-details-archive')).should('not.exist');

    openCaseManagement();
    selectCaseFilterDropdown('case-filter-view', 'Archived');
    cy.get(selector('case-management-page')).should('contain.text', 'Viewing archived cases');
    cy.then(() => {
      assertCaseVisibleInList(caseId);
    });
    cy.docsScreenshot('case-management-archived-list');
  });
});

describe('Case Management - Tenant Alert Visibility', () => {
  let caseAlertTenants: CaseAlertTenant[] = [];
  let caseAlertUsers: {limited: ManagedUser; all: ManagedUser};

  before(() => {
    cy.env(['CASE_ALERT_TENANTS', 'CASE_ALERT_USERS']).then(({CASE_ALERT_TENANTS, CASE_ALERT_USERS}) => {
      caseAlertTenants = CASE_ALERT_TENANTS || [];
      caseAlertUsers = CASE_ALERT_USERS || {};
      if (caseAlertTenants.length !== 3 || !caseAlertUsers.limited?.username || !caseAlertUsers.all?.username) {
        throw new Error('Missing CASE_ALERT_TENANTS or CASE_ALERT_USERS in cypress.config.ts');
      }
    });
  });

  after(() => {
    cy.logout();
  });

  it('limits admin tenant alerts by analyst allowed tenants and tenant visibility settings', () => {
    cy.logout();
    caseAlertTenants.forEach((tenant) => {
      createTenantAccount(tenant);
      cy.loginAsAdmin();
      openTenantsPage();
      configureTenantForCaseAlerts(tenant);
      cy.logout();
    });

    caseAlertTenants.forEach((tenant) => onboardTenantForCaseAlerts(tenant));

    cy.loginAsAdmin();
    cy.visit('/dashboard/profile/users');
    cy.get('[data-testid="tenant-add-user-button"]').should('be.visible');
    addUser(caseAlertUsers.limited);
    setPasswordResetRequired(caseAlertUsers.limited.username, false);
    addUser(caseAlertUsers.all);
    setPasswordResetRequired(caseAlertUsers.all.username, false);
    cy.logout();

    loginCaseAlertUser(caseAlertUsers.limited.username, caseAlertUsers.limited.password);
    openCaseAlertsView();
    assertVisibleTenantAlertEmails(
      [caseAlertTenants[0], caseAlertTenants[1]],
      [caseAlertTenants[2]]
    );
    cy.logout();

    loginCaseAlertUser(caseAlertUsers.all.username, caseAlertUsers.all.password);
    openCaseAlertsView();
    assertVisibleTenantAlertEmails(caseAlertTenants, []);
    cy.logout();

    setTenantAlertVisibility(caseAlertTenants[0], false);

    loginCaseAlertUser(caseAlertUsers.limited.username, caseAlertUsers.limited.password);
    openCaseAlertsView();
    assertVisibleTenantAlertEmails(
      [caseAlertTenants[1]],
      [caseAlertTenants[0], caseAlertTenants[2]]
    );
    cy.logout();

    loginCaseAlertUser(caseAlertUsers.all.username, caseAlertUsers.all.password);
    openCaseAlertsView();
    assertVisibleTenantAlertEmails(
      [caseAlertTenants[1], caseAlertTenants[2]],
      [caseAlertTenants[0]]
    );
  });
});
