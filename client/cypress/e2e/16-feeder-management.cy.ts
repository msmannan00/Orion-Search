import {
  assertFeederRuleOptions,
  clearAllFeederRecords,
  loadFeederValidationData,
  expectCurrentUserHasNoScriptAccess,
  expectCurrentUserHasScriptAccess,
  openFeederRule,
  openFeederAsAdmin,
  openFeederAsUser,
  transferFirstVisibleScriptOwner,
  validateFixtureOperationsForAllFeederRules,
} from './controllers/16-feeder-management.controller';
import type { ManagedUsers } from './model/05-user-management.model';

let testUsers = {} as ManagedUsers;
let adminUsername = '';

describe('Orion Intelligence - Feeder Management', () => {
  before(() => {
    cy.env(['TEST_USERS', 'ADMIN_USERNAME']).then(({ TEST_USERS, ADMIN_USERNAME }) => {
      testUsers = (TEST_USERS || {}) as ManagedUsers;
      adminUsername = ADMIN_USERNAME || '';
    });
    loadFeederValidationData();
  });

  after(() => {
    cy.logout();
  });

  it('validates feeder fixture operations across all rules', () => {
    openFeederAsAdmin();
    assertFeederRuleOptions();
    cy.docsScreenshot('feeder-workspace');
    validateFixtureOperationsForAllFeederRules();
  });

  it('grants defacement script access to the first feeder user', () => {
    openFeederAsAdmin();
    openFeederRule('defacement');
    cy.docsScreenshot('feeder-defacement-rule');
    transferFirstVisibleScriptOwner(testUsers.testing6.username);
  });

  it('lets the first feeder user access the transferred defacement script', () => {
    openFeederAsUser(testUsers.testing6.username, testUsers.testing6.password);
    openFeederRule('defacement');
    expectCurrentUserHasScriptAccess();
  });

  it('revokes defacement script access from the first feeder user', () => {
    openFeederAsAdmin();
    openFeederRule('defacement');
    transferFirstVisibleScriptOwner(adminUsername);
  });

  it('removes defacement script access from the first feeder user', () => {
    openFeederAsUser(testUsers.testing6.username, testUsers.testing6.password);
    openFeederRule('defacement');
    expectCurrentUserHasNoScriptAccess();
  });

  it('opens feeder and clears all records', () => {
    openFeederAsAdmin();
    assertFeederRuleOptions();
    clearAllFeederRecords();
  });
});
