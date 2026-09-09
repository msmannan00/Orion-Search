import { ThreatLensGeoUtils } from '../../src/app/pages/geo-fencing/threat-lens/map-utils/threat-lens-geo.utils';
import { ThreatLensIpMarkerRenderer } from '../../src/app/pages/geo-fencing/threat-lens/map-overlays/threat-lens-ip-marker.renderer';
import type { EsriGraphicsLayer, EsriSceneView, ThreatLensMapGraphic } from '../../src/app/pages/geo-fencing/threat-lens/models/threat-lens-map.types';

describe('Threat Lens IP candidate parsing', () => {
  it('maps geolocation candidates into renderable IP records', () => {
    const records = ThreatLensGeoUtils.extractThreatLensIpScanRecords({
      candidate_ip_locations: [{
        ip: '203.0.113.10',
        latitude: 20,
        longitude: 0,
        network: '203.0.113.0/24',
        accuracy_radius: 25,
        distance_km: 8.5,
      }],
    });

    expect(records).to.deep.equal([{
      ip: '203.0.113.10',
      lat: 20,
      lon: 0,
      network: '203.0.113.0/24',
      accuracyRadius: 25,
      distanceKm: 8.5,
    }]);
  });

  it('renders the scan circle and a detail-enabled IP marker', () => {
    const graphics: ThreatLensMapGraphic[] = [];
    const graphicsLayer = {
      removeAll: () => graphics.splice(0),
      add: (graphic: ThreatLensMapGraphic) => graphics.push(graphic),
      addMany: (items: ThreatLensMapGraphic[]) => graphics.push(...items),
      remove: (graphic: ThreatLensMapGraphic) => {
        const index = graphics.indexOf(graphic);
        if (index >= 0) {
          graphics.splice(index, 1);
        }
      },
      graphics: { toArray: () => graphics.slice() },
    } as unknown as EsriGraphicsLayer;
    const view = { zoom: 6, scale: 1_000_000 } as EsriSceneView;
    const renderer = new ThreatLensIpMarkerRenderer(view, graphicsLayer);

    expect(renderer.render([{
      ip: '203.0.113.10',
      lat: 20,
      lon: 0,
      network: '203.0.113.0/24',
      accuracyRadius: 25,
      distanceKm: 8.5,
    }], { lat: 20, lon: 0 }, 12000)).to.equal(true);

    const radius = graphics.find((graphic) => graphic.attributes?.role === 'ip-scan-radius');
    const marker = graphics.find((graphic) => graphic.attributes?.role === 'ip-scan-marker');
    expect(radius?.geometry?.rings?.[0]).to.have.length.greaterThan(0);
    expect(marker?.attributes).to.include({
      ip: '203.0.113.10',
      network: '203.0.113.0/24',
      accuracyRadius: 25,
      distanceKm: 8.5,
    });
    expect(renderer.isMarkerGraphic(marker)).to.equal(true);
  });
});

describe('Threat Lens IP scan polling', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  after(() => {
    cy.logout();
  });

  it('polls the tracked scan job instead of reposting the scan request', () => {
    let createCalls = 0;
    let pollCalls = 0;

    cy.intercept('POST', '**/api/threat/lens', {
      statusCode: 200,
      body: {},
    }).as('threatLensData');

    cy.intercept('POST', '**/api/netintel/iot_detect', (request) => {
      createCalls += 1;
      expect(request.body).to.deep.equal({
        coordinates: '20, 0',
        radius_km: 12000,
        max_ips: 500,
      });
      request.reply({
        status: 'pending',
        progress: 5,
        step: 'queued',
        scan_id: 'threat-lens-ip-scan',
        scan_title: 'Threat Lens IP Scan',
        scan_target: '20, 0',
        scan_status: 'running',
        scan_seen: false,
      });
    }).as('ipScanStarted');

    cy.intercept('POST', '**/api/scan-jobs/threat-lens-ip-scan/poll', (request) => {
      pollCalls += 1;
      request.reply({
        response: {
          status: 'done',
          progress: 100,
          step: 'done',
          result: {
            status: 'done',
            candidate_ip_locations: [{ ip: '203.0.113.10', latitude: 20, longitude: 0 }],
          },
        },
      });
    }).as('ipScanPolled');

    cy.visit('/dashboard/profile/consolidated/all?tab=Geo%20Fencing&view=threat');
    cy.get('[data-testid="threat-lens-page"]', { timeout: 120000 }).should('be.visible');
    cy.wait('@threatLensData');
    cy.wait('@ipScanStarted');
    cy.wait('@ipScanPolled');

    cy.contains('IP scan loading...').should('not.exist');
    cy.then(() => {
      expect(createCalls).to.equal(1);
      expect(pollCalls).to.be.greaterThan(0);
    });
  });

  it('reuses a completed automatic scan without opening the duplicate prompt', () => {
    cy.intercept('POST', '**/api/threat/lens', {
      statusCode: 200,
      body: {},
    });

    cy.intercept('POST', '**/api/netintel/iot_detect', {
      statusCode: 200,
      body: {
        requires_confirmation: true,
        message: 'A completed scan already exists.',
        source: 'previous_completed',
        previous_scan: {
          scan_id: 'previous-threat-lens-ip-scan',
          title: 'Threat Lens IP Scan',
          target: '20, 0',
          status: 'done',
        },
      },
    }).as('duplicateIpScan');

    cy.intercept('GET', '**/api/scan-jobs/previous-threat-lens-ip-scan', {
      statusCode: 200,
      body: {
        scan_id: 'previous-threat-lens-ip-scan',
        title: 'Threat Lens IP Scan',
        target: '20, 0',
        api_reference: '/api/netintel/iot_detect',
        status: 'done',
        payload: { coordinates: '20, 0', radius_km: 12000, max_ips: 500 },
        response: {
          status: 'done',
          progress: 100,
          step: 'done',
          result: {
            status: 'done',
            candidate_ip_locations: [{ ip: '203.0.113.11', latitude: 20, longitude: 0 }],
          },
        },
      },
    }).as('previousIpScan');

    cy.visit('/dashboard/profile/consolidated/all?tab=Geo%20Fencing&view=threat');
    cy.get('[data-testid="threat-lens-page"]', { timeout: 120000 }).should('be.visible');
    cy.wait('@duplicateIpScan');
    cy.wait('@previousIpScan');

    cy.contains('IP scan loading...').should('not.exist');
    cy.contains('Run New Scan').should('not.exist');
  });
});
