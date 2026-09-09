![Build](https://github.com/Orion-Intelligence/Orion-Intelligence/actions/workflows/build.yml/badge.svg?branch=trusted-main)
![Tests](https://github.com/Orion-Intelligence/Orion-Intelligence/actions/workflows/test.yml/badge.svg?branch=trusted-main)
[![Web App](https://img.shields.io/uptimerobot/status/m802042352-33d9c489257791a41a505a06?label=web%20app&logo=googlechrome)](https://stats.uptimerobot.com/xV0BS3KMq7)
[![Docs](https://img.shields.io/uptimerobot/status/m802042420-50c04caf485479764330029b?label=docs&logo=readthedocs)](https://stats.uptimerobot.com/xV0BS3KMq7)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/54342c0b3ffd4ae2ad9bcf701b2500f7)](https://app.codacy.com/gh/Orion-Intelligence/Orion-Intelligence/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![CodeQL Analysis](https://github.com/Orion-Intelligence/Orion-Intelligence/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/Orion-Intelligence/Orion-Intelligence/actions/workflows/github-code-scanning/codeql)
[![MDN HTTP Observatory](https://img.shields.io/badge/observatory-A%2B-brightgreen)](https://developer.mozilla.org/en-US/observatory/analyze?host=try.orionintelligence.org)
[![Security Headers](https://img.shields.io/badge/security%20headers-A%2B-brightgreen)](https://securityheaders.com/?q=https%3A%2F%2Ftry.orionintelligence.org%2F&followRedirects=on)
[![SSLLabs](https://img.shields.io/static/v1?label=SSLLabs&message=A%2B&color=brightgreen)](https://www.ssllabs.com/ssltest/analyze.html?d=try.orionintelligence.org&latest)
[![PageSpeed Insights](https://img.shields.io/badge/PageSpeed%20Insights-100%25-brightgreen)](https://pagespeed.web.dev/analysis/https-orion-genesistechnologies-org/hfe5h3u485?form_factor=desktop)
[![Lighthouse Performance](https://img.shields.io/badge/Lighthouse%20Performance-Run%20Artifacts-blue)](https://github.com/Orion-Intelligence/Orion-Intelligence/actions/workflows/build.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/54342c0b3ffd4ae2ad9bcf701b2500f7)](https://app.codacy.com/gh/Orion-Intelligence/Orion-Intelligence/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)

# Orion Platform

<p align="left" aria-label="Orion project resources">
  <a href="https://orion-search.readthedocs.io" title="Read the Orion documentation"><img src="docs/_static/readme-documentation.svg" alt="Read the Orion documentation" width="232" height="38"></a>
  &nbsp;
  <a href="https://uptime.orionintelligence.org/status/orion-intelligence" title="View Orion service health"><img src="docs/_static/readme-status.svg" alt="View Orion live service health" width="232" height="38"></a>
</p>

Orion Platform is a comprehensive, web-based solution that combines the functionality of a browser, search engine, crawler, and data aggregation tools to empower OSINT (Open Source Intelligence) experts. Built on top of Docker, Orion provides a user-friendly interface to explore, search, and visualize data extracted by its powerful Orion Crawler.

<p align="center">
  <img src="https://github.com/user-attachments/assets/4266afc8-1d52-41ac-a2fe-b445e1b6b848" alt="CYBERATTACK HITS FRENCH INTERIOR(3)" width="1200">
</p>

The platform integrates seamlessly with machine learning models, enhancing search relevance and enabling advanced
content analysis. Orion supports a broad range of functionalities, including the ability to search, filter, and
visualize data across multiple categories, making it an invaluable tool for data exploration and intelligence
gathering.<br>

Designed with flexibility and scalability in mind, Orion enables OSINT experts to feed data directly into the platform,
ensuring up-to-date and comprehensive datasets. Whether for investigative research, competitive analysis, or general
information gathering, Orion provides a unified ecosystem that enhances the workflow of professionals who rely on
actionable insights.<br>
<br>

## Quick Start

### Prerequisites

- Git and a Bash-compatible shell.
- Docker Engine with Docker Compose v2 (`docker compose`).
- A Node.js version matching `^20.19.0`, `^22.12.0`, or `>=24.0.0`, with npm.
- OpenSSL and `rsync`, used by the local build script.

<details>
<summary><strong>Install and configure</strong> · build and run Orion locally</summary>

<br>

```bash
git clone https://github.com/Orion-Intelligence/Orion-Intelligence.git
cd Orion-Intelligence
cp template-env .env
```

Open `.env` and replace every placeholder credential before starting the platform. Generate independent application
keys with:

```bash
openssl rand -hex 32
openssl rand -base64 32 | tr '+/' '-_'
```

Use the first value for `JWT_SECRET_KEY` and the second for `ENCRYPTION_KEY`. The `.env` file is ignored by Git and must
never be committed.

### Build and start

```bash
chmod +x run.sh
./run.sh build -d
```

After the services become healthy, open [http://127.0.0.1:8080](http://127.0.0.1:8080). Local HTTPS is also available
at `https://127.0.0.1:8443` with a generated self-signed certificate.

For later starts or shutdowns:

```bash
./run.sh
./run.sh stop
```

For additional build modes, testing workflows, production deployment, and configuration details, see the
[developer documentation](docs/app_docs/developer_documentation.md) or the complete
[Orion documentation](https://orion-search.readthedocs.io).

</details>

## Platform Preview

The Orion homepage provides a search-first investigation workspace with summary panels, recent findings, and
visual pivots that help analysts move quickly from overview to deeper investigation.

<p align="center">
  <a href="docs/screenshots/homepage-overview-20260326.png">
    <img src="docs/screenshots/homepage-overview-20260326.png" alt="Orion homepage overview" width="1200">
  </a>
  <br>
  <sub><strong>Homepage Overview</strong> · Search, intelligence summaries, activity, and geographic context</sub>
</p>

<details>
  <summary><strong>Screenshot Gallery</strong> · Browse 43 platform screens</summary>
  <br>
  <table width="100%">
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/account-settings-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/account-settings-20260326.png" alt="Account Settings" width="100%"></a><br><sub>Account Settings</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/apk-scan-report-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/apk-scan-report-20260326.png" alt="APK Scan Report" width="100%"></a><br><sub>APK Scan Report</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/audit-logs-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/audit-logs-20260326.png" alt="Audit Logs" width="100%"></a><br><sub>Audit Logs</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/consolidated-insights-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/consolidated-insights-20260326.png" alt="Consolidated Insights" width="100%"></a><br><sub>Consolidated Insights</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/consolidated-results-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/consolidated-results-20260326.png" alt="Consolidated Results" width="100%"></a><br><sub>Consolidated Results</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/cti-context-menu-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/cti-context-menu-20260326.png" alt="CTI Context Menu" width="100%"></a><br><sub>CTI Context Menu</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/cti-export-modal-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/cti-export-modal-20260326.png" alt="CTI Export Modal" width="100%"></a><br><sub>CTI Export Modal</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/cti-graph-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/cti-graph-20260326.png" alt="CTI Graph" width="100%"></a><br><sub>CTI Graph</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/data-breach-tracking-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/data-breach-tracking-20260326.png" alt="Data Breach Tracking" width="100%"></a><br><sub>Data Breach Tracking</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/defacement-report-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/defacement-report-20260326.png" alt="Defacement Report" width="100%"></a><br><sub>Defacement Report</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/directory-monitoring-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/directory-monitoring-20260326.png" alt="Directory Monitoring" width="100%"></a><br><sub>Directory Monitoring</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/entity-api-email-breach-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/entity-api-email-breach-20260326.png" alt="Entity API Email Breach" width="100%"></a><br><sub>Entity API Email Breach</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/exploit-results-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/exploit-results-20260326.png" alt="Exploit Results" width="100%"></a><br><sub>Exploit Results</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/feed-report-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/feed-report-20260326.png" alt="Feed Report" width="100%"></a><br><sub>Feed Report</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/file-scanner-report-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/file-scanner-report-20260326.png" alt="File Scanner Report" width="100%"></a><br><sub>File Scanner Report</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/general-intelligence-results-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/general-intelligence-results-20260326.png" alt="General Intelligence Results" width="100%"></a><br><sub>General Intelligence Results</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/heatmap-report-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/heatmap-report-20260326.png" alt="Heatmap Report" width="100%"></a><br><sub>Heatmap Report</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/homepage-overview-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/homepage-overview-20260326.png" alt="Homepage Overview" width="100%"></a><br><sub>Homepage Overview</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/homepage-searchbar-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/homepage-searchbar-20260326.png" alt="Homepage Searchbar" width="100%"></a><br><sub>Homepage Searchbar</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/login-page-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/login-page-20260326.png" alt="Login Page" width="100%"></a><br><sub>Login Page</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/network-intel-geo-modal-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/network-intel-geo-modal-20260326.png" alt="Network Intel Geo Modal" width="100%"></a><br><sub>Network Intel Geo Modal</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/network-intel-host-recon-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/network-intel-host-recon-20260326.png" alt="Network Intel Host Recon" width="100%"></a><br><sub>Network Intel Host Recon</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/network-intel-ip-scan-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/network-intel-ip-scan-20260326.png" alt="Network Intel IP Scan" width="100%"></a><br><sub>Network Intel IP Scan</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/network-intel-vulnerability-scan-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/network-intel-vulnerability-scan-20260326.png" alt="Network Intel Vulnerability Scan" width="100%"></a><br><sub>Network Intel Vulnerability Scan</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/password-reset-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/password-reset-20260326.png" alt="Password Reset" width="100%"></a><br><sub>Password Reset</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/report-chatbot-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/report-chatbot-20260326.png" alt="Report Chatbot" width="100%"></a><br><sub>Report Chatbot</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/report-json-viewer-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/report-json-viewer-20260326.png" alt="Report JSON Viewer" width="100%"></a><br><sub>Report JSON Viewer</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/search-filters-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/search-filters-20260326.png" alt="Search Filters" width="100%"></a><br><sub>Search Filters</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-intel-list-view-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-intel-list-view-20260326.png" alt="Social Intel List View" width="100%"></a><br><sub>Social Intel List View</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-intel-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-intel-20260326.png" alt="Social Intel" width="100%"></a><br><sub>Social Intel</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-manage-profiles-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-manage-profiles-20260326.png" alt="Social Manage Profiles" width="100%"></a><br><sub>Social Manage Profiles</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-metadata-results-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-metadata-results-20260326.png" alt="Social Metadata Results" width="100%"></a><br><sub>Social Metadata Results</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-report-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-report-20260326.png" alt="Social Report" width="100%"></a><br><sub>Social Report</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-summary-popup-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/social-summary-popup-20260326.png" alt="Social Summary Popup" width="100%"></a><br><sub>Social Summary Popup</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/stealer-logs-results-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/stealer-logs-results-20260326.png" alt="Stealer Logs Results" width="100%"></a><br><sub>Stealer Logs Results</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/support-modal-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/support-modal-20260326.png" alt="Support Modal" width="100%"></a><br><sub>Support Modal</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/system-settings-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/system-settings-20260326.png" alt="System Settings" width="100%"></a><br><sub>System Settings</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/tenant-administration-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/tenant-administration-20260326.png" alt="Tenant Administration" width="100%"></a><br><sub>Tenant Administration</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/tenant-homepage-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/tenant-homepage-20260326.png" alt="Tenant Homepage" width="100%"></a><br><sub>Tenant Homepage</sub></td>
    </tr>
    <tr>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/tenant-manage-iocs-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/tenant-manage-iocs-20260326.png" alt="Tenant Manage IOCs" width="100%"></a><br><sub>Tenant Manage IOCs</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/tenant-settings-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/tenant-settings-20260326.png" alt="Tenant Settings" width="100%"></a><br><sub>Tenant Settings</sub></td>
      <td width="33.33%" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/tenant-users-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/tenant-users-20260326.png" alt="Tenant Users" width="100%"></a><br><sub>Tenant Users</sub></td>
    </tr>
    <tr>
      <td colspan="3" align="center" valign="top"><a href="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/web-scan-report-20260326.png"><img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/web-scan-report-20260326.png" alt="Web Scan Report" width="33.33%"></a><br><sub>Web Scan Report</sub></td>
    </tr>
  </table>
</details>

## Core Capabilities

Orion is built as an operational intelligence environment rather than a single search page. Its capabilities span the
complete path from collection to analyst action.

- Collect and ingest intelligence from multiple sources.
- Normalize collected data and enrich it with investigation-ready context.
- Index and retrieve large investigative datasets through purpose-built search services.
- Search, filter, correlate, visualize, and review intelligence in one analyst environment.
- Extend the ecosystem as new collection sources and investigative needs emerge.

## Who It's For

Orion is intended for OSINT analysts, research teams, cyber threat investigators, and platform operators who need a
unified environment for collection, search, enrichment, correlation, and review workflows.

## Project Status and Support

<table width="100%" cellspacing="0" cellpadding="8">
  <thead>
    <tr>
      <th width="23%" align="left" valign="bottom" scope="col">Area</th>
      <th width="77%" align="left" valign="bottom" scope="col">Current position</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top"><strong>Development status</strong></td>
      <td valign="top"><sub>Actively developed on the <code>trusted-main</code> branch.</sub></td>
    </tr>
    <tr>
      <td valign="top"><strong>Supported deployment</strong></td>
      <td valign="top"><sub>Docker Compose for local and development environments, with a dedicated production Compose configuration.</sub></td>
    </tr>
    <tr>
      <td valign="top"><strong>Release policy</strong></td>
      <td valign="top"><sub>Versioned Git tags identify release snapshots. <code>trusted-main</code> contains current development, and releases follow validation rather than a fixed public cadence.</sub></td>
    </tr>
    <tr>
      <td valign="top"><strong>Documentation</strong></td>
      <td valign="top"><sub>Use the <a href="https://orion-search.readthedocs.io">Orion documentation</a> for platform usage, configuration, and API guidance.</sub></td>
    </tr>
    <tr>
      <td valign="top"><strong>Bugs and feature requests</strong></td>
      <td valign="top"><sub>Use <a href="https://github.com/Orion-Intelligence/Orion-Intelligence/issues">GitHub Issues</a> for reproducible bugs and feature proposals that contain no sensitive information.</sub></td>
    </tr>
    <tr>
      <td valign="top"><strong>Operational help</strong></td>
      <td valign="top"><sub>Use the in-platform <strong>Help &amp; Support</strong> workflow or the <a href="https://www.orionintelligence.org/collaboration">collaboration page</a> for non-security questions.</sub></td>
    </tr>
    <tr>
      <td valign="top"><strong>Security reports</strong></td>
      <td valign="top"><sub>Follow the <a href="SECURITY.md">Security Policy</a> and report vulnerabilities privately.</sub></td>
    </tr>
  </tbody>
</table>

## Orion Ecosystem

The Orion ecosystem is composed of connected repositories and services that support the full intelligence lifecycle.
Individual modules focus on collection, storage, supporting services, the analyst experience, browser-assisted
acquisition, and specialized social-data workflows.

### Architecture Overview

Orion follows a clear path from source collection to analyst action:

<p align="center">
  <img src="docs/_static/readme-architecture-flow.svg" alt="Orion architecture flow: collect, enrich, index, serve, investigate, and feed new intelligence priorities back into collection" width="1200">
</p>

## Modules

<sub>The five primary modules are shown first. Expand the additional modules to view the rest of the ecosystem.</sub>

<table width="100%" cellspacing="0" cellpadding="8">
  <thead>
    <tr>
      <th width="23%" align="left" valign="bottom" scope="col">Module</th>
      <th width="42%" align="left" valign="bottom" scope="col">Role in the ecosystem</th>
      <th width="35%" align="left" valign="bottom" scope="col">Core technologies</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th colspan="3" align="left" scope="rowgroup"><strong>Analyst experience and project access</strong></th>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Intelligence"><strong>Orion Platform</strong></a><br><sub>PUBLIC REPOSITORY</sub></td>
      <td valign="top"><sub>Unified analyst workspace for search, investigation, correlation, visualization, cases, alerts, and administration.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-Angular-DD0031?style=flat-square&amp;logo=angular&amp;logoColor=white" alt="Angular"> <img src="https://img.shields.io/badge/-FastAPI-009688?style=flat-square&amp;logo=fastapi&amp;logoColor=white" alt="FastAPI"> <img src="https://img.shields.io/badge/-Elasticsearch-005571?style=flat-square&amp;logo=elasticsearch&amp;logoColor=white" alt="Elasticsearch"> <img src="https://img.shields.io/badge/-MongoDB-47A248?style=flat-square&amp;logo=mongodb&amp;logoColor=white" alt="MongoDB"> <img src="https://img.shields.io/badge/-Docker-2496ED?style=flat-square&amp;logo=docker&amp;logoColor=white" alt="Docker"></td>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Intelligence-Landing"><strong>Orion Landing</strong></a><br><sub>ECOSYSTEM SERVICE</sub></td>
      <td valign="top"><sub>Public-facing product site for capability discovery, project orientation, and access to the Orion ecosystem.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-React-61DAFB?style=flat-square&amp;logo=react&amp;logoColor=black" alt="React"> <img src="https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="TypeScript"> <img src="https://img.shields.io/badge/-Vite-646CFF?style=flat-square&amp;logo=vite&amp;logoColor=white" alt="Vite"> <img src="https://img.shields.io/badge/-Tailwind_CSS-06B6D4?style=flat-square&amp;logo=tailwindcss&amp;logoColor=white" alt="Tailwind CSS"></td>
    </tr>
    <tr>
      <th colspan="3" align="left" scope="rowgroup"><strong>Investigation, collection, and enrichment</strong></th>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Dark-Nexus"><strong>Orion Dark Nexus</strong></a><br><sub>ECOSYSTEM SERVICE</sub></td>
      <td valign="top"><sub>AI-assisted investigation, chat orchestration, tool integration, and secure workspace management.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-Python-3776AB?style=flat-square&amp;logo=python&amp;logoColor=white" alt="Python"> <img src="https://img.shields.io/badge/-FastAPI-009688?style=flat-square&amp;logo=fastapi&amp;logoColor=white" alt="FastAPI"> <img src="https://img.shields.io/badge/-LangGraph-1C3C3C?style=flat-square&amp;logo=langchain&amp;logoColor=white" alt="LangGraph"> <img src="https://img.shields.io/badge/-MCP-5A45FF?style=flat-square" alt="Model Context Protocol"> <img src="https://img.shields.io/badge/-Ollama-000000?style=flat-square&amp;logo=ollama&amp;logoColor=white" alt="Ollama"></td>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Crawler"><strong>Orion Crawler</strong></a><br><sub>ECOSYSTEM SERVICE</sub></td>
      <td valign="top"><sub>Scheduled crawling across hidden-web and monitored sources, with distributed task execution and private-network routing.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-Python-3776AB?style=flat-square&amp;logo=python&amp;logoColor=white" alt="Python"> <img src="https://img.shields.io/badge/-Celery-37814A?style=flat-square&amp;logo=celery&amp;logoColor=white" alt="Celery"> <img src="https://img.shields.io/badge/-Playwright-2EAD33?style=flat-square&amp;logo=playwright&amp;logoColor=white" alt="Playwright"> <img src="https://img.shields.io/badge/-Redis-DC382D?style=flat-square&amp;logo=redis&amp;logoColor=white" alt="Redis"> <img src="https://img.shields.io/badge/-Tor-7D4698?style=flat-square&amp;logo=torproject&amp;logoColor=white" alt="Tor"></td>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Collector"><strong>Orion Collector</strong></a><br><sub>ECOSYSTEM SERVICE</sub></td>
      <td valign="top"><sub>Extensible source-collection framework for targeted acquisition and custom ingestion workflows.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-Python-3776AB?style=flat-square&amp;logo=python&amp;logoColor=white" alt="Python"> <img src="https://img.shields.io/badge/-Playwright-2EAD33?style=flat-square&amp;logo=playwright&amp;logoColor=white" alt="Playwright"> <img src="https://img.shields.io/badge/-Beautiful_Soup-59666C?style=flat-square" alt="Beautiful Soup"> <img src="https://img.shields.io/badge/-Redis-DC382D?style=flat-square&amp;logo=redis&amp;logoColor=white" alt="Redis"></td>
    </tr>
  </tbody>
</table>

<details>
  <summary><strong>Show 6 more modules</strong> · Social, Browser, Micros, Sandbox, Leaks, and Tor2Web</summary>
  <br>
  <table width="100%" cellspacing="0" cellpadding="8">
    <thead>
      <tr>
        <th width="23%" align="left" valign="bottom" scope="col">Module</th>
        <th width="42%" align="left" valign="bottom" scope="col">Role in the ecosystem</th>
        <th width="35%" align="left" valign="bottom" scope="col">Core technologies</th>
      </tr>
    </thead>
    <tbody>
    <tr>
      <th colspan="3" align="left" scope="rowgroup"><strong>Collection and enrichment</strong></th>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Social"><strong>Orion Social</strong></a><br><sub>ECOSYSTEM SERVICE</sub></td>
      <td valign="top"><sub>Social-intelligence collection and enrichment service with browser automation and isolated Tor-assisted crawling.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-Python-3776AB?style=flat-square&amp;logo=python&amp;logoColor=white" alt="Python"> <img src="https://img.shields.io/badge/-Playwright-2EAD33?style=flat-square&amp;logo=playwright&amp;logoColor=white" alt="Playwright"> <img src="https://img.shields.io/badge/-Redis-DC382D?style=flat-square&amp;logo=redis&amp;logoColor=white" alt="Redis"> <img src="https://img.shields.io/badge/-Tor-7D4698?style=flat-square&amp;logo=torproject&amp;logoColor=white" alt="Tor"> <img src="https://img.shields.io/badge/-Docker-2496ED?style=flat-square&amp;logo=docker&amp;logoColor=white" alt="Docker"></td>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Browser"><strong>Orion Browser</strong></a><br><sub>ECOSYSTEM SERVICE</sub></td>
      <td valign="top"><sub>Private, browser-assisted acquisition workflows for mobile investigators.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-Kotlin-7F52FF?style=flat-square&amp;logo=kotlin&amp;logoColor=white" alt="Kotlin"> <img src="https://img.shields.io/badge/-Android-3DDC84?style=flat-square&amp;logo=android&amp;logoColor=white" alt="Android"> <img src="https://img.shields.io/badge/-GeckoView-FF7139?style=flat-square&amp;logo=firefoxbrowser&amp;logoColor=white" alt="GeckoView"> <img src="https://img.shields.io/badge/-Orbot-7D4698?style=flat-square&amp;logo=torproject&amp;logoColor=white" alt="Orbot"> <img src="https://img.shields.io/badge/-SQLCipher-003B57?style=flat-square&amp;logo=sqlite&amp;logoColor=white" alt="SQLCipher"></td>
    </tr>
    <tr>
      <th colspan="3" align="left" scope="rowgroup"><strong>Platform services and secure access</strong></th>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Micros"><strong>Orion Micros</strong></a><br><sub>ECOSYSTEM SERVICE</sub></td>
      <td valign="top"><sub>Shared analysis, validation, privacy, malware-scanning, and security-testing services.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-Python-3776AB?style=flat-square&amp;logo=python&amp;logoColor=white" alt="Python"> <img src="https://img.shields.io/badge/-FastAPI-009688?style=flat-square&amp;logo=fastapi&amp;logoColor=white" alt="FastAPI"> <img src="https://img.shields.io/badge/-Presidio-5E5E5E?style=flat-square&amp;logo=microsoft&amp;logoColor=white" alt="Microsoft Presidio"> <img src="https://img.shields.io/badge/-ClamAV-CC1F2F?style=flat-square" alt="ClamAV"> <img src="https://img.shields.io/badge/-OWASP_ZAP-00549E?style=flat-square&amp;logo=owasp&amp;logoColor=white" alt="OWASP ZAP"></td>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Sandbox"><strong>Orion Sandbox</strong></a><br><sub>ECOSYSTEM SERVICE</sub></td>
      <td valign="top"><sub>Isolated execution infrastructure for untrusted investigation and AI-workspace code.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-OpenSandbox-4B5563?style=flat-square" alt="OpenSandbox"> <img src="https://img.shields.io/badge/-Kata_Containers-2F81F7?style=flat-square" alt="Kata Containers"> <img src="https://img.shields.io/badge/-Docker-2496ED?style=flat-square&amp;logo=docker&amp;logoColor=white" alt="Docker"> <img src="https://img.shields.io/badge/-ClamAV-CC1F2F?style=flat-square" alt="ClamAV"></td>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Leaks"><strong>Orion Leaks</strong></a><br><sub>ECOSYSTEM SERVICE</sub></td>
      <td valign="top"><sub>Secure whistleblowing and report-intake portal based on the GlobaLeaks platform.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-GlobaLeaks-3333AB?style=flat-square" alt="GlobaLeaks"> <img src="https://img.shields.io/badge/-Python-3776AB?style=flat-square&amp;logo=python&amp;logoColor=white" alt="Python"> <img src="https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="TypeScript"> <img src="https://img.shields.io/badge/-Docker-2496ED?style=flat-square&amp;logo=docker&amp;logoColor=white" alt="Docker"></td>
    </tr>
    <tr>
      <td valign="top"><a href="https://github.com/Orion-Intelligence/Orion-Tor2Web"><strong>Orion Tor2Web</strong></a><br><sub>ECOSYSTEM SERVICE</sub></td>
      <td valign="top"><sub>Controlled Tor-to-web access layer for browser-compatible access to onion resources.</sub></td>
      <td valign="top"><img src="https://img.shields.io/badge/-Python-3776AB?style=flat-square&amp;logo=python&amp;logoColor=white" alt="Python"> <img src="https://img.shields.io/badge/-Twisted-2D5E8C?style=flat-square" alt="Twisted"> <img src="https://img.shields.io/badge/-NGINX-009639?style=flat-square&amp;logo=nginx&amp;logoColor=white" alt="NGINX"> <img src="https://img.shields.io/badge/-Tor-7D4698?style=flat-square&amp;logo=torproject&amp;logoColor=white" alt="Tor"></td>
    </tr>
  </tbody>
</table>
</details>

## Contribution

We welcome contributions to improve Orion Platform. If you'd like to contribute, please fork the repository and submit a
pull request.

### Steps to Contribute

1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a new Pull Request.

## License

Orion Platform is licensed under the [MIT License](LICENSE).

## Disclaimer

This project is intended for research purposes only. The authors of Orion Platform do not support or endorse illegal
activities, and users of this project are responsible for ensuring their actions comply with the law.

## Security

Please report suspected vulnerabilities privately according to the [Orion Security Policy](SECURITY.md). Do not open a
public issue for a security vulnerability.

## Project Links

Explore collaboration opportunities and platform documentation.

<p>
  <a href="https://www.orionintelligence.org/collaboration"><img src="docs/_static/readme-collaboration.svg" alt="Explore Orion collaboration" width="232" height="38"></a>
  &nbsp;
  <a href="https://orion-search.readthedocs.io/en/latest/app_docs/introduction_to_platform.html"><img src="docs/_static/readme-documentation.svg" alt="Read the Orion documentation" width="232" height="38"></a>
</p>
