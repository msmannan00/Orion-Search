import {
  setupManageProfilesStubs,
  visitManageProfiles,
  assertSessionsTab,
  assertPersonasTab,
  assertProfilesTab,
  assertAssignmentsTab,
  assertResultsTab
} from './controllers/22-manage-profiles.controller';

describe('Orion Intelligence - Manage Profiles Flow', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('covers manage profiles app and all its tabs', () => {
    setupManageProfilesStubs();
    visitManageProfiles();
    
    assertSessionsTab();
    assertPersonasTab();
    assertProfilesTab();
    assertAssignmentsTab();
    assertResultsTab();
  });
});
