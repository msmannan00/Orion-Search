import type { FeederValidationCategory, FeederValidationData } from '../model/16-feeder-management.model';

let feederValidationData: FeederValidationData | null = null;
export const FEEDER_RULE_KEYS = [
  'apt',
  'defacement',
  'exploit',
  'forum',
  'generic',
  'leak',
  'malware',
  'mastodon',
  'news',
  'pastebin',
  'reddit',
  'tracking',
  'twitter',
];
const FILE_RULE_KEYS = FEEDER_RULE_KEYS.filter((ruleKey) => ruleKey !== 'generic');
const FEEDER_TEST_RULE_LIMIT = 4;
const FEEDER_SCRIPT_ROW_TIMEOUT = 60000;
const FEEDER_QUERY_TIMEOUT = 60000;

function waitForFeederPanelReady(): Cypress.Chainable {
  return cy.get('[data-testid="feeder-reload-button"]', { timeout: FEEDER_QUERY_TIMEOUT })
    .should('be.visible')
    .and('not.be.disabled');
}

export function openFeederAsAdmin() {
  void cy.loginAsAdmin();
  void cy.visit('/dashboard/profile/homepage');
  void cy.get('[data-testid="sidebar-group-profile"]').should('be.visible').scrollIntoView().click();
  void cy.get('[data-testid="sidebar-subitem-profile-feeder"]').should('be.visible').scrollIntoView().click();
  void cy.get('[data-testid="feeder-page-title"]').should('be.visible').and('contain.text', 'Feeder Scripts');
}

export function openFeederAsUser(username: string, password: string) {
  void cy.intercept({ method: 'POST', pathname: '**/api/token' }).as('loginRequest');
  void cy.visit('/login');
  void cy.get('[data-testid="login-user"]').should('be.visible').clear().type(username);
  void cy.get('[data-testid="login-pass"]').should('be.visible').clear().type(password, { log: false });
  void cy.get('[data-testid="login-button"]').first().should('be.visible').click();
  void cy.waitForLoginRequest();
  void cy.get('[data-testid="dashboard-main"]').should('be.visible');
  void cy.get('[data-testid="sidebar-group-profile"]').should('be.visible').scrollIntoView().click();
  void cy.get('[data-testid="sidebar-subitem-profile-feeder"]').should('be.visible').scrollIntoView().click();
  void cy.get('[data-testid="feeder-page-title"]').should('be.visible').and('contain.text', 'Feeder Scripts');
}

function getFixturePath(path: string) {
  return `cypress/fixtures/${path}`;
}

function getFixtureFileName(path: string) {
  return path.split('/').pop() || path;
}

function waitForScriptRowReady(category: FeederValidationCategory) {
  const fileName = getFixtureFileName(category.fileFixture!);
  const rowSelector = `[data-testid="feeder-script-row-${fileName}"]`;
  const statusSelector = `[data-testid="feeder-script-active-status-${fileName}"]`;

  void cy.get(rowSelector, { timeout: FEEDER_SCRIPT_ROW_TIMEOUT }).filter(':visible').first().should('be.visible');
  void cy.get(statusSelector, { timeout: FEEDER_SCRIPT_ROW_TIMEOUT })
    .filter(':visible')
    .first()
    .invoke('text')
    .should((text) => {
      expect(text.trim().toLowerCase()).to.match(/^(enabled|disabled)$/);
    });
}

function getWrongFileCategory(ruleKey: string) {
  if (!feederValidationData) {
    throw new Error('Feeder validation data is not loaded');
  }
  const currentIndex = FILE_RULE_KEYS.indexOf(ruleKey);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % FILE_RULE_KEYS.length;
  return feederValidationData.categories[FILE_RULE_KEYS[nextIndex]];
}

function selectFeederRule(ruleKey: string) {
  return cy.get('[data-testid="feeder-rule-select"]').should('be.visible').and('not.be.disabled').then(($select) => {
    if ($select.is('select')) {
      cy.get(`[data-testid="feeder-rule-option-${ruleKey}"]`).then(($option) => {
        void cy.wrap($select).select($option.attr('value')!);
        void cy.wrap($select).find(':selected').should('have.attr', 'data-testid', `feeder-rule-option-${ruleKey}`);
      });
      void cy.wait(250);
      return;
    }

    void cy.wrap($select).click();
    void cy.get(`[data-testid="feeder-rule-option-${ruleKey}"]`).click({ force: true });
    void cy.wait(250);
  });
}

export function assertFeederRuleOptions() {
  cy.get('[data-testid="feeder-rule-select"]').should('be.visible').then(($select) => {
    if ($select.is('select')) {
      cy.get('[data-testid="feeder-rule-select"] option').then(($options) => {
        const actualRuleKeys = [...$options]
          .map((option) => option.getAttribute('data-testid') || '')
          .filter(Boolean)
          .map((testId) => testId.replace('feeder-rule-option-', ''));

        expect(actualRuleKeys.length).to.be.greaterThan(9);
      });
      return;
    }

    void cy.wrap($select).click();
    cy.get('[data-testid^="feeder-rule-option-"]').then(($options) => {
      expect($options.length).to.be.greaterThan(9);
    });
    void cy.get('body').click(0, 0);
  });
}

export function openFeederRule(ruleKey: string) {
  return selectFeederRule(ruleKey);
}

function openAddTab(): Cypress.Chainable {
  return openTabIfPresent('feeder-tab-add', () => cy.wait(250));
}

function openScriptTab(): Cypress.Chainable {
  return openTabIfPresent('feeder-tab-script', () => cy.wait(250));
}

function openTabIfPresent(testId: string, callback: () => Cypress.Chainable): Cypress.Chainable {
  return cy.get('body').then(($body): Cypress.Chainable => {
    const tab = $body.find(`[data-testid="${testId}"]:visible`).first();
    if (!tab.length) {
      return cy.wrap(null, { log: false });
    }
    void cy.wrap(tab).click();
    return cy.then(callback);
  });
}

function uploadScript(category: FeederValidationCategory): Cypress.Chainable {
  if (!category.fileFixture || !category.fileName) {
    return cy.wrap(null, { log: false });
  }

  void cy.get('[data-testid="feeder-select-file-button"]').filter(':visible').first().should('be.visible');
  void cy.get('[data-testid="feeder-file-input"]')
    .last()
    .selectFile(getFixturePath(category.fileFixture), { force: true });
  void cy.wait(250);
  void cy.get('[data-testid="feeder-upload-script-button"]').should('be.visible').click();

  waitForScriptRowReady(category);

  if (category.ruleType === 'shared') {
    void openAddTab();
    return cy.get('[data-testid="feeder-values-input"]', { timeout: 4000 }).should('be.visible');
  }

  return cy.wait(250);
}

function expectWrongFileUploadError(category: FeederValidationCategory): Cypress.Chainable {
  const wrongCategory = getWrongFileCategory(category.ruleKey);
  if (!wrongCategory?.fileFixture) {
    return cy.wrap(null, { log: false });
  }

  void cy.get('[data-testid="feeder-select-file-button"]').filter(':visible').first().should('be.visible');
  void cy.get('[data-testid="feeder-file-input"]')
    .last()
    .selectFile(getFixturePath(wrongCategory.fileFixture), { force: true });
  void cy.wait(250);
  return cy.get('[data-testid="feeder-upload-script-button"]').should('be.visible').click();
}

function uploadFirstValue(fixturePath: string): Cypress.Chainable {
  return cy.fixture(fixturePath, 'utf8').then((text: string): Cypress.Chainable => {
    const firstValue = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    if (!firstValue) {
      return cy.wrap(null, { log: false });
    }

    void cy.get('[data-testid="feeder-values-input"]').should('be.visible').clear().type(firstValue, { delay: 0 });
    void cy.get('[data-testid="feeder-upload-values-button"]').should('be.visible').click();
    return cy.wait(250);
  });
}

function expectWrongValueUploadError(fixturePath: string): Cypress.Chainable {
  return cy.fixture(fixturePath, 'utf8').then((text: string): Cypress.Chainable => {
    const firstValue = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    if (!firstValue) {
      return cy.wrap(null, { log: false });
    }

    void cy.get('[data-testid="feeder-values-input"]').should('be.visible').clear().type(firstValue, { delay: 0 });
    return cy.get('[data-testid="feeder-upload-values-button"]').should('be.visible').click();
  });
}

function clearVisibleValueRows(): Cypress.Chainable {
  return waitForFeederPanelReady().then(() => cy.get('body')).then(($body): Cypress.Chainable => {
    const button = $body.find('[data-testid^="feeder-value-delete-button-"]:visible').first();
    if (!button.length) {
      return cy.wrap(null, { log: false });
    }
    void cy.intercept('POST', '**/api/profile/feeder/scripts/*/delete-value').as('feederValueDeleteRequest');
    void cy.intercept('GET', '**/api/profile/feeder/scripts**').as('feederScriptsQueryAfterClear');
    void cy.wrap(button).click();
    void cy.get('[data-testid="confirmation-yes-button"]').should('be.visible').click();
    return cy.wait('@feederValueDeleteRequest', { timeout: FEEDER_QUERY_TIMEOUT })
      .then(() => cy.wait('@feederScriptsQueryAfterClear', { timeout: FEEDER_QUERY_TIMEOUT }))
      .then(() => clearVisibleValueRows());
  });
}

function clearScripts(): Cypress.Chainable {
  return cy.contains('[data-testid="feeder-section-title"]', 'Your Scripts', { timeout: 4000 }).should('be.visible').then(() => {
    return waitForFeederPanelReady()
      .then(() => cy.get('[data-testid="feeder-empty-scripts"], [data-testid^="feeder-script-row-"], [data-testid="feeder-clear-all-button"]', { timeout: 4000 }))
      .should('exist')
      .then(() =>
        cy.get('body', { timeout: 4000 }).should(($body) => {
          const hasEmptyState = $body.find('[data-testid="feeder-empty-scripts"]:visible').length > 0;
          const hasEnabledClearButton = $body.find('[data-testid="feeder-clear-all-button"]:visible:not(:disabled)').length > 0;
          expect(hasEmptyState || hasEnabledClearButton).to.eq(true);
        })
      )
      .then(() => cy.get('body'))
      .then(($body) => {
        const enabledClearButton = $body.find('[data-testid="feeder-clear-all-button"]:visible:not(:disabled)').first();
        if (enabledClearButton.length) {
          void cy.intercept('POST', '**/api/profile/feeder/scripts/clear-all**').as('feederClearAllRequest');
          void cy.intercept('GET', '**/api/profile/feeder/scripts**').as('feederScriptsQueryAfterClear');
          void cy.wrap(enabledClearButton).click({ force: true });
          void cy.get('[data-testid="confirmation-popup"]').should('be.visible');
          void cy.get('[data-testid="confirmation-yes-button"]').should('be.visible').click({ force: true });
          return cy.wait('@feederClearAllRequest', { timeout: FEEDER_QUERY_TIMEOUT }).then(() => {
            return cy.wait('@feederScriptsQueryAfterClear', { timeout: FEEDER_QUERY_TIMEOUT });
          }).then(() => {
            return cy.get('[data-testid="feeder-empty-scripts"], [data-testid="feeder-clear-all-button"]:disabled', { timeout: 4000 })
              .should('exist');
          });
        }

        const hasEmptyState = $body.find('[data-testid="feeder-empty-scripts"]:visible').length > 0;
        if (hasEmptyState) {
          return cy.wrap(null, { log: false });
        }

        throw new Error('Script panel has neither a visible clear button nor an empty state');
      });
  });
}

function confirmPopup() {
  void cy.get('[data-testid="confirmation-popup"]').should('be.visible');
  void cy.get('[data-testid="confirmation-yes-button"]').should('be.visible').click({ force: true });
}

export function transferFirstVisibleScriptOwner(username: string) {
  return openScriptTab().then(() => {
    void cy.get('[data-testid^="feeder-script-owner-button-"]').filter(':visible').first().click({ force: true });
    void cy.get('[data-testid="feeder-owner-dialog"]').should('be.visible');
    cy.get(`[data-testid="feeder-owner-option-${username}"]`).then(($option) => {
      void cy.get('[data-testid="feeder-owner-select"]').select($option.attr('value')!);
    });
    void cy.get('[data-testid="feeder-owner-submit"]').should('be.visible').click({ force: true });
    void cy.get('[data-testid^="feeder-script-owner-label-"]')
      .filter(':visible')
      .first()
      .should('contain.text', username);
  });
}

export function expectCurrentUserHasScriptAccess() {
  return openScriptTab().then(() => {
    void cy.get('[data-testid^="feeder-script-row-"]').filter(':visible').first().should('exist');
  });
}

export function expectCurrentUserHasNoScriptAccess() {
  return openScriptTab().then(() => {
    void cy.get('[data-testid="feeder-empty-scripts"]').should('be.visible');
  });
}

function assertFirstRowStatus(expected: 'enabled' | 'disabled') {
  return cy.get('[data-testid^="feeder-script-active-status-"]')
    .filter(':visible')
    .first()
    .invoke('text')
    .should((text) => {
      expect(text.trim().toLowerCase()).to.eq(expected);
    });
}

function setFirstRowStatus(expected: 'enabled' | 'disabled'): Cypress.Chainable {
  return cy.get('[data-testid^="feeder-script-active-status-"]')
    .filter(':visible')
    .first()
    .invoke('text')
    .then((text): Cypress.Chainable => {
      if (text.trim().toLowerCase() === expected) {
        return cy.wrap(null, { log: false });
      }

      void cy.get('[data-testid^="feeder-script-toggle-button-"]').filter(':visible').first().click({ force: true });
      confirmPopup();
      return assertFirstRowStatus(expected);
    });
}

function toggleAllStatuses(enabled: boolean) {
  const buttonTestId = enabled ? 'feeder-enable-all-button' : 'feeder-disable-all-button';
  const expectedStatus = enabled ? 'enabled' : 'disabled';

  void cy.get(`[data-testid="${buttonTestId}"]`).filter(':visible').first().should('not.be.disabled').click({ force: true });
  confirmPopup();
  void cy.wait(250);
  void assertFirstRowStatus(expectedStatus);
}

export function loadFeederValidationData() {
  return cy.fixture<FeederValidationData>('feeder/collector-validation.json').then((data) => {
    feederValidationData = data;
    return data;
  });
}

export function clearAllFeederRecords() {
  const validationData = feederValidationData;
  if (!validationData) {
    throw new Error('Feeder validation data is not loaded');
  }

  const ruleKeys: string[] = validationData.ruleKeys.slice(0, FEEDER_TEST_RULE_LIMIT);
  void cy.wrap(ruleKeys).each((ruleKey: string) => {
    const category = validationData.categories[ruleKey];

    return cy.then(() => {
      return selectFeederRule(category.ruleKey).then(() => {
        if (category.ruleType !== 'generic') {
          return openTabIfPresent('feeder-tab-script', clearScripts).then(() => {
            return openTabIfPresent('feeder-tab-values', clearVisibleValueRows);
          });
        }

        return openTabIfPresent('feeder-tab-values', clearVisibleValueRows);
      });
    });
  });
}

export function validateFixtureOperationsForAllFeederRules() {
  const validationData = feederValidationData;
  if (!validationData) {
    throw new Error('Feeder validation data is not loaded');
  }

  const ruleKeys: string[] = validationData.ruleKeys.slice(0, FEEDER_TEST_RULE_LIMIT);
  void cy.wrap(ruleKeys).each((ruleKey: string) => {
    const category = validationData.categories[ruleKey];

    return cy.then(() => {
      return selectFeederRule(category.ruleKey).then(() => {
        return openAddTab().then(() => {
          if (category.ruleType === 'generic') {
            return uploadFirstValue(category.valuesFixture!).then(() => {
              if (category.invalidValuesFixture) {
                return expectWrongValueUploadError(category.invalidValuesFixture);
              }
              return cy.wrap(null, { log: false });
            });
          }

          return cy.then(() => uploadScript(category))
            .then(() => {
              if (category.ruleType === 'shared' && category.valuesFixture) {
                return uploadFirstValue(category.valuesFixture);
              }
              return cy.wrap(null, { log: false });
            })
            .then(() => openScriptTab())
            .then(() => {
              return setFirstRowStatus('disabled')
                .then(() => setFirstRowStatus('enabled'))
                .then(() => {
                  toggleAllStatuses(false);
                  toggleAllStatuses(true);
                });
            })
            .then(() => openAddTab())
            .then(() => expectWrongFileUploadError(category));
        });
      });
    });
  });
}
