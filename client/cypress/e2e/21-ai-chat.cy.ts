import {
  AI_CHAT_MESSAGE,
  AI_CHAT_RENAMED_TITLE,
  AI_CHAT_RESPONSE,
  AI_CHAT_VIEW_CASES,
  firstByPrefix,
  selector,
} from './controllers/21-ai-chat.controller';

describe('AI Chat - Basic Flow', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('opens AI chat and performs chat actions', () => {
    cy.intercept('GET', '**/chats').as('listAiChats');

    cy.visit('/dashboard/profile/homepage');

    cy.get(selector('homepage-search-input'), { timeout: 60000 })
      .should('be.visible');

    cy.get(selector('ioc-basic-tag-AI'), { timeout: 60000 })
      .filter(':visible')
      .first()
      .scrollIntoView()
      .should('be.visible')
      .invoke('removeAttr', 'target')
      .click({ force: true });

    cy.get(selector('ai-workspace-root'), { timeout: 60000 })
      .should('be.visible');

    cy.wait('@listAiChats', { timeout: 60000 }).its('response.statusCode').should('eq', 200);

    AI_CHAT_VIEW_CASES.forEach(({ buttonTestId, visibleTestIds }) => {
      cy.get(selector(buttonTestId))
        .should('be.visible')
        .click({ force: true })
        .should('have.attr', 'aria-pressed', 'true');

      visibleTestIds.forEach((testId) => {
        cy.get(selector(testId), { timeout: 60000 }).should('be.visible');
      });
    });

    cy.intercept('POST', '**/chats').as('ensureAiChat');

    cy.get(selector('ai-new-chat-button'), { timeout: 60000 })
      .filter(':visible')
      .first()
      .should('be.visible')
      .click({ force: true });

    cy.wait('@ensureAiChat', { timeout: 60000 }).then(({ response }) => {
      expect(response, 'initial chat response').to.not.equal(undefined);
      expect(response?.statusCode, JSON.stringify(response?.body || {})).to.be.oneOf([200, 201]);
    });

    cy.intercept('POST', '**/api/nexus/chat').as('sendAiMessage');

    cy.get(selector('chat-widget-input'), { timeout: 60000 })
      .should('be.visible')
      .and('not.be.disabled')
      .clear()
      .type(AI_CHAT_MESSAGE);

    cy.get(selector('chat-widget-send'))
      .should('not.be.disabled')
      .click({ force: true });

    cy.contains(selector('ai-message-user'), AI_CHAT_MESSAGE, { timeout: 60000 })
      .should('be.visible');

    cy.wait('@sendAiMessage', { timeout: 120000 }).then(({ response }) => {
      expect(response, 'send AI message response').to.not.equal(undefined);
      expect(response?.statusCode, JSON.stringify(response?.body || {})).to.be.oneOf([200, 201]);
    });

    cy.contains(selector('ai-message-bot'), AI_CHAT_RESPONSE, { timeout: 120000 })
      .should('be.visible');

    cy.intercept('PUT', '**/chats/*').as('renameAiChat');

    cy.get(firstByPrefix('ai-chat-options-'), { timeout: 60000 })
      .first()
      .scrollIntoView()
      .should('exist')
      .click({ force: true });

    cy.get(firstByPrefix('ai-chat-menu-'), { timeout: 60000 })
      .first()
      .should('exist');

    cy.get(firstByPrefix('ai-chat-rename-'))
      .first()
      .click({ force: true });

    cy.get(selector('ai-chat-rename-modal'), { timeout: 60000 })
      .should('be.visible');

    cy.get(selector('ai-chat-rename-input'))
      .should('be.visible')
      .clear()
      .type(AI_CHAT_RENAMED_TITLE);

    cy.get(selector('ai-chat-rename-confirm'))
      .should('not.be.disabled')
      .click({ force: true });

    cy.wait('@renameAiChat', { timeout: 60000 }).then(({ response }) => {
      expect(response, 'rename chat response').to.not.equal(undefined);
      expect(response?.statusCode, JSON.stringify(response?.body || {})).to.be.oneOf([200, 201]);

      const body = response?.body || {};
      expect(body.title, JSON.stringify(body)).to.equal(AI_CHAT_RENAMED_TITLE);
    });

    cy.contains(firstByPrefix('ai-chat-session-'), AI_CHAT_RENAMED_TITLE, { timeout: 60000 })
      .should('be.visible');

    cy.get(selector('ai-chat-search-toggle'))
      .should('be.visible')
      .click({ force: true });

    cy.get(selector('ai-chat-search-input'))
      .should('be.visible')
      .type(AI_CHAT_RENAMED_TITLE);

    cy.contains(firstByPrefix('ai-chat-session-'), AI_CHAT_RENAMED_TITLE)
      .should('be.visible');

    cy.get(selector('ai-chat-sidebar-collapse'))
      .should('be.visible')
      .and('have.attr', 'aria-label', 'Collapse sidebar')
      .click();

    cy.get('app-ai-chat-sidebar [data-sidebar-expanded]').should('not.exist');
    cy.get('app-ai-chat-sidebar [data-sidebar-collapsed]').should('be.visible');
    cy.get(selector('ai-chat-sidebar-expand'))
      .should('be.visible')
      .and('have.attr', 'aria-label', 'Expand sidebar');

    cy.get(`${firstByPrefix('ai-chat-session-')}[data-selected="true"]`)
      .should('be.visible');

    cy.get(selector('ai-chat-sidebar-expand')).click();

    cy.get('app-ai-chat-sidebar [data-sidebar-expanded]').should('be.visible');
    cy.get('app-ai-chat-sidebar [data-sidebar-collapsed]').should('not.exist');
    cy.get(selector('ai-chat-search-toggle'))
      .should('be.visible');

    cy.get(selector('ai-chat-search-input'))
      .should('not.exist');

    cy.get(selector('ai-chat-search-toggle')).click();

    cy.get(selector('ai-chat-search-input'))
      .should('be.visible')
      .type(AI_CHAT_RENAMED_TITLE);

    cy.get(selector('ai-chat-search-clear'))
      .should('be.visible')
      .click({ force: true });

    cy.get(selector('ai-chat-search-input')).type('{esc}');

    cy.intercept('POST', '**/chats').as('createAiChat');

    cy.get(selector('ai-new-chat-button'), { timeout: 60000 })
      .filter(':visible')
      .first()
      .should('be.visible')
      .click({ force: true });

    cy.wait('@createAiChat', { timeout: 60000 }).then(({ response }) => {
      expect(response, 'create chat response').to.not.equal(undefined);
      expect(response?.statusCode, JSON.stringify(response?.body || {})).to.be.oneOf([200, 201]);

      const sessionId = response?.body?.session_id;
      expect(sessionId, JSON.stringify(response?.body || {})).to.be.a('string').and.to.have.lengthOf.greaterThan(0);
      cy.get(selector(`ai-chat-session-${sessionId}`), { timeout: 60000 })
        .should('have.attr', 'data-selected', 'true');
    });

    cy.get(selector('chat-widget-input'), { timeout: 60000 })
      .should('be.visible');

    cy.intercept('DELETE', '**/chats/*').as('deleteAiChat');

    cy.get(firstByPrefix('ai-chat-options-'), { timeout: 60000 })
      .first()
      .scrollIntoView()
      .should('exist')
      .click({ force: true });

    cy.get(firstByPrefix('ai-chat-menu-'), { timeout: 60000 })
      .first()
      .should('exist');

    cy.get(firstByPrefix('ai-chat-delete-'))
      .first()
      .click({ force: true });

    cy.get(selector('confirmation-yes-button'), { timeout: 60000 })
      .should('be.visible')
      .click({ force: true });

    cy.wait('@deleteAiChat', { timeout: 60000 }).then(({ response }) => {
      expect(response, 'delete chat response').to.not.equal(undefined);
      expect(response?.statusCode, JSON.stringify(response?.body || {})).to.be.oneOf([200, 204]);
    });
  });
});
