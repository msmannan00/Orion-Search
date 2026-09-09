(user-manual)=

# User Manual

:::{admonition} Scope
:class: tip

This manual is written for the Orion web application as implemented in this repository. It covers the main user experience, search and investigation workflows, live lookup tools, graph views, tenant workflows, and administrative screens. Some features appear only for specific licenses, tenants, or roles.
:::

## About This Guide

Orion is an investigation and monitoring platform that combines indexed intelligence, live lookups, graph exploration, tenant workflows, and platform administration in one interface. Users typically work in one of four ways:

1. Enter the platform through login, signup, verification, onboarding, or shared links.
2. Search indexed data from the main dashboard.
3. Run a targeted lookup or scan against a domain, file, email, IP, username, or other entity.
4. Open a report view to inspect metadata, evidence, and relationships.
5. Manage tenant, user, alert, case, collection, and platform settings based on role permissions.

This document is organized around those tasks.

For concise, task-based instructions with navigation and troubleshooting, see the [Orion Help Manual](./help_manual.md).

```{contents}
:local:
:depth: 2
```

## Access and Entry Points

### Signup

Signup creates a new account request. The form validates username format, email format, and password requirements before submitting the registration.

The username must start with a letter and use the supported username pattern. If the value is invalid, Orion suggests a corrected format. Password input shows strength and requirement feedback before submission.

After a successful signup, the user is sent to the welcome flow. The account may still require administrator review, email verification, or tenant onboarding before full dashboard access.

### Login

The standard entry point is the login screen. Depending on deployment settings, users may also encounter:

- account onboarding
- welcome or notification screens
- password reset flows

Browser sign-in uses an encrypted, HTTP-only session cookie instead of storing the access token in browser local storage. In production, the cookie is also marked `Secure`, uses `SameSite=Lax`, and expires after 30 minutes. Session renewal and authenticated requests use the cookie automatically. Signing out invalidates the server session and removes the authentication cookie.

Unsuccessful login attempts are tracked against the entered email or username. The fifth consecutive failure temporarily pauses login for 1 minute, the next failure pauses it for 10 minutes, and later consecutive failures pause it for 30 minutes. The login screen reports how long to wait. A successful login clears the failure count, and an inactive failure history expires after 30 minutes.

```{figure} ../screenshots/login-page-20260326.png
:alt: Orion login page
:width: 100%

Login screen used for standard account access.
```

```{admonition} Role-aware experience
:class: note

The sidebar, available modules, and some actions are controlled by role, tenant state, and license assignment. Two users in the same deployment may not see the same menu.
```

### Password Reset

Select `Recover account?` on the login screen to open the recovery page. The page provides two separate tabs:

- `Reset password` sends a reset link to the registered email address.
- `Account recovery` verifies the registered email together with the user's global recovery key before sending the same type of reset link.

The standard reset flow supports two stages:

- requesting a reset link by email
- submitting a new password using a tokenized reset link

The request form validates the email format when submitted. Orion always displays the same success result for a well-formed request, whether or not the email is registered. This prevents the recovery screen from revealing which accounts exist.

Reset links expire after 20 minutes, are restricted to the correct tenant, and can be used only for an active account. The reset token is stored as a hash and is removed after a successful password change. The new-password form includes password-strength guidance and confirmation validation, and the new password cannot match the previous password.

If an administrator requires a password change, a successful login redirects the user to the same new-password screen before normal work continues. Completing the change clears the forced-reset requirement.

#### Recover With a Recovery Key

Use account recovery when you have the global recovery key generated from Account Settings:

1. Select `Recover account?` on the login screen.
2. Select the `Account recovery` tab.
3. Enter the registered email address.
4. Enter the complete 43-character recovery key.
5. Select `Recover account` and check the registered email for a reset link.
6. Open the link, choose a new password, confirm it, and submit the form.

The page validates email and recovery-key formats before submission. For correctly formatted input, Orion returns the same success screen even when the email or recovery key is incorrect. A reset email is sent only when both values match.

:::{admonition} Recovery key and 2FA setup key
:class: important

The global recovery key is different from the authenticator setup secret shown while configuring 2FA. Use the global recovery key on the Account Recovery tab. Keep both values private and store them outside the Orion browser session.
:::

```{figure} ../screenshots/password-reset-20260326.png
:alt: Password reset request page
:width: 100%

Password reset workflow entry point.
```

### Welcome and Email Verification

The welcome page appears after signup and after tokenized verification links. Without a token, it confirms that registration was submitted and tells the user to wait for administrator approval or email notification.

When opened with a verification token, the page verifies the token and reports one of the following states:

- verification successful
- expired verification link
- invalid verification link
- temporary verification failure

After a successful verification, users can continue to login or onboarding depending on account state.

### Tenant Onboarding

New tenant users may be routed through a multi-step onboarding flow before using the main dashboard. The onboarding wizard includes:

1. company information
2. IOC setup
3. confirmation

During onboarding, users can define monitored IOC values by category before entering the main application.

The tested tenant flow confirms that onboarding is part of a larger tenant lifecycle rather than a standalone form. Covered user-visible behavior includes:

- tenant signup and verification email delivery
- admin-side tenant review and verification changes
- enterprise-license assignment before first tenant login
- onboarding wizard completion
- IOC seeding during onboarding
- tenant sub-user creation immediately after onboarding

### Notifications and Subscription Screens

Notification screens are used for access-level messages such as trial expiration, subscription prompts, or deployment-specific access notices. The payment gateway screen displays trial or subscription messaging when payment or upgrade flow context is needed.

These screens do not expose investigation data. They explain why a user cannot continue directly into the requested workflow and provide a path back to the main application.

### Shared Links

Some workflows can produce share links that open outside the signed-in dashboard:

- shared case links open a scoped case view.
- shared chat links open a scoped AI/chat transcript.

Shared views are narrow by design. They expose only the material attached to that share link and do not grant broader dashboard access.

## Main Application Layout

After authentication, Orion opens inside the `dashboard` workspace.

```{figure} ../screenshots/homepage-overview-20260326.png
:alt: Orion homepage
:width: 100%

Orion dashboard landing view.
```

The main UI is centered around four areas:

- the left sidebar for navigation
- the global search and module toolbar
- the result or report workspace
- slide-out or inline filter panels

### Left Sidebar

The left sidebar is the primary navigation system. It groups features by investigation area and by operational purpose.

```{figure} ../screenshots/homepage-overview-20260326.png
:alt: Orion sidebar
:width: 100%

Expanded sidebar with major modules and support links.
```

The sidebar can include:

- user profile and account pages
- indexed search modules
- live scan and API modules
- graph tools
- support links such as `Onion Link`, `Links`, and `Documentation`

### Global Search Area

Most data-driven modules share the same search pattern:

- a search box
- optional advanced filtering
- optional search tools
- an optional right-side filter drawer

```{figure} ../screenshots/homepage-searchbar-20260326.png
:alt: Global search bar
:width: 100%

Search bar with search, advanced mode, and tools controls.
```

### Result Workspace

The result area changes by module, but commonly includes:

- a result count
- cards or row-based entries
- analytics summaries
- filters
- pagination
- empty, loading, and no-result states

## Global Search Workflow

The search bar is the main entry point for indexed investigation.

### Basic Search

In standard mode, users can enter a free-text query and submit it immediately. Orion then loads results for the current module context.

### Advanced Search Toggle

The `Advance` toggle enables the filter overlay below the search bar. When enabled, Orion exposes indexed filter controls that let users narrow the query more precisely.

### Tools Menu

The `Tools` section provides search behavior controls and, in some contexts, sorting options.

```{figure} ../screenshots/homepage-searchbar-20260326.png
:alt: Search type controls
:width: 100%

Search entry area with search mode and tools controls.
```

Available search modes in the main result workflow include:

- `Match Semantic`
- `Match any term (OR)`
- `Match individual terms (AND)`
- `Match full query`

These modes affect how broadly or narrowly Orion interprets the query.

### Search Filters

When advanced mode is enabled, users can add indexed filters to refine the result set.

```{figure} ../screenshots/search-filters-20260326.png
:alt: Search filters
:width: 100%

Filter controls for refining indexed search.
```

Across the application, filter panels typically support:

- dropdown selection
- text input
- date range input
- apply
- reset

### Selected Filter Bar

When entity filters, sidebar filters, or non-default search tools are active, Orion can display a selected-filter bar showing what is currently affecting the result set.

## Homepage

The homepage is the default overview for many users and acts as a search-first dashboard.

The homepage typically includes:

- the global search entry point
- high-level summaries
- statistics or insight cards
- general and leaked index summaries

For some privileged roles, the homepage also includes a draggable insight panel layered over the main search experience. Other users may instead see a simplified search-first landing view or a tenant-home style alert summary, depending on license assignment and whether the account belongs to a default tenant.

### Homepage Summary Areas

- `General Index`: broad indexed content gathered across supported sources.
- `Leaked Index`: sensitive, exposed, or higher-priority findings.
- `Recent or featured results`: direct pivots into current records.
- `Insight blocks`: charts and counts used for quick triage.

```{figure} ../screenshots/homepage-overview-20260326.png
:alt: Homepage dashboard
:width: 100%

Homepage overview with summary panels and search-first layout.
```

```{figure} ../screenshots/heatmap-report-20260326.png
:alt: Homepage heatmap country report
:width: 100%

Country-level heatmap report opened directly from the homepage world map.
```

The tested homepage workflow also includes:

- hovering countries to reveal tooltip state
- opening country-level report panels from the heatmap
- closing the report by close control and by overlay
- keeping homepage search and heatmap pivots available in the same workspace

## Analytics and Result Insights

Orion exposes analytics alongside search results to help analysts understand the composition of the returned dataset.

```{figure} ../screenshots/consolidated-insights-20260326.png
:alt: Keyword insights
:width: 100%

Keyword-level insight and result analysis.
```

```{figure} ../screenshots/consolidated-results-20260326.png
:alt: General result analytics
:width: 100%

Expanded result insight and breakdown panels.
```

Depending on module and query, analytics can summarize:

- keyword frequency
- category distribution
- result volume
- network or source distribution
- URL and title breakdowns

## Navigation Reference

The exact menu depends on license and permissions, but the Orion UI commonly exposes the following modules.

| Module | Primary purpose | Typical views |
| --- | --- | --- |
| Homepage | Entry point and overview | search, summaries, statistics |
| General Intelligence | Broad indexed intelligence search | All, General, Forums, News, Stolen, Drugs, Hacking, Marketplaces, Cryptocurrency, Leaks |
| Data Breach | Breach records, exposure checks, and leak references | All, Databases, Tracking |
| Compromise Monitoring | Website compromise and defacement monitoring | All, Hacked, Phishing, Databases |
| Social | Social and community-source intelligence | All, Telegram, Twitter, Mastodon, Pastebin, Forum, Reddit, Facebook, Instagram, LinkedIn, TikTok, YouTube |
| Exploit | Vulnerability and exploit intelligence | All, CVE, Tools, ZeroDay |
| Actors & Malware | APT actor and malware-family intelligence | All, APT, Malware, Compromised-Actors |
| Consolidated | Combined multi-source investigation | IOCs, Deep Search, Network Intel |
| News Feed | News-style intelligence stream | News, Tracking |
| Stealer Logs | Credential and IOC investigation | IOCs |
| Entity Lookup | Entity-based live lookups | Email Breach, Social Scanner, Wanted List, National Identity, Playstore Scanner, Software Scanner, File Scanner, Text Analysis, Crypto Scanner |
| Web Scans | Live web-target scanning | Basic Scan, Port Scan, Repository Scan, SEO Scan, APK Scan, scan reports |
| Network Intel | Domain, IP, and vulnerability recon | Host Recon, IP Scan, Vulnerability Scan with depth controls |
| Satellite Intel | Geo-fencing, satellite map, facilities, aircraft, and ship tracking | Satellite Map, Threat Lens, Imagery Analysis |
| Social Intel | Username and profile mapping | graph and list views |
| CTI Graph | Cyber relationship mapping | graph filters, Advanced Graph Builder, cluster, document, property pivots |
| Account Settings | Current-user profile, security, and preferences | profile image, theme, 2FA, password, recovery key, licenses |
| Public User Activity | Visible profile activity review | user profile, activity items, thread links |
| Tenant Homepage | Tenant alert and monitoring overview | risk cards, alert categories, export, scan actions |
| Manage IOCs | Tenant monitored-value management | IOC tabs, add, import, remove, clear |
| Monitoring | Operational monitoring container | Log Manager, Auditlog, Event Management |
| Event Management | SIEM-style event search | IOC-tagged search, date filter, event expansion |
| Log Manager | Admin operational log review | type/date filters, file delete, flush logs |
| Case Management | Investigation case tracking | filters, analytics, details, artifacts, integrity verification, tracking board, shares, PDF export |
| AI Workspace | In-app assistant workspace | Nexus chat, quick prompts, message actions, streaming controls, shared chat links where enabled |
| Feeder | Feed/source rule operations | rule management and ownership flows where enabled |
| Tenant Settings | Tenant identity and license summary | tenant image, contact data, license and quota summary |
| Users | Tenant user management | add, edit, license assignment, status, delete |
| Tenants | Cross-tenant administration | tenant status, quotas, licenses, alert settings |
| Audit Logs | Administrative history | user and tenant activity records |
| System Settings | Global platform configuration | branding, feature visibility, app metadata |
| Custom Alerts | Manual alert creation | alert type, title, source, URL, IOC |
| Links | Link directory and monitored references | directory listing |
| Onion Link | External onion access | external link |
| Whistle Blowing | External reporting portal | external link |
| Documentation | Published documentation | external docs |

The following supporting workflows are also part of the product even though they are not normal sidebar modules:

| Workflow | Where users encounter it | Purpose |
| --- | --- | --- |
| Signup | Public entry screen | account request creation with username, email, and password validation |
| Welcome and verification | Registration email and welcome screen | registration status and email verification result |
| Password reset | Reset request and emailed reset link | privacy-preserving reset request and tokenized password update |
| Account recovery | Recovery page opened from login | email and global recovery-key verification followed by an emailed reset link |
| Tenant onboarding | First-run tenant setup | tenant identity, monitored values, and initial configuration |
| Notification | Access, trial, and subscription notices | access-level, trial, or subscription message |
| Payment gateway notice | Trial, payment, or subscription state screen | trial/payment/subscription state notice |
| Case share | Shared case review link | public case review link |
| Chat share | Shared chat transcript link | public shared chat transcript link |
| Scan report | Scan notifications and scan-result links | reopened tracked scan result |
| Discussion workflow | Discussion-style result workflow | supported discussion, chat, and social result paths |
| Social mapper aliases | Social Intel navigation | alternate paths into Social Intel |

## Indexed Investigation Modules

### Consolidated

The consolidated view is Orion's combined investigation workspace. It is designed for users who want one query to drive multiple result channels instead of searching each module separately.

The consolidated workspace can expose three major tabs:

- `IOCs`
- `Deep Search`
- `Network Intel`

Depending on the query and license state, this view can combine:

- grouped indexed results
- stealer-log matches for qualifying queries such as emails or URLs
- embedded network or scan-style pivots

Use consolidated search for first-pass triage when you want breadth before moving into a dedicated module.

```{figure} ../screenshots/consolidated-results-20260326.png
:alt: Consolidated investigation results
:width: 100%

Combined result workflow used for broad first-pass triage.
```

### General Intelligence

General Intelligence is the primary broad-spectrum indexed search area. Use it when you want to search topics, entities, or keywords across multiple kinds of sources.

Subcategories:

- `All`
- `General`
- `Forums`
- `News`
- `Stolen`
- `Drugs`
- `Hacking`
- `Marketplaces`
- `Cryptocurrency`
- `Leaks`

```{figure} ../screenshots/general-intelligence-results-20260326.png
:alt: General intelligence results
:width: 100%

General Intelligence result workflow.
```

Typical use cases:

- surveying discussions around a topic
- reviewing leak mentions
- exploring dark-web marketplace activity
- scanning mixed-source intelligence for a keyword

### Data Breach

The Data Breach module is used for known breach data, identity exposure checks, leak references, and breach-related listings gathered from monitored sources.

Subcategories:

- `All`
- `Databases`
- `Tracking`

Use `Databases` when you want structured breach records. Use `Tracking` when checking whether a specific email or identity appears in known breach data. Use breach report fields and URL/link pivots when the key artifact is a leak URL, dump reference, or channel-style source mention.

```{figure} ../screenshots/data-breach-tracking-20260326.png
:alt: Email breach tracking
:width: 100%

Example of a breach tracking workflow.
```

### Compromise Monitoring

Compromise Monitoring tracks defacement-style website incidents where sites were altered, hijacked, cloned, or otherwise compromised. Backend routes and some report names still use the `defacement` term, but the current sidebar label is `Compromise Monitoring`.

Subcategories:

- `All`
- `Hacked`
- `Phishing`
- `Databases`

The detail view commonly exposes:

- target URL
- date saved
- attacker or defacer
- team name
- server or IOC context
- breach or source reference
- IP and location

```{figure} ../screenshots/defacement-report-20260326.png
:alt: Defacement report view
:width: 100%

Compromise Monitoring result detail with target and attacker context.
```

### Social

The Social module aggregates intelligence from social and community platforms.

Supported views:

- `All`
- `Telegram`
- `Twitter`
- `Mastodon`
- `Pastebin`
- `Forum`
- `Reddit`
- `Facebook`
- `Instagram`
- `LinkedIn`
- `TikTok`
- `YouTube`

Use this module for:

- early warning and chatter monitoring
- leak discovery
- discussion tracking
- platform-specific searches

```{figure} ../screenshots/social-report-20260326.png
:alt: Social or feed-style intelligence results
:width: 100%

Example of a stream-oriented social intelligence view.
```

#### Discussion Route

Discussion opens discussion-style chat and social result contexts. It uses the current result container and can open chat, social, general, leak, exploit, and compromise-monitoring reports.

Use the Social module for normal sidebar navigation. Use Discussion when a workflow routes through discussion-style result paths.

### Exploit

Exploit focuses on vulnerability and exploit-related intelligence.

Key views:

- `CVE`
- `Tools`
- `ZeroDay`

This module is useful when starting from:

- a known vulnerability ID
- a product or platform with public exploit coverage
- a threat report mentioning exploit tooling

The E2E workflow covers all tested exploit entry points:

- `All`
- `CVE`
- `Tools`
- `ZeroDay`

```{figure} ../screenshots/exploit-results-20260326.png
:alt: Exploit module results
:width: 100%

Exploit search workflow across the tested vulnerability and tooling views.
```

### Actors & Malware

Actors & Malware is the APT Intel workspace for actor and malware tracking. It is exposed as a licensed sidebar module when the user's license allows access.

Key views:

- `All`
- `APT`
- `Malware`
- `Compromised-Actors`

Use this module when starting from:

- an APT actor name or alias
- a malware family, signature, or reporter
- a country-linked threat actor question
- a need to compare actor and malware records in one search

Actor and malware results open into detail reports with the same report review, export, and pivot behavior used by other indexed investigation modules.

### News Feed

News Feed is the stream-oriented intelligence area for news-style content and current reporting. It is useful for users who want a curated readout without first building a structured query.

The tested feed workflow covers:

- opening the `News` feed view
- submitting a live query
- opening a report
- reviewing JSON-backed detail inside the report

```{figure} ../screenshots/feed-report-20260326.png
:alt: Feed report view
:width: 100%

Feed report workflow with structured detail and raw response inspection.
```

### Help & Support

The profile menu exposes a support workflow that is part of the tested navigation model.

Covered user-visible behavior includes:

- opening Help & Support from the profile menu
- filling email, subject, and message fields
- submitting the support request

```{figure} ../screenshots/support-modal-20260326.png
:alt: Help and support modal
:width: 100%

Support modal used for direct in-app support requests.
```

## Stealer Logs

Stealer Logs is a dedicated credential and IOC investigation workflow for infostealer-derived data.

### Search Modes

The stealer-log search bar supports two operating modes:

- `Basic`
- `Advanced`

### Basic Mode

Basic mode lets users search by a selected tag. Available tags include:

- `All`
- `Domain`
- `Email`
- `Credit Card`
- `IP`

Validation is applied to tag-specific inputs where needed.

### Advanced Filter Builder

Advanced mode exposes a row-based query builder that supports:

- `WHERE`
- `AND`
- `OR`

Each row combines:

- an operator
- a data tag
- a value

This is the preferred mode for precise hunting across large stealer datasets.

### Result Metrics

The Stealer Logs results page surfaces quick metrics such as:

- search elapsed time
- total results
- asset count
- aggregated count

### Supporting Actions

The toolbar can include:

- password scheme view
- domain or subdomain helper
- result download

The password-scheme helper is useful when you want to inspect likely password formats or schema patterns. The domain helper provides a fast pivot into related host or subdomain exploration without leaving the stealer-log workflow.

### Result Review

The results area is designed for:

- large record volumes
- structured credential review
- pagination
- ranked result handling

:::{admonition} Common use case
:class: note

Use Stealer Logs when you already have a domain, email, or IP and need to confirm whether it appears in infostealer-derived material.
:::

```{figure} ../screenshots/stealer-logs-results-20260326.png
:alt: Credential and stealer-log results
:width: 100%

Structured result review for credential-focused investigations.
```

## Live Lookup and Scan Modules

### Entity Lookup

Entity Lookup is used for targeted live lookups rather than passive indexed browsing. The sidebar label is `Entity Lookup`, and the module groups focused enrichment workflows in one place.

Available lookup types:

- `Email Breach`
- `Social Scanner`
- `Wanted List`
- `National Identity`
- `Playstore Scanner`
- `Software Scanner`
- `File Scanner`
- `Text Analysis`
- `Crypto Scanner`

```{figure} ../screenshots/entity-api-email-breach-20260326.png
:alt: Entity Lookup view
:width: 100%

Entity Lookup interface for live lookup workflows.
```

#### Common Entity Lookup Use Cases

- breach validation for a single email
- identity enrichment
- app and software lookups
- file analysis
- text analysis for spam or malicious URL detection
- crypto-address context

### Text Analysis

Text Analysis is part of Entity Lookup. It is used when the artifact is text rather than a file, domain, username, or IP address.

Use Text Analysis for:

- suspicious message bodies
- text that may contain malicious URLs
- spam or phishing-style content checks
- short copied snippets that do not justify a full file upload

The output depends on the configured analysis service, but the workflow follows the same scan-oriented pattern: provide the input, run the analysis, review the result, and use the result in a broader investigation if needed.

### File Scanner

File Scanner is the upload-based analysis area inside `Entity Lookup`.

#### Main Modes

The workflow supports two related use cases:

- file IOC extraction
- APK analysis

#### Supported Behavior

The File Scanner workflow includes:

- file-type validation
- size validation
- upload and processing progress
- grouped IOC output
- export and print for supported scan types

#### IOC Extraction Output

For file IOC extraction, Orion groups indicators into categories such as URLs, packages, permissions, tampering markers, and other extracted values based on the uploaded content.

```{figure} ../screenshots/file-scanner-report-20260326.png
:alt: File scanner result
:width: 100%

File-scanner workflow after upload and successful analysis.
```

### Web Scans

Web Scans is the live scanning area for web-facing targets. Depending on the selected scan, the workflow may run through Entity Lookup, Network Intel, or the scan report view used to reopen completed scan jobs.

#### Available Scan Types

- `Basic Scan`
- `Port Scan`
- `Repository Scan`
- `SEO Scan`
- `APK Scan`

#### Standard Workflow

The standard web-scan flow is:

1. enter a target domain or repository-style URL
2. run the scan
3. wait for loading-step progress
4. review the generated report
5. reopen the report from scan-job notifications if needed

#### Report Structure

The resulting report commonly includes:

- a security grade
- host and port
- TLS status
- scan metadata such as `Scanned On` and `Scanned By`
- categorized findings
- evidence or proof blocks
- download and print actions

#### Findings and Error States

Finding sections also show severity and confidence labels, so the report can be used for quick triage as well as export.

Scan failures are handled with retry guidance and error messaging.

```{figure} ../screenshots/web-scan-report-20260326.png
:alt: Web scan report
:width: 100%

Web scan report with security posture, findings, and metadata.
```

```{figure} ../screenshots/apk-scan-report-20260326.png
:alt: APK scan result
:width: 100%

APK scan workflow after file upload, analysis, and report generation.
```

### Tracked Scan Jobs

Long-running scan and lookup actions are tracked as scan jobs. This applies to several Entity Lookup, Web Scan, Network Intel, crypto, dynamic social, wanted-list, and national-identity workflows.

Scan jobs can appear in the left home menu and notification surfaces with states such as queued, running, done, or error. Users can reopen completed scan reports, resume incomplete jobs, and poll running jobs without starting the same scan from scratch.

User-visible scan job actions include:

- opening the completed scan report
- returning to an incomplete job
- polling a running job for fresh status
- marking a scan notification as seen
- deleting one completed scan notification
- clearing all completed scan notifications

Duplicate scan handling follows these rules:

- if an identical scan is already running, Orion reuses the existing running job
- if an identical scan completed in the last three days, Orion opens the previous result automatically
- if the last identical completed scan finished more than three days ago, Orion asks whether to use the previous result or run a new scan
- choosing to run a new scan sends the request with `force_new=true`

Notification controls allow terminal scan jobs to be marked seen, deleted individually, or cleared in bulk. Incomplete jobs are prioritized so users can continue active work before reviewing completed scans.

Scan reports open from notifications, result links, or completed scan workflows. Users normally do not need to type a direct address manually.

### Network Intel

Network Intel provides live recon workflows for domains and IPs.

Tabs:

- `Host Recon`
- `IP Scan`
- `Vulnerability Scan`

```{figure} ../screenshots/network-intel-host-recon-20260326.png
:alt: Network intelligence view
:width: 100%

Network Intel module for recon and vulnerability review.
```

#### Host Recon

Host Recon is used to resolve a domain into infrastructure and network information. It commonly surfaces DNS-style and IP-related context for the queried host.

#### IP Scan

IP Scan focuses on a specific IP and can expose service or infrastructure context derived from the target address.

```{figure} ../screenshots/network-intel-ip-scan-20260326.png
:alt: Network Intel IP scan
:width: 100%

IP-scan result view with service and infrastructure context for a resolved address.
```

#### Vulnerability Scan

Vulnerability Scan reviews security issues for a supplied target and includes:

- progress feedback
- elapsed time
- downloadable report output
- cancel support during scanning

After a target is resolved, the vulnerability view lists the primary domain and any discovered subdomains as selectable targets. Each target can be scanned with a depth level before opening the target result:

| Depth | Intended use | Tool coverage shown in the UI |
| --- | --- | --- |
| `Low` | fast first-pass review when the analyst needs quick signal | URL probes and heuristic checks |
| `Medium` | broader validation when the target needs passive security review | URL probes, heuristic checks, ZAP passive checks, and CVE lookup |
| `High` | deeper review when the analyst accepts a longer scan | URL probes, ZAP spider, heuristic checks, ZAP passive checks, and CVE lookup |

Changing the depth prompts the user to confirm the scan before the selected target is run. The selected depth is stored per target in the current view, so one target can be scanned at `Low` while another target is reviewed at `Medium` or `High`.

Completed vulnerability results can show severity summary cards, extracted response details, scanned URLs, request metadata, and individual findings. Findings may include title, category, risk, description, affected URL, reference URLs, and evidence snippets when those fields are returned by the scanner.

```{figure} ../screenshots/network-intel-vulnerability-scan-20260326.png
:alt: Network Intel vulnerability scan
:width: 100%

Vulnerability-scan result view with severity summary and findings.
```

#### Common Toolbar Features

The Network Intel toolbar can include:

- query input
- status indicators
- result count
- elapsed time
- download report
- cancel current run
- optional geo search support for relevant views

Geo support is especially relevant when working from host-oriented results and wanting to pivot from a location or coordinates into nearby IP discovery.

```{figure} ../screenshots/network-intel-geo-modal-20260326.png
:alt: Network Intel geo modal
:width: 100%

Geo-assisted pivot modal used from network results.
```

### Satellite Intel

Satellite Intel is Orion's geo-fencing map workspace for infrastructure, facilities, transportation tracking, and satellite imagery review. It combines a Leaflet map, indexed map entities, nearby facility discovery, live aircraft and ship overlays, and comparison imagery in one operational view.

Satellite Intel can be opened from the sidebar as `Satellite Intel`. It is also embedded inside the consolidated results `Geo Fencing` tab, where the top toolbar can switch between `Satellite Map` and `Threat Lens`.

```{figure} ../screenshots/satellite-map-overview-20260326.png
:alt: Satellite Map overview
:width: 100%

Satellite Map overview with indexed map entities, facility filters, search, tracking controls, selection state, and the map renderer.
```

#### Access and Licensing

The sidebar entry is available to admins and users with the `osint_advanced` module. If the module is unavailable, the sidebar entry remains gated by the subscription prompt.

Satellite Intel can be opened from the Geo Fencing sidebar entry or from consolidated geo-fencing flows.

The embedded view exposes the `Satellite Map` and `Threat Lens` toggle. The map view keeps its own panel menu, layer switcher, facility dashboard, imagery-analysis panel, location modal, and tracking overlays.

#### Map Renderer and Layers

The map renderer uses Leaflet. The `Street` layer uses the Carto Voyager tile set, while the `Satellite` layer uses ArcGIS World Imagery.

Map behavior includes:

- world-bounds limiting so the map does not wrap horizontally
- dynamic minimum zoom based on the rendered container
- map movement events that update the active viewport
- feature focusing from search results
- selected-location rendering after a geocode or coordinate lookup
- marker sizing refresh after zoom changes
- sidebars for aircraft and ship details

```{figure} ../screenshots/satellite-map-satellite-layer-20260326.png
:alt: Satellite Map satellite imagery layer
:width: 100%

Satellite imagery layer selected from the map layer control.
```

#### Indexed Map Entities

On load, the dashboard requests indexed map entities and converts them into map features with name, type, source, coordinates, optional capacity, and a stable feature identifier.

The dashboard can show power and infrastructure facility categories, including:

- hydro
- solar
- wind
- gas
- coal
- oil
- nuclear
- geothermal
- biomass
- waste
- storage
- cogeneration
- petcoke
- wave and tidal
- airport
- port
- warehouse
- industrial
- military
- other

The `All Facilities` panel shows loaded and visible counts. Users can select all categories, clear all categories, or toggle individual categories to control which indexed points render on the map.

#### Search and Selection

The dashboard search box filters loaded map entities and nearby facilities. Selecting a result focuses the map on that feature and updates the `Selection` panel.

The selection panel can show:

- facility or entity name
- normalized type
- source, such as `WRI` or `OSM`
- capacity in megawatts when available
- coordinates in latitude and longitude form

#### Location Search and Nearby Facilities

The `Location` button opens the shared geocode modal. Users can search for a place, enter coordinates, adjust the map coverage delta, and apply the location to the Satellite Map.

```{figure} ../screenshots/satellite-map-location-modal-20260326.png
:alt: Satellite Map location modal
:width: 100%

Location modal used to scope Satellite Map facilities and tracking overlays.
```

After a location is applied, Satellite Intel:

- focuses the map on the selected coordinates
- records the active viewport
- loads nearby facilities for the selected viewport
- refreshes enabled aircraft and ship tracking against the scoped viewport
- enables the location-target control so the user can return to the selected location

Nearby facilities are normalized into the same map-feature shape used by indexed entities. Point, line, polygon, and multipolygon geometries are converted into renderable coordinates. Facility kinds are normalized into Orion map categories such as airport, port, warehouse, industrial, military, solar, wind, hydro, coal, gas, oil, storage, and other.

```{figure} ../screenshots/satellite-map-location-facilities-20260326.png
:alt: Satellite Map nearby facilities
:width: 100%

Nearby facilities loaded for a selected location, with facility counts and category breakdowns.
```

#### Aircraft and Ship Tracking

The `Tracking` panel controls live transportation overlays.

Aircraft tracking uses the active map bounds and can include OpenSky credentials when configured.

Ship tracking uses the active map bounds. Bounds are clamped to valid latitude and longitude ranges, and the request can include an AISStream API key when configured.

Tracking behavior includes:

- separate toggles for `Aircraft` and `Ships`
- loading indicators per tracking source
- visible counts in the tracking buttons
- matching aircraft and ship counts in the facilities summary
- marker rendering on the map
- detail sidebars when a tracking marker is selected
- aircraft detail lookup by ICAO
- aircraft track lookup
- ship detail lookup by MMSI
- viewport refreshes for ships after the map moves

If a tracking feed is pending or busy, the polling helper keeps waiting. If a feed returns an error, the dashboard shows the tracking-specific error while preserving the rest of the map context.

```{figure} ../screenshots/satellite-map-tracking-20260326.png
:alt: Satellite Map aircraft and ship tracking
:width: 100%

Aircraft and ship tracking enabled with counts shown in the dashboard panels.
```

#### Imagery Analysis

The panel menu opens `Imagery Analysis`. This view is used for satellite image comparison and anomaly review at a selected location.

The imagery workflow supports:

- selecting or reusing a location
- choosing an image type from the advanced controls
- choosing a timeline date
- resetting the date to the default
- loading a comparison set
- opening generated images in a lightbox

When `Load comparison` is clicked, the view runs a combined comparison flow. If no explicit month is selected, Orion can also request a year-ago image for comparison. Anomaly analysis runs against the selected imagery set.

The result panel can show:

- number of comparison images loaded
- image labels for each returned month
- anomaly alert level
- NDVI delta score
- scan coordinates
- month count for the anomaly scan
- empty-image and failed-request states

```{figure} ../screenshots/satellite-map-imagery-analysis-20260326.png
:alt: Satellite Map imagery analysis
:width: 100%

Imagery Analysis panel with comparison output and anomaly summary for the selected map location.
```

#### Empty and Error States

Satellite Intel keeps map and dashboard state visible while individual data sources load or fail.

Common states include:

- the main loading overlay while large map or entity requests are in progress
- `Select location to load facilities` before nearby facility lookup
- `Loading facilities...` while a facility request is running
- `No facilities found` when a scoped lookup returns no renderable records
- request-failed messaging in Imagery Analysis
- aircraft and ship feed warnings beside the affected tracking control

Clearing the selected location resets the focused feature, selected feature, nearby facilities, tracking data, and location overlay while keeping the base indexed map entities available.

### Geo Fencing Threat Lens

Threat Lens is the geo-fencing threat-intelligence workspace. It turns consolidated threat records into a country-oriented map, overlays category relationships as arcs, and runs an IP exposure scan for the active map scope.

Threat Lens can be opened directly from the dashboard sidebar as `Threat Lens`. It is also available inside Satellite Intel as the `Threat Lens` tab, where it shares the geo-fencing map workspace without showing the standalone filter button.

```{figure} ../screenshots/threat-lens-overview-20260326.png
:alt: Threat Lens overview
:width: 100%

Threat Lens overview with map, country ranking, category layers, live feed, archive, and IP scan status.
```

#### Access and Licensing

The sidebar entry is available to admins and users with the `osint_advanced` module. When the module is not available, the sidebar item remains visible but gated by the subscription prompt.

Threat Lens can be opened as its own geo-fencing workspace or from the Satellite Intel tab switcher.

#### Data Request and Filtering

Threat Lens requests consolidated map, feed, and category data based on the currently selected dashboard filters.

Before the request is sent, empty values, default values, empty arrays, and `all` selections are removed. The keyword field `q` and page field are kept so that an empty search can still load the complete Threat Lens dataset.

The standalone filter drawer uses the Threat Lens filter model:

- network type
- date range
- content type
- platform
- platform result count

Changing filters refreshes the Threat Lens search. In the embedded Satellite Intel tab, the parent geo-fencing shell controls the surrounding map toolbar and opens the same filter behavior from its side panel.

```{figure} ../screenshots/threat-lens-filters-20260326.png
:alt: Threat Lens filters
:width: 100%

Threat Lens filter drawer for network, date, content, platform, and platform-count filtering.
```

#### Consolidated Category Coverage

The implementation reads these consolidated result categories:

- `Leak`
- `Tracking`
- `News`
- `Exploit`
- `Defacement`
- `Chat`
- `Social`
- `Generic`

Each category has its own map color. Result records are deduplicated by hash, document id, id, URL, title, and creation date. If those fields are missing, the raw document body is used as the fallback identity.

Country labels are extracted from the available country and location fields, including `m_country`, `m_country_name`, `m_location`, `country`, and `location`. Comma, semicolon, and pipe-separated values are split into individual countries. Two and three letter region codes are normalized through browser region display names when possible.

The map data builder then produces:

- total result count
- ranked country counts
- per-category country counts
- document country groups used for arc generation
- feed items sorted by timestamp

#### Search Panel

The search panel supports free-text keyword searches and country pivots.

Search actions:

- type a keyword and press `Enter`
- type a keyword and click `Search`
- click a top highlighted country

When the keyword matches a country known by the map layer, Threat Lens converts the search into a country-filtered request. In that case it sends an entity filter for `m_country`, enables strict matching, disables full search, and focuses the country on the map. For other keywords, the value is sent as `q`.

```{figure} ../screenshots/threat-lens-search-20260326.png
:alt: Threat Lens search
:width: 100%

Threat Lens keyword search with active keyword state and refreshed country/category context.
```

#### Map, Countries, and Arcs

The map renderer uses ArcGIS SceneView with a global dark basemap. It loads a country feature layer, highlight styling, tooltip handling, arc graphics layers, and IP marker layers.

The country layer provides the selectable geographic surface. Hovering a country shows the country name, total count, and category breakdown. Clicking a country selects it, focuses the map on the country geometry, updates the summary panel, and starts a country-scoped IP exposure scan when boundary data is available.

Threat arcs are generated from records that mention more than one country. The renderer builds animated connections between country pairs, groups them by category color, and rotates visible arcs in batches of up to five. When a country search is active, the map shows only arc connections linked to the selected country.

The renderer also watches zoom and interaction state:

- close zoom switches to a street-oriented night basemap
- map movement pauses arc animation while interacting
- completed navigation can request a new viewport IP scan
- resize handling keeps the scene stable inside dashboard layouts

Documentation capture can use a fallback map state so screenshots remain stable while preserving the same visible panel flow.

#### Summary Panel

The summary panel reports the active Threat Lens state:

- selected country, when one is selected
- current status message
- visible arc count
- per-category selected-country breakdown
- IP scan status, scope, range, and marker count

Both the search panel and summary panel can be collapsed to clear map space.

#### News Feed and Archive

Threat Lens converts result documents into feed cards. Each card can include title, summary, source link, date, category label, category color, and up to four highlights such as platform, risk, channel, attacker, IOC, CVE, or content type.

There are two feed panels:

- `News Feed` shows only `News` category records
- `Archive` shows leak, tracking, exploit, defacement, chat, social, and generic records

Feed controls:

- collapse or expand each feed
- local text search inside the loaded feed records
- range filtering for `1 Day`, `1 Week`, and `All Time`
- auto-scroll while the pointer is away
- temporary pause during hover, wheel, or touch interaction
- safe link opening for HTTP and HTTPS source URLs

The feed range buttons filter data already loaded into the browser. The side filter date range requests refreshed data for the selected time window.

```{figure} ../screenshots/threat-lens-feeds-20260326.png
:alt: Threat Lens feeds
:width: 100%

Threat Lens feed panels with local archive search and feed range filtering.
```

#### IP Exposure Scan Overlay

Threat Lens automatically uses the Network Intel geo scanner to look for exposed IP-backed camera or IoT records near the active map scope.

Default behavior:

- initial coordinates are `20, 0`
- default radius is `12,000 km`
- default max IP count is `200`
- the summary label is `Global view`

Viewport and country behavior:

- map movement can request a viewport-based scan
- country selection changes the scope to the selected country
- country boundary data is passed to marker rendering when available
- repeated scans with the same scope, center, and radius are deduplicated

The scan posts coordinates, radius, and max-IP count through the Network Intel geo-camera scan flow. Completed results are normalized from returned IP arrays or camera arrays, limited to renderable records, and displayed as map markers. Selecting an IP marker opens the Threat Lens IP detail popup.

The IP scan panel shows:

- running, ready, complete, or error state
- marker count
- scope label
- radius label
- progress/status text
- previous markers kept when a later scan returns no renderable records

#### Empty and Error States

If the Threat Lens data request fails, the map is cleared and the status message explains that the data source could not be loaded. If records load but no country metadata is present, the workspace reports the loaded record count and explains that no country highlights were found.

If records contain countries but no multi-country co-occurrence, the country ranking still appears while the arc count remains zero.

If an IP exposure scan fails, the IP scan panel changes to the error state and preserves the map context.

## Graph Investigation Modules

### CTI Graph

CTI Graph is the relationship-mapping module for cyber threat intelligence pivots.

It opens in its own tabbed workspace and supports multiple sessions.

Key concepts:

- `Cluster` nodes
- `Document` nodes
- `Property` nodes
- grouped nodes
- directional connections

#### Core CTI Features

- session tabs
- sidebar filters
- graph and list views
- node search and highlighting
- physics toggle
- expand or collapse controls
- right-side listings panel
- import and export support
- report export

The listings panel provides a document-oriented summary of the current graph state, while the legend explains node and edge types.

```{figure} ../screenshots/cti-graph-20260326.png
:alt: CTI graph workspace
:width: 100%

CTI graph workspace with filter controls, graph canvas, listings, and session actions.
```

#### Advanced Graph Builder

The Advanced Graph Builder is used when a single CTI filter is too broad. It opens from the CTI Graph advanced filter control and lets the analyst combine multiple graph fields in one search.

The builder supports:

- up to eight filter rows
- searchable field selection
- `AND` and `OR` joins after the first row
- direct text values for property-style fields
- searchable cluster values for cluster-style fields
- removing individual rows
- clearing the active builder chips after execution

The first row acts as the initial condition. Additional rows refine or broaden the graph query depending on the selected join operator. Use `AND` when all conditions should be present in the graph result, and use `OR` when any of the selected conditions should be enough to bring related nodes into the result.

Typical Advanced Graph Builder workflow:

1. Open `CTI Graph`.
2. Expand the advanced builder control.
3. Choose the first field, such as country, actor, IP, domain, cluster, or another available graph field.
4. Enter a value or choose a cluster value.
5. Add another row when the investigation needs a second condition.
6. Choose `AND` or `OR` for the new row.
7. Execute the search.
8. Review the generated filter chips and graph result.
9. Clear the builder chips when returning to a broader graph view.

The builder is useful for questions such as:

- show graph records tied to a country and a specific infrastructure value
- find relationships that match either of two indicators
- narrow a noisy graph to a cluster plus one supporting property
- prepare a cleaner graph before exporting JSON or a PDF report

The tested CTI workflow also confirms the following operator-visible actions:

- switching filter type to `Cluster`
- applying graph filters
- searching and highlighting matching nodes
- switching between graph and list views
- collapsing and reopening the listings panel
- toggling physics simulation
- opening the Advanced Graph Builder
- adding multiple builder rows
- joining builder rows with `OR`
- executing builder filters and clearing generated filter chips
- creating, renaming, importing, exporting, and closing sessions
- exporting report options such as JSON and graph PDF
- opening canvas context-menu actions

```{figure} ../screenshots/cti-export-modal-20260326.png
:alt: CTI export modal
:width: 100%

CTI export modal with tested report-export options such as JSON and graph PDF.
```

```{figure} ../screenshots/cti-context-menu-20260326.png
:alt: CTI context menu
:width: 100%

CTI graph context-menu actions opened directly from the graph canvas.
```

### Social Intel

Social Intel is a graph-based username and profile mapping workspace.

It is designed for operators who need to move from a single username, image, or related profile into a richer relationship map of platforms, related accounts, and extracted profile evidence.

#### Social Intel Layout

The workspace includes:

- a tab bar for multiple social-analysis sessions
- a collapsible left home menu for created scans and saved jobs
- a graph toolbar for search, mode switching, export, and scan actions
- a central graph canvas or list view
- modal workflows for profile management, metadata, aliases, and follower scans

This is not a single-screen graph. It is a multi-state workspace where the user can move among:

- graph view
- list view
- summary popups
- profile-management modals
- follower/following import popups
- metadata search results

#### Core Entry Points

Social Intel supports several starting paths:

- direct username scanning
- image-based and reverse image profile discovery
- manual custom-entity entry
- guided entity lookup submission from the add-entity modal
- reopening previously created scan jobs from the left home menu

This makes Social Intel useful for both:

- known-profile investigations
- unknown-profile discovery from an uploaded image

```{figure} ../screenshots/social-intel-20260326.png
:alt: Social Intel workspace
:width: 100%

Social Intel graph workspace used for username and relationship mapping.
```

#### Graph and List Views

The graph view is intended for structural relationship analysis. The list view is intended for profile-by-profile inspection and management.

Common view actions include:

- switching between graph and list views
- searching within the graph toolbar
- clearing graph search input
- enabling or disabling graph physics where available
- opening relationship popups directly from graph nodes
- opening list rows to review platform-specific detail

Use graph view when you want to understand how entities connect. Use list view when you want a more structured review of profiles, links, summaries, and platform records.

The graph is a view of the Social Intel dashboard rather than a separate page. The round diagram button beside the gear switches between the profile list and the graph, and lights up while the graph is shown. Everything around it — scan history, scan box, breadcrumb — stays in place.

In graph view:

- clicking a scan in the left history adds that user's node instead of opening the profile
- the `Find a username in this graph...` box lists only users already in the graph, and offers `Add @handle` for one that is not
- each account node carries badges for the relationship sets found on it, such as `Followers` and `Commenters`
- right-clicking an unscanned contact offers `Scan @handle`, which starts a normal scan and refreshes the graph when it finishes
- removing a user is done from its own node panel

The set of users in the graph is saved per account, so reopening Social Intel restores the same relationship picture.

```{figure} ../screenshots/social-relationship-graph-20260326.png
:alt: Social Intel relationship graph view
:width: 100%

Relationship graph view showing a scanned account, its platform node, and follower and commenter badges.
```

#### Session Management

Social Intel supports multiple sessions in the same way the CTI workspace supports multiple investigative tabs.

Covered session actions include:

- creating a new session
- renaming a session
- exporting a social report from the current session

Sessions are useful when you want to separate different investigations, keep one graph focused on one target, or compare multiple usernames without overwriting the previous workspace.

#### Add-Entity Workflow

The add-entity modal supports more than one submission mode.

Available tested behavior includes:

- opening an entity type such as `Phone`
- using an API query mode
- validating that the submit button stays disabled until a valid input is present
- switching from API mode to manual mode
- entering a manual value
- submitting the new entity into the social workspace

This matters because Social Intel is not limited to scraped social accounts. It can also be used to place analyst-defined entities into the investigative graph.

#### Image-Based Profile Discovery

The image-based workflow is one of the more advanced Social Intel paths.

It supports:

- uploading an image
- waiting for image recon processing
- opening the manage-profiles modal
- filtering candidate platforms
- reviewing discovered usernames
- opening direct profile links for discovered accounts
- fetching the selected profile into the workspace
- reopening completed profile jobs from the left home menu
- selecting multiple discovered profiles and updating the graph with them

Use this workflow when a screenshot, avatar, or reused profile image is the starting point instead of a known handle.

#### Manage Profiles Modal

The manage-profiles modal is the main control surface for discovered or queued profile candidates.

From this modal, users can:

- filter platforms
- search usernames
- review discovered profile links
- fetch profile data
- select all fetched profiles
- update the graph with the selected profiles
- cancel without applying changes

This modal is central to the Social Intel workflow and should be treated as part of the main graph system, not as a secondary helper.

Profile detail panels can expose platform-specific sections for profile search results, posts, videos, shorts, followers, following, images, online presence, metadata, wanted-list context, forum profile matches, saved profile candidates, and stealer-log matches. Availability depends on the platform and on which data was found for the selected username.

Use the profile detail panels to move from broad identity mapping into source-by-source review. Posts, videos, and shorts help review published content; followers and following show relationship context; images and online presence help validate whether the same identity appears elsewhere; stealer-log and wanted-list sections highlight risk context that may require a case or tenant alert follow-up.

```{figure} ../screenshots/social-manage-profiles-20260326.png
:alt: Social Intel manage profiles modal
:width: 100%

Manage-profiles modal used to filter, inspect, fetch, and push discovered accounts into the graph.
```

```{figure} ../screenshots/social-intel-list-view-20260326.png
:alt: Social Intel list view
:width: 100%

Social Intel list-view mode for profile-by-profile review after graph ingestion.
```

#### Browser Extension and Captured Sessions

Profile fetching runs through the Orion browser extension, so the profile tabs stay gated until the extension is installed and signed in. When it is missing, Social Intel and the Manage Profiles page show an install prompt: Firefox installs the signed build in one click, while the Chrome package is downloaded and loaded manually from `chrome://extensions` with Developer mode on.

```{figure} ../screenshots/social-extension-install-20260326.png
:alt: Orion extension install prompt
:width: 100%

Install prompt shown while the Orion extension is not available to the browser.
```

The Manage Profiles page lists every supported platform with the number of sessions saved for it. From here users can fetch a session for a platform, and expand a platform to verify, re-capture, or delete an individual saved session.

```{figure} ../screenshots/social-manage-profiles-page-20260326.png
:alt: Manage Profiles captured sessions
:width: 100%

Manage Profiles page listing supported platforms and their captured session counts.
```

#### Summary Popup and Metadata Search

The summary popup provides deeper profile inspection beyond the main graph or list node.

Supported summary actions include:

- opening the summary popup from a list entry
- reviewing all detected platforms for the selected subject
- opening `Profile Metadata Results`
- entering metadata search tokens
- validating no-token error states
- running metadata searches with terms such as leaked email or other keywords
- reviewing returned external links
- pivoting into a selected platform from within the popup
- reopening external profile links

This popup is where profile-level enrichment becomes operationally useful. It combines raw profile context with searchable metadata and quick pivots.

```{figure} ../screenshots/social-summary-popup-20260326.png
:alt: Social Intel summary popup
:width: 100%

Summary popup used for platform review, enrichment actions, and detailed subject inspection.
```

```{figure} ../screenshots/social-metadata-results-20260326.png
:alt: Social Intel metadata results
:width: 100%

Metadata-search results inside the Social Intel summary workflow.
```

#### Followers, Following, and Connections

The followers/following workflow is more than a read-only count view.

Covered actions include:

- opening the followers-and-following popup
- switching among `Followers`, `Following`, and `Connections`
- filtering discovered related accounts
- fetching more followers from inside the popup
- selecting discovered related accounts
- confirming selection to import those accounts back into the main workflow
- reopening created follow-based jobs from the left home menu
- selecting all imported results and updating the graph

In practice, this means Social Intel can expand an investigation outward from one profile into a broader relationship set rather than staying limited to the original target.

A `connection` is someone who **engaged** with the profile, not someone who follows it. Orion reads the commenters off each of the profile's own posts and deduplicates them into a single people list, remembering which posts each person commented on. One handle therefore appears once in `Connections` even when it commented on several posts, and the count of those posts is kept with it.

The graph carries the same relation. Commenters hang off the account node as a `Commenters` badge; an individual commenter's edge reads `commented on @handle`, and the edge weight and its node panel show how many distinct posts that person commented on. When a commenter is also a scanned user, the two users are joined through the platform node they share. One that has not been scanned yet can be added to the graph as its own user, or scanned directly from its node.

Each fetch section keeps its own state: a band above the results shows whether the section is up to date and when it was last synced, `Sync all` refetches it, and the section resumes on its own if the page is reloaded while a fetch is still running.

```{figure} ../screenshots/social-followers-popup-20260326.png
:alt: Social Intel profile fetch tabs
:width: 100%

Profile fetch tabs with the per-section sync band, alongside exposure, wanted-list, and phone-lookup panels.
```

#### Images, Followers, and Re-Scan Controls

Within the summary popup, the suite covers several enrichment actions:

- `Fetch Followers`
- `Fetch Following`
- `Fetch Images`
- `Re-scan profile`

These actions make the popup a live enrichment console rather than only a static summary.

#### Aliases and Context Menus

The graph canvas supports right-click or context-menu style interaction paths.

Covered behavior includes:

- triggering a context menu from the canvas
- opening the `Set Alias` action
- editing an alias value
- saving the alias
- seeing the alias reflected in later list or summary views

Aliases are useful when the analyst wants a cleaner investigation label than the raw discovered username.

#### Relationship Popups

Social Intel also supports relationship-specific popups from graph nodes.

These popups can expose:

- related-account information
- external account links
- quick-close controls

This makes it possible to inspect a connection without leaving the graph canvas.

#### What the Legend Represents

The legend distinguishes visual object types such as:

- user profiles
- platforms
- platform groups
- custom entities
- relationship or connection types

Understanding the legend is important when the graph becomes dense. It tells the user whether they are looking at:

- a discovered profile
- a platform wrapper
- a manually added entity
- or a relationship generated by enrichment

#### Recommended Social Intel Workflow

1. Start with a known username or an uploaded image.
2. Fetch the initial profile set into the workspace.
3. Review the manage-profiles modal and push selected profiles into the graph.
4. Switch between graph and list views as needed.
5. Open the summary popup for metadata and platform review.
6. Fetch followers, following, or images where useful.
7. Rename aliases or add custom entities if the graph needs cleanup.
8. Export the session when the relationship picture is complete.

## Result and Report Workflows

Most indexed modules eventually lead into a report page. Report pages are one of the most important parts of the product because they consolidate the searchable record, its metadata, and pivot actions.

### Report Toolbar

The shared report header can expose:

- download
- export report
- translation
- AI summary
- share
- open source URL
- open CTI graph

The exact buttons depend on the record and deployment configuration.

When available, this toolbar is the fastest way to export, translate, summarize, share, or pivot the current record into graph analysis.

Some report pages also show feedback controls. These controls let signed-in users mark a record as recommended, trusted, or untrusted. The counters help teams identify records that have already been reviewed and make it easier to spot material that needs confidence review before it is reused in a case, export, or briefing.

### Result Insights Side Panel

In consolidated workflows, Orion also provides a dedicated insights panel beside the main result stream. This side panel can expose:

- keyword insights
- general coverage summaries
- threat-actor search helpers
- unique URL lists
- expandable extracted-data sections

This panel is intended for quick triage and narrowing before opening individual reports.

In practice, it helps answer three questions quickly:

- what themes dominate this result set
- whether actor- or URL-based pivots are available
- which extracted sections are worth opening in full reports

```{figure} ../screenshots/consolidated-insights-20260326.png
:alt: Result insights side panel
:width: 100%

Result insights side panel with URL and extracted-data pivots.
```

### General Report Page

The general report view commonly includes:

- title
- description or important content
- web reference
- source URL
- published date
- network
- last-checked date
- content-type tags
- freshness status

Some report layouts also expose quick links, downloadable record output, or direct pivot actions to graph and sharing tools from the same header.

```{figure} ../screenshots/social-report-20260326.png
:alt: Report content view
:width: 100%

Typical report layout with content and structured context.
```

### Metadata Panel

The metadata panel is expandable and lets users browse extracted values by category. Common tabs include:

- content
- section
- organization
- entity or person
- other extracted attributes

This is the main place to inspect structured extraction results from the record.

```{figure} ../screenshots/report-json-viewer-20260326.png
:alt: Report metadata sections
:width: 100%

Expandable metadata and extracted-section review.
```

### Screenshot and JSON Sections

For relevant breach records, the report may also include:

- screenshot preview
- JSON record viewer
- report mapping

The JSON viewer is useful for raw structured inspection, while report mapping helps users navigate relationships and related record context.

```{figure} ../screenshots/report-json-viewer-20260326.png
:alt: Report JSON viewer
:width: 100%

JSON inspection view for raw structured report data.
```

### AI Chat and Summary

If AI is enabled, users may also see:

- AI summary generation
- chat over the report content

For chat-style and social-style records, report pages can also include:

- channel or source title
- source URL
- report sharable link
- sender details
- message identifiers
- views, likes, shares, comments, tags, or retweets
- expandable metadata blocks
- JSON inspection

This makes the report page suitable for both analyst review and downstream sharing.

The tested chatbot flow specifically confirms:

- opening the chat widget from a report
- entering a prompt
- sending a message
- rendering a visible message thread in the chat area

### Compromise Monitoring Report Page

The Compromise Monitoring report is a streamlined variant focused on target and attacker context. It includes:

- target URL
- saved date
- defacer or IOC type
- team
- source breach reference
- IP
- location
- metadata panel
- JSON viewer

## Links, Support, and External Navigation

### Directory

The `Directory` page presents monitored live services and related records in a browsing-oriented layout. It differs from the normal search-result workflow by focusing on monitored entries and operational visibility rather than keyword-first investigation.

Common behaviors include:

- page-level filtering
- paginated or progressively loaded directory entries
- monitoring-status style browsing
- service and reference review across monitored live entries

```{figure} ../screenshots/directory-monitoring-20260326.png
:alt: Directory and monitoring view
:width: 100%

Monitoring-oriented directory workflow.
```

### Links

The `Links` sidebar item acts as the user-facing entry into the directory-style workflow above.

### Onion Link

If configured, `Onion Link` opens the deployment’s onion address in a separate tab.

### Whistle Blowing

If enabled, `Whistle Blowing` opens an external anonymous reporting portal. This is outside the main indexed investigation workflow.

### Documentation

The `Documentation` entry opens the published documentation site in a new tab.

## Profile, Tenant, and Alert Workflows

The user profile area at the top of the sidebar contains user-specific and tenant-specific pages.

```{figure} ../screenshots/account-settings-20260326.png
:alt: Account settings page
:width: 100%

Profile, settings, and administrative workspace.
```

### Account Settings

The account page allows the current user to review and manage:

- profile image
- username
- role
- tenant or location display
- assigned licenses
- two-factor authentication
- password
- global recovery key
- theme preference

The page also shows the currently running platform version. It is focused on the current user rather than the tenant as a whole.

The tested account workflow also includes:

- avatar upload
- theme toggle and persistence
- enabling `2FA`
- logging out and reaching the two-factor challenge screen on next login
- viewing the QR image and OTP input state for 2FA setup/verification
- changing the account password
- generating or replacing a global recovery key

Changing the password, enabling or disabling 2FA, and generating or replacing a recovery key opens a `Confirm your identity` dialog. Enter the current account password to authorize the change. Orion verifies it on the server against the stored password hash; an incorrect password leaves the dialog open and shows an error. Profile, language, theme, and visibility changes do not require this additional confirmation.

#### Generate or Replace a Recovery Key

1. Open `Profile > Account`.
2. In `Recovery Key`, select `Generate / replace recovery key`.
3. Enter the current password in the identity-confirmation dialog.
4. Copy the recovery key from the popup and store it in a password manager or another secure location.
5. Close the popup after saving the key.

The recovery key is 43 characters and is shown only once. Orion stores only its hash. Generating another key immediately replaces the previous key, so the older value can no longer recover the account.

When 2FA is configured, the authenticator secret is encrypted with tenant-scoped encryption before it is retained. Existing unencrypted 2FA secrets are encrypted after successful verification.

```{figure} ../screenshots/account-settings-20260326.png
:alt: Account settings form
:width: 100%

Current-user profile and account settings form.
```

### Public User Activity

User activity pages open from profile, report, comment, or interaction links when profile visibility allows it.

The page can show:

- the user's profile image
- visible activity items
- report or thread links for activity entries
- an unavailable or private-profile state when visibility is disabled

Tenant profile visibility and the user's own profile preference can hide public activity from other users.

### AI Workspace

AI Workspace is opened from `Profile > AI` when the deployment enables the AI endpoint. It is used for support-style and investigation-assistant conversations inside the profile area.

The workspace can support:

- asking investigation or support questions
- reviewing previous messages in the chat rail
- sharing a chat transcript through a tokenized shared link where enabled
- opening shared chat transcripts outside the dashboard shell

#### Nexus Conversation Controls

AI Workspace uses the Nexus assistant surface when the AI endpoint and user license allow access. The workspace opens as a full chat view and can also receive a query context from the surrounding dashboard route.

The main controls are:

- `New Chat` clears the current visible conversation and starts a fresh Nexus session when no response is actively streaming.
- `Share` creates a tokenized shared-chat link for the current visible user and Nexus messages.
- quick prompt buttons prefill the composer with common investigation-assistant prompts.
- the composer sends with `Enter` and inserts a new line with `Shift + Enter`.
- the send button changes to a stop control while Nexus is generating a response.

The composer and edited user messages use a 300-token limit. When a draft is over the limit, the workspace shows how many tokens must be removed before the message can be sent or saved.

#### Message Actions

User messages can be copied or edited when Nexus is not currently sending. Editing a user message removes that message and the later conversation turns, places the edited text back into the composer flow, and resends it as a new request. This keeps the visible conversation aligned with the revised prompt instead of leaving stale assistant answers after an edited question.

Nexus responses render markdown when returned by the assistant. Completed Nexus messages expose bot-message actions, while actively streaming messages show an in-progress indicator instead of the completed-message action row.

#### History, Streaming, And Recovery

AI Workspace loads saved chat history when the page opens. History preserves user, Nexus, and explicit cancellation messages; older history is trimmed so the workspace does not keep unlimited user or bot turns.

When a response is running, the workspace shows streaming status and step text when available. If the user presses the stop control, the current Nexus stream is cancelled and a `Message canceled.` entry is stored in history.

If the page reloads or the user returns while the last saved item is a user message with no matching Nexus response, AI Workspace attempts to resume the active Nexus stream. If recovery fails, the conversation remains visible and the user can retry from the error state where a retry payload is available.

Shared chat links are separate from the editable workspace. A shared transcript opens outside the dashboard shell and shows only the messages included in the generated share payload.

### Tenant Homepage

For tenant users, the profile homepage may function as a tenant intelligence and alert workspace instead of a simple profile landing page.

Depending on license and role, this page can include:

- homepage search
- alert export
- scan-all or flush-all actions
- risk summary cards
- category alert cards
- monitored IOC counts
- alert scanner settings

In some deployments, this page behaves differently by role:

- maintainers or higher-license users may receive the full alert-and-action workspace
- analysts may see a simpler search-first homepage variant
- some users may see an insights-only fallback instead of tenant alert controls

The summary area commonly displays:

- critical alerts
- high-risk alerts
- medium-risk alerts
- low-risk alerts

Category cards provide quick access to alert-specific drill-down reports.

Maintainer-level users can manage alert scanner settings when the workflow is enabled. The scanner settings page lets the tenant enable or disable allowed alert categories for future tenant scans. Saving updates the tenant's allowed alert categories.

Scheduled alert scans use the tenant's monitored IOC values, allowed alert categories, and alert run-time configuration. The run time controls when the platform should perform the tenant's recurring alert scan, while scan-all remains the manual path for immediate follow-up.

The profile area also supports alert-focused workflows such as:

- category-specific alert reports
- custom alert creation where enabled
- category-level alert scanner settings where enabled

#### Custom Alerts

Custom Alerts allow a permitted user to create or edit an alert record manually. The form captures alert type, status, title, description, source, reference URL, and one IOC bucket.

Supported alert types are:

- `general`
- `breach`
- `exploit`
- `social`
- `defacement`

The alert form validates title, description, source, and URL before saving. The reference URL must start with `http://` or `https://`. The IOC selector uses the deployment's supported entity list, and the saved alert receives license visibility based on the alert type.

#### Alert Scanner Settings

Alert scanner settings control which alert categories are allowed to run for the tenant. They are useful when a tenant wants monitoring but does not want every possible scanner category to execute.

Typical scanner categories can include:

- general intelligence
- breach and credential exposure
- compromise monitoring
- social and discussion sources
- exploit intelligence
- stealer logs
- scanning-backed categories such as email breach, social scanner, software scanner, repository scan, SEO scan, playstore scan, advanced scan, and vulnerability scan

The exact list depends on the deployment and tenant configuration. Disabled categories are not a data deletion control; they affect future alert scanning and visibility behavior.

#### Alert Report Drilldown

Category alert reports are opened from `Profile > Homepage` or from alert drilldowns. The report page is used to review category-specific alert records, inspect risk context, export findings, and move from an alert into a deeper investigation.

Alert detail drawers can show the alert risk, title, description, URL, category, source, matched entity, result date, content type, password when present, and raw findings when the source record includes additional evidence. Use the drawer to verify the underlying finding before exporting, creating a custom alert, or opening a case workflow.

Admins with case-management visibility can also open tenant alert views inside case management. That workflow is used when tenant alerts need administrative review alongside cases and tracked investigation work.

### Take Down

The `Take Down` page is the root-administrator review workspace for abuse/takedown evidence requests. It appears in the profile area as `Takedown Requests` for root-tenant administrators and opens at `/dashboard/profile/take-down`.

The feature has two user-visible entry points:

- `Initiate Takedown` on eligible Compromise Monitoring or defacement reports
- `Report Takedown` on the Take Down review page for a manually entered target URL

When a user initiates a takedown from a report, Orion uses the report target URL and captures abuse-contact evidence before creating the review entry. The modal shows the captured abuse email when one is found and confirms that evidence has been saved for administrator review. If no public abuse contact is exposed for the target, no evidence entry is saved and the modal shows that the request was not created.

The review page supports:

- searching by target, abuse email, user, or report identifier
- date-range filtering
- status filtering for `All`, `Pending`, `Accepted`, `Denied`, or `Failed`
- pagination
- accepting pending requests
- rejecting pending or failed requests with a reason
- manually creating a request from a target URL

Request statuses are shown with the same meaning across reports and the review page:

| Stored status | Report label | Meaning |
| --- | --- | --- |
| `pending` | `Takedown in progress` | Evidence was captured and the request is waiting for root-admin review. |
| `accepted` | `Takedown reported` | A root administrator accepted the request and the abuse email was dispatched. |
| `denied` | `Takedown denied` | A root administrator rejected the request, optionally with a reason. |
| `failed` | `Takedown failed` | The request is in a failed state and can be reviewed or rejected. |

Accepting a request sends the abuse/takedown email to the captured abuse contact using the saved evidence. Rejecting a request closes the review path and stores the rejection reason when one is supplied. After a request exists for a target domain, the source report disables duplicate initiation and shows the current takedown label.

```{admonition} Access and scope
:class: note

Creating a takedown request requires an eligible role and defacement-module access. Reviewing, accepting, or rejecting takedown requests requires root-tenant administrator access.
```

### Manage IOCs

The IOC management page allows tenants to maintain the set of monitored values used in searches and alerting.

Capabilities include:

- IOC category search
- horizontal category browsing
- adding IOC values
- IOC import from CSV
- CSV upload action for bulk IOC upload
- downloading the CSV template
- removing IOC values
- clearing all IOC values

This page is especially important for tenant-driven monitoring workflows.

CSV imports must use an exact `key,value` header. Files must be CSV format, no larger than 1 MB, and each key must match a supported IOC entity key. Duplicate values are ignored during import.

Some tenants can be marked for Privileged IOC handling. When that protection applies, users without the required permission can review IOC values but cannot add, remove, clear, or upload IOC values for that tenant. The page shows a permission warning when IOC editing is disabled.

Example CSV structure:

```text
key,value
domain,example.com
email,analyst@example.com
ip,203.0.113.10
url,https://example.com/login
```

After import, review the visible IOC counts before running tenant alert scans. Invalid keys or oversized files should be corrected before retrying the import.

The tested tenant IOC workflow includes:

- opening the IOC page from the tenant profile area
- switching across IOC category tabs
- adding values in multiple categories
- importing values from a CSV template
- adding monitored email values for downstream alerting
- returning to the tenant homepage and triggering follow-up scanning actions

### Statistics

The `Statistics` page in the profile area reuses the insight-oriented summary experience for users who want a visual overview without returning to the main homepage.

### Profile Consolidated View

The profile area also contains a consolidated-search view. Functionally, it behaves like the main consolidated workspace but sits within profile and tenant-oriented workflows.

### Monitoring

Monitoring is an operational profile workspace that groups monitoring-related tabs. Depending on role and tenant configuration, the visible tabs can include:

- `Log Manager`
- `Auditlog`
- `Event Management`

Admins can see Log Manager. Admins and maintainers can see Auditlog. Event Management appears only for admins or maintainers when the tenant has event management enabled.

### Event Management

Event Management is the SIEM-style event search workspace. It is available from the profile area or the Monitoring tab when enabled.

Capabilities include:

- searching SIEM events
- using IOC-style search tags such as all, domain, email, and IP
- validating domain, email, and IP input
- filtering by date range
- paginating large event result sets
- expanding a result to inspect raw event fields and extracted IOCs

### Log Manager

Log Manager is an admin-only operational log viewer.

Capabilities include:

- filtering logs by type: `INFO`, `WARNING`, or `ERROR`
- filtering by available log date
- paginating log entries
- deleting an individual log file
- flushing all logs after confirmation
- reviewing file size and log metadata

Use Log Manager for operational troubleshooting, not analyst investigation.

### Feeder

Feeder is the source/rule intake workspace for users with feeder access.

The Feeder workspace includes:

- a rule catalog dropdown
- grouped Social Media rules for supported social platforms
- an `Add` tab for uploading parser files or saving URL values
- a `View` tab for uploaded scripts
- a `Values` tab for stored rule values where supported
- search, sorting, pagination, preview, enable/disable, delete, and clear controls
- owner transfer for admins

Upload rules depend on the selected rule type:

- Python parser uploads must use `.py` files no larger than 1 MB.
- Shared session uploads must use `.zip` files.
- Value-backed rules accept newline-separated URL values.
- Shared rules require the parser file before adding values.

Feeder data is used by collection workflows. It should be managed carefully because enabling, disabling, clearing, or deleting entries affects future ingestion behavior.

### Case Management

Case Management is the investigation workspace for turning alerts, findings, and analyst leads into tracked cases. It is available from the profile area when the user has the required case-management access.

Common entry points include:

- `Profile > Case Management`
- `Profile > Case Management > Tracking Board`
- `Profile > Case Management > Case Details`
- shared case links
- admin tenant alert views inside case management

Case visibility and allowed actions depend on role:

| Role or access pattern | Typical capabilities |
| --- | --- |
| Admin | create, assign, update, archive, unarchive, close, share, export, and review tenant alert case flows |
| Maintainer/member with access | create, assign where permitted, update, archive, share, export, and close eligible cases |
| Analyst with case-management permission | view assigned or permitted work, update allowed case fields and task state, review evidence, and contribute comments |
| Shared-link viewer | view only the shared case material allowed by the generated share link |

#### Case List, Filters, And Analytics

The Case Management landing page has three working modes where permissions allow them:

- `Case List` for day-to-day triage and opening cases
- `Analytics` for summary charts and workload review
- `Alerts` for admin tenant-alert review inside the case-management context

The case filter row applies to the list and analytics modes. It supports:

- case-list scope selection for open or archived cases where the user can manage cases
- free-text search across case ID, title, and description
- status filtering
- severity filtering
- priority filtering
- searchable case-type filtering
- sort order selection

The same filter state is used by the list and analytics panel. For example, if the user searches for a case ID and switches to `Analytics`, the analytics counts and charts reflect the filtered set rather than silently reverting to all cases.

The analytics panel shows:

- visible cases compared with total cases
- active case count
- critical-severity case count
- high-priority case count
- unassigned case count
- open-task count
- artifact count
- average case age and stale case count
- status distribution
- severity distribution
- priority distribution
- case-type distribution
- intake-source distribution
- task-status distribution
- analyst workload
- `Needs Attention` cases

Use analytics when a lead or administrator needs to understand workload, stale investigations, unassigned work, or high-risk cases before assigning analysts or moving cases through the tracking board.

```{figure} ../screenshots/case-management-add-20260326.png
:alt: Add case drawer
:width: 100%

Case creation drawer with the core case fields and primary entity form.
```

When adding a case, users define:

- case title and investigation description
- case type and intake source
- status, severity, and priority
- tags for triage and reporting
- primary entity, such as a person, organization, email, domain, IP, URL, account, credential, or infrastructure indicator

Recommended case creation flow:

1. Create the case with a clear title, severity, priority, and intake source.
2. Add a primary entity before adding secondary evidence.
3. Attach artifacts or report references while the source context is still fresh.
4. Assign analysts or tasks if follow-up work is needed.
5. Use the tracking board for status movement rather than editing status informally.

The case details page keeps the case record organized into independent sections. Each section has its own add or edit action, and side drawers are used for focused data entry.

```{figure} ../screenshots/case-management-view-20260326.png
:alt: Case detail view
:width: 100%

Case detail view with closure, case metadata, entity context, evidence, and analyst workflow sections.
```

The main case details section shows the title, description, case ID, type, intake source, status, severity, priority, tags, assigned analysts, PDF export, and share-link actions.

PDF export is intended for handoff and reporting. Share links are intended for controlled review of a case without giving the recipient broader application access. Revoke case shares when external review is complete.

Primary Entity stores the main subject of the investigation. Related Entities are additional people, domains, accounts, assets, indicators, sources, or actors connected to the case.

The case details page also exposes a case-level Nexus assistant where enabled. This assistant receives the current case details as its working context, so it is useful for summarizing case state, asking what evidence is already attached, preparing handoff notes, or identifying likely next steps from the visible case record. It is separate from public case shares; shared-link viewers do not receive broader application access through the assistant.

#### Case Artifacts

Artifacts store evidence and supporting material. Common artifact types include screenshots, uploaded files, URL captures, raw alerts, log excerpts, email headers, chat transcripts, linked reports, and generic evidence.

Artifact records include:

- title
- type
- source
- captured date
- description
- optional URL for URL-capture artifacts
- optional files for screenshot and file artifacts
- optional linked report metadata for report artifacts

Artifact cards show the title, type, source, captured date, description, URL actions, linked-report actions, and file actions where relevant.

##### Linked Report Artifacts

When the artifact type is `Report`, the user can attach an existing Orion report instead of only typing a free-form artifact description.

The linked-report workflow is:

1. Add or edit an artifact.
2. Set artifact type to `Report`.
3. Choose a report source.
4. Search for a report title.
5. Select a result from the report dropdown.
6. Save the artifact.
7. Use `View Report` from the artifact card when the linked report needs to be reopened.

Supported report sources are:

- `General Intelligence`
- `Data Breach`
- `Defacement`
- `Social`
- `Feed`
- `Exploit`
- `Stealer Logs`

If no result matches the search term, the dropdown shows the empty state. Clearing the selected report removes the linked report ID and title from the artifact before saving.

##### Artifact Files And Integrity

Screenshot and file artifacts support multiple uploaded files. Screenshot artifacts accept PNG files. File artifacts accept PDF, JPG, PNG, TXT, or DOCX files. The current UI allows up to five files per artifact.

Saved artifact files show the file name and an integrity badge. Users with case-management authority can:

- download a file
- verify a file's integrity
- delete a file from an open case

Integrity verification compares the stored file against the case artifact record and updates the badge to `Verified` or `Integrity Failed`. Failed integrity disables download for that file so users do not rely on evidence that no longer matches its stored integrity record.

Analyst-style users without the required management permission can review artifact files, but they cannot run artifact integrity verification.

Tasks track follow-up work for analysts. A task can hold status, priority, assignee, due date, description, and links to relevant entities or artifacts.

Linked Cases connect the current case to other case records. Links can mark duplicates, parent or child cases, follow-ups, escalations, shared actors, shared victims, shared infrastructure, or general related cases.

Comments provide the analyst discussion thread for the case. Use comments for review notes, handoff context, evidence interpretation, or follow-up decisions. Comment authors can be opened through the user sidebar where supported.

Closure records the final outcome. It includes the closure reason, summary, resolution notes, who closed the case, and the close time. Closing a case is the point where the investigation outcome becomes part of the case report and exported PDF.

#### Case Status Lifecycle

Case status changes follow a fixed tracking-board flow:

1. `new`
2. `intake_review`
3. `under_investigation`
4. `evidence_collection`
5. `verification`
6. `regulatory_action`
7. `legal_review`
8. `resolved`
9. `closed`

Status changes must be made from the tracking board, require a reason, and can move only one step forward or backward. A case cannot be moved back to `new`, and a closed case cannot be moved to another status.

Each board move stores the submitted reason in the case status history. Use concise reasons that explain why the case moved, because this history supports handoff, review, export preparation, and later audit of the investigation timeline.

Closure is handled separately from board movement. A case can be closed only from the case details closure section, only after it reaches `resolved`, and only by admins, maintainers, or the case creator.

Archived cases are read-only for update-style actions. Analyst access is intentionally narrower than admin or maintainer access: analysts can view assigned work and update their allowed task state, but case assignment, case status movement, and closure remain restricted.

#### Admin Tenant Alerts In Case Management

Administrators can review tenant alert categories from the case-management area when the workflow is enabled. This view is useful when an alert needs to become a case, be compared with existing cases, or be reviewed across tenants.

Use this path when:

- a tenant alert requires administrative triage
- a category alert needs to be linked to active case work
- a default or administrative tenant needs to inspect alerts for another tenant
- alert review and investigation status need to be handled together

### Tenant Settings

Tenant Settings stores tenant-level identity and contact information.

Depending on permissions, users can:

- upload a tenant image
- review assigned licenses
- review license count
- review assigned user quota
- edit phone
- edit country
- edit city or state
- review alert visibility and scanner-category settings where the tenant role allows it

Some fields remain read-only depending on role. The page also acts as a tenant overview by summarizing the tenant name, status-style badges, location, assigned quota, and current license list.

#### Tenant Alert Webhook Integrations

Tenant Settings also shows tenant alert webhook integrations that an administrator has configured at the platform level. Tenants use the visible Connect or Reconnect action to authorize their own Slack or Jira webhook destination in a new tab. Providers that are not configured by an administrator are hidden from the tenant page.

```{figure} ../screenshots/tenant-alert-integrations-slack-20260326.png
:alt: Tenant Slack alert integration
:width: 100%

Tenant alert webhook integrations showing Slack as the only available configured connector.
```

```{figure} ../screenshots/tenant-settings-20260326.png
:alt: Tenant settings page
:width: 100%

Tenant settings and tenant-level license summary.
```

## User and Tenant Administration

### Tenant Users

The `Users` view is the main tenant user-management page.

It supports:

- viewing users in a table or mobile card layout
- adding a user
- expanding a user row for details
- changing status
- editing assigned licenses
- editing user permissions where available
- limiting alert-administration visibility to all tenants or selected tenants where enabled
- deleting a user

Displayed information commonly includes:

- username
- email
- role
- status
- subscription
- licenses
- permissions
- alert access scope where enabled

The page also respects quota-based restrictions.

The broader tested user-management lifecycle also covers:

- creating multiple users with different roles and license mixes
- verifying role- and license-based sidebar visibility after login
- triggering subscription or paywall behavior for limited-license users
- showing near-expiry trial state messaging where applicable

```{figure} ../screenshots/tenant-users-20260326.png
:alt: Tenant users page
:width: 100%

Tenant user-management view with quotas, roles, and licenses.
```

### Tenant Administration

The `Tenants` view is used by higher-privilege roles to manage tenant records across the platform.

It supports:

- reviewing tenant information
- expanding a tenant for detail and editing
- changing verification state
- changing quota
- changing status
- updating tenant licenses
- setting tenant alert run time in `HH:mm` 24-hour format
- controlling whether tenant alerts are visible to admins
- configuring allowed alert scanner categories
- enabling Privileged IOC handling where required
- assigning which tenants a user can view in tenant-alert administration workflows
- deleting a tenant and its associated users and keys after confirmation

Displayed fields include:

- company name
- country
- subscription
- verification state
- user quota
- status
- license assignments
- alert visibility and alert run-time settings where enabled
- privileged IOC state where enabled

Admin tenant-alert views can summarize alerts across visible tenants, filter or search tenants from a multi-select dropdown, open category-specific alert drilldowns, review risk summary cards, and export a tenant's alerts as a PDF report.

Tenant deletion is available only to administrators. The root/default tenant cannot be deleted.

To delete a tenant:

1. Sign in as an administrator and open `Tenants`.
2. Find the tenant and select its red delete button.
3. Review the confirmation message and select `Yes, Confirm`.
4. Confirm that the tenant disappears from the list.

This permanently removes the tenant and its associated users and keys.

#### Dedicated Tenant Subdomains and White-Labeling

Each tenant uses a dedicated subdomain, such as `<tenant-slug>.<platform-domain>` (`<tenant-slug>.localhost` in local environments). Tenant accounts sign in through that tenant URL, keeping authentication isolated from the main platform domain. Branding is also tenant-scoped, so the application name, favicon, light and dark logos, and login image can be customized without changing other tenants.

```{figure} ../screenshots/system-settings-20260326.png
:alt: Tenant white-label branding settings
:width: 100%

Brand assets and application identity controls used for tenant-level white-labeling.
```

```{figure} ../screenshots/tenant-administration-20260326.png
:alt: Tenant administration page
:width: 100%

Administrative tenant-management table used for verification, licensing, and quota updates.
```

### Audit Logs

Audit Logs provide a searchable activity trail across user and tenant actions.

```{admonition} Audit data shown
:class: note

The audit log list typically shows a timestamp, actor, tenant, and event description for each recorded entry.
```

The audit-log page supports:

- export
- filtering
- pagination
- desktop and mobile layouts

```{figure} ../screenshots/audit-logs-20260326.png
:alt: Audit log page
:width: 100%

Audit log workspace with filters and export actions.
```

## System Administration

### System Settings

System Settings is the primary platform-level configuration page.

It includes two main groups:

- asset and branding configuration
- application and service configuration

#### Asset Management

Administrators can manage brand and UI images such as:

- primary logo
- wide light logo
- wide dark logo
- authentication dashboard icon

#### Configuration

Editable platform settings can include:

- application name
- language
- onion address
- AI endpoint visibility
- admin panel visibility
- documentation, pricing, data-source, and adversary public URL settings
- account email and SMTP settings for platform mail delivery
- version and platform metadata
- logo and authentication dashboard image URLs

#### Alert Webhook Integrations

Administrators configure platform OAuth credentials for alert webhook integrations from System Settings. System Settings stores the Slack and Jira app credentials and redirect URI notes only; tenants connect their own webhook destinations from Tenant Settings.

#### Backup

The Backup card controls whether Orion Intelligence creates backups on its own schedule.

When Scheduled Backup is enabled, the platform creates a backup automatically every 3 days. The toggle saves immediately; there is no separate save action for it.

Only the 2 most recent backups are retained. When a new backup would exceed that limit, the oldest existing backup is deleted first. This retention limit is shared across scheduled and manually created backups, so enabling the schedule will eventually displace older manual backups.

```{figure} ../screenshots/alert-integrations-system-slack-config-20260326.png
:alt: System Slack alert integration configuration
:width: 100%

System alert webhook integration settings for configuring Slack OAuth credentials.
```

```{figure} ../screenshots/system-settings-20260326.png
:alt: Administrative and system settings workspace
:width: 100%

Administrative settings and platform-management view.
```

### Backup and Restore

Backup and Restore lists every backup held by the platform and allows administrators to create, restore, and delete them.

Each backup captures:

- MongoDB collections
- ArangoDB collections
- Elasticsearch indices
- application logs
- static resource files

The listing shows a sequence number, backup name, type, and creation date. Backup type is either `auto` for backups produced by the 3-day schedule, or `instant` for backups created manually.

Administrators can:

- **Instant Backup** — create a backup immediately. The button shows a progress indicator and stays disabled until the operation finishes.
- **Restore** — replace current data with the contents of the selected backup. The platform enters maintenance mode until the restore completes.
- **Delete** — permanently remove a stored backup.

Each action asks for confirmation before it runs. When the platform already holds 5 backups, the Instant Backup confirmation warns that the oldest backup will be removed if the operation proceeds.

Restoring is destructive: collections are cleared before the backup contents are written back. Only administrators can reach these operations.

## Detailed UI Coverage Appendix

This appendix documents exact user-visible behaviors verified during documentation coverage. It is intended to close the gap between a feature overview and the concrete interactions that an operator, tenant user, or administrator can perform in the current product.

### Authentication and Session Lifecycle

The tested authentication lifecycle includes:

- loading the login page from the public entry point
- signing in as an administrator
- keeping the browser access token in an encrypted HTTP-only cookie rather than local storage
- applying progressive delays after consecutive unsuccessful login attempts
- opening the profile menu and signing out
- requesting a password-reset email
- receiving the same reset-request result regardless of whether an account exists
- requesting recovery with a registered email and global recovery key
- opening a tokenized reset-password screen
- validating that the new password cannot match the old password
- applying a new password successfully
- signing in again with the updated password
- encountering a two-factor prompt after enabling `2FA`
- viewing the 2FA QR image and OTP input state
- requiring the current password before password, 2FA, or recovery-key changes

### Sidebar and Global Navigation States

The automation covers both content navigation and structural sidebar behavior.

Supported navigation behaviors include:

- expanding and collapsing sidebar groups
- collapsing the whole sidebar
- re-expanding the whole sidebar
- visiting all major search, scan, graph, tenant, and admin groups that are available to the current role
- opening external or support-oriented entries from the main navigation where configured

For user documentation purposes, that means the sidebar is not only a static menu. It is expected to support:

- nested group expansion
- condensed and expanded display modes
- role-based visibility
- license-based visibility

The profile menu is also part of this navigation model. Tested behavior includes:

- opening the profile menu
- reaching Help & Support from the profile menu
- signing out from the profile menu

### Homepage, Heatmap, and Support Interactions

The homepage is validated as more than a search landing page. The automated flow covers:

- world heatmap rendering
- tooltip visibility on country hover
- tooltip hide behavior on pointer leave
- opening a country-level report from the map
- closing the country report with the close button
- closing the same report by clicking the overlay
- fallback behavior when heatmap data or world data changes

The support workflow is also covered directly from the profile menu:

- opening the Help & Support modal
- filling email, subject, and message fields
- submitting the support request

### Search Behavior and Result Expectations

Documentation coverage validates that indexed modules are not only searchable but also return stable, inspectable result structures.

Covered search behavior includes:

- general keyword searching
- module-specific searching
- result opening from cards and table rows
- returning from a report to the original listing
- opening reports in both modal-style and page-style layouts
- validating first-result content against fixtures in key modules

The search-result verification suite explicitly checks stable first-result expectations for:

- `General Intelligence`
- `Data Breach`
- `Defacement`
- `Social`
- `Exploit`
- `Feed`

This means the manual should treat these modules as search-first experiences with expected, stable result-card or row-based layouts, not as experimental views.

### Indexed Module and Tab Coverage

The suite covers more module variations than the earlier manual described explicitly.

`General Intelligence` coverage includes:

- `All`
- `General`
- `Forums`
- `News`
- `Stolen`
- `Drugs`
- `Hacking`
- `Marketplaces`
- `Cryptocurrency`
- `Leaks`

`Data Breach` coverage includes:

- `All`
- `Databases`
- `Tracking`
- leak URL and dump-reference fields inside breach reports

`Defacement` coverage includes:

- `All`
- `Hacked`
- `Phishing`
- `Databases`

`Social` coverage includes:

- `All`
- `Telegram`
- `Twitter`
- `Mastodon`
- `Pastebin`
- `Forum`
- `Reddit`

`Exploit` coverage includes:

- `All`
- `CVE`
- `Tools`
- `ZeroDay`

`Feed` coverage includes:

- `News`

`Stealer Logs` coverage includes:

- `IOCS`

### Report Opening, JSON Review, and Chat Workflows

Report handling is one of the most deeply exercised areas of the suite.

Covered behaviors include:

- opening the first available report from multiple modules
- verifying that a report can open as a page or modal, depending on module layout
- opening JSON-backed report viewers
- closing modal reports with escape
- opening chat from a report
- sending a chat message
- verifying that a chat response area renders messages

The manual should therefore treat chat and JSON review as first-class report features, not optional side notes.

### Search Tools and Advanced Filters

The suite covers two layers of filtering:

- toolbar-level search tools
- sidebar filter drawers

Toolbar-level coverage includes:

- toggling `Advance`
- opening `Tools`
- changing result sort order
- switching search behavior between semantic, OR, AND, and full-query modes
- clearing entity-filter selections

Sidebar-filter coverage includes:

- network filtering
- safe-search filtering
- content-type filtering
- date-range filtering
- reset
- apply
- auto-apply and manual-apply variations

The tests also verify these filters across multiple modules, including:

- `General Intelligence`
- `Data Breach`
- `Defacement`
- `Social`
- `Exploit`
- `Feed`

Advanced resilient filter validation also scans report detail and metadata after filtering, which means filtering is expected to affect downstream report inspection, not just the list page.

For users, that means the filtering model should be understood as end-to-end rather than cosmetic. The tested behavior confirms:

- search-tool mode changes affect the actual returned result set
- sort order changes are preserved into refreshed searches
- side filters can be applied repeatedly across different modules
- date filters support both matching and intentionally empty result windows
- filtered state is expected to remain meaningful when opening report detail and metadata panels

### Pagination, Load More, and Result Expansion

The suite validates navigation through large result sets rather than assuming a single-page result view.

Covered pagination and expansion behaviors include:

- next-page navigation in `General Intelligence`
- next-page navigation in `Data Breach`
- next-page navigation in `Defacement`
- next-page navigation in `Social`
- next-page navigation in `Exploit`
- next-page navigation in `Feed`
- directory pagination
- directory page-number navigation
- directory lazy expansion by scrolling to the bottom
- stealer-log row expansion
- IOC row expansion in consolidated tables
- consolidated `See More` and `See Less` toggles where present

This matters operationally because the interface is tested as a browsing workspace, not only a single-query landing page. Users should expect:

- multi-page navigation in indexed modules
- progressive loading where directory-style surfaces support it
- expandable rows and cards in result-heavy modules
- persistence of the browsing context while moving in and out of details

### Stealer Logs: Full Tested Behaviors

In addition to the broader description above, the stealer-log suite covers:

- tag-based basic searching
- advanced row-based condition building
- validation of empty or invalid search states
- result download initiation
- password-scheme modal opening
- password-length and character-class filtering
- helper-driven pivots from results
- expansion of matched credential rows
- review of email and telemetry fields inside expanded rows

This means Stealer Logs should be understood as a full hunting workspace with both simple and compound-query modes.

### Consolidated: Full Tested Behaviors

The consolidated area is one of the deepest tested surfaces in the application.

Covered behaviors include:

- opening `Deep Search`
- opening `IOCs`
- using the profile-scoped consolidated view
- searching from the homepage into consolidated
- reviewing defacement-style threat cards inside deep search
- expanding and collapsing grouped threat cards
- inspecting keyword and coverage insight sections
- expanding all insight sections
- searching inside the threat-actor insight panel
- testing no-match behavior inside insight search
- opening report details from consolidated results and returning
- filtering consolidated results by network
- validating that filtered result cards reflect the chosen network
- opening the domain-scanner modal
- running subdomain scans
- running IP lookup when available
- running wayback-style scans when available
- closing the domain-scanner modal
- opening IOC tables for stealer and threat entries
- expanding the first several IOC rows
- switching IOC search terms and validating both non-empty and empty states
- downloading IOC results
- applying password-scheme filters from the consolidated IOC context
- applying date filters that produce both non-empty and empty results

The consolidated right-side insight panel should therefore be considered part of the documented workflow, not an ancillary convenience.

### CTI Graph: Full Tested Behaviors

The CTI suite covers substantially more than opening the graph.

Covered CTI behaviors include:

- switching graph filter type to `Cluster`
- applying CTI filters
- opening the Advanced Graph Builder
- adding multiple advanced-builder rows
- selecting searchable advanced-builder fields
- joining builder rows with `OR`
- executing advanced-builder filters
- clearing generated builder filter chips
- searching the graph toolbar
- validating highlighted results
- opening export-report modals
- switching between graph and list views
- collapsing and expanding the listings panel
- toggling physics simulation
- creating a new CTI session
- renaming a CTI session
- exporting the current session through the `Export Current Session` action
- importing a session from JSON
- closing a session tab
- selecting export format options such as JSON and graph PDF
- opening a context menu from the graph canvas

There is also component-level branch coverage for:

- graph-change handling
- empty category handling
- rotated category sets
- report retrieval by country

Those coverage points confirm fallback and re-render behavior in the current UI.

### Social Intel: Full Tested Behaviors

The social graph area is also extensively exercised.

Covered behaviors include:

- scanning a username
- switching between graph and list views
- clearing graph search
- creating and renaming a social session
- exporting a social report
- opening the add-entity modal
- validating disabled and enabled submit states
- submitting both guided lookup and manual entity entries
- triggering a graph context-menu path
- opening image-based profile search
- uploading an image for recon
- reviewing the manage-profiles modal
- filtering discovered platforms
- fetching profiles
- selecting all discovered profiles and pushing them into the graph
- opening summary popups
- searching profile metadata with tokens
- opening external profile links
- fetching followers
- fetching following
- fetching images
- rescanning a profile
- reopening manage-profiles and cancelling
- opening follower/following scan popups
- switching among followers, following, and connections tabs
- selecting discovered related accounts
- confirming follower/following imports
- opening relationship popups from graph nodes
- opening related account links
- setting an alias through the context menu

This is one of the richest modules in the product and should be documented as a multi-step graph, list, and modal workflow rather than only as a graph view.

### Entity Lookup and Scan Modules: Full Tested Behaviors

Documentation coverage includes every documented live lookup workflow currently present in the main product:

- `Email Breach`
- `Social Scanner`
- `Wanted List`
- `National Identity`
- `Playstore Scanner`
- `Software Scanner`
- `File Scanner`
- `Crypto Scanner`

It also covers the web-scan routes:

- `Basic Scan`
- `Port Scan`
- `Repository Scan`
- `SEO Scan`
- `APK Scan`

Specific validated actions include:

- submitting text lookups
- submitting file uploads
- showing success badges
- downloading reports
- printing reports
- resetting file-upload flows with `Analyze Another File`
- re-uploading and re-running the same scanner after reset

The tested scan and lookup journeys are therefore more specific than a single generic “scan” action. They include:

- email-driven breach validation
- social handle lookups
- wanted-person lookups
- national identity checks
- Playstore package lookups
- software-name searches
- file-upload IOC extraction
- cryptocurrency address or hash lookups
- web-target scans for basic, port, repository, SEO, and APK workflows

### Network Intel: Full Tested Behaviors

The Network Intel suite covers:

- host recon search
- IP scan search
- vulnerability scan search
- target selection inside vulnerability scanning
- depth-aware vulnerability scanning controls
- detail row expansion and collapse
- downloading reports from each main network-intel tab
- export-trigger validation

The Geo IoT modal is also covered end to end, including:

- opening the modal
- closing with the close control
- closing with the cancel control
- switching between map mode and manual mode
- zooming in and out on the map
- editing coordinates manually
- editing radius
- editing max-IP count
- switching back to map mode
- starting a geo scan
- reusing the selected coordinates as the active network-intel query

### Satellite Map: Full Tested Behaviors

The Satellite Map documentation flow covers the embedded Geo Fencing map workspace inside consolidated results.

Covered behaviors include:

- loading the Satellite Map from the dashboard
- loading indexed map entities
- rendering the Leaflet map before screenshots are captured
- selecting all loaded map-entity categories
- showing loaded and visible entity counts
- switching from the street map layer to the satellite imagery layer
- searching loaded map entities from the dashboard panel
- selecting a search result and updating the selection panel
- opening the geocode location modal
- applying coordinates from the location modal
- loading nearby facilities
- showing nearby facility counts and type breakdowns
- enabling aircraft tracking
- enabling ship tracking
- showing aircraft and ship counts in the tracking and facilities panels
- opening the panel menu
- switching to `Imagery Analysis`
- loading comparison imagery from the satellite imagery flow
- running anomaly analysis
- rendering comparison and anomaly output before capture

### Threat Lens: Full Tested Behaviors

The Threat Lens documentation flow covers the standalone Threat Lens workspace.

Covered behaviors include:

- loading the Threat Lens page from the dashboard
- rendering the map fallback during documentation capture
- loading consolidated Threat Lens data
- ranking top highlighted countries from consolidated country metadata
- rendering category-layer rows for leak, tracking, news, exploit, defacement, chat, social, and generic records
- rendering live news feed records
- rendering archive feed records
- running the default IP exposure scan through the Network Intel geo scanner
- showing IP scan scope, radius, status, and marker count
- searching Threat Lens with a keyword
- showing the active keyword state
- applying local archive-feed search
- switching feed range filters
- opening and capturing the Threat Lens filter drawer

### Directory: Full Tested Behaviors

The directory workflow is covered as an operational browsing surface rather than a search-first module.

Covered behaviors include:

- initial page load
- table and empty-state validation
- progressive loading by scrolling
- pagination to page two and back to page one
- filtering by network
- filtering by index
- filtering by content type
- applying and clearing date ranges
- full filter reset

### Account Settings, Preferences, and Reset Journey

The suite covers more account behavior than the current summary described.

Covered account behaviors include:

- avatar upload
- theme toggle
- two-factor toggle
- current-password confirmation for sensitive changes
- one-time recovery-key generation and replacement
- post-update persistence
- returning to login after logout
- viewing the 2FA challenge screen
- requesting password reset from login
- switching between Reset password and Account recovery without retaining fields or errors
- validating email and recovery-key formats before submission
- returning a generic result for validly formatted reset and recovery requests
- reading the reset email flow
- submitting an invalid reused password
- submitting a valid new password
- logging in again with the updated password

### User Management, License Visibility, and Subscription States

The user-management suite covers both admin and non-admin behavior.

Covered behaviors include:

- creating multiple users with different roles
- assigning licenses during creation
- logging in as those users
- verifying sidebar visibility based on assigned licenses
- verifying that some users see only indexed modules
- verifying that some users also see breach, social, exploit, feed, stealer-log, or scanner modules
- updating account preferences as a non-admin user
- triggering the stealer-logs subscription or paywall flow for a demo user
- showing a near-expiry trial banner for a member user
- deleting managed users until only protected system users remain

This means license-aware UI visibility and paywall/subscription behavior are part of the documented product behavior.

In practical terms, the tested product states include:

- users whose sidebar is limited to core indexed modules only
- users who gain additional breach, social, exploit, feed, stealer-log, or scanner visibility through license assignment
- users whose role grants scanner and entity-API access
- demo or limited users who are redirected into subscription/paywall flows instead of full module access
- expiring users who receive warning banners before access changes

### Tenant Provisioning and Tenant Operations

The tenant suite covers the full tenant lifecycle, including both admin-side and tenant-side workflows.

Covered provisioning and onboarding behaviors include:

- tenant signup
- email verification
- admin review of tenants
- tenant verification state changes
- enterprise-license assignment
- tenant onboarding wizard completion
- tenant IOC initialization during onboarding
- creating a tenant sub-user
- editing tenant user quota

Covered tenant-home behaviors include:

- tenant homepage navigation
- alert export
- notification sidebar opening
- opening alert details from notifications
- exporting alert reports from multiple alert contexts
- opening category alert cards
- creating a custom alert
- date filtering for tenant alerts
- flushing all alerts after confirmation through the `Flush All` workflow

The tenant-alert workflow therefore includes both content review and alert-maintenance controls, not only passive monitoring.

### Audit Logs and Administrative Operations

Administrative audit coverage includes:

- opening the audit-log page
- exporting audit records
- applying a date range that intentionally yields no rows
- resetting filters to return to populated records
- using the audit-log page in both tenant-management and standalone admin contexts

### System Settings and Error States

System Settings coverage includes both successful edits and validation failures.

Covered behaviors include:

- opening the system settings page
- entering edit mode
- changing the application name
- editing external URLs such as data sources, adversaries, and pricing
- saving the updated configuration
- attempting to upload an oversized authentication-dashboard icon
- showing the `File too large` validation error for files above `1 MB`

This should be documented explicitly because it is one of the tested administrative guardrails in the platform.

### Case Management: Full Tested Behaviors

The case-management suite covers the active investigation workflow from creation through evidence handling, status movement, closure, sharing, and archive review.

Covered behaviors include:

- opening Case Management from the profile area
- creating a case with core fields and a primary entity
- assigning an analyst when an eligible analyst is available
- opening the created case detail page
- filtering the case list by case ID or text
- filtering by status, severity, priority, and case type
- changing sort order
- switching between open and archived case lists
- switching between `Case List` and `Analytics`
- rendering the analytics panel
- editing case details
- editing the primary entity
- adding and editing related entities
- adding file artifacts
- uploading artifact files
- verifying artifact-file integrity
- showing verified file integrity state
- editing artifact metadata
- adding linked-report artifacts through report source and search controls
- adding raw-alert artifacts
- deleting artifact files
- adding and editing tasks
- adding and editing linked cases
- adding comments
- exporting a case PDF
- creating a public case share link
- revoking case share links
- moving a case through the tracking board with required reasons
- closing a resolved case
- enforcing read-only controls after closure
- archiving a closed case and reviewing it from the archived list

This means Case Management should be documented as a complete investigation workspace rather than only a form for saving case metadata.

### Chatbot and Report Conversation Flow

The report workspace also includes a tested conversational path when the chat widget is enabled.

Covered user-visible behavior includes:

- opening the chat widget from a report
- typing a prompt into the report chat input
- sending the message
- seeing the chat thread render inside the report workspace

```{figure} ../screenshots/report-chatbot-20260326.png
:alt: Report chatbot widget
:width: 100%

Report-level chatbot workflow used for conversational follow-up on an opened record.
```

## Practical Workflows

### Workflow 1: Broad Investigation

1. Start in `Homepage` or `General Intelligence`.
2. Enter a keyword or topic.
3. Use `Advance` and sidebar filters to narrow the results.
4. Switch search mode if the results are too broad or too narrow.
5. Open a report for the most relevant record.
6. Review metadata and open CTI Graph if a relationship pivot is needed.

### Workflow 2: Identity Exposure Check

1. Open `Data Breach` or `Entity Lookup`.
2. Search for an email or identity value.
3. Review breach details or live lookup results.
4. Use Stealer Logs if deeper credential evidence is required.

### Workflow 3: Infrastructure Review

1. Open `Network Intel` or `Web Scans`.
2. Enter a domain or IP.
3. Run the appropriate recon or scan view.
4. For vulnerability scans, choose the target and scan depth that match the investigation need.
5. Review the report, severity, scanned URLs, request details, and evidence.
6. Export the report if it needs to be shared externally.

### Workflow 4: Profile Mapping

1. Open `Social Intel`.
2. Scan a username.
3. Review the graph or list view.
4. Open profile summaries and metadata popups.
5. Add custom entities or manage connections if needed.

### Workflow 5: Tenant Monitoring

1. Configure IOC values in `Profile > IOC`.
2. Review alert summaries from the tenant homepage.
3. Open category alert reports for the highest-risk items.
4. Export alerts when sharing findings with teammates.
5. Adjust `Profile > Alert Scanners` if future scans should include or exclude specific categories.
6. Create or link a case when an alert needs ownership, tasking, or closure tracking.

### Workflow 6: Actor Or Malware Investigation

1. Open `Actors & Malware`.
2. Search by actor name, alias, malware family, country, signature, reporter, or related keyword.
3. Switch between `APT`, `Malware`, and `Compromised-Actors` when the result type is unclear.
4. Open the actor or malware report.
5. Pivot to related indicators, infrastructure, reports, or graph views when relationship context is needed.

### Workflow 7: Geo-Fencing Review

1. Open `Geo Fencing` or `Satellite Intel`.
2. Search for a place or enter coordinates.
3. Review indexed facilities and nearby facility results.
4. Enable aircraft or ship tracking if transportation context matters.
5. Use `Imagery Analysis` for comparison or anomaly review.
6. Switch to `Threat Lens` when country-level threat records or map arcs are more relevant than facilities.

### Workflow 8: Long-Running Scan Review

1. Start the scan from `Entity Lookup`, `Web Scans`, `Network Intel`, or a geo camera workflow.
2. Leave the page only after the scan job has been created.
3. Use the notification or scan-job surface to reopen incomplete or completed scans.
4. Reuse recent completed results when the application offers them.
5. Choose a new scan only when a fresh result is required.

### Workflow 9: Case Handoff

1. Create a case from `Profile > Case-Management`.
2. Add the primary entity and the first set of artifacts.
3. Attach uploaded files, linked reports, or raw alerts as separate artifacts.
4. Verify uploaded artifact-file integrity before handoff where the action is available.
5. Assign analysts or tasks.
6. Use the case filters and analytics view to monitor open, stale, high-risk, or unassigned work.
7. Move the case through the tracking board as work progresses.
8. Close the case only after it reaches `resolved`.
9. Export a PDF or generate a share link for review, then revoke the share when review ends.

## Notes and Limitations

:::{admonition} Feature availability
:class: important

If a module described in this manual is not visible in your sidebar, the most common reasons are role restrictions, license restrictions, or deployment-level configuration toggles.
:::

:::{admonition} External modules
:class: note

Some sidebar items open new tabs or external services rather than rendering inside the main Orion workspace. `CTI Graph`, `Social Intel`, `Onion Link`, `Whistle Blowing`, and `Documentation` may behave this way depending on feature and deployment setup.
:::

:::{admonition} Recommended starting point
:class: tip

New users should begin with `Homepage`, `General Intelligence`, `Data Breach`, and `Stealer Logs` before moving into graph tools, tenant administration, or system administration.
:::
