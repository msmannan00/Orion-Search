import {addUser, completeSubscriptionPopupFlow, deleteUsersByUsername, loginAndClickSidebar, loginAsUser, ManagedUser, ManagedUsers, openFirstStrategicReportFromSearch, openSidebarGroup, openSidebarSubItem, openUserEditor, setPasswordResetRequired, UserManagementTestData} from './controllers/05-user-management.controller';
import {typeInputSlow, waitForSearchReady} from './controllers/04-searching.controller';

let testUsers = {} as ManagedUsers;
let testData = {} as UserManagementTestData;
let createUsers: ManagedUser[] = [];
let profileUserId = '';
const forcedResetUserKey = 'testing1';
const forcedResetNewPassword = '2wsx@WSX';

describe('Orion Intelligence - User Management Creation Flow', () => {
  before(() => {
    cy.env(['TEST_USERS', 'TEST_DATA']).then(({TEST_USERS, TEST_DATA}) => {
      testUsers = (TEST_USERS || {}) as ManagedUsers;
      testData = (TEST_DATA || {}) as UserManagementTestData;
      createUsers = Object.keys(testUsers)
        .filter((key) => /^testing\d+$/.test(key))
        .map((key) => testUsers[key] as ManagedUser);
    });
  });

  before(() => {
    cy.env(['TEST_USERS', 'TEST_DATA']).then(({TEST_USERS, TEST_DATA}) => {
      testUsers = (TEST_USERS || {}) as ManagedUsers;
      testData = (TEST_DATA || {}) as UserManagementTestData;
      createUsers = Object.keys(testUsers)
        .filter((key) => /^testing\d+$/.test(key))
        .map((key) => testUsers[key] as ManagedUser);
    });
  });

  after(() => {
    cy.logout();
  });

  it('disables user creation until SMTP settings are configured', () => {
    cy.loginAsAdmin();
    cy.visit('/dashboard/profile/users');
    cy.get('[data-testid="tenant-add-user-button"]').should('be.disabled');

    cy.get('[data-testid="sidebar-subitem-profile-system-settings"]').filter(':visible').first().scrollIntoView().click();
    cy.url().should('include', 'system-settings');
    cy.get('[data-testid="system-settings-account-mail"]').scrollIntoView().should('be.visible').clear().type('cypress-mailer@example.test');
    cy.get('[data-testid="system-settings-account-mail-password"]').scrollIntoView().should('be.visible').clear().type('1#VSC&cuad)d', {log: false});
    cy.get('[data-testid="system-settings-account-smtp-server"]').scrollIntoView().should('be.visible').clear().type('mailpit');
    cy.get('[data-testid="system-settings-account-smtp-port"]').scrollIntoView().should('be.visible').clear().type('1025');
    cy.scrollDashboardToTop();
    cy.get('[data-testid="system-settings-mail-save"]').scrollIntoView().should('be.visible').and('not.be.disabled').click();
    cy.get('[data-testid="system-settings-mail-save"]', {timeout: 30000}).should('be.disabled');

    cy.visit('/dashboard/profile/users');
    cy.get('[data-testid="tenant-add-user-button"]').should('not.be.disabled');
    cy.logout();
  });

  it('creates seven users with configured licenses as admin', () => {
    cy.loginAsAdmin();
    cy.visit('/dashboard/profile/homepage');
    cy.get('[data-testid="sidebar-group-profile"]').should('be.visible').scrollIntoView().click();
    cy.get('[data-testid="sidebar-subitem-profile-users"]').should('be.visible').scrollIntoView().click();
    cy.url().should('include', '/dashboard/profile/users');
    cy.get('[data-testid="tenant-add-user-button"]').should('be.visible');

    createUsers.forEach((u) => addUser(u));
    createUsers.forEach((u) => {
      setPasswordResetRequired(u.username, u.username === testUsers[forcedResetUserKey]?.username);
    });
    cy.logout();
  });

  it('forces testing1 to change password on first login and clears the reset flag', () => {
    const user = testUsers[forcedResetUserKey] as ManagedUser;

    cy.intercept({ method: 'POST', pathname: '**/api/token' }).as('loginRequest');
    cy.visit('/login');
    cy.get('[data-testid="login-user"]').should('be.visible').clear().type(user.username);
    cy.get('[data-testid="login-pass"]').should('be.visible').clear().type(user.password, {log: false});
    cy.get('[data-testid="login-button"]').first().should('be.visible').click();
    cy.waitForLoginRequest();

    cy.url().should('include', '/reset/');
    cy.get('[data-testid="reset-title"]').should('contain.text', 'Change Password');
    cy.get('[data-testid="reset-password"]').should('be.visible').clear().type(forcedResetNewPassword, {log: false});
    cy.get('[data-testid="reset-confirm-password"]').should('be.visible').clear().type(forcedResetNewPassword, {log: false});
    cy.get('[data-testid="reset-submit"]').should('not.be.disabled').click();
    cy.get('[data-testid="dashboard-main"]').should('be.visible');
    testUsers[forcedResetUserKey].password = forcedResetNewPassword;
    cy.logout();

    cy.loginAsAdmin();
    cy.visit('/dashboard/profile/users');
    cy.get('[data-testid="tenant-add-user-button"]').should('be.visible');
    openUserEditor(user.username);
    cy.get('@expandedUserEditor').within(() => {
      cy.get('[data-testid="tenant-password-reset-required-toggle"]')
        .then(($control) => {
          const $checkbox = $control.find('input[type="checkbox"]');
          if ($checkbox.length) {
            cy.wrap($checkbox).should('not.be.checked');
            return;
          }
          cy.wrap($control).should('contain.text', 'No password reset');
        });
    });
    cy.logout();
  });

  it('logs in as testing1 and verifies allowed sidebar group access', () => {
    loginAndClickSidebar(testUsers.testing1.username, ['General Intelligence'], testUsers, testData);
  });

  it('logs in as testing2 and verifies assigned license sidebar groups', () => {
    loginAndClickSidebar(testUsers.testing2.username, ['General Intelligence', 'Data Breach', 'Defacement', 'Social', 'Exploit', 'Feed'], testUsers, testData);
  });

  it('logs in as testing2 and updates account settings preferences', () => {
    loginAsUser(testUsers.testing2.username, testUsers.testing2.password);
    cy.visit('/dashboard/profile/account');
    cy.get('[data-testid="account-settings-form"]').should('be.visible');
    cy.get('[data-testid="account-settings-twofa-toggle"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="password-confirmation-input"]').type(testUsers.testing2.password, {log: false});
    cy.get('[data-testid="password-confirmation-submit"]').click();
    cy.get('[data-testid="password-confirmation-input"]').should('not.exist');
    cy.get('[data-testid="account-settings-form"]').should('be.visible');
    cy.get('[data-testid="account-settings-theme-toggle"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="account-settings-form"]').should('be.visible');
    cy.logout();
  });

  it('logs in as testing3 and verifies assigned license sidebar groups', () => {
    loginAndClickSidebar(testUsers.testing3.username, ['General Intelligence', 'Data Breach', 'Defacement', 'Social', 'Exploit', 'Feed', 'Stealer logs'], testUsers, testData);
  });

  it('logs in as testing4 and verifies scanner and api sidebar groups', () => {
    loginAndClickSidebar(testUsers.testing4.username, ['Web Scans', 'Entity Lookup'], testUsers, testData);
  });

  it('logs in as testing5 and completes the stealer logs subscription paywall flow', () => {
    loginAsUser(testUsers.testing5.username, testUsers.testing5.password);
    openSidebarGroup('Stealer logs');
    completeSubscriptionPopupFlow(testData, () => {
      openSidebarGroup('Stealer logs');
      openSidebarSubItem('stealerlogs', 'iocs');
    });
    cy.url().should('match', /\/($|homepage)/);
    cy.logout();
  });

  it('logs in as testing1 and shows the trial subscription banner near expiry', () => {
    cy.clock(new Date('2026-03-10T12:00:00Z').getTime(), ['Date']);
    cy.intercept('POST', '**/api/get/tenant/node', (req) => {
      req.continue((res) => {
        if (res.body?.user) {
          res.body.user.role = 'member';
          res.body.user.subscription = false;
          res.body.user.verificationDate = '2026-02-20T12:00:00Z';
        }
      });
    }).as('trialSession');

    loginAsUser(testUsers.testing1.username, testUsers.testing1.password);
    cy.wait('@trialSession');
    cy.get('[data-testid="trial-subscription-banner"]').should('be.visible');
    cy.contains('[data-testid="trial-subscription-banner"]', 'Your subscription is about to expire in 10 days.').should('be.visible');
    cy.docsScreenshot('trial-subscription-banner');
    cy.logout();
  });

  it('covers report feedback and public profile activity flow', () => {
    cy.visit('/');
    cy.get('[data-testid="login-page"]').should('be.visible');

    const currentUsername = testUsers.testing3.username;
    const commentText = `Follow up on this thread ${Date.now()}`;
    const blockedCommentText = `Blocked follow up ${Date.now()}`;

    loginAsUser(testUsers.testing3.username, testUsers.testing3.password);

    openFirstStrategicReportFromSearch();

    cy.scrollDashboardToTop();
    cy.get('[data-testid="report-feedback-recommended"]').filter(':visible').first().scrollIntoView().click();
    cy.get('[data-testid="report-feedback-recommended"]').filter(':visible').first().should('contain.text', 'Selected');

    cy.get('[data-testid="report-feedback-trust"]').filter(':visible').first().scrollIntoView().click();
    cy.get('[data-testid="report-feedback-trust"]').filter(':visible').first().should('contain.text', 'Selected');

    cy.scrollDashboardToBottom()
    cy.get('[data-testid="report-feedback-comment-input"]').filter(':visible').first().scrollIntoView().should('be.visible').type(commentText);
    cy.get('[data-testid="report-feedback-comment-save"]').filter(':visible').first().click();
    cy.contains('p', commentText).scrollIntoView().should('be.visible');
    cy.docsScreenshot('report-feedback-comments');

    cy.contains('[data-testid="report-feedback-comment-user-name"]', currentUsername).first().click({ force: true });
    cy.contains('div', 'Profile').should('be.visible');
    cy.get('[data-testid="report-user-sidebar-open-profile"]').filter(':visible').first().click();
    cy.url().should('match', /\/dashboard\/profile\/user\/[^/]+$/);
    cy.location('pathname').then((pathname) => {
      profileUserId = pathname.split('/').pop() || '';
      expect(profileUserId).to.not.equal('');
    });
    cy.contains('h1', currentUsername).should('be.visible');
    cy.contains('span', 'Recommended').should('exist');
    cy.contains('span', 'Trust').should('exist');
    cy.contains('span', /comment/i).should('exist');
    cy.docsScreenshot('public-user-activity');

    cy.window().then((win) => {
      cy.stub(win, 'open').as('profileWindowOpen');
    });
    cy.get('[data-testid="user-profile-open-thread"]').filter(':visible').first().click();
    cy.get('@profileWindowOpen').should('have.been.calledOnce');
    cy.get('@profileWindowOpen').its('firstCall.args.0').should('include', '/dashboard/');

    openFirstStrategicReportFromSearch();
    cy.wait(1000)
    cy.scrollDashboardToBottom()
    cy.get('[data-testid="report-feedback-comment-input"]').filter(':visible').first().scrollIntoView().should('be.visible').type(blockedCommentText);
    cy.get('[data-testid="report-feedback-comment-save"]').filter(':visible').first().click();
    cy.contains('p', 'Only one comment per hour is allowed.').should('be.visible');
    cy.contains('p', blockedCommentText).should('not.exist');

    cy.visit('/dashboard/profile/account');
    cy.intercept('POST', '**/api/update/current/user').as('profileVisibilityUpdate');
    cy.get('[data-testid="account-settings-profile-visibility-toggle"]').should('be.visible').then(($toggle) => {
      const label = $toggle.text();
      if (label.includes('Visible to other users')) {
        cy.wrap($toggle).scrollIntoView().click();
        cy.wait('@profileVisibilityUpdate');
      }
    });
    cy.contains('[data-testid="account-settings-profile-visibility-toggle"] p', 'Hidden from other users').should('be.visible');
    cy.reload();
    cy.get('[data-testid="account-settings-profile-visibility-toggle"]').scrollIntoView().should('be.visible');
    cy.contains('[data-testid="account-settings-profile-visibility-toggle"] p', 'Hidden from other users').should('be.visible');
    cy.logout();

    loginAsUser(testUsers.testing5.username, testUsers.testing5.password);
    openFirstStrategicReportFromSearch();
    cy.scrollDashboardToBottom()
    cy.contains('[data-testid="report-feedback-comment-user-name"]', currentUsername).first().click({ force: true });
    cy.get('[data-testid="report-user-sidebar-hidden-profile"]').should('exist');
    cy.get('[data-testid="report-user-sidebar-open-profile"]').should('not.exist');
    cy.docsScreenshot('public-user-hidden-profile');
    cy.logout();
  });

});

describe('Orion Intelligence - Enterprise Demo Tour', () => {
  const enterpriseUser: ManagedUser = {
    username: 'enterprise_tour1',
    email: 'enterprise_tour@example.com',
    password: '1qaz!QAZ',
    role: 'Analyst',
    licenses: ['Enterprise']
  };

  const waitForTourStep = (expectedCurrent: number, expectedTotal: number) => {
    cy.get('[data-testid="demo-tour-tooltip"]').should('be.visible');
    cy.get('[data-testid="demo-tour-step"]').should('be.visible').invoke('text').should(rawProgress => {
      const progress = rawProgress.match(/^\s*Step\s+(\d+)\s*\/\s*(\d+)\s*$/);
      expect(progress, 'tour progress').to.not.equal(null);
      expect(Number(progress![1]), 'current tour step').to.eq(expectedCurrent);
      expect(Number(progress![2]), 'total tour steps').to.eq(expectedTotal);
    });
    cy.get('[data-testid="demo-tour-next"]').should('be.visible').and('not.be.disabled');
  };

  const assertTourStep = (current: number, total: number, title?: string) => {
    waitForTourStep(current, total);
    if (title) {
      cy.get('[data-testid="demo-tour-title"]').should('be.visible').invoke('text').should(rawTitle => {
        expect(rawTitle.trim(), `title for tour step ${current}`).to.eq(title);
      });
    }
  };

  const advanceToTourStep = (current: number, target: number, total: number) => {
    for (let stepNumber = current; stepNumber < target; stepNumber += 1) {
      assertTourStep(stepNumber, total);
      cy.get('[data-testid="demo-tour-next"]').should('be.visible').and('not.be.disabled').click();
    }
    assertTourStep(target, total);
  };

  const interceptDocumentationAvailability = (enabled: boolean) => {
    cy.intercept('GET', '**/api/public', (req) => {
      req.continue((res) => {
        const settings = res.body?.settings;
        if (!settings) {
          return;
        }
        let metaInfo: Record<string, unknown>;
        try {
          const parsedMetaInfo = typeof settings.meta_info === 'string' ? JSON.parse(settings.meta_info) : settings.meta_info;
          metaInfo = parsedMetaInfo && typeof parsedMetaInfo === 'object' && !Array.isArray(parsedMetaInfo)
            ? parsedMetaInfo as Record<string, unknown>
            : {};
        }
        catch {
          metaInfo = {};
        }
        metaInfo['S_HOME_HEADER_PRICING_ALLOWED'] = enabled;
        settings.meta_info = JSON.stringify(metaInfo);
      });
    }).as(enabled ? 'publicConfigWithDocumentation' : 'publicConfigWithoutDocumentation');
  };

  const resetDocumentationScroll = () => {
    cy.get('[data-sidebar-expanded] [data-testid="dashboard-sidebar-scroll"]').should('have.length', 1).then($scrollers => {
      const scroller = $scrollers[0] as HTMLElement;
      const documentation = scroller.querySelector<HTMLElement>('[data-testid="sidebar-documentation"]');

      expect(documentation, 'Documentation belongs to the visible sidebar scroller').to.not.equal(null);
      expect(scroller.scrollHeight, 'sidebar has scrollable content').to.be.greaterThan(scroller.clientHeight);

      scroller.scrollTop = 0;

      const scrollerRect = scroller.getBoundingClientRect();
      const documentationRect = documentation!.getBoundingClientRect();
      const viewportHeight = scroller.ownerDocument.defaultView?.innerHeight ?? scrollerRect.bottom;
      const visibleBottom = Math.min(scrollerRect.bottom - 12, viewportHeight - 12);
      expect(scroller.scrollTop, 'sidebar starts at the top').to.eq(0);
      expect(documentationRect.bottom, 'Documentation initially extends below the visible sidebar viewport').to.be.greaterThan(visibleBottom + 1);
    });
  };

  const assertDocumentationScrolledIntoView = () => {
    cy.get('[data-sidebar-expanded] [data-testid="dashboard-sidebar-scroll"]').should('have.length', 1).then($scrollers => {
      const scroller = $scrollers[0] as HTMLElement;
      const documentation = scroller.querySelector<HTMLElement>('[data-testid="sidebar-documentation"]');

      expect(documentation, 'Documentation remains in the visible sidebar scroller').to.not.equal(null);
      const scrollerRect = scroller.getBoundingClientRect();
      const documentationRect = documentation!.getBoundingClientRect();
      const viewportHeight = scroller.ownerDocument.defaultView?.innerHeight ?? scrollerRect.bottom;
      const visibleTop = Math.max(scrollerRect.top + 12, 12);
      const visibleBottom = Math.min(scrollerRect.bottom - 12, viewportHeight - 12);
      expect(scroller.scrollTop, 'Documentation step scrolls the sidebar').to.be.greaterThan(0);
      expect(documentationRect.top, 'Documentation top is inside the visible sidebar viewport').to.be.at.least(visibleTop - 3);
      expect(documentationRect.bottom, 'Documentation bottom is inside the visible sidebar viewport').to.be.at.most(visibleBottom + 3);
    });
    cy.get('[data-testid="sidebar-documentation"]').should('be.visible');
  };

  const advanceToFinalTourStep = (visitedTitles: string[] = [], expectedTotal: number): Cypress.Chainable<string[]> => {
    waitForTourStep(visitedTitles.length + 1, expectedTotal);
    return cy.get('[data-testid="demo-tour-step"]').should('be.visible').invoke('text').then(rawProgress => {
      const progress = rawProgress.match(/^\s*Step\s+(\d+)\s*\/\s*(\d+)\s*$/);
      expect(progress, 'tour progress').to.not.equal(null);
      const current = Number(progress![1]);
      const total = Number(progress![2]);

      expect(total, 'stable tour step count').to.eq(expectedTotal);
      expect(current, 'sequential tour step').to.eq(visitedTitles.length + 1);

      return cy.get('[data-testid="demo-tour-title"]').should('be.visible').invoke('text').then(rawTitle => {
        const title = rawTitle.trim();
        visitedTitles.push(title);

        if (current === total) {
          return cy.wrap(visitedTitles, { log: false });
        }

        cy.get('[data-testid="demo-tour-next"]').should('be.visible').and('not.be.disabled').click();
        return advanceToFinalTourStep(visitedTitles, expectedTotal);
      });
    });
  };

  const assertBackWorksDuringLoading = (total: number) => {
    assertTourStep(1, total, 'Global Threat Search');
    cy.get('[data-testid="demo-tour-back"]').should('not.exist');
    cy.get('[data-testid="demo-tour-next"]').should('be.visible').and('not.be.disabled').click();
    cy.get('[data-testid="demo-tour-tooltip"]').should('have.attr', 'aria-busy', 'true');
    cy.get('[data-testid="demo-tour-back"]').should('be.visible').and('not.be.disabled').then($back => {
      cy.get('[data-testid="demo-tour-tooltip"]').should('have.attr', 'aria-busy', 'true');
      cy.wrap($back).click();
    });
    assertTourStep(1, total, 'Global Threat Search');
    cy.get('#homeSearch input[type="text"]').should('have.value', 'jessidig@amazon.com');
    cy.get('[data-testid="demo-tour-back"]').should('not.exist');
  };

  const assertSharedStepBackSequence = () => {
    assertTourStep(7, 10, 'Collapse sidebar');
    cy.get('[data-testid="sidebar-collapse-button"]').should('exist');

    cy.get('[data-testid="demo-tour-next"]').click();
    assertTourStep(8, 10, 'Expand sidebar');
    cy.get('[data-testid="sidebar-expand-button"]').should('exist');

    cy.get('[data-testid="demo-tour-back"]').should('be.visible').and('not.be.disabled').click();
    assertTourStep(7, 10, 'Collapse sidebar');
    cy.get('[data-testid="sidebar-collapse-button"]').should('exist');

    cy.get('[data-testid="demo-tour-next"]').click();
    assertTourStep(8, 10, 'Expand sidebar');
    cy.get('[data-testid="sidebar-expand-button"]').should('exist');

    cy.get('[data-testid="demo-tour-next"]').click();
    assertTourStep(9, 10, 'Profile menu');
    cy.get('[data-testid="profile-dropdown-menu"]').should('exist');

    cy.get('[data-testid="demo-tour-back"]').should('be.visible').and('not.be.disabled').click();
    assertTourStep(8, 10, 'Expand sidebar');
    cy.get('[data-testid="sidebar-expand-button"]').should('exist');

    cy.get('[data-testid="demo-tour-next"]').click();
    assertTourStep(9, 10, 'Profile menu');
    cy.get('[data-testid="profile-dropdown-menu"]').should('exist');

    resetDocumentationScroll();
    cy.get('[data-testid="demo-tour-next"]').click();
    assertTourStep(10, 10, 'Documentation');
    assertDocumentationScrolledIntoView();

    cy.get('[data-testid="demo-tour-back"]').should('be.visible').and('not.be.disabled').click();
    assertTourStep(9, 10, 'Profile menu');
    cy.get('[data-testid="profile-dropdown-menu"]').should('exist');

    resetDocumentationScroll();
    cy.get('[data-testid="demo-tour-next"]').click();
    assertTourStep(10, 10, 'Documentation');
    assertDocumentationScrolledIntoView();
  };

  before(() => {
    cy.loginAsAdmin();
    cy.intercept('POST', '**/api/users').as('usersApi');
    cy.visit('/dashboard/profile/homepage');
    cy.get('[data-testid="sidebar-group-profile"]').should('be.visible').scrollIntoView().click();
    cy.get('[data-testid="sidebar-subitem-profile-users"]').should('be.visible').scrollIntoView().click();
    cy.url().should('include', '/dashboard/profile/users');
    addUser(enterpriseUser);
    setPasswordResetRequired(enterpriseUser.username, false);
    cy.logout();
  });

  beforeEach(() => {
    cy.intercept('POST', '**/api/get/tenant/node', (req) => {
      req.continue((res) => {
        if (res.body?.user) {
          res.body.user.demo_tour = false;
          res.body.user.license = ['enterprise'];
          res.body.user.role = 'Analyst';
        }
      });
    }).as('enterpriseTenantNode');
  });

  after(() => {
    cy.logout();
  });

  it('blocks background interaction while tour controls remain available', () => {
    interceptDocumentationAvailability(true);

    loginAsUser(enterpriseUser.username, enterpriseUser.password);
    cy.wait('@enterpriseTenantNode');

    cy.get('html').should('have.class', 'no-scroll');
    cy.get('body').should('have.class', 'no-scroll');

    cy.window().then((win) => {
      const overlay = win.document.querySelector('[data-testid="demo-tour-overlay"]') as SVGElement | null;
      const profileButton = win.document.querySelector('[data-testid="sidebar-group-profile"]') as HTMLElement | null;

      expect(overlay, 'demo tour overlay').to.not.equal(null);
      expect(profileButton, 'profile sidebar button').to.not.equal(null);
      expect(win.document.querySelector('[data-testid="sidebar-documentation"]'), 'Documentation is enabled for this tour').to.not.equal(null);

      const profileRect = profileButton!.getBoundingClientRect();
      const topmostElement = win.document.elementFromPoint(profileRect.left + (profileRect.width / 2), profileRect.top + (profileRect.height / 2));
      expect(topmostElement?.closest('[data-testid="demo-tour-overlay"]'), 'overlay blocks the sidebar control').to.not.equal(null);
    });

    assertBackWorksDuringLoading(10);
    cy.reload();
    cy.wait('@enterpriseTenantNode');
    advanceToTourStep(1, 7, 10);
    assertSharedStepBackSequence();
  });

  it('marks demo_tour true after the enterprise tour completes', () => {
    interceptDocumentationAvailability(false);
    cy.intercept('POST', '**/api/update/current/user', (req) => {
      req.reply({ statusCode: 200, body: { message: 'updated' } });
    }).as('updateCurrentUser');

    loginAsUser(enterpriseUser.username, enterpriseUser.password);
    cy.wait('@enterpriseTenantNode');
    assertTourStep(1, 9, 'Global Threat Search');
    cy.get('[data-testid="sidebar-documentation"]').should('not.exist');
    advanceToFinalTourStep([], 9).then(visitedTitles => {
      expect(visitedTitles).not.to.include('Documentation');
      cy.get('[data-testid="demo-tour-next"]').should('be.visible').and('not.be.disabled').click();
    });

    cy.wait('@updateCurrentUser').then(({ request }) => {
      expect(request.body.demo_tour).to.eq(true);
      expect(request.body.username).to.eq(enterpriseUser.username);
    });
    cy.get('[data-testid="demo-tour-tooltip"]').should('not.exist');
  });
});

describe('Orion Intelligence - Dismiss Result Flow', () => {
  const stealerLogTestEmail = 'superman0011@twitter.example';
  let dismissResultUser = {} as ManagedUser;

  before(() => {
    cy.env(['DISMISS_RESULT_USER']).then(({DISMISS_RESULT_USER}) => {
      dismissResultUser = (DISMISS_RESULT_USER || {}) as ManagedUser;
      if (!dismissResultUser.username) {
        throw new Error('Missing DISMISS_RESULT_USER in cypress.config.ts');
      }
    });
  });

  const searchStealerLogsFor = (email: string) => {
    openSidebarGroup('Stealer logs');
    waitForSearchReady();
    cy.get('input[name="searchQuery"][placeholder="Search..."]').first().as('q');
    cy.get('@q').should('be.visible').and('not.be.disabled');
    typeInputSlow('@q', email);
    cy.get('[data-testid="ioc-stealer-table"]').scrollIntoView().should('be.visible');
  };

  const dismissFirstVisibleResult = () => {
    cy.get('[data-testid="ioc-stealer-row"]').first().scrollIntoView().click();
    cy.get('[data-testid="ioc-stealer-dismiss"]').first().should('be.visible').click();
    cy.get('[data-testid="confirmation-popup"]').should('be.visible');
    cy.get('[data-testid="confirmation-yes-button"]').click();
    cy.get('[data-testid="confirmation-popup"]').should('not.exist');
  };

  after(() => {
    cy.logout();
  });

  it('dismisses a stealer log result as admin and reveals it via the hide-dismissed toggle', () => {
    cy.loginAsAdmin();
    searchStealerLogsFor(stealerLogTestEmail);

    cy.get('[data-testid="ioc-hide-dismissed-toggle"]').should('have.attr', 'aria-pressed', 'false');
    cy.get('[data-testid="ioc-stealer-row"]').should('have.length.greaterThan', 0);

    cy.get('[data-testid="ioc-stealer-row"]').then(($rows) => {
      const initialCount = $rows.length;

      dismissFirstVisibleResult();
      cy.get('[data-testid="ioc-stealer-row"]').should('have.length', initialCount - 1);

      cy.get('[data-testid="ioc-hide-dismissed-toggle"]').click();
      cy.get('[data-testid="ioc-hide-dismissed-toggle"]').should('have.attr', 'aria-pressed', 'true');
      cy.get('[data-testid="ioc-stealer-row"]').should('have.length', initialCount);
      cy.get('[data-testid="ioc-stealer-dismissed"]').should('have.length.greaterThan', 0);
    });

    cy.logout();
  });

  it('creates an Enterprise user with the Dismiss Result permission', () => {
    cy.loginAsAdmin();
    cy.visit('/dashboard/profile/users');
    cy.get('[data-testid="tenant-add-user-button"]').should('be.visible');
    addUser(dismissResultUser);
    setPasswordResetRequired(dismissResultUser.username, false);
    cy.logout();
  });

  it('lets the Dismiss Result user reveal and undismiss the result', () => {
    loginAsUser(dismissResultUser.username, dismissResultUser.password);
    searchStealerLogsFor(stealerLogTestEmail);

    cy.get('[data-testid="ioc-hide-dismissed-toggle"]').should('have.attr', 'aria-pressed', 'false');
    cy.get('[data-testid="ioc-stealer-row"]').should('not.exist');

    cy.get('[data-testid="ioc-hide-dismissed-toggle"]').click();
    cy.get('[data-testid="ioc-hide-dismissed-toggle"]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="ioc-stealer-row"]').should('have.length.greaterThan', 0);
    cy.get('[data-testid="ioc-stealer-dismissed"]').should('have.length.greaterThan', 0);

    cy.get('[data-testid="ioc-stealer-dismissed"]').first().click();
    cy.get('[data-testid="ioc-stealer-dismissed"]').should('not.exist');

    cy.logout();
  });
});

describe('Orion Intelligence - User Management Deletion Flow', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('deletes configured test users', () => {
    cy.env(['TEST_USERS']).then(({TEST_USERS}) => {
      const usernames = Object.keys(TEST_USERS || {})
        .filter((key) => /^testing\d+$/.test(key) && key !== 'testing3' && key !== 'testing4' && key !== 'testing5' && key !== 'testing6' && key !== 'testing7')
        .map((key) => TEST_USERS[key]?.username)
        .filter(Boolean);

      deleteUsersByUsername(usernames);
    });
    cy.logout();
  });
});
