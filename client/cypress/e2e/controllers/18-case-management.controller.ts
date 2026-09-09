import { type CaseAlertTenant } from './10-tenant-management.controller';
import { openTenantEditor } from './10-tenant-management.controller';

export const CASE_MOVE_STATUS_IDS: Record<string, string> = {
  'Intake Review': 'intake_review',
  'Under Investigation': 'under_investigation',
  'Move back to Intake Review': 'intake_review',
  'Evidence Collection': 'evidence_collection',
  'Verification': 'verification',
  'Regulatory Action': 'regulatory_action',
  'Legal Review': 'legal_review',
  'Resolved': 'resolved'
};

export let caseId = '';
export let linkedCaseId = '';

export const selector = (testId: string) => `[data-testid="${testId}"]`;

function parseCaseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function caseDateMonthStart(label: string): number {
  return new Date(`${label.trim()} 1`).getTime();
}

function moveCaseDatePickerToMonth(targetLabel: string, attempts = 24) {
  cy.get('[data-testid="side-filter-date-month-label"]').filter(':visible').first().invoke('text').then((raw) => {
    const currentLabel = raw.trim();
    if (currentLabel === targetLabel) {
      return;
    }

    expect(attempts, `navigate case date picker to ${targetLabel}`).to.be.greaterThan(0);
    const goPrev = caseDateMonthStart(currentLabel) > caseDateMonthStart(targetLabel);
    const navSelector = goPrev ? '[data-testid="side-filter-date-prev-month"]' : '[data-testid="side-filter-date-next-month"]';
    void cy.get(navSelector).filter(':visible').first().click({ force: true });
    moveCaseDatePickerToMonth(targetLabel, attempts - 1);
  });
}

export function selectCaseDate(testId: string, value: string) {
  const date = parseCaseDate(value);
  const monthLabel = date.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  void cy.get(selector(testId)).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
  moveCaseDatePickerToMonth(monthLabel);
  void cy.get(`[data-testid="side-filter-date-day-${date.getDate()}"]`)
    .filter(':visible')
    .filter((_index, element) => !String(element.getAttribute('class') || '').includes('text-slate-400'))
    .first()
    .scrollIntoView()
    .click({ force: true });
  void cy.get(selector(testId)).filter(':visible').first().should('contain.text', value);
}

export function clickHeaderAction(testId: string) {
  void cy.scrollTo('top', { ensureScrollable: false });
  void cy.get(selector(testId)).last().scrollIntoView().should('exist').click({ force: true });
}

export function assertNotification(message: string) {
  void cy.contains(message, { timeout: 60000 }).should('exist');
}

export function saveCaseAlertTenantEditor(alias: string) {
  void cy.intercept('POST', '**/api/update/tenants', (req) => {
    if (req.body && typeof req.body === 'object') {
      delete req.body.accounts_mail_password;
      delete req.body.accounts_mail;
      delete req.body.accounts_smtp_server;
      delete req.body.accounts_smtp_port;
      delete req.body.password_reset_required;
    }
  }).as(alias);

  void cy.scrollDashboardToBottom();
  void cy.get('div.relative.hidden.overflow-x-auto.overflow-y-visible.md\\:block')
    .filter(':visible')
    .first()
    .scrollTo('bottomRight', {ensureScrollable: false});

  cy.get('@tenantEditFormPanel')
    .find('[data-testid="tenant-save-changes"]')
    .then(($button) => {
      const button = $button.get(0) as HTMLButtonElement;
      button.scrollIntoView({block: 'center', inline: 'nearest'});

      const dashboard = Cypress.$('#dashboard-container, [data-testid="dashboard-container"]')
        .filter(':visible')
        .first()
        .get(0) as HTMLElement | undefined;
      if (dashboard) {
        dashboard.scrollTop = dashboard.scrollHeight;
        dashboard.dispatchEvent(new Event('scroll', {bubbles: true}));
      }

      const scrollableParent = button.closest('div.relative.hidden.overflow-x-auto.overflow-y-visible.md\\:block') as HTMLElement | null;
      if (scrollableParent) {
        scrollableParent.scrollTop = scrollableParent.scrollHeight;
        scrollableParent.scrollLeft = scrollableParent.scrollWidth;
        scrollableParent.dispatchEvent(new Event('scroll', {bubbles: true}));
      }

      expect(button.disabled, 'tenant save changes button disabled').to.equal(false);
      void cy.wrap($button).click({force: true});
    });

  cy.wait(`@${alias}`, {timeout: 60000}).then(({response}) => {
    assert.exists(response, `${alias} response`);
    expect(response?.statusCode, JSON.stringify(response?.body || {})).to.be.oneOf([200, 201]);
  });
  void cy.scrollDashboardToBottom();
}

function scrollCaseTenantControlIntoView(element: HTMLElement) {
  element.scrollIntoView({block: 'center', inline: 'nearest'});

  const dashboard = Cypress.$('#dashboard-container, [data-testid="dashboard-container"]')
    .filter(':visible')
    .first()
    .get(0) as HTMLElement | undefined;
  if (dashboard) {
    const rect = element.getBoundingClientRect();
    dashboard.scrollTop = Math.max(dashboard.scrollTop + rect.top - 180, 0);
    dashboard.dispatchEvent(new Event('scroll', {bubbles: true}));
  }

  const tableScroller = element.closest('div.relative.hidden.overflow-x-auto.overflow-y-visible.md\\:block') as HTMLElement | null;
  if (tableScroller) {
    tableScroller.scrollLeft = tableScroller.scrollWidth;
    tableScroller.dispatchEvent(new Event('scroll', {bubbles: true}));
  }
}

export function setCaseAlertTenantEditorToggle(testId: string, checked: boolean) {
  cy.get('@tenantEditFormPanel')
    .find(`[data-testid="${testId}"]`)
    .then(($control) => {
      const control = $control.get(0) as HTMLElement;
      scrollCaseTenantControlIntoView(control);
      const $checkbox = $control.find('input[type="checkbox"]').first();
      expect($checkbox.length, `${testId} checkbox`).to.be.greaterThan(0);
      if ($checkbox.is(':checked') !== checked) {
        void cy.wrap($checkbox).click({force: true});
      }
    });
}

export function setCaseAlertTenantLicense(license: string, checked: boolean) {
  cy.get('@tenantEditFormPanel')
    .find('button[aria-controls^="tenant-license-menu-"]')
    .first()
    .then(($trigger) => {
      const trigger = $trigger.get(0) as HTMLElement;
      scrollCaseTenantControlIntoView(trigger);
      const menuId = $trigger.attr('aria-controls');
      assert.exists(menuId, 'tenant license menu id');

      void cy.wrap($trigger).click({force: true});
      cy.get(`#${menuId} [data-testid="tenant-license-${license}"]`, {timeout: 10000})
        .should('exist')
        .then(($option) => {
          const isSelected = $option.attr('aria-selected') === 'true';
          if (isSelected !== checked) {
            void cy.wrap($option).click({force: true});
          }
        })
        .then(() => {
          void cy.wrap($trigger).click({force: true});
        });
    });
}

export function setCaseAlertTenantQuota(value: string) {
  cy.get('@tenantEditFormPanel')
    .find('[data-testid="tenant-user-quota-input"]')
    .then(($input) => {
      const input = $input.get(0) as HTMLElement;
      scrollCaseTenantControlIntoView(input);
      void cy.wrap($input).should('be.visible').clear().type(value);
    });
}

export function configureTenantForCaseAlerts(tenant: CaseAlertTenant) {
  openTenantEditor(tenant);
  setCaseAlertTenantEditorToggle('tenant-verified-toggle', true);
  setCaseAlertTenantEditorToggle('tenant-status-toggle', true);
  setCaseAlertTenantLicense('free', false);
  setCaseAlertTenantLicense('maintainer', true);
  setCaseAlertTenantLicense('enterprise', true);
  setCaseAlertTenantQuota('2');
  saveCaseAlertTenantEditor(`saveCaseAlertTenant${tenant.username}`);
}

export function openCaseAlertsView() {
  openCaseManagement();
  void cy.get(selector('case-mode-alerts-button')).scrollIntoView().should('be.visible').click({force: true});
  void cy.get(selector('case-admin-alerts-view')).should('be.visible');
  void cy.get(selector('case-admin-alerts-loading'), {timeout: 80000}).should('not.exist');
}

export function assertVisibleTenantAlertEmails(visibleTenants: CaseAlertTenant[], hiddenTenants: CaseAlertTenant[]) {
  cy.get(selector('case-admin-alert-tenant-email'), {timeout: 80000})
    .should('have.length.greaterThan', 0)
    .then(($emails) => {
      const renderedEmails = $emails.toArray().map((email) => (email.textContent || '').trim());
      visibleTenants.forEach((tenant) => {
        expect(renderedEmails, `${tenant.email} should be visible`).to.include(tenant.email);
      });
      hiddenTenants.forEach((tenant) => {
        expect(renderedEmails, `${tenant.email} should be hidden`).not.to.include(tenant.email);
      });
    });

  visibleTenants.forEach((tenant) => {
    void cy.contains(selector('case-admin-alert-tenant-email'), tenant.email)
      .scrollIntoView()
      .should('be.visible');
  });
}

function caseListSelector(id: string): string {
  return `${selector(`case-row-${id}`)}, ${selector(`case-mobile-card-${id}`)}`;
}

export function openCaseFiltersIfCollapsed() {
  cy.get('body').then(($body) => {
    const toggle = $body.find(selector('case-filter-mobile-toggle')).filter(':visible').first();
    if (toggle.length && toggle.attr('aria-expanded') !== 'true') {
      void cy.wrap(toggle).click({ force: true });
    }
  });
}

export function selectCaseFilterDropdown(testId: string, optionLabel: string) {
  openCaseFiltersIfCollapsed();
  cy.get(selector(testId)).filter(':visible').first().scrollIntoView().should('be.visible').and('not.be.disabled').then(($button) => {
    const menuId = $button.attr('aria-controls');
    assert.exists(menuId, `${testId} dropdown menu id`);

    if ($button.attr('aria-expanded') !== 'true') {
      void cy.wrap($button).click({ force: true });
    }
    void cy.get(`#${menuId}`, { timeout: 60000 })
      .should('be.visible')
      .contains('[role="option"]', optionLabel)
      .click({ force: true });
  });
}

export function typeCaseFilterSearch(value: string) {
  openCaseFiltersIfCollapsed();
  void cy.get(selector('case-filter-search')).filter(':visible').first().scrollIntoView().should('be.visible').clear().type(value);
}

export function assertCaseVisibleInList(id: string) {
  void cy.get(caseListSelector(id), { timeout: 60000 }).filter(':visible').first().scrollIntoView().should('be.visible');
}

export function assertCaseHiddenInList(id: string) {
  void cy.get(caseListSelector(id), { timeout: 60000 }).should('not.exist');
}

export function createCase(title: string, description: string, entityValue: string, assignId: (id: string) => void) {
  let createdCaseId = '';
  void cy.get(selector('add-case-button')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
  void cy.get(selector('case-add-drawer')).filter(':visible').first().should('be.visible');
  cy.get(selector('case-add-id-input'))
    .should(($input) => expect(String($input.val() || '')).not.to.equal(''))
    .invoke('val')
    .then((value) => {
      createdCaseId = String(value || '');
      assignId(createdCaseId);
    });
  void cy.get(selector('case-add-title-input')).should('be.visible').type(title);
  void cy.get(selector('case-add-description-input')).should('be.visible').type(description);
  void cy.get(selector('case-add-type-select')).should('be.visible').select('fraud');
  void cy.get(selector('case-add-intake-source-select')).should('be.visible').select('soc_alert');
  void cy.get(selector('case-add-severity-select')).should('be.visible').select('high');
  void cy.get(selector('case-add-priority-select')).should('be.visible').select('high');
  void cy.get(selector('case-primary-entity-value-input')).scrollIntoView().should('be.visible').type(entityValue);
  if (title === 'Cypress Case Title') {
    void cy.docsScreenshot('case-management-add');
  }
  void cy.get(selector('case-add-save')).filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });

  assertNotification('Case added successfully');
  cy.then(() => {
    void cy.get(selector(`case-row-${createdCaseId}`)).should('be.visible');
  });
}

export function openCaseManagement() {
  void cy.visit('/dashboard/profile/homepage');
  void cy.get('[data-testid="sidebar-group-profile"]').filter(':visible').first().scrollIntoView().should('be.visible').click({ force: true });
  void cy.get('[data-testid="sidebar-subitem-profile-case-management"]').filter(':visible').first().scrollIntoView().should('exist').click({ force: true });
  void cy.get(selector('case-management-page')).should('be.visible');
}

export function addCase() {
  createCase('Cypress Case Title', 'Cypress investigation context', 'Cypress Entity', (createdCaseId) => {
    caseId = createdCaseId;
  });
}

export function assignAnalystIfAvailable() {
  cy.then(() => {
    void cy.get(selector(`case-row-${caseId}`), { timeout: 60000 })
      .scrollIntoView()
      .should('be.visible');

    void cy.get(selector(`case-assign-analyst-${caseId}`), { timeout: 60000 })
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    void cy.get(selector('case-analyst-dialog'), { timeout: 60000 })
      .should('be.visible');

    cy.get(selector('case-analyst-select'), { timeout: 60000 })
      .should('be.visible')
      .then(($control) => {
        if (($control[0] as HTMLButtonElement).disabled) {
          void cy.get(selector('case-analyst-cancel')).click({ force: true });
          return;
        }

        const menuId = $control.attr('aria-controls');
        assert.exists(menuId, 'case analyst dropdown menu id');
        void cy.wrap($control).click({ force: true });
        void cy.get(`#${menuId}`, { timeout: 60000 }).should('be.visible').find('[role="option"]').first().click({ force: true });
        void cy.get(selector('case-analyst-submit')).click({ force: true });
        assertNotification('Case analyst assigned successfully');
      });
  });
}

export function addLinkTargetCase() {
  createCase('Cypress Link Target Case', 'Cypress linked case context', 'Cypress Link Target Entity', (createdCaseId) => {
    linkedCaseId = createdCaseId;
  });
}

export function openCreatedCaseFromList() {
  cy.window().then((win) => {
    cy.stub(win, 'open').as('caseDetailsWindowOpen');
  });

  cy.then(() => {
    void cy.get(selector(`case-view-${caseId}`)).should('be.visible').click();
    void cy.get('@caseDetailsWindowOpen').should('have.been.calledWithMatch', new RegExp(`case-management/case-details\\?caseId=${caseId}`), '_blank');

    void cy.visit(`/dashboard/profile/case-management/case-details?caseId=${caseId}`);
  });
  void cy.get(selector('case-details-page')).should('be.visible');
}

export function openCreatedCaseDetails() {
  cy.then(() => {
    void cy.visit(`/dashboard/profile/case-management/case-details?caseId=${caseId}`);
  });
  void cy.get(selector('case-details-page')).should('be.visible');
  cy.then(() => {
    void cy.get(selector('case-details-case-id-value'), { timeout: 60000 })
      .should(($value) => {
        expect($value.text().trim()).to.equal(caseId);
      });
  });
}
