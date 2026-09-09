(developer-documentation)=

# Developer Documentation

:::{admonition} Scope
:class: tip

This page is for engineers working on the Orion Intelligence codebase in this repository. It focuses on architecture, runtime services, development workflows, testing, documentation generation, and operational boundaries. It intentionally avoids exposing real secrets or environment-specific credentials.
:::

## About This Guide

Orion Intelligence is a containerized investigation platform with a web client, backend APIs, search infrastructure, monitoring surfaces, and documentation tooling. In practical terms, developers usually interact with the system in five ways:

1. build and start the stack
2. work on the Angular client and FastAPI backend services
3. run automated tests and seeded flows
4. update search, collector, or API behavior
5. maintain documentation and screenshot generation

This document is organized around those tasks.

```{contents}
:local:
:depth: 2
```

## System Overview

Orion Intelligence combines user-facing investigation workflows with backend search, scanning, and administrative services. The repository primarily represents the web application layer that sits between collected data and analyst workflows.

At a high level, the system includes:

- a frontend client under `client/`
- backend application code under `backend/`
- container orchestration through Docker Compose
- a build-and-run entry script in `run.sh`
- generated and maintained documentation under `docs/`

The wider Orion ecosystem also references adjacent projects such as crawlers, collectors, and other supporting components, but this repository is centered on the search and investigation platform itself.

### Current Product Surface

The current application is not only a search UI. Developers should treat the repository as a multi-surface product with several route families:

| Surface                        | Frontend route family                                                                                                                    | Main backend/API areas                                                                          | Notes                                                                                                                                                                                                       |
|--------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Access lifecycle               | `/signup`, `/login`, `/reset`, `/welcome`, `/welcome/:token`, `/onboarding`, `/notification`, `/paymentGateway`                          | auth, verification, onboarding, notification, subscription, and tenant update routes            | These routes are part of the product even though they are outside the authenticated dashboard shell.                                                                                                        |
| Shared public views            | `/case-share/:shareId`, `/chat-share/:shareId`                                                                                           | `/api/public/case-shares/*`, `/api/public/chat-shares/*`                                        | Public share views are intentionally narrow and token/link scoped.                                                                                                                                          |
| Indexed search                 | `/dashboard/strategic`, `/dashboard/breach`, `/dashboard/social`, `/dashboard/exploit`, `/dashboard/apt-intel`, `/dashboard/stealerlogs` | `/api/search/*`                                                                                 | Result models, filters, reports, STIX exports, and analytics are shared across several modules.                                                                                                             |
| Alternate search routes        | `/dashboard/discussion`, `/dashboard/social-mapper`, `/dashboard/social-graph`                                                           | social, chat, and graph routes                                                                  | These routes are supported entry points into the current discussion, social, and graph feature surfaces.                                                                                                    |
| Consolidated investigation     | `/dashboard/consolidated`, `/dashboard/profile/consolidated`                                                                             | `/api/search/consolidated`, consolidated helper APIs                                            | Used for multi-channel triage and profile-oriented investigation flows.                                                                                                                                     |
| Entity lookup and scans        | `/dashboard/api/*`, `/dashboard/scanner/*`, `/dashboard/netint`, `/dashboard/scan-report/:scanId`                                        | `/api/dynamic/*`, `/api/urlscan/*`, `/api/netintel/*`, `/api/scan-jobs/*`                       | Many long-running operations use tracked scan jobs and can reopen existing results. Network Intel vulnerability scans also expose per-target scan depth.                                                    |
| Geo-fencing                    | `/dashboard/satellite-intel`, `/dashboard/threat-lens`                                                                                   | `/api/search/map-entities/*`, `/api/threat/lens`, `/api/satellite/*`, geo camera scan APIs      | License-gated map, facility, imagery, aircraft, ship, and threat-lens workflows.                                                                                                                            |
| Graphs and social intelligence | `/dashboard/ctigraph`, `/dashboard/social-intel`                                                                                         | `/api/graph`, `/api/social/*`                                                                   | Graph modules often open in a separate workspace or tab and depend on license gates. CTI Graph includes the Advanced Graph Builder in addition to the basic graph filters.                                  |
| Tenant and profile operations  | `/dashboard/profile/*`, `/dashboard/tenant/*`                                                                                            | profile, tenant, IOC, alert, SIEM, case, audit, feeder, takedown, system log, and settings APIs | Visibility depends heavily on role, tenant state, permissions, and licenses. AI Workspace, chat sharing, case analytics, artifact files, tenant-alert review, and takedown review are part of this surface. |

When a feature changes one of these surfaces, check both route wiring and written docs. For example, adding a new scan API usually touches backend route metadata, the Angular route or component, scan-job behavior, API docs, and user-facing module documentation.

## Core Architecture

### Primary Layers

The application is easiest to understand as four cooperating layers:

| Layer            | Main responsibility                                       | Typical technologies                    |
|------------------|-----------------------------------------------------------|-----------------------------------------|
| Presentation     | analyst UI, reports, settings, tenant flows               | Angular, Cypress                        |
| Application      | APIs, orchestration, auth, search logic, scans            | FastAPI, Python backend services        |
| Data and Search  | indexing, persistence, caching, task state                | Elasticsearch, MongoDB, Redis, ArangoDB |
| Delivery and Ops | containers, reverse proxy, static delivery, health checks | Docker Compose, NGINX                   |

### Frontend

The frontend lives in `client/` and powers:

- dashboard navigation
- search and filtering
- report pages
- graph and social-intel views
- tenant and system administration pages

The UI is built as a routed Angular application and is tested with Cypress end-to-end coverage.

### Backend

The backend lives in `backend/` and provides:

- user and tenant APIs
- indexed search endpoints
- report and metadata retrieval
- scan and lookup APIs
- documentation and public API descriptions
- test fixtures and mocks

Backend routes and generated API docs are also used to drive the published docs set under `docs/api_docs/`.

### Supporting Services

The running platform depends on several stateful services. The exact compose file varies by mode, but the logical service map is stable:

- `Elasticsearch` for search and indexed retrieval
- `MongoDB` for document-style persistence
- `Redis` for cache and queue-like coordination
- `ArangoDB` for graph-oriented workloads used by parts of the platform
- `NGINX` for delivery and reverse-proxy behavior

In some environments, additional operational surfaces may exist for API docs, logs, or task monitoring. Those are deployment concerns, not core application concepts.

## Repository Map

The most important top-level paths are:

| Path                           | Purpose                                                                       |
|--------------------------------|-------------------------------------------------------------------------------|
| `client/`                      | frontend application, Cypress tests, client build config                      |
| `backend/`                     | API, business logic, docs routes, static test fixtures                        |
| `docs/`                        | application docs, API docs, screenshots, docs generation scripts              |
| `docs/app_docs/`               | published product, user, developer, module, and Swagger-style reference pages |
| `docs/api_docs/`               | maintained per-endpoint API documentation fragments and API bundles           |
| `backend/routes/docs/docs.py`  | route-description source consumed by backend OpenAPI metadata                 |
| `docs/api_docs/source_docs.py` | source input for regenerated Markdown API docs                                |
| `nginx/`                       | NGINX configuration variants                                                  |
| `run.sh`                       | local orchestration entry point                                               |
| `docker-compose*.yml`          | environment-specific stack definitions                                        |

## Runtime and Environment

### Environment Configuration

The project uses a root `.env` file for service and application settings. This file can include:

- service credentials
- runtime mode toggles
- feature flags
- domain and deployment settings
- testing mode state

:::{warning}
Do not place real credentials in documentation, examples, screenshots, or committed sample files. If sensitive values were ever committed historically, rotate them and remove them from version history.
:::

### Build Modes

`run.sh` is the main local orchestration entry point. It always stops any previous stack first, recreates parser assets, selects the correct compose file, starts Docker services, and then applies additional behavior based on the command and flag.

### `run.sh` Command Reference

| Command                 | Purpose                                            | What it does                                                                                                                                        |
|-------------------------|----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `./run.sh`              | start default local stack                          | uses `docker-compose.yml` and starts the application without rebuilding images                                                                      |
| `./run.sh stop`         | stop local stack                                   | runs compose shutdown, removes orphans, and removes the standalone nginx container if present                                                       |
| `./run.sh production`   | start production-oriented runtime                  | uses `docker-compose-production.yml` and starts the stack without rebuilding                                                                        |
| `./run.sh -doc`         | generate documentation screenshots                 | aliases the docs workflow by first running `./run.sh build -t`, then clearing old screenshots and running the Cypress screenshot job                |
| `./run.sh -docs`        | generate documentation screenshots                 | aliases the docs workflow by first running `./run.sh build -t`, then running the Cypress screenshot job without clearing existing screenshots first |
| `./run.sh build <flag>` | rebuild application containers for a specific mode | runs dependency install and linting, applies the selected frontend/backend mode, then executes `docker compose build` before starting services      |

The optional `-ip` prefix updates `SWARM_URL` to the current local IP before the selected command runs. Use it only when other services need to reach this workstation by LAN address rather than loopback.

Production rebuilds can also accept `-full` as the third argument: `./run.sh build -p -full`. In that mode the script force-recreates production compose services after build and pull steps. Production mode also enables the maintenance flag while rebuilding, validates `client/build/assets/data/map/world.json`, tests the running NGINX config with `nginx -t`, reloads NGINX, waits for the configured public server, and then disables maintenance mode.

### `build` Flags

All supported `build` flags are listed below.

| Flag  | Primary use                                                         | Key behavior                                                                                                                                                                                                                                                                                      |
|-------|---------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `-t`  | frontend and Cypress test workflow                                  | sets `TESTING_ENABLED="1"`, builds the Angular client with the `instrumented` configuration, uses `docker-compose-testing.yml`, starts the stack, and waits for `https://127.0.0.1:8443/api/public` before tests                                                                                  |
| `-tb` | protected backend test workflow                                     | same stack setup as `-t`, then runs containerized backend pytest through `run_backend_tests_protected`                                                                                                                                                                                            |
| `-c`  | rebuild client only for default local mode                          | builds the production client bundle, ensures local SSL certs exist, copies `nginx/nginx-dev.conf`, uses `docker-compose.yml`, and rebuilds images                                                                                                                                                 |
| `-b`  | rebuild backend and containers without rebuilding the client bundle | ensures local SSL certs exist, copies `nginx/nginx-dev.conf`, uses `docker-compose.yml`, and rebuilds images                                                                                                                                                                                      |
| `-d`  | general default-mode rebuild                                        | builds the production client bundle, ensures local SSL certs exist, copies `nginx/nginx-dev.conf`, uses `docker-compose.yml`, and rebuilds images                                                                                                                                                 |
| `-p`  | production-oriented rebuild                                         | builds the production client bundle, copies `nginx/nginx-prod.conf`, uses `docker-compose-production.yml`, prepares `/srv/elasticsearch/data`, keeps Elasticsearch private to the Docker network with password authentication, rebuilds images, and waits for `https://try.orionintelligence.org` |

Testing mode is the path most developers will use day to day. It enables the application testing flag, creates the instrumented frontend bundle, starts the testing compose stack, and blocks until the test service is reachable before Cypress is launched.

Backend test runs can be controlled with `SKIP_BACKEND_TESTS` and `BACKEND_TEST_TIMEOUT` when using the protected backend-test path.

### Scan Job Runtime Contract

Several scan-style APIs now run through `ScanJobManager` rather than returning only a direct synchronous result. This affects Entity Lookup, Web Scan, Network Intel, Crypto, Social, Wanted List, National Identity, and geo camera workflows.

The backend routes usually call `run_tracked_scan()` with:

- the authenticated user
- an `api_reference` such as `dynamic/user`, `urlscan/domain`, or `netintel/ipscanner`
- the request payload
- metadata containing a title and target
- a runner callable that executes the real scan
- an optional `force_new` flag

The frontend can then list, poll, reopen, mark seen, clear, or delete scan jobs through private `/api/scan-jobs/*` helper routes. When changing scan behavior, keep the UI and docs aligned with these rules:

- identical running scans should reuse the active job
- recently completed identical scans can reopen the previous result
- previous matching scans can offer a choice between reuse and `force_new=true`
- terminal notifications can be marked seen or cleared
- incomplete jobs should remain recoverable through the profile/home notification surface

### Compose Variants

The repository includes multiple compose definitions so the same codebase can be started in different modes:

- default local mode
- testing mode
- testing mode with backend test execution
- production-oriented mode

Developers should treat the compose file as the runtime contract for the application. If a feature depends on an external service, health check, or environment variable, the compose configuration is where that dependency becomes operational.

## Local Development Workflow

### Standard Flow

For most application work, the practical loop is:

1. update code in `client/`, `backend/`, or docs
2. run `./run.sh build -t`
3. wait for the script to finish the readiness check against `https://127.0.0.1:8443/api/public`
4. run targeted Cypress tests from `client/`
5. inspect the UI or generated docs output

The Cypress entry point is the `test` script in `client/package.json`, which maps to the Cypress CLI. After `./run.sh build -t` completes, targeted tests should be run with `npm test run ...` from `client/`.

Common examples:

- `cd client && npm test run --browser electron`
- `cd client && npm test run --browser electron --spec cypress/e2e/09-tenant-management.cy.ts`
- `cd client && npm test run --browser electron --config baseUrl="http://127.0.0.1:8080"`

This is important because `./run.sh build -t` prepares and starts the instrumented application stack, but it does not automatically execute Cypress. The test run is a second explicit step.

### Frontend Work

When changing user-facing behavior, common touchpoints include:

- route components under `client/src/app/pages/`
- shared report and layout partials under `client/src/app/shared/`
- controller helpers under `client/cypress/e2e/controllers/`
- Cypress specs under `client/cypress/e2e/`

UI changes should be validated against:

- route-level navigation
- filter and report behavior
- tenant/admin permission differences
- responsive layout where relevant

### Backend Work

When changing APIs or data behavior, common touchpoints include:

- route handlers and managers in `backend/`
- generated docs helpers in `backend/routes/docs/`
- test coverage under `backend/tests/`
- mock search data under `backend/tests/mock/`

Backend changes should be validated against both API behavior and the frontend workflows that consume those responses.

## Testing Strategy

### Frontend End-to-End Tests

The main UI verification layer is Cypress. The test suite covers:

- login and account flows
- search and filter behavior
- tenant management
- dashboard modules
- admin and system settings
- docs screenshot generation

Tests live under `client/cypress/e2e/`. Reusable actions are extracted into controller files so large specs remain readable and less brittle.

The expected developer sequence is:

1. run `./run.sh build -t`
2. wait for the readiness check to finish
3. run `cd client && npm test run --browser <browser> --spec <spec>`

`npm test run` works because the `test` script is defined as `cypress`, so the command expands to the Cypress CLI with the `run` subcommand. This should be the default way to execute a specific Cypress spec after a `build -t` rebuild.

### Backend Tests

Protected backend tests can run in a dedicated containerized path. The repository already includes a helper in `run.sh` that executes pytest in an isolated service context when the appropriate build mode is selected.

Use `./run.sh build -tb` when the goal is to run the protected backend pytest path. That mode starts the testing stack, waits for readiness, and then runs:

- `python -m pytest -q tests --maxfail=1 --disable-warnings`

This is the preferred path for:

- manager logic
- route behavior
- serializer or schema validation
- integration points that depend on service configuration

### Fixtures and Mocks

The repository contains static mock data for predictable testing, especially around indexed search behavior. This matters because many user workflows depend on rich search results rather than simple CRUD pages.

Developers should prefer deterministic fixtures over ad hoc live data when adding or stabilizing tests.

## Documentation Workflow

### Application Docs

Public application documentation lives under `docs/app_docs/`. These public files describe:

- the platform
- major modules
- the user manual
- developer workflows

Docs in this area should be written for scannability:

- short sections
- clear headings
- limited duplication
- role-aware wording where permissions or licenses affect visibility

### API Docs

API documentation has three related layers. Treating them as interchangeable is what causes drift.

| Layer                        | Location                                            | Purpose                                                              | Maintenance rule                                                                                                                          |
|------------------------------|-----------------------------------------------------|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| Live schema                  | FastAPI `/openapi.json` from backend route metadata | Machine-readable contract for routes included in schema              | Update route summaries, descriptions, response descriptions, tags, dependencies, and unique `operation_id` values in backend route files. |
| Maintained API docs          | `docs/api_docs/` and `docs/api_docs/source_docs.py` | Human-written per-endpoint explanations, examples, and bundle output | Update when request shape, response shape, endpoint availability, examples, or semantics change.                                          |
| Published Swagger-style page | `docs/app_docs/swagger_api_reference.md`            | Single published reference page for integrators reading the app docs | Keep as a generated or synchronized artifact; do not let it become the only source of truth.                                              |

The `api_docs` directory is the better source-of-truth layer for endpoint prose because it is structured by endpoint family and can be reviewed incrementally. `swagger_api_reference.md` is useful as a consolidated published page, but it is redundant as an editing source if it is not regenerated or synchronized from the schema and maintained API docs.

When API output or contract wording changes, update the backend route metadata and `docs/api_docs/` together, then refresh or manually synchronize `swagger_api_reference.md`.

### API Documentation Checklist

Use this checklist whenever adding, deleting, renaming, or changing a documented API:

1. Confirm whether the route should be public in `/openapi.json` or hidden with `include_in_schema=False`.
2. Give every public route a stable and unique `operation_id`.
3. Attach the correct tag, summary, description, and response description.
4. Use the matching docs dictionary key in `backend/routes/docs/docs.py`; for example, social search uses `SEARCH_DOCS["social"]`, APT Intel search uses `SEARCH_DOCS["apt_intel"]`, and social reports use `REPORT_DOCS["social"]`.
5. Update `docs/api_docs/source_docs.py` and the relevant Markdown file under `docs/api_docs/`.
6. Update `docs/api_docs/README.md` and `docs/api_docs/ALL.md` when endpoint families are added or removed.
7. Update `docs/app_docs/swagger_api_reference.md` only after the endpoint index and detailed endpoint sections are consistent with the live route set.
8. Run a stale-reference scan for endpoint paths, category names, and screenshot references.

Current public API coverage:

- `POST /api/search/social` documents Social search, including Telegram-oriented searches through the supported Social search request fields.
- APT Intel search is `POST /api/search/apt-intel`; APT and malware detail reports are `GET /api/search/apt/{doc_id}` and `GET /api/search/malware/{doc_id}`.
- Public API reference pages should cover documented operations only; keep private helper APIs out of published reference pages unless they become supported integration surfaces.

### Application Docs Maintenance Checklist

Application docs under `docs/app_docs/` should describe the actual product surface, not only module labels. Check these sources before changing user-facing docs:

- sidebar labels and visibility in `client/src/app/pages/dashboard/dashboard-sidebar/`
- route families in `client/src/app/app.routes.ts`
- category enums in `client/src/app/shared/constants/pages.ts`
- license rules and visibility gates in `client/src/app/services/licenses/licenses.service.ts`
- backend route metadata in `backend/routes/*.py`
- generated screenshots in `docs/screenshots/`

If a screenshot filename is removed or renamed, update every figure reference in the docs in the same change.

### Feature Coverage Checklist

Before calling documentation complete for a release, confirm that the following route-backed features are either documented as user-visible features or explicitly described as private application infrastructure:

| Feature family                 | Must be covered in docs                                                                                                                                                                                                                             |
|--------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Auth and access                | signup, login, password reset, welcome page, email verification token, onboarding, trial/subscription notification routes                                                                                                                           |
| Public shares                  | case share links and chat share links                                                                                                                                                                                                               |
| Dashboard shell                | homepage, sidebar states, mobile/gated subscription behavior, search tools, filters, pagination, reports                                                                                                                                            |
| Indexed modules                | General Intelligence, Data Breach, Compromise Monitoring, Social, Discussion route, Exploit, Actors & Malware, News Feed, Stealer Logs                                                                                                              |
| Entity and scan modules        | Entity Lookup, Text Analysis, File Scanner, APK Scan, Web Scans, Network Intel, Network Intel vulnerability scan depth, scan reports, scan-job notifications                                                                                        |
| Geo-fencing                    | Satellite Intel, Threat Lens, map entities, facilities, tracking, imagery comparison, anomaly review, geo camera scans                                                                                                                              |
| Graphs and social intelligence | CTI Graph, CTI Advanced Graph Builder, Social Intel, social mapper aliases, profile storage, metadata and relationship pivots                                                                                                                       |
| Profile operations             | Account, public user activity, AI Workspace conversation controls, AI chat sharing, Monitoring, Event Management, Log Manager, Feeder, IOC management, Statistics                                                                                   |
| Tenant and alerts              | Tenant Homepage, category alerts, custom alerts, alert scanner settings, alert exports, scan-all/flush-all, Tenant Settings, Takedown Requests                                                                                                      |
| Administration                 | Users, Tenants, Audit Logs, System Settings, tenant alert administration, profile visibility, quotas, licenses                                                                                                                                      |
| Case management                | case list filters, analytics, case details, case assistant, tracking board, analyst assignment, artifacts/files, linked report artifacts, artifact integrity verification, comments, linked cases, closure, shares, PDF export, admin tenant alerts |

Keep screenshots and docs aligned with the active route tree. If a feature remains available through more than one route, document the current label and the internal route name so terminology stays consistent.

### Case Management Documentation Notes

Case Management is a large profile-area feature and should be documented as a workflow surface, not only as CRUD around a case model.

When changing Case Management, update user docs for all user-visible changes in these areas:

- list mode, archived list mode, filter row behavior, sorting, and mobile filter behavior
- analytics mode, including summary counts, charts, analyst workload, stale cases, and attention lists
- alerts mode when tenant-alert review is exposed from the case-management page
- case detail sections: summary, primary entity, related entities, artifacts, tasks, linked cases, comments, closure, export, and sharing
- case-level assistant behavior where the assistant receives case context
- artifact type behavior, including URL captures, raw alerts, uploaded files, screenshots, chat transcripts, and linked reports
- artifact report source options and the report-search dropdown
- artifact file limits, allowed file types, integrity status, verification, download restrictions after integrity failure, and permission boundaries
- tracking-board status movement, reason capture, closure prerequisites, archive behavior, and read-only states

Private case APIs are not currently part of the published `api_docs` reference set. If they are promoted to an external API surface later, add endpoint reference pages at the same time as the user-facing workflow docs.

### Takedown Documentation Notes

Take Down is a profile-area review workflow, not a public integration API. The user-facing route is `/dashboard/profile/take-down`, and the sidebar category maps `Take-Down` to `Takedown Requests`.

When changing takedown behavior, keep these user-visible details documented:

- `Initiate Takedown` appears on eligible defacement/compromise reports with a report ID and target URL.
- `Report Takedown` on the review page lets a root administrator create the same kind of request from a manual URL.
- request creation captures public abuse-contact evidence before saving the review entry.
- if no abuse contact is found, the request is not saved and the user sees an error state.
- stored statuses are `pending`, `accepted`, `denied`, and `failed`; report labels are `Takedown in progress`, `Takedown reported`, `Takedown denied`, and `Takedown failed`.
- duplicate target-domain requests return the existing request state when an abuse email is already known.
- report enrichment disables duplicate initiation and adds `m_takedown_status`, `m_takedown_label`, and `m_takedown_disabled`.
- accepting dispatches the abuse/takedown email with captured evidence; rejecting stores an optional denial reason.
- the review page supports free-text search, status filtering, date-range filtering, pagination, accept, reject, and manual request creation.

The backend routes `/api/takedowns`, `/api/takedowns/{request_id}/accept`, and `/api/takedowns/{request_id}/reject` are currently marked `include_in_schema=False`. Keep them out of the published Swagger/API reference unless the product decision changes and they become supported external API operations.

### AI Workspace Documentation Notes

AI Workspace is not the same as the report-level chat widget. It is the profile-area Nexus conversation surface and should be documented separately.

When changing AI Workspace, keep these behaviors documented:

- access through the profile AI route and license or endpoint visibility gates
- quick prompts and composer behavior
- `Enter` versus `Shift + Enter`
- 300-token composer and edit limits
- `New Chat` session clearing behavior
- shared-chat link creation and public shared-chat view behavior
- saved chat history loading and history trimming
- streaming status, stop/cancel behavior, and persisted cancellation messages
- message copy action
- user-message edit and resend behavior
- markdown rendering for Nexus replies
- retry behavior after recoverable error states
- recovery/resume behavior when the latest saved turn is a user message without a final assistant response

### CTI And Network Intel Documentation Notes

CTI Graph has two filtering models: the normal graph/sidebar filters and the Advanced Graph Builder. Document both whenever CTI filtering changes. The builder supports searchable fields, cluster-value selection, text values, up to eight rows, row deletion, generated chips, and `AND`/`OR` joins after the first row.

Network Intel vulnerability scanning has target-level depth selection. Document the difference between `Low`, `Medium`, and `High`, and keep screenshots or examples aligned with the active tooltip text if the scanner tool coverage changes.

### Sphinx Build

The docs build is configured through `docs/conf.py` and currently expects extensions such as `myst_parser` and `sphinx_design`. A clean validation pass should include:

```bash
python3 -m sphinx -b html docs /tmp/orion-docs-build
```

If the command fails because a Sphinx extension is missing, install the docs dependencies in the active environment before treating the docs build as validated. Do not remove the extension from `docs/conf.py` only to make a local build pass.

### Screenshot Generation

The repository includes a docs-focused Cypress screenshot flow for the user manual. The current implementation captures documentation screenshots from the regular Cypress specs through `cy.docsScreenshot()` calls that are enabled only by the docs generation path.

At a high level, that flow:

1. builds the test stack
2. seeds tenant state
3. runs the regular Cypress specs with screenshot capture enabled
4. writes screenshots into `docs/screenshots/`

This keeps documentation images reproducible from the application itself instead of relying on manual capture.

The two screenshot commands differ only in cleanup behavior:

- `./run.sh -doc` clears old screenshots before capture.
- `./run.sh -docs` keeps existing screenshots and captures into the current screenshot directory.

Use the clearing flow when replacing a full screenshot set. Use the non-clearing flow when adding coverage for a small new workflow and reviewing the output manually.

## Search and Data Concepts

### Indexed Search

A large part of the platform assumes indexed, searchable result models rather than direct database-table browsing. Engineers working on result pages should think in terms of:

- query inputs
- filters
- aggregations
- result cards or tables
- metadata extraction
- report pivots

That search-first model drives homepage behavior, module pages, consolidated search, reports, and result-insight panels.

### Report-Centric UX

Many routes eventually lead to a report screen. That means backend and UI changes should preserve:

- structured metadata
- export and share actions
- JSON inspection where applicable
- graph pivots
- consistent report header behavior

Breaking report semantics usually affects more than one module.

### Tenant and Role Awareness

The application is heavily shaped by role, tenant state, and license assignment. Developers should expect different users to see different:

- sidebar entries
- homepage variants
- scan and API modules
- administrative forms
- tenant-level tools

Any feature work that assumes a universal menu or universal permission model is likely incomplete.

Current access patterns worth preserving:

- admins can access most operational modules directly
- demo and mobile-demo behavior can deliberately show gated modules with subscription prompts
- `osint_basic`, `osint_advanced`, and `enterprise` users can access Actors & Malware
- `osint_advanced` participates in Network Intel and geo-fencing access
- `maintainer` can bypass several module-specific gates and can manage selected tenant alert workflows
- case-management access depends on role and the `case_management` permission for analyst-style access
- alert visibility combines user licenses, tenant licenses, alert type, and configured scanner categories

## Operational Notes

### Health and Service Readiness

The local stack depends on service readiness, especially for:

- the backend API
- search infrastructure
- persistence services
- test endpoints in instrumented mode

If a build succeeds but tests fail immediately, first check whether the expected services are actually healthy and reachable.

### Secrets and Safety

Documentation, examples, and tests should never normalize the use of real production credentials. Use placeholders, redacted strings, or seeded test accounts only.

### Dirty Worktrees

The repository may contain concurrent changes across docs, frontend, backend, and tests. When making updates:

- avoid reverting unrelated work
- avoid destructive git commands
- keep docs changes scoped
- preserve existing behavior unless the task explicitly requires refactor

## Practical Contributor Workflows

### Workflow 1: Add a New UI Capability

1. identify the route and template involved in `client/src/app/`
2. update the UI and any consuming service logic
3. add or adjust Cypress coverage
4. validate role and tenant behavior
5. update sidebar/category constants if the feature is navigable
6. update user-facing docs if the workflow changed

### Workflow 2: Change an API Contract

1. update backend route or manager logic
2. update backend tests or fixtures
3. verify the frontend consumer still matches the response shape
4. update route metadata and docs dictionaries
5. update `docs/api_docs/` and synchronized Swagger-style docs
6. update application docs where user-facing behavior changed

### Workflow 3: Refresh User Manual Screenshots

1. ensure the testing stack builds
2. run the docs generation path
3. confirm screenshots land in `docs/screenshots/`
4. update the manual only after verifying actual generated filenames

### Workflow 4: Add A New Search Module

1. add or update the backend search route and report route
2. assign correct license dependencies and route docs keys
3. wire the Angular route, category enum, sidebar visibility, and report resolver
4. add result-card/report behavior and deterministic test data where possible
5. add or update Cypress coverage for navigation, query, filter, report, and empty/error states
6. update `Introduction To Modules`, `User Manual`, `docs/api_docs/`, and `swagger_api_reference.md`
7. run endpoint, category, and screenshot reference checks

### Workflow 5: Add A New Scan Workflow

1. decide whether the scan should be synchronous or tracked through `ScanJobManager`
2. define the request model, validation rules, license dependency, and audit-log event
3. add scan-job metadata with a stable `api_reference`, title, and target
4. wire frontend progress, polling, duplicate-scan behavior, report reopening, and error states
5. document whether the endpoint is public API reference material or private application infrastructure
6. update user-facing scan docs and API docs where applicable

## Related Documents

- [User Manual](./user_manual.md)
- [Introduction To Modules](./introduction_to_modules.md)
