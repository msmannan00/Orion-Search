
import type { ManagedUser, ManagedUsers, UserManagementTestData } from '../model/05-user-management.model';
export type { ManagedUser, ManagedUsers, UserManagementTestData } from '../model/05-user-management.model';


const SIDEBAR_GROUP_ROUTE_PREFIX: Record<string, string> = {
  'General Intelligence': 'strategic',
  'Data Breach': 'breach',
  Defacement: 'defacement',
  Social: 'social',
  Exploit: 'exploit',
  Feed: 'feed',
  'Stealer logs': 'stealerlogs',
  'Web Scans': 'scanner',
  'Entity Lookup': 'api',
};

function getSidebarGroupTestId(itemName: string): string {
  const routePrefix = SIDEBAR_GROUP_ROUTE_PREFIX[itemName];
  assert.exists(routePrefix, `routePrefix mapping for "${itemName}"`);
  return `sidebar-group-${routePrefix}`;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function resolveOptionLabel(labels: string[], optionText: string, fallback?: (labels: string[]) => string): string {
  const wanted = cleanText(optionText).toLowerCase();
  const exact = labels.find((label) => label.toLowerCase() === wanted);
  if (exact) {
    return exact;
  }
  return fallback?.(labels) || labels[0] || optionText;
}

function selectDropdownOption($trigger: JQuery, optionText: string, description: string, fallback?: (labels: string[]) => string) {
  const menuId = $trigger.attr('aria-controls');
  assert.exists(menuId, `${description} menu id`);

  void cy.wrap($trigger).click({force: true});
  void cy.wrap($trigger).should('have.attr', 'aria-expanded', 'true');
  cy.get(`#${menuId} [role="option"]`, {timeout: 10000})
    .should(($options) => {
      expect($options.length, `${description} option count`).to.be.greaterThan(0);
      const labels = [...$options].map((option) => cleanText(option.textContent || '')).filter(Boolean);
      const resolved = resolveOptionLabel(labels, optionText, fallback);
      expect(labels.map((label) => label.toLowerCase()), `${description} options`).to.include(resolved.toLowerCase());
    })
    .then(($options) => {
      const labels = [...$options].map((option) => cleanText(option.textContent || '')).filter(Boolean);
      const resolved = resolveOptionLabel(labels, optionText, fallback);
      const option = [...$options].find((el) => cleanText(el.textContent || '').toLowerCase() === resolved.toLowerCase());
      assert.exists(option, `${description} option ${resolved}`);
      void cy.wrap(option as HTMLElement).click({force: true});
    });
}

function selectAddUserDropdown(triggerSelector: string, optionText: string, fallback?: (labels: string[]) => string) {
  cy.get('@addUserModal').then(($modal) => {
    const $trigger = $modal.find(triggerSelector).first();
    expect($trigger.length, `${triggerSelector} trigger`).to.be.greaterThan(0);
    selectDropdownOption($trigger, optionText, triggerSelector, fallback);
  });
}

export function openSidebarGroup(itemName: string) {
  const sidebarGroupTestId = getSidebarGroupTestId(itemName);
  void cy.get(`[data-testid="${sidebarGroupTestId}"]`).first().scrollIntoView().should('be.visible').click();
}

export function openSidebarSubItem(routePrefix: string, itemSlug: string) {
  void cy.get(`[data-testid="sidebar-subitem-${routePrefix}-${itemSlug}"]`).first().scrollIntoView().should('be.visible').click();
}

export function setSelect(name: 'role' | 'status', optionText: string) {
  cy.get('@addUserModal').then(($modal) => {
    const $select = $modal.find(`select[name="${name}"]`).first();
    if (!$select.length) {
      selectAddUserDropdown(`[data-testid="tenant-add-user-${name}"]`, optionText, (labels) => {
        const normalized = labels.map((x) => x.toLowerCase());
        const wanted = optionText.trim().toLowerCase();
        if (name === 'role' && wanted === 'member' && normalized.includes('analyst')) {
          return 'Analyst';
        }
        return labels[0] || optionText;
      });
      return;
    }

    const optionLabels = [...$select.find('option')].map((opt) => (opt.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const normalized = optionLabels.map((x) => x.toLowerCase());
    const wanted = optionText.trim().toLowerCase();
    let resolved = optionText;
    if (!normalized.includes(wanted)) {
      if (name === 'role' && wanted === 'member' && normalized.includes('analyst')) {
        resolved = 'Analyst';
      } else if (optionLabels.length > 0) {
        resolved = optionLabels[0];
      }
    }
    void cy.wrap($select).select(resolved);
  });
}

function setAddUserLicenses(wanted: string[]) {
  cy.get('@addUserModal').then(($modal) => {
    const $cards = $modal.find('.license-grid .license-card, .license-card, .license-btn');
    if ($cards.length) {
      void cy.wrap($cards).each(($card) => {
        const label = cleanText($card.find('.license-label').text()).toLowerCase();
        const $checkbox = $card.find('input[type="checkbox"]');
        const shouldBeChecked = wanted.includes(label);
        const isChecked = $checkbox.is(':checked');
        if (shouldBeChecked !== isChecked) {
          void cy.wrap($card).click();
        }
      });
      return;
    }

    const $trigger = $modal.find('[data-testid="tenant-add-user-license"]').first();
    expect($trigger.length, 'tenant-add-user-license trigger').to.be.greaterThan(0);
    const menuId = $trigger.attr('aria-controls');
    assert.exists(menuId, 'tenant-add-user-license menu id');

    void cy.wrap($trigger).click({force: true});
    void cy.wrap($trigger).should('have.attr', 'aria-expanded', 'true');
    cy.get(`#${menuId} [role="option"]`, {timeout: 10000})
      .should('have.length.greaterThan', 0)
      .each(($option) => {
        const label = cleanText($option.text()).toLowerCase();
        const shouldBeSelected = wanted.includes(label);
        const isSelected = $option.attr('aria-selected') === 'true';
        if (shouldBeSelected !== isSelected) {
          void cy.wrap($option).click({force: true});
        }
      })
      .then(() => {
        void cy.wrap($trigger).click({force: true});
      });
  });
}

function normalizeDropdownValue(value: string): string {
  return cleanText(value).toLowerCase().replace(/[_-]+/g, ' ');
}

function setAddUserPermissions(wanted: string[]) {
  if (!wanted.length) {
    return;
  }

  cy.get('@addUserModal').then(($modal) => {
    const $trigger = $modal.find('[data-testid="tenant-add-user-permission"]').first();
    expect($trigger.length, 'tenant-add-user-permission trigger').to.be.greaterThan(0);
    const menuId = $trigger.attr('aria-controls');
    assert.exists(menuId, 'tenant-add-user-permission menu id');
    const normalizedWanted = wanted.map(normalizeDropdownValue);

    void cy.wrap($trigger).click({force: true});
    void cy.wrap($trigger).should('have.attr', 'aria-expanded', 'true');
    cy.get(`#${menuId} [role="option"]`, {timeout: 10000})
      .should('have.length.greaterThan', 0)
      .each(($option) => {
        const label = normalizeDropdownValue($option.text());
        const shouldBeSelected = normalizedWanted.includes(label);
        const isSelected = $option.attr('aria-selected') === 'true';
        if (shouldBeSelected !== isSelected) {
          void cy.wrap($option).click({force: true});
        }
      })
      .then(() => {
        void cy.wrap($trigger).click({force: true});
      });
  });
}

function setAddUserAlertAllowedTenants(wanted?: string[] | 'all') {
  if (!wanted) {
    return;
  }

  cy.get('@addUserModal').then(($modal) => {
    const $trigger = $modal.find('[data-testid="tenant-add-user-alerts-allowed"]').first();
    expect($trigger.length, 'tenant-add-user-alerts-allowed trigger').to.be.greaterThan(0);
    const menuId = $trigger.attr('aria-controls');
    assert.exists(menuId, 'tenant-add-user-alerts-allowed menu id');
    const normalizedWanted = wanted === 'all'
      ? ['all']
      : wanted.map(normalizeDropdownValue);

    void cy.wrap($trigger).click({force: true});
    void cy.wrap($trigger).should('have.attr', 'aria-expanded', 'true');
    cy.get(`#${menuId} [role="option"]`, {timeout: 10000})
      .should('have.length.greaterThan', 0)
      .each(($option) => {
        const label = normalizeDropdownValue($option.text());
        const shouldBeSelected = normalizedWanted.includes(label);
        const isSelected = $option.attr('aria-selected') === 'true';
        if (shouldBeSelected !== isSelected) {
          void cy.wrap($option).click({force: true});
        }
      })
      .then(() => {
        void cy.wrap($trigger).click({force: true});
      });
  });
}

export function addUser(user: ManagedUser) {
  void cy.url().should('include', '/dashboard/profile/users');
  void cy.get('[data-testid="tenant-add-user-button"]').should('be.visible').scrollIntoView().click();
  void cy.get('[data-testid="tenant-add-user-modal"]').should('be.visible').as('addUserModal');
  void cy.get('@addUserModal').find('input[name="username"]').should('be.visible').clear().type(user.username);
  void cy.get('@addUserModal').find('input[name="email"]').should('be.visible').clear().type(user.email);
  void cy.get('@addUserModal').find('input[name="password"]').should('be.visible').clear().type(user.password);
  void cy.get('@addUserModal').find('[data-testid="tenant-add-user-confirm-password"]').should('be.visible').clear().type(user.password);
  setSelect('role', user.role);
  setSelect('status', 'Active');
  const wanted = user.licenses.map((x) => x.trim().toLowerCase());
  setAddUserLicenses(wanted);
  setAddUserPermissions(user.permissions || []);
  setAddUserAlertAllowedTenants(user.alertAllowedTenants);
  void cy.get('@addUserModal').find('[data-testid="tenant-add-user-submit"]').click({force: true});
  void cy.get('[data-testid="tenant-add-user-modal"]').should('not.exist');
  void cy.contains(user.username).should('exist');
}

export function openUserEditor(username: string) {
  void cy.contains('tbody tr[data-testid="tenant-user-row"]', username)
    .scrollIntoView()
    .should('be.visible')
    .click();

  void cy.contains('tbody tr[data-testid="tenant-user-row"]', username)
    .next()
    .as('expandedUserEditor')
    .should('contain.text', 'Edit User');
}

export function setPasswordResetRequired(username: string, required: boolean) {
  openUserEditor(username);
  void cy.scrollDashboardToBottom();

  cy.get('@expandedUserEditor').then(($editor) => {
    const $control = $editor.find('[data-testid="tenant-password-reset-required-toggle"]').first();
    expect($control.length, 'password reset control').to.be.greaterThan(0);
    const $checkbox = $control.find('input[type="checkbox"]').first();
    if ($checkbox.length) {
      if ($checkbox.is(':checked') !== required) {
        void cy.wrap($checkbox).click({force: true});
      }
      return;
    }

    const menuId = $control.attr('aria-controls');
    assert.exists(menuId, 'password reset dropdown menu id');
    selectDropdownOption($control, required ? 'Require password reset' : 'No password reset', 'password reset dropdown');
  });

  void cy.intercept('POST', '**/api/update/user', (req) => {
    console.log('[cypress] updateUser request', req.body);
    req.continue((res) => {
      console.log('[cypress] updateUser response', res.statusCode);
    });
  });

  void cy.get('@expandedUserEditor').within(() => {
    void cy.get('[data-testid="tenant-save-user-changes"]').scrollIntoView().should('be.visible').and('not.be.disabled').click();
  });
}

export function loginAsUser(username: string, password: string) {
  void cy.intercept({ method: 'POST', pathname: '**/api/token' }).as('loginRequest');
  void cy.visitLoginWithCleanAuthState();
  void cy.get('[data-testid="login-user"]').should('be.visible').clear().type(username);
  void cy.get('[data-testid="login-pass"]').should('be.visible').clear().type(password, {log: false});
  void cy.get('[data-testid="login-button"]').filter(':visible').first().should('be.visible').click({ force: true });
  void cy.waitForLoginRequest();

  void cy.get('[data-testid="profile-menu"], [data-testid="dashboard-main"], [data-testid="dashboard-container"]')
    .filter(':visible')
    .should('have.length.greaterThan', 0);
  void cy.scrollDashboardToBottom();
}

export function openFirstStrategicReportFromSearch(searchTerm = 'data') {
  void cy.visit('/dashboard/strategic/all?page=1');
  void cy.scrollDashboardToTop();
  void cy.location('pathname').should('eq', '/dashboard/strategic/all');
  void cy.get('[data-testid="dashboard-body"]').should('be.visible');
  void cy.scrollDashboardToTop();
  void cy.get('[data-testid="dashboard-general-input"]').should('be.visible').clear().type(searchTerm);
  void cy.get('[data-testid="dashboard-search-submit"]').click();
  void cy.get('[data-testid="result-card"]').should('have.length.greaterThan', 0);
  void cy.get('[data-testid="open-report"]').filter(':visible').first().click();
  void cy.url().should('match', /\/dashboard\/strategic\/all\/[^/?]+/);
  void cy.get('#report-detail').should('be.visible');
}

export function loginAndClickSidebar(username: string, sidebarItems: string[], testUsers: ManagedUsers, testData: UserManagementTestData) {
  const selectedUser = Object.values(testUsers).find((user) => user.username === username);
  if (!selectedUser?.password) {
    throw new Error(`Missing user/password in Cypress env for username: ${username}`);
  }
  loginAsUser(username, selectedUser.password);
  sidebarItems.forEach((itemName) => {
    openSidebarGroup(itemName);

    if (username === 'testing5' && itemName === 'Stealer logs') {
      cy.get('body').then(($b) => {
        if ($b.find('[data-testid="pro-subscription-overlay"]').length) {
          void cy.get('[data-testid="pro-subscription-overlay"]').should('be.visible');
          void cy.get('[data-testid="pro-subscription-options"] input[type="radio"][value="annual"]').check();
          void cy.get('input#name').clear().type(testData.stealer_upgrade_name);
          void cy.get('input#phone').clear().type('03001234567');
          void cy.get('input#email').clear().type(testData.stealer_upgrade_email);
          void cy.get('[data-testid="pro-subscription-payment-form"]').submit();
          void cy.get('[data-testid="pro-subscription-close"]').should('be.visible').click();
        }
      });
    }
  });
  void cy.logout();
}

export function completeSubscriptionPopupFlow(testData: UserManagementTestData, _reopenPopup: () => void) {
  void cy.intercept('POST', '**/api/subscription/request', (req) => {
    console.log('[cypress] subscription request', req.body);
    req.reply({
      statusCode: 200,
      body: {message: 'sent'}
    });
  });
  const subscriptionPopupSelector = '[data-testid="pro-subscription-overlay"]';

  void cy.get(subscriptionPopupSelector).should('be.visible');
  void cy.contains('h2', 'Upgrade to Dark Web Shield Pro').should('be.visible');
  void cy.contains('button', 'Proceed to Payment').should('be.disabled');
  void cy.docsScreenshot('subscription-upgrade-modal');

  void cy.get('input#name').focus().blur().should('have.attr', 'aria-invalid', 'true');
  void cy.get('input#phone').focus().blur().should('have.attr', 'aria-invalid', 'true');
  void cy.get('input#email').focus().blur().should('have.attr', 'aria-invalid', 'true');
  void cy.get('span')
    .filter((_, el) => (el.textContent || '').trim() === 'Required')
    .should('have.length.at.least', 3);

  void cy.get('input#name').clear().type('A').blur();
  void cy.contains('span', 'Too short').should('be.visible');

  void cy.get('input#phone').clear().type('abc').blur();
  void cy.contains('span', 'Invalid').should('exist');

  void cy.get('input#email').clear().type('invalid-email').blur();
  void cy.contains('span', 'Invalid').should('exist');

  void cy.get('input[type="radio"][name="subscription"][value="monthly"]').check().should('be.checked');
  void cy.get('input[type="radio"][name="subscription"][value="annual"]').check().should('be.checked');

  void cy.get('input#name').should('be.visible').clear().type(testData.stealer_upgrade_name);
  void cy.get('input#phone').should('be.visible').clear().type('03001234567');
  void cy.get('input#email').should('be.visible').clear().type(testData.stealer_upgrade_email);
  void cy.contains('button', 'Proceed to Payment').should('not.be.disabled').click();

  void cy.url().should('include', '/notification');
  void cy.contains('div', 'Subscription Request Sent').should('be.visible');
  void cy.contains('p', 'Our team has received your subscription request').should('be.visible');
  void cy.docsScreenshot('subscription-request-notification');
  void cy.contains('button', 'Homepage').should('be.visible').click();

  void cy.contains('button[type="button"]', 'Close').should('be.visible').click();
  void cy.get(subscriptionPopupSelector).should('not.exist');
}

export function openUsersList(usersUrl: string) {
  void cy.intercept('POST', '**/api/users').as('usersApi');
  void cy.visit(usersUrl);
}

export function deleteUsersByUsername(usernames: string[], usersUrl = '/dashboard/profile/users?page=1') {
  const deleteNext = (remaining: string[]) => {
    if (!remaining.length) {
      return;
    }

    const [username, ...rest] = remaining;

    openUsersList(usersUrl);
    cy.contains('tbody tr[data-testid="tenant-user-row"]', username).then(($row) => {
      if (!$row.length) {
        void cy.log(`User ${username} not found. Skip.`);
        deleteNext(rest);
        return;
      }

      void cy.wrap($row).scrollIntoView().should('be.visible').click();

      void cy.contains('tbody tr[data-testid="tenant-user-row"]', username)
        .next()
        .within(() => {
          void cy.get('[data-testid="tenant-delete-user-button"]').first().scrollIntoView().click({force: true});
        });

      void cy.intercept('POST', '**/api/delete/user').as('deleteUserApi');
      void cy.get('.ui-graph-popup-panel').should('be.visible').within(() => {
        void cy.get('[data-testid="confirmation-yes-button"]').first().click({force: true});
      });
      void cy.wait('@deleteUserApi');
      void cy.get('.ui-graph-popup-panel').should('not.exist');

      deleteNext(rest);
    });
  };

  deleteNext(usernames);
}
