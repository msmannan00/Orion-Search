function ensureSidebarExpanded() {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="sidebar-expand-button"]:visible').length) {
      void cy.get('[data-testid="sidebar-expand-button"]').click();
    }
  });
  void cy.get('[data-testid="sidebar-collapse-button"]').should('be.visible');
}

describe('Dashboard – General Intelligence – Tabs & Pagination', () => {
  after(() => {
    cy.logout();
  });

  beforeEach(() => {
    cy.loginAsAdmin();
    ensureSidebarExpanded();
    cy.get('[data-testid="sidebar-group-strategic"]').should('exist');
  });

  it('General Intelligence – tabs load & pagination', () => {
    cy.get('[data-testid="sidebar-group-strategic"]').should('be.visible').click();
    cy.get('[data-testid="result-card"]').should('exist');
    cy.get('body').scrollTo('bottom', {
      ensureScrollable: false
    });
    cy.get('[data-testid="pagination-root"]').should('exist').scrollIntoView();

    cy.get('[data-testid="pagination-root"]', { timeout: 120000 }).scrollIntoView().should('be.visible');
    cy.get('[data-testid="pagination-next"]').filter(':visible').scrollIntoView().not(':disabled').then(($btn) => {
        if ($btn.length) {
          cy.wrap($btn).click();
          cy.get('[data-testid="result-card"]').should('exist');
        }
      });
  });
});

describe('Data Breach – Tabs & Pagination', () => {
  after(() => {
    cy.logout();
  });

  beforeEach(() => {
    cy.loginAsAdmin();
    ensureSidebarExpanded();
    cy.get('[data-testid="sidebar-group-breach"]').should('exist');
  });

  it('Data Breach – tabs load & pagination', () => {
    cy.get('[data-testid="sidebar-group-breach"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="result-card"]').should('exist');
    cy.get('[data-testid="pagination-root"]').should('exist');

    cy.get('[data-testid="pagination-root"]').scrollIntoView();
    cy.get('[data-testid="pagination-next"]').filter(':visible').scrollIntoView().not(':disabled').then(($btn) => {
        if ($btn.length) {
          cy.wrap($btn).click();
          cy.get('[data-testid="result-card"]').should('exist');
        }
      });
  });
});

describe('Defacement – Tabs & Pagination', () => {
  after(() => {
    cy.logout();
  });

  beforeEach(() => {
    cy.loginAsAdmin();
    ensureSidebarExpanded();
    cy.get('[data-testid="sidebar-group-defacement"]').should('exist');
  });

  it('Defacement – tabs load & pagination with scoped clicks', () => {
    cy.get('[data-testid="sidebar-group-defacement"]').click();
    cy.get('[data-testid="defacement-group-card"]', { timeout: 60000 }).should('exist');

    cy.get('[data-testid="defacement-group-card"]').first().find('.font-mono').first().invoke('text').then((text) => {
      const recordCount = Number(text.trim());
      expect(recordCount, 'first group max records').to.be.greaterThan(0).and.at.most(5);
    });

    cy.get('body').then(($body) => {
      const groupCount = $body.find('[data-testid="defacement-group-card"]').length;
      const totalText = $body.find('span').filter((_, el) => /Results Found/.test(el.textContent || '')).first().text();
      const totalCount = Number((totalText.match(/\d+/) || ['0'])[0]);

      if (totalCount > groupCount) {
        cy.get('[data-testid="pagination-root"]').should('not.exist');
      }
    });
  });
});

describe('Social – Tabs & Pagination', () => {
  after(() => {
    cy.logout();
  });

  beforeEach(() => {
    cy.loginAsAdmin();
    ensureSidebarExpanded();
    cy.get('[data-testid="sidebar-group-social"]').should('exist');
  });

  it('Social – tabs load & pagination with scoped clicks', () => {
    cy.get('[data-testid="sidebar-group-social"]').click();
    cy.get('[data-testid="result-card"]').should('exist');
    cy.get('[data-testid="result-card"]').should('exist');
    cy.get('body').then(($body) => {
      const hasPagination = $body.find('[data-testid="pagination-root"]:visible').length > 0;
      if (!hasPagination) {
        return;
      }
      cy.get('[data-testid="pagination-root"]').scrollIntoView().should('be.visible');
      cy.get('[data-testid="pagination-next"]').filter(':visible').scrollIntoView().not(':disabled').then(($btn) => {
          if ($btn.length) {
            cy.wrap($btn).click();
            cy.get('[data-testid="result-card"]').should('exist');
            cy.get('[data-testid="result-card"]').should('exist');
          }
        });
    });
  });
});

describe('Exploit – Tabs & Pagination', () => {
  after(() => {
    cy.logout();
  });

  beforeEach(() => {
    cy.loginAsAdmin();
    ensureSidebarExpanded();
    cy.get('[data-testid="sidebar-group-exploit"]').should('exist');
  });

  it('Exploit – tabs load & pagination with scoped clicks', () => {
    cy.get('[data-testid="sidebar-group-exploit"]').click();
    cy.get('[data-testid="result-card"]').should('exist');
    cy.get('[data-testid="result-card"]').should('exist');
    cy.get('[data-testid="pagination-root"]').should('exist');

    cy.get('[data-testid="pagination-root"]').scrollIntoView();
    cy.get('body').then(($body) => {
      const hasVisibleNext = $body.find('[data-testid="pagination-next"]:visible').length > 0;
      if (!hasVisibleNext) {
        return;
      }
      cy.get('[data-testid="pagination-next"]:visible').then(($btn) => {
        if (!$btn.is(':disabled')) {
          cy.wrap($btn).click();
          cy.get('[data-testid="result-card"]').should('exist');
          cy.get('[data-testid="result-card"]').should('exist');
        }
      });
    });
  });
});

describe('Feed – Tabs & Pagination', () => {
  after(() => {
    cy.logout();
  });

  const TABS = ['News'];

  beforeEach(() => {
    cy.loginAsAdmin();
    ensureSidebarExpanded();
    cy.get('[data-testid="sidebar-group-feed"]').should('exist');
  });

  it('Feed – tabs load & pagination with scoped clicks', () => {
    cy.get('[data-testid="sidebar-group-feed"]').click();
    cy.get('[data-testid="sidebar-group-feed"]').as('feedTabs');
    TABS.forEach((tab) => {
      cy.log(`TAB: ${tab}`);
      cy.get(`[data-testid="sidebar-subitem-feed-${tab.toLowerCase()}"]`).click();
      cy.get('[data-testid="result-card"]').should('exist');
      cy.get('[data-testid="result-card"]').should('exist');
      cy.get('[data-testid="pagination-root"]').should('exist');

      cy.get('[data-testid="pagination-root"]').scrollIntoView().should('be.visible');
      cy.get('[data-testid="pagination-next"]').filter(':visible').scrollIntoView().not(':disabled').then(($btn) => {
          if ($btn.length) {
            cy.wrap($btn).click();
            cy.reload();
            cy.get('[data-testid="result-card"]').should('exist');
          }
        });
      cy.logout();
    });
  });
});
