import {clickSearch, fillPrimaryScanInput, fillSecondaryScanInput, makeFileInputInteractable} from './controllers/14-scans-management.controller';
import type { ScanManagementTestData } from './model/14-scans-management.model';

describe('Scans Management - Web Scans Flow', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('runs Basic, Vulnerability, Repository, and SEO scans', () => {
    cy.visit('/dashboard/scanner/network-scan');
    cy.get('[data-testid="network-intel-tab-host-recon"]').should('be.visible');
    cy.get('[data-testid="network-intel-search-input"]').clear().type('ucp.edu.pk{enter}');

    cy.visit('/dashboard/scanner/network-scan');
    cy.get('[data-testid="network-intel-tab-vulnerability-scan"]').should('be.visible').click();
    cy.get('[data-testid="network-intel-search-input"]').clear().type('ucp.edu.pk{enter}');

    cy.visit('/dashboard/scanner/network-scan');
    cy.get('[data-testid="network-intel-tab-repository-scan"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="network-intel-search-input"]').clear().type('https://github.com/juice-shop/juice-shop{enter}');

    cy.visit('/dashboard/scanner/network-scan');
    cy.get('[data-testid="network-intel-tab-seo-scan"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="network-intel-search-input"]').clear().type('ucp.edu.pk{enter}');

  });
});

describe('Scans Management - Entity Lookup Flow', () => {
  let testData = {} as ScanManagementTestData;

  before(() => {
    cy.env(['TEST_DATA']).then(({TEST_DATA}) => {
      testData = (TEST_DATA || {}) as ScanManagementTestData;
    });
  });

  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('runs Email, Social, Wanted, Playstore, Software, File, Text Analysis, and Crypto scans', () => {
    cy.visit('/dashboard');

    cy.visit('/dashboard/api/email-breach');
    fillSecondaryScanInput(testData.scans_email_breach);
    clickSearch();
    cy.get('[data-testid="scan-success-badge"]').filter(':visible').first().should('be.visible');
    cy.docsScreenshot('entity-api-email-breach');

    cy.visit('/dashboard/api/social-scanner');
    fillPrimaryScanInput(testData.scans_social_username);
    clickSearch();
    cy.get('[data-testid="scan-success-badge"]').filter(':visible').first().should('be.visible');
    cy.docsScreenshot('social-scanner-report');

    cy.visit('/dashboard/api/wanted-list');
    fillPrimaryScanInput(testData.scans_wanted_name);
    clickSearch();
    cy.get('[data-testid="scan-success-badge"]').filter(':visible').first().should('be.visible');
    cy.docsScreenshot('wanted-list-report');

    cy.visit('/dashboard/api/playstore-scanner');
    fillPrimaryScanInput('https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree');
    clickSearch();
    cy.get('[data-testid="scan-success-badge"]').filter(':visible').first().should('be.visible');
    cy.docsScreenshot('playstore-scanner-report');

    cy.visit('/dashboard/scanner/apk-scan');
    makeFileInputInteractable();
    cy.get('[data-testid="scan-file-input"]').first().selectFile('cypress/fixtures/1MB_1.0_APKPure.apk');
    cy.get('[data-testid="scan-success-badge"]').filter(':visible').first().should('be.visible');
    cy.docsScreenshot('apk-scan-report');

    cy.visit('/dashboard/api/software-scanner');
    fillPrimaryScanInput('gta');
    clickSearch();
    cy.get('[data-testid="scan-success-badge"]').filter(':visible').first().should('be.visible');
    cy.docsScreenshot('software-scanner-report');

    cy.visit('/dashboard/api/file-scanner');
    makeFileInputInteractable();
    cy.get('[data-testid="scan-file-input"]').first().selectFile({
      contents: 'cypress/fixtures/resume-sample.pdf',
      fileName: 'resume-sample.pdf',
      mimeType: 'application/pdf'
    });
    cy.get('[data-testid="scan-success-badge"]').filter(':visible').first().should('be.visible');
    cy.docsScreenshot('file-scanner-report');
    cy.get('[data-testid="scan-download-report"]').filter(':visible').first().should('be.visible').and('be.enabled').scrollIntoView().click();
    cy.get('[data-testid="scan-another-file"]').filter(':visible').first().should('be.visible').and('be.enabled').scrollIntoView().click();
    makeFileInputInteractable();
    cy.get('[data-testid="scan-file-input"]').first().selectFile({
      contents: 'cypress/fixtures/resume-sample.pdf',
      fileName: 'resume-sample.pdf',
      mimeType: 'application/pdf'
    });
    cy.get('[data-testid="scan-success-badge"]').filter(':visible').first().should('be.visible');

    cy.visit('/dashboard/api/text-analysis');
    cy.get('[data-testid="text-analysis-input"]')
      .filter(':visible')
      .first()
      .should('be.visible')
      .type('Congratulations! Verify your details at https://secure-login-update.example.com/verify');
    cy.get('[data-testid="text-analysis-submit"]').filter(':visible').first().should('be.enabled').click();
    cy.get('[data-testid="text-analysis-table"]').should('be.visible');
    cy.get('[data-testid="text-analysis-primary-detection"]').should('contain.text', 'Spam and phishing detected');
    cy.docsScreenshot('text-analysis-report');

    cy.visit('/dashboard/api/crypto-scanner');
    fillPrimaryScanInput('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    clickSearch();
    cy.get('[data-testid="scan-success-badge"]').filter(':visible').first().should('be.visible');
    cy.docsScreenshot('crypto-scanner-report');
  });

  it('manages completed scan notifications from the top header panel', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="profile-scan-notification-bell"]').should('be.visible').click();
    cy.get('[data-testid="tenant-notification-sidebar"]').should('be.visible').and('contain.text', 'Scan Notifications');

    cy.get('[data-testid="scan-notification-card"]', { timeout: 30000 })
      .should($cards => {
        expect($cards.length).to.be.greaterThan(1);
      })
      .then($cards => {
        cy.wrap($cards.length).as('initialScanCount');
      });
    cy.docsScreenshot('scan-notifications');

    cy.get('[data-testid="scan-notification-delete"]').filter(':enabled').first().click();
    cy.get('[data-testid="confirmation-popup"]').should('be.visible');
    cy.get('[data-testid="confirmation-yes-button"]').should('be.visible').click();
    cy.get('@initialScanCount').then(initialScanCount => {
      cy.get('[data-testid="scan-notification-card"]', { timeout: 15000 }).should('have.length', Number(initialScanCount) - 1);
    });

    cy.window().then(win => {
      cy.stub(win, 'open').as('scanReportOpen');
    });
    cy.get('[data-testid="scan-notification-card"][role="button"]').filter(':visible').first().click();
    cy.get('@scanReportOpen')
      .should('have.been.calledOnce')
      .its('firstCall.args.0')
      .should('include', '/dashboard/scan-report/');

    cy.get('[data-testid="scan-notification-clear-all"]').should('be.visible').and('not.be.disabled').click();
    cy.get('[data-testid="confirmation-popup"]').should('be.visible');
    cy.get('[data-testid="confirmation-yes-button"]').should('be.visible').click();
    cy.get('[data-testid="scan-notification-card"]').should('exist');

    cy.get('[data-testid="scan-notification-delete-all"]').should('be.visible').and('not.be.disabled').click();
    cy.get('[data-testid="confirmation-popup"]').should('be.visible');
    cy.get('[data-testid="confirmation-yes-button"]').should('be.visible').click();
    cy.get('[data-testid="scan-notification-card"]').should('not.exist');
  });
});
