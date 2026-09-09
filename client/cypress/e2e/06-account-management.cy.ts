describe('Orion Intelligence - Account Settings and Password Reset Flow', () => {
    beforeEach(() => {
        cy.loginAsTest1();
    });

    after(() => {
        cy.visit("/");
    });

    it('changes account language away from English and back', () => {
        cy.visit('/dashboard/profile/account');
        cy.get('[data-testid="account-settings-form"]').should('be.visible');
        cy.get('[data-testid="account-settings-language-select"] select').scrollIntoView().should('be.visible');

        cy.intercept('POST', '**/api/update/current/user').as('accountLanguageUpdate');
        cy.get('[data-testid="account-settings-language-select"] select').select('fr').should('have.value', 'fr');
        cy.wait('@accountLanguageUpdate', { timeout: 60000 }).then(({request, response}) => {
            const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
            expect(body.preferences.language).to.eq('fr');
            expect(response?.statusCode).to.be.oneOf([200, 204]);
        });

        cy.get('[data-testid="account-settings-language-select"] select').select('en').should('have.value', 'en');
        cy.wait('@accountLanguageUpdate', { timeout: 60000 }).then(({request, response}) => {
            const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
            expect(body.preferences.language).to.eq('en');
            expect(response?.statusCode).to.be.oneOf([200, 204]);
        });
    });

    it('updates avatar/theme/2FA and validates reset password journey', () => {
        cy.env(['TEST_USERS', 'NEW_PASSWORD']).then(({TEST_USERS, NEW_PASSWORD}) => {
            const resolvedNewPassword = NEW_PASSWORD ?? '';

            cy.get('[data-testid="sidebar-group-profile"]').should('be.visible').click({scrollBehavior: false});
            cy.get('[data-testid="sidebar-subitem-profile-account"]').should('be.visible').click({scrollBehavior: false});
            cy.location('pathname').should('include', '/dashboard/profile/account');
            cy.get('[data-testid="account-settings-form"]').should('be.visible');
            cy.get('[data-testid="account-settings-title"]').should('be.visible');
            cy.docsScreenshot('account-settings');

            cy.get('[data-testid="account-settings-title"]').invoke('text').then((t) => {
                expect(t.trim()).to.match(/Admin Profile|User Profile Form/);
            });

            cy.get('app-user-image-picker').should('exist');

            cy.fixture('avatar.png', 'base64').then((content) => {
                cy.get('app-user-image-picker input[type="file"]').first().should('exist').invoke('removeAttr', 'hidden').invoke('css', 'display', 'block').invoke('css', 'visibility', 'visible').invoke('css', 'position', 'fixed').invoke('css', 'left', '0').invoke('css', 'top', '0').invoke('css', 'width', '1px').invoke('css', 'height', '1px').invoke('css', 'opacity', '1').selectFile({
                    contents: Cypress.Blob.base64StringToBlob(content, 'image/png'),
                    fileName: 'avatar.png',
                    mimeType: 'image/png',
                    lastModified: Date.now(),
                });
            });

            cy.intercept('POST', '**/api/update/current/user').as('accountThemeUpdate');
            cy.get('[data-testid="account-settings-theme-toggle"]').click();
            cy.wait('@accountThemeUpdate', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 204]);
            cy.get('[data-testid="account-settings-theme-toggle"]').wait(200).click();
            cy.wait('@accountThemeUpdate', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 204]);
            cy.intercept('POST', '**/api/update/current/user').as('accountSettingsUpdate');
            cy.get('[data-testid="account-settings-twofa-toggle"]').click();
            cy.get('[data-testid="password-confirmation-input"]').type(TEST_USERS.testing4.password, {log: false});
            cy.get('[data-testid="password-confirmation-submit"]').click();
            cy.wait('@accountSettingsUpdate', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 204]);
            cy.logout();

            cy.intercept({ method: 'POST', pathname: '**/api/token' }).as('twoFaLogin');
            cy.visitLoginWithCleanAuthState();
            cy.get('[data-testid="login-user"]').clear().type(TEST_USERS.testing4.username);
            cy.get('[data-testid="login-pass"]').clear().type(TEST_USERS.testing4.password, {log: false});
            cy.get('[data-testid="login-button"]').click();
            cy.wait('@twoFaLogin', { timeout: 60000 }).its('response.body.twofa_required').should('eq', true);
            cy.get('[data-testid="twofa-center"]').should('be.visible');
            cy.get('[data-testid="twofa-qr-code"]').should('exist');
            cy.get('input[name="otpCode"]').should('exist');
            cy.get('[data-testid="twofa-title"]').should('contain.text', 'Enter 2FA code');

            cy.visit('/');
            cy.clearAllEmails();
            cy.contains('[data-testid="reset-password-link"]', 'Recover account?').click();
            cy.get('[data-testid="reset-companymail"]').clear().type(TEST_USERS.testing3.email);
            cy.get('[data-testid="reset-submit"]').click();

            cy.get('body').then(($body) => {
                if ($body.text().includes('Password Reset Email Sent')) {
                    cy.contains('Password Reset Email Sent').should('be.visible');
                }

                cy.openLastMailAndGetUrl().then((url) => {
                    expect(url).to.be.a('string').and.have.length.greaterThan(0);
                    cy.visit(url);
                });
                cy.url().should('include', '/reset');
                cy.get('[data-testid="reset-password"]').clear().type(TEST_USERS.testing3.password, {log: false}).blur();
                cy.get('[data-testid="reset-confirm-password"]').clear().type(TEST_USERS.testing3.password, {log: false}).blur();
                cy.get('[data-testid="reset-submit"]').click();
                cy.contains('New password must be different from the old one.').should('be.visible');
                cy.get('[data-testid="reset-password"]').clear().type(resolvedNewPassword, {log: false}).blur();
                cy.get('[data-testid="reset-confirm-password"]').clear().type(resolvedNewPassword, {log: false}).blur();
                cy.get('[data-testid="reset-submit"]').click();
                cy.url().should('include', '/login');
                cy.intercept({ method: 'POST', pathname: '**/api/token' }).as('loginRequest');
                cy.get('[data-testid="login-user"]').clear().type(TEST_USERS.testing3.username);
                cy.get('[data-testid="login-pass"]').clear().type(resolvedNewPassword, {log: false});
                cy.get('[data-testid="login-button"]').click();
                cy.waitForLoginRequest();
                cy.get('[data-testid="profile-menu"], [data-testid="dashboard-main"], [data-testid="dashboard-container"]')
                    .filter(':visible')
                    .should('have.length.greaterThan', 0);
                cy.logout();
            });
        });
    });
});
