describe('Network Intel - End-to-End Flow', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  const stubNetworkIntelApis = () => {
    cy.intercept('POST', '**/api/netintel/resolve_ip', {
      statusCode: 200,
      body: {
        status: 'done',
        result: {
          status: 'done',
          domain: 'example.com',
          ips: ['93.184.216.34'],
        },
      },
    }).as('resolveIp');

    cy.intercept('POST', '**/api/netintel/ipscanner', (req) => {
      const ip = req.body?.ip;

      if (ip === '8.8.8.8') {
        req.reply({
          statusCode: 200,
          body: {
            status: 'done',
            result: {
              status: 'done',
              ip: '8.8.8.8',
              country: 'United States',
              organization: 'Google',
              hosting_type: 'public-dns',
              open_ports: [53],
              ports: [
                {
                  port: 53,
                  protocol: 'udp',
                  service: 'dns',
                  state: 'open',
                  confidence: 0.95,
                  risk_flags: [],
                },
              ],
            },
          },
        });
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          status: 'done',
          result: {
            status: 'done',
            ip: ip || '93.184.216.34',
            country: 'United States',
            organization: 'Example Org',
            hosting_type: 'hosting',
            open_ports: [80, 443],
            ports: [
              {
                port: 80,
                protocol: 'tcp',
                service: 'http',
                state: 'open',
                confidence: 0.9,
                risk_flags: [],
              },
              {
                port: 443,
                protocol: 'tcp',
                service: 'https',
                state: 'open',
                confidence: 0.95,
                risk_flags: ['modern_tls'],
              },
            ],
          },
        },
      });
    }).as('ipScanner');

    cy.intercept('POST', '**/api/netintel/url_vulnerability_scan', {
      statusCode: 200,
      body: {
        status: 'done',
        result: {
          status: 'done',
          url: 'https://bbc.com',
          host: 'bbc.com',
          elapsed_seconds: 2,
          summary: {
            total: 1,
            critical: 0,
            high: 1,
            medium: 0,
            low: 0,
            info: 0,
          },
          findings: [
            {
              title: 'Missing Content-Security-Policy',
              severity: 'high',
              category: 'headers',
              description: 'The response does not define a Content Security Policy.',
              urls: ['https://bbc.com/', 'https://bbc.com/news'],
              evidence: 'content-security-policy: missing',
            },
          ],
        },
      },
    }).as('vulnerabilityScan');

  };

  it('runs host recon, ip scan, vulnerability scan, and exports reports from all three sections', () => {
    stubNetworkIntelApis();
    cy.visit('/dashboard/netint');
    cy.get('[data-testid="network-intel-tab-host-recon"]').should('be.visible');

    cy.window().then((win) => {
      cy.stub(win.URL, 'createObjectURL').callsFake(() => 'blob:network-intel-test').as('networkIntelExport');
    });

    cy.get('[data-testid="network-intel-tab-host-recon"]').click();
    cy.get('[data-testid="network-intel-search-input"]').clear().type('https://www.example.com/{enter}');
    cy.wait('@resolveIp').its('request.body').should('deep.equal', { domain: 'example.com' });
    cy.get('[data-testid="network-intel-dns-row-93.184.216.34"]').should('be.visible').click();
    cy.wait('@ipScanner').its('request.body').should('deep.equal', { ip: '93.184.216.34' });
    cy.get('[data-testid="network-intel-dns-detail-93.184.216.34"]').should('be.visible');
    cy.docsScreenshot('network-intel-host-recon');
    cy.get('[data-testid="network-intel-dns-row-93.184.216.34"]').should('be.visible').click();
    cy.get('[data-testid="network-intel-dns-detail-93.184.216.34"]').should('not.exist');

    cy.get('[data-testid="network-intel-download-report"]')
      .should('be.visible')
      .and('be.enabled')
      .click();

    cy.get('[data-testid="network-intel-tab-ip-scan"]').click();
    cy.get('[data-testid="network-intel-search-input"]').clear().type('https://8.8.8.8/{enter}');
    cy.wait('@ipScanner').its('request.body').should('deep.equal', { ip: '8.8.8.8' });
    cy.get('[data-testid="network-intel-ip-result"]').should('be.visible');
    cy.docsScreenshot('network-intel-ip-scan');

    cy.get('[data-testid="network-intel-download-report"]')
      .should('be.visible')
      .and('be.enabled')
      .click();

    cy.get('[data-testid="network-intel-tab-vulnerability-scan"]').click();
    cy.get('[data-testid="network-intel-search-input"]').clear().type('https://www.bbc.com/{enter}');
    cy.contains('[data-testid="network-intel-vulnerability-target"]', /^bbc\.com$/, { timeout: 60000 }).should('be.visible');
    cy.contains('[data-testid="network-intel-vulnerability-target"]', /^bbc\.com$/)
      .first()
      .closest('[data-testid="network-intel-vulnerability-row"]')
      .click();
    cy.get('[data-testid="confirmation-popup"]').should('not.exist');
    cy.get('[data-testid="network-intel-vulnerability-empty"]').should('contain.text', 'Nothing scanned yet');
    cy.contains('[data-testid="network-intel-vulnerability-target"]', /^bbc\.com$/)
      .first()
      .closest('[data-testid="network-intel-vulnerability-row"]')
      .click();
    cy.get('[data-testid="network-intel-vulnerability-empty"]').should('not.exist');
    cy.docsScreenshot('network-intel-vulnerability-depth-controls');
    cy.get('[data-testid="network-intel-vulnerability-depth-full"]').first().should('be.visible').click();
    cy.get('[data-testid="confirmation-popup"]').should('be.visible').and('contain.text', 'over an hour');
    cy.get('[data-testid="confirmation-warning-icon"]').should('be.visible');
    cy.get('[data-testid="confirmation-yes-button"]').click();
    cy.wait('@vulnerabilityScan').its('request.body').should('deep.equal', {
      domain: 'bbc.com',
      depth: 'full',
    });
    cy.get('[data-testid="network-intel-vulnerability-result"]', { timeout: 120000 }).should('be.visible');
    cy.contains('The response does not define a Content Security Policy.').should('be.visible');
    cy.get('[data-testid="network-intel-vulnerability-finding-details"]').should('not.exist');
    cy.get('[data-testid="network-intel-vulnerability-finding-toggle"]')
      .first()
      .should('have.attr', 'aria-expanded', 'false')
      .click()
      .should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-testid="network-intel-vulnerability-finding-details"]')
      .should('be.visible')
      .and('contain.text', 'Reference URLs')
      .and('contain.text', 'content-security-policy: missing');
    cy.get('[data-testid="network-intel-vulnerability-finding-toggle"]')
      .first()
      .click()
      .should('have.attr', 'aria-expanded', 'false');
    cy.get('[data-testid="network-intel-vulnerability-finding-details"]').should('not.exist');
    cy.docsScreenshot('network-intel-vulnerability-scan');

    cy.get('[data-testid="network-intel-download-report"]')
      .scrollIntoView()
      .should('be.visible')
      .and('be.enabled')
      .click();

    cy.get('@networkIntelExport').its('callCount').should('be.gte', 2);
  });

  it('covers the Geo IoT modal end to end with stable selectors only', () => {
    stubNetworkIntelApis();
    cy.intercept('POST', '**/api/netintel/iot_detect', (req) => {
      expect(req.body).to.deep.equal({
        coordinates: '31.48000, 74.17000',
        radius_km: 35,
        max_ips: 250,
      });

      req.reply({
        status: 'done',
        result: {
          status: 'done',
          domain: '31.48000, 74.17000',
          ips: ['1.1.1.1'],
          count: 1,
        },
      });
    }).as('geoIotScan');

    cy.visit('/dashboard/netint');
    cy.get('[data-testid="network-intel-tab-host-recon"]').should('be.visible');
    cy.get('[data-testid="network-intel-tab-geo-fencing"]').click();

    cy.get('[data-testid="network-intel-geo-search-trigger"]').click({ force: true });
    cy.get('[data-testid="network-intel-geo-modal"]').should('be.visible');
    cy.get('[data-testid="network-intel-geo-map"] svg path').should('have.length.greaterThan', 0);
    cy.docsScreenshot('network-intel-geo-modal');
    cy.get('[data-testid="network-intel-geo-close"]').click();
    cy.get('[data-testid="network-intel-geo-modal"]').should('not.exist');

    cy.get('[data-testid="network-intel-geo-search-trigger"]').click({ force: true });
    cy.get('[data-testid="network-intel-geo-modal"]').should('be.visible');
    cy.get('[data-testid="network-intel-geo-cancel"]').click();
    cy.get('[data-testid="network-intel-geo-modal"]').should('not.exist');

    cy.get('[data-testid="network-intel-geo-search-trigger"]').click({ force: true });
    cy.get('[data-testid="network-intel-geo-modal"]').should('be.visible');
    cy.get('[data-testid="network-intel-geo-mode-map"]').should('be.visible');
    cy.get('[data-testid="network-intel-geo-map"]').should('be.visible');
    cy.get('[data-testid="network-intel-geo-zoom-label"]')
      .should('be.visible')
      .invoke('text')
      .then((initialZoomLabel) => {
        cy.get('[data-testid="network-intel-geo-zoom-in"]').click();
        cy.get('[data-testid="network-intel-geo-zoom-label"]').should(($label) => {
          expect($label.text().trim()).not.to.equal(initialZoomLabel.trim());
        });
        cy.get('[data-testid="network-intel-geo-zoom-out"]').click();
        cy.get('[data-testid="network-intel-geo-zoom-label"]').should(($label) => {
          expect($label.text().trim()).to.equal(initialZoomLabel.trim());
        });
      });

    cy.get('[data-testid="network-intel-geo-mode-manual"]').click();
    cy.get('[data-testid="network-intel-geo-coordinates-input"]')
      .should('be.visible')
      .clear()
      .type('31.48000, 74.17000');

    cy.get('[data-testid="network-intel-geo-radius-input"]')
      .invoke('val', '30')
      .trigger('input')
      .trigger('change');
    cy.get('[data-testid="network-intel-geo-radius-increment"]').click();
    cy.get('[data-testid="network-intel-geo-radius-input"]').should('have.value', '35');

    cy.get('[data-testid="network-intel-geo-max-ips-input"]')
      .invoke('val', '300')
      .trigger('input')
      .trigger('change');
    cy.get('[data-testid="network-intel-geo-max-ips-decrement"]').click();
    cy.get('[data-testid="network-intel-geo-max-ips-input"]').should('have.value', '250');

    cy.get('[data-testid="network-intel-geo-start"]').click();
    cy.get('[data-testid="network-intel-geo-modal"]').should('not.exist');
    cy.get('[data-testid="network-intel-search-input"]').should('have.value', '31.48000, 74.17000');
  });
});
