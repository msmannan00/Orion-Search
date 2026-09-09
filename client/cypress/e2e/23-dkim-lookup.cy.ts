import {
  setupDkimStubs,
  visitDkimLookup,
  assertDkimValidation
} from './controllers/23-dkim-lookup.controller';

describe('Orion Intelligence - DKIM Lookup', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('validates a DKIM selector against a mocked backend', () => {
    setupDkimStubs();
    visitDkimLookup();
    assertDkimValidation();
  });
});
