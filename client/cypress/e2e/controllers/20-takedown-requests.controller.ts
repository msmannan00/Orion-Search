type TakedownStatus = 'pending' | 'accepted';

type TakedownRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  target_url: string;
  target_domain: string;
  abuse_email: string;
  username: string;
  user_uuid: string;
  status: TakedownStatus;
  public_status: 'in_progress' | 'accepted';
  status_label: string;
  report_id: string;
};

const REPORT_HASH = 'cypress-takedown-report';
const REQUEST_ID = '64f0f0f0f0f0f0f0f0f0f001';

export const TAKEDOWN_FIXTURE = {
  reportUrl: `/dashboard/defacement/all/${REPORT_HASH}`,
  targetUrl: 'https://compromised-monitoring.example/takedown-test',
  targetDomain: 'compromised-monitoring.example',
  abuseEmail: 'abuse@compromised-monitoring.example',
  customMessage: 'Please prioritize this confirmed compromise.',
  username: 'admin',
};

export const takedownSelector = (testId: string) => `[data-testid="${testId}"]`;

let currentRecord: TakedownRecord | null = null;

function takedownRecord(status: TakedownStatus = 'pending'): TakedownRecord {
  const accepted = status === 'accepted';
  return {
    id: REQUEST_ID,
    created_at: '2026-07-13T08:00:00.000Z',
    updated_at: accepted ? '2026-07-13T08:05:00.000Z' : '2026-07-13T08:00:00.000Z',
    target_url: TAKEDOWN_FIXTURE.targetUrl,
    target_domain: TAKEDOWN_FIXTURE.targetDomain,
    abuse_email: TAKEDOWN_FIXTURE.abuseEmail,
    username: TAKEDOWN_FIXTURE.username,
    user_uuid: 'cypress-admin-user',
    status,
    public_status: accepted ? 'accepted' : 'in_progress',
    status_label: accepted ? 'Takedown reported' : 'Takedown in progress',
    report_id: REPORT_HASH,
  };
}

function reportBody() {
  const accepted = currentRecord?.status === 'accepted';
  return {
    m_hash: REPORT_HASH,
    m_url: TAKEDOWN_FIXTURE.targetUrl,
    m_title: 'Compromised monitoring report',
    m_date: '2026-07-13T08:00:00.000Z',
    m_attacker: 'Cypress Actor',
    m_team: 'Cypress Monitoring',
    m_web_server: 'nginx',
    m_source_url: TAKEDOWN_FIXTURE.targetUrl,
    m_ip: '203.0.113.42',
    m_location: 'Test Lab',
    m_content: 'Compromised monitoring report used by Cypress takedown flow.',
    m_section: ['Captured compromised monitoring evidence.'],
    ...(accepted ? {
      m_takedown_status: 'accepted',
      m_takedown_label: 'Takedown reported',
    } : {}),
  };
}

export function stubTakedownReportFlow() {
  currentRecord = null;

  void cy.intercept('GET', `**/api/search/defacement/${REPORT_HASH}*`, req => {
    req.reply({
      statusCode: 200,
      body: reportBody(),
    });
  }).as('loadTakedownReport');

  void cy.intercept('GET', '**/api/takedowns*', req => {
    const items = currentRecord ? [currentRecord] : [];
    req.reply({
      statusCode: 200,
      body: {
        items,
        page: 1,
        limit: 100,
        total: items.length,
      },
    });
  }).as('loadTakedowns');

  void cy.intercept('POST', '**/api/takedowns', req => {
    expect(req.body).to.deep.equal({
      report_id: REPORT_HASH,
      target_url: TAKEDOWN_FIXTURE.targetUrl,
      custom_message: TAKEDOWN_FIXTURE.customMessage,
    });
    currentRecord = takedownRecord();
    req.reply({
      statusCode: 200,
      body: {
        ...currentRecord,
        evidence: {
          custom_message: TAKEDOWN_FIXTURE.customMessage,
          result: {
            abuse_email_found: TAKEDOWN_FIXTURE.abuseEmail,
          },
        },
      },
    });
  }).as('createTakedown');

  void cy.intercept('POST', `**/api/takedowns/${REQUEST_ID}/accept`, req => {
    currentRecord = takedownRecord('accepted');
    req.reply({
      statusCode: 200,
      body: currentRecord,
    });
  }).as('acceptTakedown');
}

export function openCompromisedMonitoringReport() {
  void cy.visit(TAKEDOWN_FIXTURE.reportUrl);
  void cy.wait('@loadTakedownReport').its('response.statusCode').should('eq', 200);
  void cy.get(`a[href="${TAKEDOWN_FIXTURE.targetUrl}"]`).should('be.visible');
  void cy.contains(TAKEDOWN_FIXTURE.targetDomain).should('be.visible');
  void cy.contains('button', 'Initiate Takedown').should('be.visible');
}

export function initiateTakedownFromReport() {
  void cy.contains('button', 'Initiate Takedown').should('be.visible').and('not.be.disabled').click();
  void cy.get(takedownSelector('takedown-custom-message'))
    .should('be.visible')
    .and('have.value', '')
    .type(TAKEDOWN_FIXTURE.customMessage)
    .should('have.value', TAKEDOWN_FIXTURE.customMessage);
  void cy.get(takedownSelector('takedown-submit')).should('be.visible').and('not.be.disabled').click();
  void cy.wait('@createTakedown').its('response.statusCode').should('eq', 200);
  void cy.get(takedownSelector('takedown-action-modal')).should('contain.text', TAKEDOWN_FIXTURE.abuseEmail);
  void cy.get(takedownSelector('takedown-action-modal')).should('contain.text', 'Takedown in progress');
  void cy.contains(takedownSelector('takedown-action-modal') + ' button', 'Close').click();
  void cy.contains('button', 'Takedown in progress').should('be.visible');
}

export function openTakedownReviewList() {
  void cy.visit('/dashboard/profile/take-down');
  void cy.wait('@loadTakedowns').its('response.statusCode').should('eq', 200);
  void cy.get(takedownSelector('takedown-row')).should('have.length', 1);
  void cy.get(takedownSelector('takedown-row')).first().within(() => {
    void cy.contains(TAKEDOWN_FIXTURE.targetDomain).should('be.visible');
    void cy.contains(TAKEDOWN_FIXTURE.targetUrl).should('be.visible');
    void cy.contains(TAKEDOWN_FIXTURE.abuseEmail).should('be.visible');
    void cy.contains('Takedown in progress').should('be.visible');
  });
}

export function acceptTakedownFromList() {
  void cy.get(takedownSelector('takedown-row')).first().within(() => {
    void cy.get(takedownSelector('takedown-accept-button')).should('be.visible').and('not.be.disabled').click();
  });
  void cy.wait('@acceptTakedown').its('response.statusCode').should('eq', 200);
  void cy.get(takedownSelector('takedown-row')).first().within(() => {
    void cy.contains('Takedown reported').should('be.visible');
    void cy.contains('Closed').should('be.visible');
  });
}

export function assertReportShowsAcceptedTakedown() {
  void cy.visit(TAKEDOWN_FIXTURE.reportUrl);
  void cy.wait('@loadTakedownReport').its('response.statusCode').should('eq', 200);
  void cy.contains('button', 'Takedown reported').should('be.visible').and('be.disabled');
}
