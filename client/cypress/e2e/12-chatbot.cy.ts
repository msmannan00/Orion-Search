describe('Chatbot - General Intelligence Report Flow', () => {
  before(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="chat-widget-overlay"]:visible').length) {
        cy.get('[data-testid="chat-widget-overlay"]').click('topLeft', { force: true });
      }
    });
    cy.logout();
  });

  it('opens first report and sends a chatbot message', () => {
    cy.visit('/dashboard/strategic/all?page=1');
    cy.get('[data-testid="result-card"]').should('have.length.greaterThan', 0);
    cy.get('[data-testid="result-card"]')
      .first()
      .scrollIntoView()
      .within(() => {
        cy.get('[data-testid="open-report"]').should('exist').click({force: true});
      });
    cy.url().should('match', /\/dashboard\/strategic\/all\/[^/?]+/);
    cy.get('#report-detail').should('be.visible');
    cy.get('[data-testid="chat-widget-open"]').filter(':visible').first().scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="chat-widget-input"]').filter(':visible').first().should('be.enabled').type('hey');
    cy.get('[data-testid="chat-widget-send"]').filter(':visible').first().should('be.enabled').click();
    cy.get('[data-testid="chat-widget-messages"]').filter(':visible').first().find('div').should('exist');
    cy.docsScreenshot('report-chatbot');
  });
});

describe('Chatbot - Shared Chat Public View', () => {
  it('renders shared chat transcript', () => {
    cy.intercept('GET', '**/api/public/chat-shares/shared-chat-doc*', {
      statusCode: 200,
      body: {
        messages: [
          {
            sender: 'user',
            text: 'Summarize this alert for handoff.',
            time: '2026-07-12T09:00:00Z'
          },
          {
            sender: 'bot',
            text: '**Summary:** The alert needs review before escalation.',
            time: '2026-07-12T09:00:03Z'
          }
        ],
        expiresAt: '2026-07-19T09:00:00Z'
      }
    }).as('sharedChat');

    cy.visit('/chat-share/shared-chat-doc?token=test-token');
    cy.wait('@sharedChat');
    cy.get('[data-testid="chat-share-root"]').should('be.visible');
    cy.get('[data-testid="chat-share-header"]')
      .should('contain.text', 'Shared Intelligence Report')
      .and('contain.text', 'Read Only');
    cy.contains('Summarize this alert for handoff.').should('be.visible');
    cy.contains('The alert needs review before escalation.').should('be.visible');
    cy.docsScreenshot('chat-share-public-view');
  });
});
