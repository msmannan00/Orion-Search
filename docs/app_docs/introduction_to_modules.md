# Introduction To Modules

:::{admonition} Scope
:class: tip

This page introduces the major Orion product modules and explains how they fit together. It is written as a product map, not a step-by-step user manual and not a low-level developer reference.
:::

## About This Guide

Orion Intelligence is organized as a group of connected investigation modules rather than one single search page. Some modules are search-first, some are scan-first, some are graph-oriented, and some are administrative. Together they support the full investigation lifecycle:

1. discover a signal
2. narrow and enrich it
3. inspect a report
4. pivot into related data
5. preserve work as scan jobs, cases, exports, or tenant alerts
6. manage tenants, alerts, and system settings

This document explains what each module is for and when to use it.

```{contents}
:local:
:depth: 2
```

## How To Read The Platform

The Orion module set is easiest to understand in ten groups:

| Group                            | What it does                                                                                   | Typical modules                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Access and onboarding            | account entry, verification, tenant setup, subscription notices, and shared public views       | Signup, Login, Password Reset, Welcome, Tenant Onboarding, Notification, Payment Gateway, Case Share, Chat Share                |
| Entry and overview               | search-first landing and high-level summaries                                                  | Homepage, Statistics                                                                                                            |
| Indexed investigation            | query indexed intelligence sources                                                             | General Intelligence, Data Breach, Compromise Monitoring, Social, Exploit, Actors & Malware, News Feed, Stealer Logs            |
| Combined investigation           | merge multiple result channels around one query                                                | Consolidated                                                                                                                    |
| Live lookup and scan             | run direct, targeted checks                                                                    | Entity Lookup, Web Scans, Network Intel, File Scanner, Text Analysis, Crypto Scanner                                            |
| Scan job tracking                | preserve long-running scan state                                                               | scan notifications, scan reports, resume and reuse controls                                                                     |
| Geo-fencing and map intelligence | inspect map entities, facilities, transportation overlays, imagery, and country-linked threats | Satellite Intel, Threat Lens                                                                                                    |
| Relationship analysis            | map entities and pivots visually                                                               | CTI Graph, Social Intel                                                                                                         |
| Profile productivity             | manage analyst workspaces and case records                                                     | AI Workspace, Case Management, Tracking Board, Feeder                                                                           |
| Tenant and administration        | manage users, alerts, quotas, branding, settings, and takedown review                          | Users, Tenants, Tenant Homepage, Manage IOCs, Takedown Requests, Audit Logs, Account Settings, Tenant Settings, System Settings |

## Visibility And Licensing

Module visibility is not universal. The sidebar is built from role, tenant state, deployment configuration, and license checks.

The most important access patterns are:

- admins can usually open the operational modules directly
- demo users may see gated modules but be redirected to subscription or limited demo flows
- Actors & Malware is available for `osint_basic`, `osint_advanced`, and `enterprise` licenses
- Network Intel and geo-fencing workflows are tied to scanning and advanced OSINT-style access
- Stealer Logs uses the `stealer_logs` module gate
- CTI Graph and Social Intel have separate graph and social-mapper gates
- Case Management requires case-management access and is more restricted for analyst users than for admins or maintainers
- tenant alert visibility depends on alert type, tenant licenses, user licenses, and configured scanner categories
- Takedown Requests is a root-tenant administrator review surface; defacement-module users can initiate takedown evidence requests from eligible compromise reports, but only root administrators can accept or reject those requests

If a module is described here but not visible in the application, check license assignment, user role, tenant status, and deployment feature toggles before assuming the feature is unavailable.

## Access, Onboarding, And Shared Views

These features are not investigation modules, but they are part of the complete application surface.

### Signup And Login

Signup collects username, email, and password, validates username format, evaluates password requirements, and sends successful registrations to the welcome flow. Login starts the authenticated dashboard session.

### Password Reset

Password Reset handles both reset request and reset-token views. It belongs to the access lifecycle rather than the analyst dashboard.

### Welcome And Verification

Welcome appears after signup and after email verification links. The verification flow checks the user token and reports whether verification succeeded, expired, or failed.

### Tenant Onboarding

Tenant Onboarding collects tenant identity and optional IOC values before the user enters the dashboard. The IOC step respects privileged IOC restrictions, so some users can review tenant setup without editing out-of-domain IOC values.

### Notification And Payment Gateway

Notification and Payment Gateway screens display trial, subscription, or payment-related messages. They are product screens even though they do not expose investigation data.

### Public Case And Chat Shares

Case Share and Chat Share routes expose narrow public views from generated share links. They are designed for controlled external review without giving the viewer broad application access.

## Entry And Overview Modules

### Homepage

Homepage is the primary landing area for many users. It acts as a search-first overview rather than a static welcome page.

Depending on role, tenant state, and license assignment, Homepage can function as:

- a direct search starting point
- an insight dashboard with counts and summaries
- a tenant alert overview
- a simplified landing experience for restricted users

Use Homepage when you want to start broad and decide which module to enter next.

### Statistics

Statistics is the summary-oriented view for users who want visual coverage information without starting with an immediate query. It is useful for high-level monitoring, trend review, and quick triage.

## Indexed Investigation Modules

Indexed modules are the core analyst-facing search surfaces. They operate on collected and processed data that has already been ingested into the platform.

### General Intelligence

General Intelligence is the broadest indexed search module. It is used when the analyst wants to search for a topic, keyword, organization, product, actor, or event across mixed source types.

Typical subviews include:

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

This is usually the best starting point when the user only has a broad concept and needs initial coverage.

### Data Breach

Data Breach focuses on breach records, exposed credentials, identity exposure checks, leak references, and breach-related listing material.

Typical subviews include:

- `All`
- `Databases`
- `Tracking`

Use this module when starting from:

- an email address
- a known breached identity
- a leak URL or dump reference found in a breach report
- a need to verify whether a person or account appears in breach datasets

### Compromise Monitoring

Compromise Monitoring is the sidebar label for the defacement-focused investigation module. It tracks hacked, altered, cloned, or phishing-related website incidents. It is more operationally focused than General Intelligence because it emphasizes target and attacker context.

Typical subviews include:

- `All`
- `Hacked`
- `Phishing`
- `Databases`

Use Compromise Monitoring when you are investigating compromised websites, defacer identity, or site-level incident evidence.

### Social

Social aggregates intelligence from community and social-style sources. It is useful for chatter discovery, leak references, early warning, and platform-specific narrative tracking.

Typical subviews include:

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

Use Social when timing, conversation context, or platform origin matters as much as the content itself.

### Discussion Route

Discussion is an alternate workflow for chat and social result views. It opens the current discussion-style result container while still using the same report components for chat, social, general, leak, exploit, and compromise-monitoring documents.

Use the current Social module for normal sidebar navigation. Use Discussion for workflows that open combined chat/social result contexts.

### Exploit

Exploit covers vulnerability and exploit-related material. It is intended for users starting from a vulnerability identifier, exploit reference, tooling name, or active exploit discussion.

Typical subviews include:

- `All`
- `CVE`
- `Tools`
- `ZeroDay`

This module is useful for vulnerability intelligence and exploit monitoring workflows.

### Actors & Malware

Actors & Malware is the APT Intel workspace for adversary and malware tracking. It combines actor reports, malware-family records, and compromised-actor style views in the same investigation area.

Typical subviews include:

- `All`
- `APT`
- `Malware`
- `Compromised-Actors`

Use Actors & Malware when the investigation starts from:

- an APT actor or alias
- a malware family, signature, or reporter
- a country-linked threat actor question
- a need to compare actor and malware records together

### News Feed

News Feed is a stream-style reading surface for current reporting and intelligence-style news. It is less about constructing a precise query and more about scanning active reporting and recent coverage.

Typical subviews include:

- `News`
- `Tracking`

## Combined Investigation Module

### Consolidated

Consolidated is the cross-module triage workspace. Instead of forcing the user to choose one indexed module first, it lets a single query drive multiple result channels in parallel.

Typical views include:

- `IOCs`
- `Deep Search`
- `Network Intel`

Use Consolidated when:

- you want breadth before precision
- you are still deciding which pivot matters most
- you need both indexed results and supporting enrichment around the same query

Consolidated is especially useful early in an investigation because it can combine search, insight panels, and pivot opportunities in one place.

## Live Lookup And Scan Modules

These modules do not rely only on previously indexed content. They run targeted checks or live workflows against supplied input.

### Entity Lookup

Entity Lookup is the lookup-oriented module for direct checks against a supplied entity. The sidebar label is `Entity Lookup`, and the module groups focused enrichment workflows in one place.

Typical lookup types include:

- `Email Breach`
- `Social Scanner`
- `Wanted List`
- `National Identity`
- `Playstore Scanner`
- `Software Scanner`
- `File Scanner`
- `Text Analysis`
- `Crypto Scanner`

Use Entity Lookup when the user already has a concrete entity and wants direct enrichment rather than broad indexed discovery.

Several lookup workflows are tracked as scan jobs so users can reopen or resume results instead of repeatedly launching the same long-running check.

### Text Analysis

Text Analysis is part of Entity Lookup. It is used to inspect supplied text for spam or malicious URL signals rather than searching indexed records.

Use Text Analysis when the artifact is copied text, a message body, or a suspicious URL-containing snippet.

### Web Scans

Web Scans is the live scanning surface for web-facing targets. It is used for target inspection, posture review, and evidence-driven reporting across web, repository, SEO, network, and APK analysis workflows.

Typical scan types include:

- `Basic Scan`
- `Port Scan`
- `Repository Scan`
- `SEO Scan`
- `APK Scan`

Use Web Scans when starting from:

- a domain
- a website
- a repository
- a mobile application package

### Tracked Scan Jobs

Tracked Scan Jobs is not a standalone analyst module, but it is a core cross-cutting workflow. Long-running scans are stored with an API reference, target, metadata, status, and result payload so users can return to the output after navigation or refresh.

Tracked job behavior affects:

- Entity Lookup scans
- Web Scans
- Network Intel scans
- Crypto scans
- dynamic social and identity lookups
- wanted-list and national-identity lookups
- geo camera detection flows

Use scan jobs when the operation is expensive, long-running, or likely to be resumed from a notification or scan report view.

### Network Intel

Network Intel is the infrastructure-focused live recon module.

Typical tabs include:

- `Host Recon`
- `IP Scan`
- `Vulnerability Scan`

Use Network Intel when the user needs:

- domain-to-IP resolution
- service and port context
- infrastructure review
- vulnerability findings
- geo-assisted pivots

Vulnerability Scan supports per-target scan depth. `Low` is the fast first-pass option, `Medium` adds passive security and CVE lookup coverage, and `High` adds deeper spidering before passive checks and CVE lookup. Use the deeper options when the target needs more coverage and the operator accepts a longer scan.

## Geo-Fencing And Threat Modules

### Satellite Intel

Satellite Intel is the geo-fencing map workspace. It combines indexed map entities, nearby facility lookup, selected-location state, satellite imagery comparison, anomaly review, and live aircraft or ship overlays.

Use Satellite Intel when the investigation starts from:

- a location or coordinate
- a facility, airport, port, warehouse, industrial site, or power-generation asset
- transportation movement near an area of interest
- before-and-after satellite imagery
- infrastructure exposure that needs map context

The same map workspace can appear from the Geo Fencing sidebar entry or inside consolidated geo-fencing flows.

### Threat Lens

Threat Lens is the country and map-oriented threat-intelligence view. It converts consolidated threat records into country highlights, category layers, feed cards, archive lists, and map arcs. It can also trigger geo camera and IP exposure scanning around the active map scope.

Use Threat Lens when the investigation needs:

- country-level threat distribution
- category relationships between countries
- threat feed review by geography
- map-driven IP or camera exposure context
- a bridge between consolidated records and geo-fencing analysis

Threat Lens is available as its own geo-fencing workspace and from the Satellite Intel tab switcher.

## Relationship And Graph Modules

### CTI Graph

CTI Graph is the cyber relationship-mapping module. It is intended for cases where the investigation is no longer about a single search result and instead becomes a network of documents, properties, entities, and associations.

Use CTI Graph when you need to:

- connect records together
- inspect clusters
- pivot from one property to another
- export or explain a relationship model
- combine several graph fields with the Advanced Graph Builder

This module is especially valuable after the user has already identified promising records elsewhere in the platform.

The Advanced Graph Builder extends normal CTI filters by letting users combine searchable fields, cluster values, and text values with `AND` or `OR` conditions before executing the graph query.

### Social Intel

Social Intel is the graph-oriented social-identity mapping module. It focuses on usernames, profiles, platforms, and relationships across social ecosystems.

Use Social Intel when the investigation centers on:

- username reuse
- profile correlation
- image and reverse-image profile discovery
- posts, videos, shorts, followers, following, images, and metadata review
- follower or connection review
- forum profile, saved profile, wanted-list, and stealer-log context where available
- graph-based social mapping

It complements the Social search module: Social finds content, while Social Intel maps identities and relationships.

## Shared Report Workflows

Report pages consolidate the record content, metadata, export actions, sharing actions, translation, AI summary where enabled, source links, and CTI Graph pivots. Some report pages also include feedback controls for recommended, trusted, and untrusted states so teams can signal review confidence directly on the record. Those feedback reactions appear in user activity where visibility allows it.

Comments, public user activity, and profile sidebars support collaboration around reports where those controls are enabled. Use these workflows when a record needs review context before it is exported, linked to a case, or shared for handoff.

Compromise Monitoring reports can also expose an `Initiate Takedown` action when the report has a target URL and the user has the required defacement-module access. That action captures public abuse-contact evidence and creates an administrator review entry instead of immediately dispatching an abuse message. Once a request exists for the target domain, the report shows the current public takedown state, such as `Takedown in progress`, `Takedown denied`, `Takedown reported`, or `Takedown failed`.

## Support And External Modules

### Directory

Directory is a browsing-oriented view for monitored and crawled service references. It is less query-centric than the main search modules and more useful for reviewing monitored services as a catalog.

### Links

Links is the navigation entry into the directory-style workflow. It acts as the user-facing path to monitored service browsing.

### Onion Link

Onion Link opens the deployment’s onion endpoint when that capability is enabled. It is an external-access bridge rather than an analytical module.

### Whistle Blowing

Whistle Blowing opens the secure reporting path used for direct or anonymous submissions where that feature is enabled. It is adjacent to the investigation platform but distinct from the analyst workflow itself.

### Documentation

Documentation links to the published docs set so users can move between the application and written guidance without leaving the platform context entirely.

## Profile, Tenant, And Administration Modules

These modules govern user identity, tenant operations, quotas, and platform configuration.

### AI Workspace

AI Workspace is the profile-area assistant and chat workspace. It is used for support-style and investigation-assistant flows when the deployment enables the AI endpoint.

Use AI Workspace for:

- asking support or documentation questions from inside the app
- preserving shared chat links where enabled
- moving between investigation context and assistant output
- using quick prompts, markdown-rendered replies, message copy/edit actions, streaming stop, retry, and chat-history recovery

### Public User Activity

Public User Activity is opened from profile, comment, or report interactions. It shows a user profile image and visible activity items when tenant and user profile visibility allow it.

Use this view when reviewing who interacted with a report, comment thread, or investigation item.

### Case Management

Case Management turns alerts, findings, and analyst leads into tracked investigation records. It includes case creation, case details, primary and related entities, artifacts, files, tasks, comments, linked cases, closure records, sharing, PDF export, and a tracking board.

Use Case Management when:

- an alert needs ownership and workflow state
- findings need evidence, tasks, and notes
- an analyst needs to assign or track work
- the result needs a share link or PDF report
- admin users need to review tenant alert categories from a case-management context
- teams need filtered case lists, analytics, workload review, stale-case review, or high-priority triage

Case status movement follows a fixed board flow, while closure is handled separately from the case details page after the case reaches the resolved state.

Each board move requires a reason and stores that reason in the status history, giving reviewers a concise timeline of why the case moved between workflow states.

Artifacts can include uploaded files, URL captures, raw alerts, chat transcripts, screenshots, generic evidence, and linked Orion reports. File artifacts can carry multiple files and expose integrity verification where the user's role allows it.

### Feeder

Feeder is the profile-area workflow for source or rule intake where the feature is licensed and enabled. It is used to manage feed-style collection rules and ownership flows rather than search results directly.

Feeder supports:

- a rule catalog
- Python parser uploads for file-backed rules
- URL value storage for value-backed rules
- shared parser/session setup for shared rules
- social-media rule grouping for supported social platforms
- script listing, search, sorting, enable/disable, delete, clear, and owner transfer where allowed

### Monitoring, Event Management, And Log Manager

These profile modules are operational administration surfaces:

- Monitoring groups operational tabs such as Log Manager, Auditlog, and Event Management.
- Event Management supports SIEM-style search, date filters, IOC-style search tags, pagination, and expanded event review.
- Log Manager is used for operational log inspection, type/date filtering, pagination, individual log-file deletion, and full log flush where enabled.

These modules are not always visible to every tenant user because they depend on role and maintainer-style access.

### Account Settings

Account Settings is the current-user profile area. It is used for the personal account surface rather than tenant-wide administration.

Common concerns here include:

- user identity details
- image and profile information
- assigned licenses
- two-factor settings
- theme and preference choices

### Tenant Homepage

Tenant Homepage is the tenant-scoped monitoring and alert overview. Depending on role and licensing, it can act as a dashboard for alert counts, monitored IOC coverage, and tenant summary actions.

Current tenant alert workflows can include category summaries, category-specific drilldowns, export actions, notification review, scan-all and flush-all actions, and alert scanner settings for tenants that are allowed to manage scanner categories.

Tenant alert scanner settings control the tenant's allowed scanner categories for future scans. Admin-side tenant controls can also set alert visibility, allowed alert access, alert run time, and allowed scanner categories.

### Take Down

Take Down is the root-administrator review workspace for abuse/takedown evidence requests created from compromised-site reports or from a manual target URL. The sidebar label maps to `Takedown Requests`, and the route is `/dashboard/profile/take-down`.

Use Take Down when:

- a defacement or compromise-monitoring report needs abuse-provider follow-up
- a root administrator needs to review captured evidence before email dispatch
- the team needs to search, filter, accept, or reject takedown requests
- a manually supplied target URL needs the same abuse-contact capture and review flow

The workspace lists target domain, target URL, captured abuse email, requester, status, and available action buttons. Root administrators can accept a pending request, which dispatches the takedown email using captured evidence, or reject it with a reason. Non-root users do not see this review page, even though eligible users can still create requests from report pages when their role and module license allow it.

### Manage IOCs

Manage IOCs is the tenant-maintained list of monitored values used in alerting and related search workflows. This module matters because tenant monitoring quality depends directly on the IOC set being maintained correctly.

IOC management supports manual values and CSV import. CSV files use a `key,value` format and are validated against the supported IOC entity keys before values are merged into the tenant IOC list.

### Tenant Settings

Tenant Settings stores tenant-level information such as identity, contact, quota, and assigned licenses. It is the central administrative page for tenant configuration.

### Users

Users is the tenant user-management page. It is used to add, review, update, and remove tenant users while respecting quota and role constraints.

### Tenants

Tenants is the higher-privilege administration surface for multi-tenant oversight across the platform. It is used to manage tenant state, licensing, verification, quotas, tenant alert visibility, allowed alert access, alert run time, scheduled alert scans, allowed alert scanner categories, Privileged IOC handling, user permissions, and tenant-specific alert access scopes.

### Audit Logs

Audit Logs provides a trace of platform activity across user and tenant actions. It is the main administrative history view for reviewing who performed what action and when.

### System Settings

System Settings is the platform-wide configuration page. It is used for branding, feature visibility, application identity, SMTP mail delivery settings, public URL settings, external data-source/adversary/pricing links, admin panel visibility, and selected runtime status indicators.

This is the administrative module that affects the product globally rather than one user or one tenant.

## How Modules Work Together

A useful way to think about Orion is as a layered investigation flow:

1. start broad in `Homepage`, `General Intelligence`, or `Consolidated`
2. move into a specialist indexed module such as `Data Breach`, `Compromise Monitoring`, `Social`, `Exploit`, `Actors & Malware`, `News Feed`, or `Stealer Logs`
3. open a report for detailed review
4. pivot into `Entity Lookup`, `Web Scans`, `Network Intel`, `Satellite Intel`, `Threat Lens`, `CTI Graph`, or `Social Intel`
5. preserve long-running work as a scan job or case when needed
6. finish in tenant or administrative modules if action, alerting, or governance is needed

This means the modules are not isolated products. They are connected stages of one investigation system.

## Choosing The Right Module

### Start Here If You Have A Broad Topic

Use:

- `Homepage`
- `General Intelligence`
- `Consolidated`

### Start Here If You Have A Specific Artifact

Use:

- `Data Breach` for exposed identities, emails, leak URLs, and dump references
- `Actors & Malware` for APT actor and malware-family intelligence
- `Entity Lookup` for direct entity checks
- `Network Intel` for infrastructure targets
- `Web Scans` for target scanning
- `Satellite Intel` for coordinates, facilities, imagery, or transport overlays
- `Threat Lens` for geography-oriented threat records

### Start Here If You Need Relationships

Use:

- `CTI Graph` for cyber relationship mapping
- `Social Intel` for identity and profile mapping

### Start Here If You Need Governance Or Administration

Use:

- `Users`
- `Tenants`
- `Audit Logs`
- `Tenant Settings`
- `System Settings`
- `Take Down` for root-administrator takedown review
- `Case Management`
- `Feeder`

## Related Documents

- [User Manual](./user_manual.md)
- [Developer Documentation](./developer_documentation.md)
