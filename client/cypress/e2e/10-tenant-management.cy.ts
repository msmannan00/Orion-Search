import {
  addIOCForAllTabs,
  assertOnlyGeneralHasAlertFindings,
  applyAuditLogDateRange,
  assertAlertScanCompletedMailPresent,
  closeFilterSidebar,
  closeNotificationSidebar,
  deleteTenant,
  ensureGeneralAlertIoc,
  exportFromModal,
  fillTenantNetworkConfiguration,
  flushTenantAlertsIfPresent,
  loginTenant,
  openAlertScannerSettings,
  openFilterSidebar,
  openAuditLogPage,
  openManageIOCs,
  openTenantHomepage,
  openTenantEditor,
  openTenantSettings,
  openTenantsPage,
  resetAuditLogFilters,
  runTenantAlertScan,
  saveTenantEditor,
  setOnlyGeneralAlertScanner,
  setTenantEditorToggle,
  setTenantLicense,
  setTenantLicenses,
  submitLogin,
  waitForTenantAlertScanComplete,
  ensureTenantAlertReportsPresent,
  waitForTenantAlertFindings,
  waitForBlockingOverlayToClose
} from './controllers/10-tenant-management.controller';
import {TEST_DATA} from '../support/constants';
import type { CaseAlertTenant, TenantSubUser } from './model/10-tenant-management.model';

describe('Tenant Management - End-to-End Provisioning Flows', () => {
  let tenant = {} as CaseAlertTenant;
  let tenantSubUser = {} as TenantSubUser;
  const tenantResetNewPassword = '2wsx@WSX2026';
  const alertSlackClientId = TEST_DATA.alert_slack_client_id;

  const selectEnabledCurrentMonthDate = (day: number) => {
    cy.get(`[data-testid="side-filter-date-day-${day}"]`)
      .filter(':visible')
      .filter((_index, element) => {
        const className = element.getAttribute('class') || '';
        return !element.hasAttribute('disabled') && !className.includes('text-slate-400');
      })
      .should('have.length.greaterThan', 0)
      .first()
      .scrollIntoView()
      .should('be.enabled')
      .click();
  };

  const enableTenantPrivilegedIocIfInputDisabled = () => {
    cy.get('[data-testid="tenant-ioc-value-input"]', {timeout: 60000}).should('be.visible').and('not.be.disabled');
  };

  before(() => {
    cy.env(['TENANT_ACCOUNT', 'TENANT_SUB_USER']).then(({TENANT_ACCOUNT, TENANT_SUB_USER}) => {
      tenant = TENANT_ACCOUNT as CaseAlertTenant;
      tenantSubUser = TENANT_SUB_USER as TenantSubUser;
      if (!tenant?.username || !tenant?.email || !tenant?.password || !tenantSubUser?.username || !tenantSubUser?.email || !tenantSubUser?.password) {
        throw new Error('Missing TENANT_ACCOUNT or TENANT_SUB_USER in cypress.config.ts');
      }
    });
  });

  after(() => {
    cy.logout();
  });

  it('creates tenant account and completes email verification', () => {
    cy.clearAllEmails();
    cy.visit('/signup');

    cy.get('[data-testid="signup-username"]').should('be.visible');
    cy.docsScreenshot('signup-page');
    cy.get('[data-testid="signup-username"]').type(tenant.username);
    cy.get('[data-testid="signup-companymail"]').type(tenant.email);
    cy.get('[data-testid="signup-password"]').type(tenant.password, {log: false});
    cy.get('[data-testid="signup-submit"]').should('be.visible').click();
    cy.get('[data-testid="welcome-tick"]').should('exist');
    cy.docsScreenshot('welcome-verification');
    cy.get('[data-testid="welcome-goto-login"]').click();

    cy.openLastMailAndGetUrl().then((url) => {
      cy.visit(url);
    });
  });

  it('verifies tenants and assigns enterprise license as admin', () => {
    cy.loginAsAdmin();
    openTenantsPage();
    cy.get('[data-testid="tenant-page-header"]').should('be.visible');
    cy.docsScreenshot('tenant-administration');
    openTenantEditor(tenant);
    setTenantEditorToggle('tenant-verified-toggle', true);
    setTenantEditorToggle('tenant-status-toggle', true);
    setTenantEditorToggle('tenant-password-reset-required-toggle', false);
    setTenantEditorToggle('tenant-privileged-ioc-toggle', true);
    setTenantLicense('free', false);
    setTenantLicense('maintainer', true);
    setTenantLicense('enterprise', true);
    saveTenantEditor('saveTenantLicense');
    cy.logout();
  });

  it('completes tenant onboarding and adds tenant user', () => {
    submitLogin(tenant.username, tenant.password, tenant);

    cy.get('[data-testid="tenant-company-input"]').should('be.visible');
    cy.docsScreenshot('tenant-onboarding-company');
    cy.get('[data-testid="tenant-company-input"]').clear().type('orion intelligence');
    cy.get('[data-testid="tenant-onboarding-next-step1"]').should('be.visible').click();
    cy.get('[data-testid="tenant-onboarding-next-step2"]').should('be.visible');
    cy.docsScreenshot('tenant-onboarding-iocs');
    cy.get('[data-testid="tenant-onboarding-next-step2"]').should('be.visible').click();
    cy.get('[data-testid="tenant-onboarding-confirm"]').should('be.visible').click();

    openManageIOCs();
    cy.get('[data-testid^="tenant-ioc-tab-"]').should('have.length.greaterThan', 0);
    enableTenantPrivilegedIocIfInputDisabled();
    cy.docsScreenshot('tenant-manage-iocs');
    addIOCForAllTabs();

    cy.get('[data-testid="sidebar-subitem-profile-users"]').filter(':visible').first().scrollIntoView().click();
    waitForBlockingOverlayToClose();
    cy.get('tbody tr, [data-testid="tenant-add-user-button"]').should('exist');
    cy.docsScreenshot('tenant-users');
    cy.get('[data-testid="tenant-add-user-button"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="tenant-add-user-username"]').type(tenantSubUser.username);
    cy.get('[data-testid="tenant-add-user-email"]').type(tenantSubUser.email);
    cy.get('[data-testid="tenant-add-user-password"]').type(tenantSubUser.password, {log: false});
    cy.get('[data-testid="tenant-add-user-confirm-password"]').type(tenantSubUser.password, {log: false});
    cy.get('[data-testid="tenant-add-user-submit"]').scrollIntoView().should('be.visible').and('not.be.disabled').click();
    cy.logout();
  });

  it('updates tenant user quota to one as admin', () => {
    cy.loginAsAdmin();
    openTenantsPage();
    cy.location('pathname').should('include', '/dashboard/profile/tenant');
    cy.get('[data-testid="tenant-row"]').first().click({ force: true });
    cy.get('[data-testid="tenant-edit-form-panel"]')
      .first()
      .as('tenantEditFormPanel')
      .within(() => {
        cy.get('[data-testid="tenant-user-quota-input"]')
          .first()
          .clear({ force: true })
          .type('1', { force: true });
      });
    cy.get('#dashboard-container, [data-testid="dashboard-container"]')
      .filter(':visible')
      .first()
      .scrollTo('bottom', {ensureScrollable: false});

    cy.get('div.relative.hidden.overflow-x-auto.overflow-y-visible.md\\:block')
      .filter(':visible')
      .first()
      .scrollTo('bottomRight', {ensureScrollable: false});

    cy.scrollDashboardToBottom()
    cy.get('@tenantEditFormPanel')
      .find('[data-testid="tenant-save-changes"]')
      .first()
      .then(($btn) => {
        const btn = $btn.get(0) as HTMLElement;
        btn.scrollIntoView();
        const parentScroller = btn.closest('div.relative.hidden.overflow-x-auto.overflow-y-visible.md\\:block') as HTMLElement | null;
        if (parentScroller) {
          parentScroller.scrollTop = parentScroller.scrollHeight;
          parentScroller.scrollLeft = parentScroller.scrollWidth;
          parentScroller.dispatchEvent(new Event('scroll', {bubbles: true}));
        }
        cy.wrap($btn).should('exist').and('not.be.disabled').click({ force: true });
      });
    cy.logout();
  });

  it('opens admin audit log and triggers export plus date filters', () => {
    cy.loginAsAdmin();
    openAuditLogPage();

    cy.get('[data-testid="auditlog-row"]').should('have.length.greaterThan', 0);
    cy.docsScreenshot('audit-logs');
    cy.get('[data-testid="auditlog-actor"]').first().invoke('text').then((actorText) => {
      const actor = actorText.trim();
      cy.get('[data-testid="auditlog-user-search"]')
        .should('be.visible')
        .clear()
        .type(`${actor}{enter}`);
      cy.location('search').should('contain', `actor_id=${actor}`);
      cy.get('[data-testid="auditlog-actor"]', {timeout: 10000}).should(($actors) => {
        expect($actors.length).to.be.greaterThan(0);
        $actors.each((_, el) => {
          expect(el.innerText.trim()).to.eq(actor);
        });
      });
    });

    cy.get('[data-testid="auditlog-user-search"]').clear().type('{enter}');
    cy.get('[data-testid="auditlog-row"]').should('have.length.greaterThan', 0);

    cy.get('[data-testid="auditlog-delete-button"]')
      .filter(':visible')
      .first()
      .scrollIntoView()
      .should('be.visible')
      .click({waitForAnimations: false, animationDistanceThreshold: 0});
    cy.contains('Are you sure you want to delete this audit log record?').should('be.visible');
    cy.contains('button', 'Cancel').click({waitForAnimations: false, animationDistanceThreshold: 0});

    cy.get('[data-testid="auditlog-export-button"]')
      .scrollIntoView()
      .should('be.visible')
      .click({waitForAnimations: false, animationDistanceThreshold: 0});
    exportFromModal('graph-report-export-modal', 'auditlog-export-option-csv');

    applyAuditLogDateRange(14);
    cy.get('[data-testid="auditlog-empty-state"]').should('be.visible');

    resetAuditLogFilters();
    cy.get('[data-testid="auditlog-row"]').should('have.length.greaterThan', 0);
    cy.logout();
  });

  it('logs in tenant and validates homepage navigation', () => {
    loginTenant(tenant);
    cy.get('[data-testid="sidebar-subitem-profile-homepage"]').filter(':visible').first().scrollIntoView().click();
    cy.location('pathname').should('include', '/dashboard/profile/homepage');
    waitForTenantAlertScanComplete();
    cy.docsScreenshot('tenant-homepage');
  });

  it('downgrades tenant alert access to free as admin', () => {
    cy.loginAsAdmin();
    openTenantsPage();
    openTenantEditor(tenant);
    setTenantLicenses(['free']);
    saveTenantEditor('saveTenantFreeLicense');
    cy.logout();
  });

  it('blocks tenant alert access with the free license', () => {
    loginTenant(tenant);
    cy.get('[data-testid="sidebar-subitem-profile-homepage"]').filter(':visible').first().scrollIntoView().click();
    cy.location('pathname').should('include', '/dashboard/profile/homepage');
    cy.contains('[data-testid="tenant-home-alert-category-card"]', 'Defacement', {timeout: 30000})
      .scrollIntoView()
      .should('be.visible')
      .and('have.class', 'opacity-60')
      .click();
    cy.get('[data-testid="message-notification-text"]').should('contain.text', "You don't have license to view this");
    cy.location('pathname').should('include', '/dashboard/profile/homepage');
    cy.logout();
  });

  it('restores tenant enterprise access as admin', () => {
    cy.loginAsAdmin();
    openTenantsPage();
    openTenantEditor(tenant);
    setTenantLicenses(['enterprise']);
    saveTenantEditor('saveTenantEnterpriseLicense');
    cy.logout();
  });

  it('restores tenant alert access with the enterprise license', () => {
    loginTenant(tenant);
    cy.get('[data-testid="sidebar-subitem-profile-homepage"]').filter(':visible').first().scrollIntoView().click();
    cy.contains('[data-testid="tenant-home-alert-category-card"]', 'Defacement', {timeout: 30000})
      .scrollIntoView()
      .should('be.visible')
      .and('not.have.class', 'opacity-60');
    cy.logout();
  });

  it('runs only the General alert scanner from scanner settings', () => {
    loginTenant(tenant);
    ensureGeneralAlertIoc();
    openTenantHomepage();
    waitForTenantAlertScanComplete();
    openAlertScannerSettings();
    cy.docsScreenshot('alert-scanner-settings');
    setOnlyGeneralAlertScanner();
    cy.contains('button', 'Back').scrollIntoView().click();
    cy.location('pathname').should('include', '/dashboard/profile/homepage');

    flushTenantAlertsIfPresent();
    runTenantAlertScan();
    waitForTenantAlertFindings('general');
    cy.reload();
    openTenantHomepage();
    waitForTenantAlertScanComplete();
    assertOnlyGeneralHasAlertFindings();
    cy.logout();
  });

  it('uploads IOC values from a CSV file', () => {
    const suffix = Date.now();
    const domainIoc = `tenant-upload-${suffix}.example.com`;
    const emailIoc = `tenant-upload-${suffix}@mail.com`;
    const urlIoc = `https://tenant-upload-${suffix}.example.com/login`;
    const iocCsv = [
      'key,value',
      `m_domain,${domainIoc}`,
      `m_email,${emailIoc}`,
      `m_url,${urlIoc}`
    ].join('\n');

    loginTenant(tenant);
    openManageIOCs();
    cy.get('[data-testid="tenant-ioc-upload-csv-button"]').scrollIntoView().should('be.visible').and('not.be.disabled');

    cy.intercept('POST', '**/api/update/tenants').as('uploadTenantIocCsv');
    cy.get('input[type="file"][accept=".csv,text/csv"]')
      .first()
      .selectFile({
        contents: Cypress.Buffer.from(iocCsv),
        fileName: 'tenant-ioc-upload.csv',
        mimeType: 'text/csv',
      }, {force: true});

    cy.get('[data-testid="message-notification-text"]').should('contain.text', '3 IOC values imported.');
    cy.wait('@uploadTenantIocCsv', {timeout: 60000})
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);
    cy.contains(domainIoc).should('be.visible');
    cy.contains(emailIoc).should('be.visible');
    cy.contains(urlIoc).should('be.visible');
    cy.logout();
  });

  it('saves tenant network configuration after failed SMTP validation', () => {
    loginTenant(tenant);
    openTenantSettings();
    cy.contains('app-smtp-settings-block', 'Network Configuration').should('be.visible');

    fillTenantNetworkConfiguration('localhost', '1');
    cy.intercept('POST', '**/api/update/tenants').as('saveWrongTenantMail');
    cy.get('[data-testid="system-settings-mail-save"]').scrollIntoView().should('be.visible').and('not.be.disabled').click();
    cy.wait('@saveWrongTenantMail', {timeout: 60000})
      .its('response.statusCode')
      .should('eq', 424);
    cy.contains('app-smtp-settings-block', 'Mail configuration is not working').should('be.visible');

    fillTenantNetworkConfiguration('mailpit', '1025');
    cy.intercept('POST', '**/api/update/tenants').as('saveRightTenantMail');
    cy.get('[data-testid="system-settings-mail-save"]').scrollIntoView().should('be.visible').and('not.be.disabled').click();
    cy.wait('@saveRightTenantMail', {timeout: 60000})
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);
    cy.get('[data-testid="system-settings-mail-save"]', {timeout: 30000}).should('be.disabled');
    cy.contains('app-smtp-settings-block', 'Mail configuration is not working').should('not.exist');
    cy.logout();
  });

  it('enables tenant password reset as admin', () => {
    cy.loginAsAdmin();
    openTenantsPage();
    openTenantEditor(tenant);
    setTenantEditorToggle('tenant-password-reset-required-toggle', true);
    saveTenantEditor('saveTenantPasswordReset');
    cy.logout();
  });

  it('forces tenant account to change its password', () => {
    submitLogin(tenant.username, tenant.password, tenant);
    cy.url().should('include', '/reset/');
    cy.get('[data-testid="reset-title"]').should('contain.text', 'Change Password');
    cy.get('[data-testid="reset-password"]').should('be.visible').clear().type(tenantResetNewPassword, {log: false});
    cy.get('[data-testid="reset-confirm-password"]').should('be.visible').clear().type(tenantResetNewPassword, {log: false});
    cy.get('[data-testid="reset-submit"]').should('not.be.disabled').click();
    cy.get('[data-testid="dashboard-main"]').should('be.visible');
    tenant.password = tenantResetNewPassword;
    cy.logout();
  });

  it('clears the tenant password reset flag after the change', () => {
    cy.loginAsAdmin();
    openTenantsPage();
    openTenantEditor(tenant);
    cy.get('@tenantEditFormPanel').within(() => {
      cy.get('[data-testid="tenant-password-reset-required-toggle"]')
        .find('input[type="checkbox"]')
        .should('not.be.checked');
    });
    cy.logout();
  });

  it('goes through tenant settings and disables profile visibility', () => {
    const phoneValue = `0300${Date.now().toString().slice(-7)}`;
    const countryValue = 'Pakistan';
    const cityValue = 'Karachi';

    tenant = { ...tenant, password: tenantResetNewPassword };
    loginTenant(tenant);

    cy.location('origin').then((origin) => {
      cy.visit(`${origin}/dashboard/profile/tenant-settings`);
    });
    cy.scrollDashboardToTop();
    cy.contains('h1', 'Tenant Data').scrollIntoView().should('be.visible');
    cy.contains('div', 'Profile').should('be.visible');
    cy.contains('div', 'Contacts').should('be.visible');
    cy.contains('div', 'Users').should('be.visible');
    cy.contains('div', 'Address').should('be.visible');
    cy.docsScreenshot('tenant-settings');
    cy.scrollDashboardToBottom()
    cy.contains('div', 'Privacy').should('be.visible');

    cy.get('input[name="tenant_phone"]').scrollIntoView().should('be.visible').clear().type(phoneValue);
    cy.get('input[name="tenant_country"]').scrollIntoView().should('be.visible').clear().type(countryValue);
    cy.get('input[name="tenant_city"]').scrollIntoView().should('be.visible').clear().type(cityValue);

    cy.intercept('POST', '**/api/update/tenants').as('saveTenantContact');
    cy.get('[data-testid="tenant-contact-save"]').scrollIntoView().should('be.visible').and('not.be.disabled').click();
    cy.wait('@saveTenantContact', {timeout: 60000})
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);

    cy.scrollDashboardToBottom();
    cy.contains('label', 'Allow User Profile Visibility')
      .scrollIntoView()
      .closest('div.rounded-lg')
      .then(($toggle) => {
        if (($toggle.text() || '').includes('Users can manage their profile visibility')) {
          cy.wrap($toggle).click();
        }
      });

    cy.intercept('POST', '**/api/update/tenants').as('saveTenantPrivacy');
    cy.get('[data-testid="tenant-privacy-save"]').scrollIntoView().should('be.visible').and('not.be.disabled').click();
    cy.wait('@saveTenantPrivacy', {timeout: 60000})
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);
    cy.reload();
    cy.scrollDashboardToBottom()

    cy.location('pathname').should('include', '/dashboard/profile/tenant-settings');
    cy.get('input[name="tenant_phone"]').should('have.value', phoneValue);
    cy.get('input[name="tenant_country"]').should('have.value', countryValue);
    cy.get('input[name="tenant_city"]').should('have.value', cityValue);
    cy.contains('label', 'Allow User Profile Visibility')
      .scrollIntoView()
      .closest('div.rounded-lg')
      .should('contain.text', 'User profile visibility is disabled for this tenant');
    cy.logout();
  });

  it('shows only admin-configured Slack connector in tenant settings', () => {
    loginTenant(tenant);

    cy.intercept('GET', '**/api/alert-connectors/settings', {
      statusCode: 200,
      body: {
        app: {
          slack_client_id: alertSlackClientId,
          slack_configured: true,
          jira_client_id: '',
          jira_configured: false
        },
        tenant: {
          slack_connected: false,
          slack_channel: '',
          slack_team: '',
          jira_connected: false,
          jira_site_url: '',
          jira_site_name: ''
        }
      }
    }).as('loadTenantAlertConnectors');

    cy.location('origin').then((origin) => {
      cy.visit(`${origin}/dashboard/profile/tenant-settings`);
    });

    cy.get('[data-testid="tenant-settings-connect-slack"]')
      .scrollIntoView()
      .should('be.visible')
      .and('have.attr', 'target', '_blank')
      .and('have.attr', 'href', '/api/alert-connectors/slack/connect');
    cy.get('[data-testid="tenant-settings-connect-jira"]').should('not.exist');
    cy.docsScreenshot('tenant-alert-integrations-slack');
    cy.window().then((win) => {
      const slackConnectClicks: string[] = [];
      win.document.addEventListener('click', (event) => {
        const link = (event.target as Element).closest('[data-testid="tenant-settings-connect-slack"]') as HTMLAnchorElement | null;
        if (!link) {
          return;
        }
        event.preventDefault();
        slackConnectClicks.push(link.href);
      }, {capture: true, once: true});
      cy.wrap(slackConnectClicks).as('slackConnectClicks');
    });
    cy.get('[data-testid="tenant-settings-connect-slack"]').click();
    cy.get<string[]>('@slackConnectClicks').should((clicks) => {
      expect(clicks[0]).to.include('/api/alert-connectors/slack/connect');
    });

    cy.logout();
  });

  it('handles tenant alerts and notifications end-to-end', () => {
    loginTenant(tenant);
    cy.get('[data-testid="sidebar-subitem-profile-homepage"]').filter(':visible').first().scrollIntoView().click();

    cy.get('app-alert-scan-loading', { timeout: 80000 }).should('not.exist');
    assertAlertScanCompletedMailPresent();
    ensureTenantAlertReportsPresent();
    cy.get('[data-testid="tenant-home-print-alerts"]').scrollIntoView().should('be.visible').click();
    exportFromModal('home-alert-export-modal', 'home-alert-export-option-report');

    cy.get('[data-testid="profile-notification-bell"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="tenant-notification-sidebar"]').should('be.visible');
    cy.docsScreenshot('tenant-notification-sidebar');
    cy.get('[data-testid="tenant-notification-see-details"]').first().scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="notification-alert-export-modal"]').should('be.visible');
    cy.docsScreenshot('tenant-notification-alert-detail');
    exportFromModal('notification-alert-export-modal', 'notification-alert-export-option-report');
    closeNotificationSidebar();

    cy.get('[data-testid="tenant-home-alert-category-card"]').first().scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="tenant-alert-report-see-details"]').first().scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="category-alert-export-modal"]').should('be.visible');
    cy.docsScreenshot('tenant-alert-detail');
    exportFromModal('category-alert-export-modal', 'category-alert-export-option-report');

    cy.get('[data-testid="tenant-alert-add-button"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="tenant-alert-modal"]').should('be.visible');
    cy.docsScreenshot('custom-alert-modal');
    cy.get('[data-testid="tenant-alert-title"]').should('be.visible').clear().type('Test Alert');
    cy.get('[data-testid="tenant-alert-description"]').clear().type('Test description');
    cy.get('[data-testid="tenant-alert-ioc-type-toggle"]').click();
    cy.get('[data-testid="tenant-alert-ioc-type-option"]').contains('Domains').click();
    cy.get('[data-testid="tenant-alert-source"]').clear().type('Automation');
    cy.get('[data-testid="tenant-alert-url"]').clear().type('https://example.com');
    cy.get('[data-testid="tenant-alert-ioc-value"]').clear().type('example.com');
    cy.get('[data-testid="tenant-alert-save"]').scrollIntoView().should('be.visible').click();

    openFilterSidebar();
    cy.get('[data-testid="side-filter-date-toggle"]').scrollIntoView().should('be.visible').click();
    Cypress._.times(12, () => {
      cy.get('[data-testid="side-filter-date-prev-month"]').first().click();
    });
    selectEnabledCurrentMonthDate(15);
    Cypress._.times(12, () => {
      cy.get('[data-testid="side-filter-date-next-month"]').first().click();
    });
    selectEnabledCurrentMonthDate(Math.min(15, new Date().getDate()));
    cy.get('[data-testid="side-filter-apply"]').scrollIntoView().should('be.visible').click();
    closeFilterSidebar();

    cy.get('[data-testid="tenant-alert-flush-all"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="confirmation-yes-button"]').should('be.visible').click();
  });

  it('deletes the tenant as admin', () => {
    cy.loginAsAdmin();
    openTenantsPage();
    deleteTenant(tenant);
  });
});
