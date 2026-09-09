const DKIM_CHECK_RESPONSE = {
  status: 'done',
  result: {
    status: 'success',
    domain: 'example.com',
    selector: 'selector1',
    dns_query: 'selector1._domainkey.example.com',
    source: 'live_dns',
    found: true,
    is_valid: true,
    key_type: 'rsa',
    key_size_bits: 2048,
    raw_record: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBExample',
    parsed_data: {
      'version (v)': 'DKIM1',
      'key_type (k)': 'rsa',
      'public_key (p)': 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBExample'
    },
    warnings: [],
    checks: [
      { test: 'DKIM Record Published', status: 'ok', response: 'DKIM Record found' },
      { test: 'DKIM Syntax Check', status: 'ok', response: 'The record is valid' },
      { test: 'DKIM Public Key Check', status: 'ok', response: 'Public key is present' }
    ],
    dmarc: { published: true, dns_query: '_dmarc.example.com', raw_record: 'v=DMARC1; p=reject', policy: 'reject' },
    spf: { published: true, dns_query: 'example.com', raw_record: 'v=spf1 include:_spf.example.com ~all' },
    related: [
      { test: 'DMARC Record Published', status: 'ok', response: 'DMARC Record found' },
      { test: 'SPF Record Published', status: 'ok', response: 'SPF Record found' }
    ]
  }
};

export function setupDkimStubs() {
  cy.intercept('POST', '**/api/dkim/check', { statusCode: 200, body: DKIM_CHECK_RESPONSE }).as('dkimCheck');
}

export function visitDkimLookup() {
  cy.viewport(1920, 1080);
  cy.visit('/dashboard/api/dkim-lookup');
  cy.get('[data-testid="scan-primary-input"]').should('be.visible');
}

export function assertDkimValidation() {
  cy.get('[data-testid="scan-primary-input"]').clear().type('example.com');
  cy.get('[data-testid="dkim-initial-selector-input"]').clear().type('selector1');
  cy.get('[data-testid="scan-search-button"]').should('not.be.disabled').click();

  cy.wait('@dkimCheck').its('request.body.text').should('deep.include', { domain: 'example.com', selector: 'selector1' });

  cy.contains('selector1._domainkey', { timeout: 15000 }).should('be.visible');
  cy.contains('DKIM Record found').should('be.visible');
  cy.contains('Domain Security').should('be.visible');
  cy.contains('DMARC Record found').should('be.visible');
}
