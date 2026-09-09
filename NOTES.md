# NOTES

## Client build warnings (2026-08-28)

### npm install/ci warnings

- **`ERESOLVE overriding peer dependency` (listr2)** — `@angular/cli@22.1.4` pins `listr2@10.2.2`, but the
  `@listr2/prompt-adapter-inquirer@4.2.4` it also ships peers on `listr2@10.2.1` *exactly*. Upstream packaging bug.
  Newer adapter releases (4.2.5+) peer on `listr2@11`, so upgrading the adapter makes it worse. Fixed with the
  `"@angular/cli": { "listr2": "10.2.1" }` override in `client/package.json` — the CLI gets the patch version the
  adapter asks for, and `@angular/build`'s own `listr2@10.2.2` is left untouched.

- **`deprecated glob@10.5.0`** — came from `babel-plugin-istanbul@8 → test-exclude@7 → glob@^10`. `babel-plugin-istanbul`
  has no release that moves to `test-exclude@8`, so the fix is the `"test-exclude": { "glob": "13.0.6" }` override.
  `test-exclude` only uses `require('glob').glob` / `.sync`, both of which still exist in glob 13, and the root project
  already depends on `glob@13.0.6` so the nested copy dedupes away entirely.
  Note: npm will not re-apply a new nested override against an already-resolved lock edge. The stale
  `node_modules/test-exclude` + `node_modules/test-exclude/node_modules/glob` entries had to be deleted from
  `package-lock.json` before `npm install` would honour it.

- **`deprecated esri-loader@3.7.0`** — replaced by
  `client/src/app/pages/geo-fencing/threat-lens/map-utils/threat-lens-arcgis.loader.ts`, which does the only two things
  the app used esri-loader for: inject `https://js.arcgis.com/4.34/` once and wrap the resulting AMD `require` in a
  promise. The suggested replacement, `@arcgis/core`, was rejected: it is a ~200 MB ESM package on a 5.x API line
  (the app targets the 4.34 CDN build), it needs its assets copied into the build output, and bundling `SceneView`
  locally would blow the initial-bundle budget. Runtime behaviour is unchanged — the ArcGIS API is still CDN-loaded
  on demand.

- **`deprecated @ngtools/webpack` / `@angular-devkit/build-angular`** — fixed by migrating the whole workspace
  off Angular's webpack build system. See "Webpack -> esbuild build system migration" below. (Originally
  written up as unfixable; the reason it turned out to be tractable is that the production webpack config
  was dead code.)

  The original assessment was: `angular.json` builds through `@angular-builders/custom-webpack:browser` because
  `webpack.config.js` runs `webpack-obfuscator` over `vendor.js` and `compression-webpack-plugin` for the `.gz`
  artifacts, and `webpack.instrument.js` adds `babel-plugin-istanbul` for Cypress coverage. `@angular-builders/custom-webpack`
  itself depends on `@angular-devkit/build-angular`, so the packages install (and warn) regardless of what
  `angular.json` selects. Moving to `@angular/build:application` means porting obfuscation, gzip and coverage
  instrumentation to esbuild equivalents.

### `ng build` warnings

- **CommonJS/AMD optimization bailouts** for `leaflet`, `@maplibre/maplibre-gl-leaflet` and `maplibre-gl` — these are
  real UMD packages and are already loaded through a dynamic `import()` in the satellite map renderer, so they land in
  a lazy chunk. Added to `allowedCommonJsDependencies` in `angular.json`. The `esri-loader` bailout disappeared with
  the package itself.

- **`bundle initial exceeded maximum budget`** — the initial budget warning was raised from 2 MB to 2.25 MB
  (error threshold left at 3 MB). This is a threshold change, not a size reduction: the initial bundle is 2.10 MB, of
  which **1.19 MB is `styles.css`**, essentially all Tailwind utilities generated from `./src/**/*.{html,ts}`
  (the codebase leans hard on arbitrary-value classes, and `important: true` adds `!important` to every rule).
  `main.js` is only 790 kB. Real reductions, if wanted later:
  - move `maplibre-gl.css` (70 kB) and the leaflet CSS (17 kB) out of the global `styles` array and onto the
    geo-fencing map components (they already use `ViewEncapsulation.None`), so they ship in the lazy chunk — worth
    roughly 60-70 kB;
  - reduce the arbitrary-value Tailwind usage, which is where the remaining ~1.1 MB comes from.

## Webpack -> esbuild build system migration (2026-08-28)

Migrated every builder off Angular's deprecated webpack support. This removes `@angular-devkit/build-angular`,
`@ngtools/webpack` and `@angular-builders/custom-webpack` from the tree entirely (448 packages), so `npm ci`
is now completely silent and `ng build` / `ng serve` no longer print builder deprecation notices.

| target | before | after |
| --- | --- | --- |
| build | `@angular-builders/custom-webpack:browser` | `@angular/build:application` |
| serve | `@angular-devkit/build-angular:dev-server` | `@angular/build:dev-server` |
| extract-i18n | `@angular-devkit/build-angular:extract-i18n` | `@angular/build:extract-i18n` |
| test | `@angular-devkit/build-angular:karma` | `@angular/build:karma` |

`@angular/build` had to be added as an explicit devDependency — it was only present transitively via the two
packages that were removed.

### Why the migration was possible at all: webpack.config.js was dead code

`webpack.config.js` guarded its body with `if (options?.configuration !== "production") return config;`.
`@angular-builders/custom-webpack` invokes the user config as
`configOrFactoryOrPromise(baseWebpackConfig, buildOptions, targetOptions)`
(`node_modules/@angular-builders/custom-webpack/dist/custom-webpack-builder.js:56`) — `configuration` lives on
the THIRD argument, not the second. So `options.configuration` was always `undefined` and the guard always
returned early. Corroborating evidence: the file `require()`s `compression-webpack-plugin` and
`webpack-obfuscator` after the guard, neither package was in package.json or node_modules, and the production
build still exited 0. Nothing would have resolved those requires if the body ran.

Consequence: gzip precompression and JS obfuscation were NOT happening, despite appearances. No `.gz` files
were ever emitted (`nginx/nginx-prod.conf` has `gzip on;` at line 38 doing it dynamically, so nothing was
actually broken). The file was deleted rather than ported — porting it would have ADDED obfuscation that
production has never had.

### Coverage instrumentation had to be rebuilt (webpack.instrument.js -> instrument-build.js)

`webpack.instrument.js` WAS live (no configuration guard) — it added a `babel-loader` + `babel-plugin-istanbul`
rule for the `instrumented` configuration, which Cypress consumes via `@cypress/code-coverage`.

An esbuild plugin cannot replace it. `@angular/build` registers its own compiler plugin BEFORE user plugins
(`node_modules/@angular/build/src/tools/esbuild/application-code-bundle.js:56` pushes `createCompilerPlugin()`,
line 62 pushes `...options.plugins`), and that plugin claims `onLoad({filter: /\.[cm]?[jt]sx?$/})`. esbuild runs
onLoad callbacks in registration order and the first non-null result wins, so a user `.ts` onLoad never fires.
This is also why `@angular-builders/custom-esbuild` was NOT adopted — its `plugins` option feeds the same
`options.plugins` array and inherits the same ordering problem.

Replacement: `client/instrument-build.js`, a post-build step that instruments the EMITTED bundles with
`istanbul-lib-instrument` (already a devDependency), passing each bundle's adjacent `.js.map` as
`inputSourceMap`. istanbul embeds that map in the coverage object, and nyc/`istanbul-lib-source-maps` splits
one bundle's coverage back into per-source-file entries at report time.

One non-obvious detail: esbuild emits source maps with workspace-relative `sources`
(`src/app/...`). Left alone, `istanbul-lib-source-maps` resolves those against the OUTPUT directory and
produces paths like `build-next/browser/src/app/...`. `instrument-build.js` therefore rewrites `sources` to
absolute paths (`path.resolve(__dirname, source)`) before instrumenting.

Verified without running Cypress: 146 app bundles instrumented / 28 vendor bundles skipped, all output still
parses as valid ESM, `window.__coverage__` wiring present, and feeding `main.js` through
`readInitialCoverage` -> `createSourceMapStore().transformCoverage()` remaps 847 statements onto 26 real
`.ts` files (the single non-src entry is a `node_modules` file that nyc excludes by default).
NOT yet verified: an actual browser run producing `window.__coverage__`. That needs a Cypress run.

### Output layout change

`@angular/build:application` writes to `<outputPath>/browser/`. angular.json uses the object form
`{"base": "build", "browser": ""}` to keep the flat `client/build/` layout that `post-build.js` and the
backend expect.

The CLI's `--output-path` flag only accepts the STRING form (`--output-path.base` is rejected: "Unknown
arguments"), and the string form always appends `browser/`. Since `run.sh`'s `client_build()` passes
`--output-path build-next`, it now builds to `build-next/browser/`. `run.sh` was updated to move the
base-level files (`3rdpartylicenses.txt`, `prerendered-routes.json`) into that directory and rsync from
`build-next/browser/` instead of `build-next/`.

### proxy.conf.json had to be rewritten

The Vite dev-server translates the webpack array form via `normalizeProxyConfiguration`
(`node_modules/@angular/build/src/utils/load-proxy-config.js`) — it keeps the `context` array handling, but
the resulting per-key object is handed to Vite's `http-proxy`, which has no `router`, `pathFilter` or
`logLevel` options. `router` was the only thing specifying the backend, so the proxy would have had NO target.
Rewritten to a single `"target": "https://127.0.0.1:8443"`; `secure`, `ws`, `changeOrigin` and `xfwd` are all
genuine `http-proxy` options and were kept.

### Two latent warnings that webpack had been hiding

- `src/main.ts` imported `@angular/localize/init` directly; esbuild warns this "may lead to undefined
  behavior". Moved to the `polyfills` array in angular.json.
- `home-insight.component.html` had `[ngClass]="{ '': cond, '': !cond }"` — two empty-string keys, so it
  applied no classes in either branch and the duplicate key made the first unreachable. Dead binding, removed.

### Bundle size

esbuild produces a smaller initial bundle than webpack did: **2.10 MB -> 1.90 MB**. The initial budget
`maximumWarning` was therefore restored to its original `2MB` (it had been raised to 2.25MB only to silence
the webpack-era overshoot). Headroom is now ~100 kB. `styles.css` is still ~1.25 MB of Tailwind utilities and
remains the dominant contributor if that ever needs reducing.

### Dependency cleanup

- Removed devDependencies: `@angular-builders/custom-webpack`, `@angular-devkit/build-angular`.
- Added devDependency: `@angular/build@22.1.4`.
- Removed the now-dead `"@angular-devkit/build-angular"` overrides block.
- `webpack` and `babel-loader` REMAIN in the tree on purpose — they are peer dependencies of
  `@cypress/code-coverage` and `@cypress/webpack-preprocessor`, so the top-level `webpack` security override
  is still live. `babel-plugin-istanbul` and the `@babel/*` presets are no longer used by the build but were
  left in place for the same Cypress tooling.

## Tenant onboarding never left `/onboarding` after Confirm

`18-case-management.cy.ts` -> "Case Management - Tenant Alert Visibility" failed at
`10-tenant-management.controller.ts:169` waiting for `[data-testid="dashboard-main"]`. Every test id in the
flow exists; the failure screenshot shows the app still parked on
`/onboarding?redirect=%2Fdashboard%2Fprofile%2Fhomepage` with step 3 rendered, and the
`POST /api/update/tenants` in the command log returning 200. So the request succeeded and the client simply
bounced straight back to onboarding.

`TenantComponent.confirm()` ran all of its side effects *inside* the `userSessionData.update()` callback:

```
userSessionData.update(state => {
  const updated = { ...state, tenant: { ...state.tenant, ...res.tenant, ... } };
  tenantData.set(...);
  setOnboardingStatus(false);      // this is itself a userSessionData.update()
  router.navigate(['/dashboard']);
  return updated;                  // <- overwrites what setOnboardingStatus just wrote
});
```

Angular's `WritableSignal.update(fn)` is `set(fn(currentValue))` — `fn` runs first, then the result is
written. So the nested `setOnboardingStatus(false)` set `hasOnboarding: false`, and the outer `set(updated)`
immediately clobbered it back to `true` (carried over from `state.tenant`). `OnboardingGuard` on
`/dashboard/profile` then redirected to `/onboarding` again.

This only started failing after the tenant merge was tightened. The previous shape was
`tenant: res.tenant ?? state.tenant`, which replaced the whole tenant object with the backend's snake_case
`tenant_data` document — that payload has no `hasOnboarding` key at all, so the value came out `undefined`,
the guard read it as falsy, and the redirect happened to not fire. The clobber was always there; changing to
`{ ...state.tenant, ...res.tenant }` preserved `hasOnboarding: true` and exposed it.

Fix: keep the update callback pure and move `tenantData.set`, `setOnboardingStatus(false)` and
`router.navigate` out to the `next` handler, after the signal write.

Note `res.tenant` is `tenant.model_dump()` from `TenantManager.update_tenant` — raw snake_case, and its
`email` is still Fernet-encrypted (only `get_all_tenant` decrypts it). Spreading it into the camelCase
session tenant leaves those keys as dead weight; the explicit camelCase remaps below the spread cover the
fields the UI actually reads.

## Social spec: two real blockers, both mocked out now

`08-social-management.cy.ts` was down to 1 passing / 2 failing / 8 skipped. Two independent causes.

### 1. `reconProfilesFrom` crashed on the recon mock

`TypeError: Cannot read properties of null (reading 'ids')` in the suite's `before each`. Entries 2, 3 and 5
of `backend/tests/mock/elastic/social_recon.json` carry `"data": null` (Github and Allmylinks hits with no
parsed profile), and `asRecord(null)` returned `null`, so `asRecord(entry['data'])['ids']` threw. `asRecord`
now coerces null/undefined to `{}`, which also hardens `crawlItemsFor` against a mock that failed to load.

### 2. Nothing was stubbing the extension, so half the UI never rendered

`SocialExtensionService.detect()` is a pure `window.postMessage` handshake with the browser extension — it
pings `{source:'orion-app', type:'ping'}` and waits for `{source:'orion-extension', type:'presence'}`. It
never touches `/api/extension/session`; that endpoint exists on the backend but no client code calls it, so
the `cy.intercept('GET', '**/api/extension/session', …)` lines in both social controllers were inert. Without
a presence reply the state settles on `install`, and both `profile-listing.component.html` (the whole
profile-tabs section, behind `isExtensionReady()`) and `manage-profiles.component.html` render the install
gate instead of their content.

`stubExtensionPresence(connected)` now installs a fake in-page bridge through `cy.on('window:before:load')`.
It has to be injected with `win.eval` rather than `win.addEventListener` from the spec: `detect()` rejects
any message whose `event.source !== window`, and a `postMessage` issued from the Cypress frame carries the
spec window as its source. Running the listener inside the AUT realm makes the reply pass that guard.
`connected: false` gives the `signin` state and `stubUnsupportedBrowser()` (blanking `userAgent` /
`userAgentData`) gives `unsupported`, so all three extension-manager branches are now covered.

### Connections mock was producing character-index objects

`crawlItemsFor('connections')` spread each entry of `social_followers.json` — which is an array of plain
handle strings — so `{...'loislane'}` became `{"0":"l","1":"o",…}`. The old connections test only asserted
the outgoing request body, so nothing caught it. The mapping now builds real
`{resource_id, handle, title, url, parent_url}` records, and the connections tab and the post-connections
popup both assert on rendered handles.

### Coverage added

Empty scan results, clean stealer/phone lookups, stopping an in-flight section sync (`command: 'cancel'`),
`load more` past the 50-item display limit, the post-connections popup (YouTube — feed connections are
gated to facebook/youtube/mastodon/bluesky/hackernews/reddit/habr/devcommunity/stackoverflow/stackexchange),
the extension `signin` and `unsupported` states, the manage-profiles 10-session cap, and a platform load
failure. 11 tests -> 20, all passing on two consecutive runs.

## Log Manager was dropping most of what it claimed to show (2026-08-31)

Audit of `/dashboard/profile/monitoring?tab=log-manager`. Six defects, all fixed.

### Unhandled 500s never reached the file logger

`configs/exception_handlers.py` logged to `logging.getLogger("uvicorn.error")`, which only goes to
stdout/container logs. Nothing in the repo bridges stdlib `logging` to `workspace/logs/` (no
`basicConfig`/`dictConfig`/`log_config` anywhere), so no 500 and no traceback had ever appeared in the
Log Manager. Both handlers now also call `log.g().e()` / `log.g().w()` with the formatted traceback.
`auth_manager` had the same problem via its own `logging.getLogger(__name__)`; that logger is gone and
its two `logger.exception` calls now go through `log.g().e()`.

### Multi-line entries were discarded

`LOG_LINE_PATTERN` is anchored, and `_parse_log_line` returned `None` for anything that did not match, so
every continuation line was thrown away — 196 of 778 lines (25%) in the crawler logs, which is exactly the
stack frames and Playwright `Call log:` detail. `get()` now buffers unmatched lines and attaches them to
their header entry. Because `_iter_log_lines_reverse` walks bottom-up, the continuation arrives before its
header, so the buffer is flushed in `reversed()` order onto the next entry that parses.

### Crawler errors were shown twice

The crawler's `log.g().e()`/`c()` write to both `<date>/info/` and `<date>/error/`, and `_log_files`
`rglob`s the whole date directory, so every crawler error appeared twice. `error/` is a strict subset of
`info/` (only `e()` and `c()` write there, and they always write both), so it is now skipped when a
sibling `info/` exists.

### CRITICAL was written to disk and then filtered out by the reader

`VISIBLE_LOG_TYPES` was `{INFO, WARNING, ERROR}` while `log_controller` also emits `SUCCESS` and
`CRITICAL` — the most severe level was unreachable by design. Both added, plus the type dropdown and
badge colours in the component.

### The caller column was empty for ~90% of rows

The old code looked for the literal `" - Function "` and so only matched callers logged from a bare
function; for a class caller the `if` failed and the `(file:line)` suffix stayed glued to the end of the
message. Replaced with `CALLER_PATTERN` matching the `<name> (<path>:<line>)` suffix. Measured on the
real logs: 90/100 empty -> 0/100.

### 30-day retention had not run since 2026-07-04

`__cleanup_old_logs` wrapped the whole loop in one `try`, so a single failure aborted the entire pass, and
it used `os.remove` per file — which raises `IsADirectoryError` on the crawler's nested `info/`/`error/`
layout and `PermissionError` on root-owned directories. It also set `__last_cleanup_date` before doing the
work, so a failed pass would not retry that day. Now: per-directory `shutil.rmtree(..., ignore_errors=True)`,
so one undeletable directory no longer blocks the rest.

### Flush deleted the log root and wedged the writer for four days

Found on production after the fixes above shipped: the page was still empty because
`SYSTEM_LOG_FLUSHED_AT` was `2026-08-27T23:58:39` and `/app/workspace/logs` did not exist at all.
`flush()` removes every date directory and then calls `_remove_empty_dir(root)` on the log root itself,
so pressing "Flush all logs" deletes `workspace/logs`. After that `__write_to_file`'s
`os.makedirs(.../logs/<date>)` needs write permission on `workspace/`, not on `logs/` — the container runs
as uid 1000 and could write inside `logs/` but could not recreate it — and `log_controller.py:93` is
`except Exception: pass`, so every write failed silently. Nothing was logged between 2026-08-27 and
2026-08-31. Dropped the `_remove_empty_dir(root)` call; `delete()` still prunes an emptied date directory,
which is the case that call was actually for.

Recovering an instance in this state needs both halves: recreate `backend/workspace/logs` owned by 1000,
and `DEL SYSTEM_LOG_FLUSHED_AT` in redis, since the marker hides everything older than the flush.

`run.sh` now creates `backend/workspace/logs` and makes it group/other writable just before `compose up`,
next to the identical `parser_files` prep, so every deploy path lands the directory. It is needed because
`/app/workspace` is root-owned on production while the container runs as uid 1000 — the app can write
inside `logs/` but cannot create it — so a fresh clone, a wiped volume or a new box would otherwise start
in the same wedged state. The chmod is deliberately not `-R`: recursing would rewrite the 0644 perms
`__write_to_file` sets on every log file and walk the whole history on each deploy.

### Root logger bridge for stdlib logging

`docker logs trusted-web-main` carried 101 lines against 7 in `workspace/logs` for the same window,
including a real `[ERROR] Control server error: [Errno 13] Permission denied` that the page never showed.
Everything reaching stdlib `logging` — third-party libraries and any `logging.getLogger(__name__)` — was
invisible. `log_bridge` is a `logging.Handler` on the root logger at level WARNING that forwards
WARNING/ERROR/CRITICAL to `log.g().w()`/`.e()`/`.c()`, formatting `record.exc_info` onto the message so
the reader's multi-line merge keeps the traceback. INFO and DEBUG are dropped at the handler, which
matters because pymongo and elastic_transport are extremely chatty below WARNING.

`install()` calls `log.g()` first. That looks redundant but is the loop guard: `__configure_logs` is what
sets `propagate = False` on `genesis_logs`, and until the singleton exists that logger propagates to root,
so a record written by the bridge could come straight back into it. Forcing construction before the
handler is attached makes the ordering deterministic rather than dependent on who logs first.

Two things it does not reach. `uvicorn` sets `propagate: False`, so `uvicorn.error` records stop there and
never touch root — that path stays covered by the explicit `log.g()` calls in `configs/exception_handlers.py`.
And the gunicorn master is a separate process that never imports the app without `--preload`, so its own
errors are out of reach of anything in-process; the same goes for nginx, mongo, elastic and arango, which
need a log shipper, not a handler. `caller` on bridged rows reads `log_bridge` since `get_caller_info`
walks to the handler frame; the originating logger name is the message prefix instead.

### Left alone deliberately

`total` is still `page * limit + 1` (an honest count means scanning every file on every request), deep
paging is still an O(page) rescan, and nginx / Mongo / Elastic / the Angular client / the sibling Orion
services still do not feed this page at all. Those need a real log pipeline, not a patch.

## Backup job state, progress and memory (2026-08-31)

Reported symptom: in production the instant-backup progress bar never appears, sometimes appears after a
reload, and the backup does not finish; the server itself was seen choking. Three independent causes.

### The progress bar: per-process job state behind four workers

`docker-compose-production.yml` runs `gunicorn -w 4 --threads 4`, and `cronjobs.py` runs as a fifth,
separate process. `BackupManager._job` was a plain dict on a per-process singleton. `POST /api/admin/backups/instant`
starts the task in whichever worker handled it; `GET /api/admin/backups/status` round-robins, so three polls
in four answer from a worker whose singleton has never seen the job and returns `status: "idle"`.

The client made that worse rather than merely noisy: `pollJob()` only re-armed its timer while
`status === 'running'`, so the first poll that landed on the wrong worker ended polling silently — no bar,
no toast, nothing. A reload had a one-in-four chance of hitting the right worker, which is exactly the
"sometimes shows on reload" report.

Job state now lives in Mongo in `backup_jobs`, one document keyed `job_key: "backup_job"` with a unique
index, wrapped by `BackupJobStore`. `begin()` is a `find_one_and_update` filtered on `status != running`
with `upsert=True`; when a job is already running the filter misses, the upsert collides with the unique
index and the `DuplicateKeyError` *is* the answer — the lock is held. That makes the guard atomic across
all five processes, where the old `if self._job["status"] == "running"` guarded only its own.

Gunicorn was left at `-w 4` on purpose. Dropping to `-w 1` would also have made the singleton correct, by
serializing every API request in the product behind one event loop.

### Jobs that die without saying so

Two ways a run vanished. `asyncio.create_task(...)` was called with its return value discarded, and the
loop keeps only a weak reference, so the task could be collected mid-run; tasks are now held in
`BackupManager._tasks` until they complete. And if the worker itself is killed (OOM, `--timeout 900`), the
in-memory dict died with it, so the UI saw `idle` and no error was ever written. The job document now
carries a 30s heartbeat, and any reader that finds a `running` job whose `updated_at` is older than 120s
marks it failed with `BackupJobStore.STALE_MESSAGE`. A killed worker now surfaces as a failed backup within
two minutes instead of a bar that never moves or a job that is "running" forever.

### The choke: whole collections in RAM, twice

`_backup_mongo` did `find({}).to_list(length=None)` per collection and then `json_util.dumps(documents, indent=2)`,
holding the decoded documents *and* the entire serialized string in memory at once; `_backup_arango` did the
same via a list comprehension over the cursor plus `json.dumps`. The `web` service has no `mem_limit`, so on a
real dataset this is bounded only by host RAM. Both now stream: batches of `CONSTANTS.BACKUP_BATCH_SIZE`
documents, serialized and written inside `asyncio.to_thread`, with the Arango AQL cursor opened
`stream=True`. Restore is streamed and batched the same way, and Elasticsearch restore no longer builds
every bulk action for an index before sending the first one.

Streaming means the dumps are newline-delimited `.ndjson` rather than one JSON array, so restore accepts
both: `_collect_sources` maps stem to file and lets `.ndjson` win over a legacy `.json` of the same name,
and `_read_documents` / `_iter_documents` branch on the suffix. Backups taken before this change still
restore, including through `restore_backup.py`.

Streaming is also what keeps `--timeout 900` viable. The dump now yields to the event loop on every batch,
so the uvicorn worker keeps answering gunicorn's heartbeat while a large backup runs.

### Progress that reflects work

`step()` fired six times for the whole backup, and the Mongo export — by far the long pole — sat at the same
value from start to finish. `_backup_mongo` now takes a `report` callback and advances a fraction per
collection inside its slice of the window. The message stays one of the fixed strings because the UI runs
it through `| translate`; only the number moves.

### Log folder path

`_perform_backup` copied `BASE_DIR / "orion" / "logs"`, which has not been the log location since logs moved
to `workspace/logs` — and `/app/orion` is mounted read-only in production anyway. Every backup has been
storing an empty `logs/` folder. Fixed to `BASE_DIR / "workspace" / "logs"`.

Logs are archived into the backup but **never restored**. Fixing the path is what first made the log
restore actually execute, and it failed immediately in the real container: `copytree` copies file
metadata, so it hit `[Errno 13] Permission denied` on every existing `log_1.log` and `[Errno 1]
Operation not permitted` on the day directories. That aborted the restore, and because the rollback
path restores logs too it aborted the rollback as well — leaving maintenance mode held on for manual
intervention, which is how the Cypress spec caught it. Restoring logs is wrong anyway: it fights the
running logger's open handles, and rolling back *data* should not roll back the logs of what just
happened. `_run_restore_engine` no longer touches the log directory at all.

### Scheduled backups

`cronjob_manager.backup_loop` called `create_backup()` directly, bypassing the job guard entirely: it
published no status the UI could see, and nothing stopped it from running concurrently with a UI-triggered
backup — two full dumps at once, with `MAX_BACKUPS` pruning `shutil.rmtree`-ing a folder the other was still
writing. It now calls `run_backup_now()`, which takes the same cross-process lock and reports through the
same document.

## Backup/restore hardening and real maintenance mode (2026-08-31)

Follow-up to the entry above. A seven-lens audit with adversarial verification of every finding
produced 22 confirmed defects (6 were refuted and dropped). What follows is what was wrong and
what changed.

### Maintenance mode was advisory, not enforced

The `.maintenance` flag was read by exactly one thing: nginx, via `if (-f /app/static/.maintenance)`.
No Python anywhere looked at it. That left four ways to keep writing to the databases during a
restore, all confirmed:

- `location = /api/extension/socket` carried no guard in any of the five server blocks across the
  three configs. Because `location =` outranks the guarded prefixes, an extension could complete a
  fresh WebSocket handshake mid-restore.
- The `.onion` vhost's `location /` (nginx-prod.conf) had no guard at all, so Tor users kept full
  read/write access while the databases were being wiped and repopulated.
- `cronjobs.py` is a separate process. `purge_loop`, `iocs_alert_loop` and `backup_loop` never
  traverse nginx, so a proxy-level flag is invisible to them. The confirmed contamination path is
  the alert one: `upsert_alerts_bulk` and `set_scan_running` write with no owner or generation
  filter, so an alert scan finishing after `_restore_mongo` has repopulated the alert collections
  writes post-backup alerts into the just-restored dataset.
- nginx evaluates the guard only on *new* requests, so any asyncio task already in flight —
  and any long-lived socket — keeps running for the whole restore.

Enforcement is now in three layers. `maintenance_state` is a singleton class holding the single
predicate — `get_instance().is_active()`, a 1s-cached stat so it is cheap enough to call per
request, plus `enable()`/`disable()`/`invalidate()` so one object owns the flag's lifecycle. Every
tunable it and the backup manager use (`MAINTENANCE_FLAG`, `MAINTENANCE_CACHE_TTL_SECONDS`,
`BACKUP_MANIFEST_NAME`, `RESTORE_ROLLBACK_PREFIX`, `BACKUP_EXCLUDED_ELASTIC_INDICES`, the job-store
heartbeat and staleness windows, …) lives in `CONSTANTS` rather than as module-level globals, and
`backup_manager` now sources `BASE_DIR` from `CONSTANTS` too instead of mixing it with the
`interface` import. `maintenance_middleware` is
an ASGI middleware registered last in `setup_middlewares`, which makes it outermost, so it runs
before tenant resolution and every route. It handles `websocket` scopes explicitly — receiving the
`websocket.connect` and answering `websocket.close` 1013 — because the existing
`service_ready_middleware` returns early on any non-`http` scope, which is precisely the hole the
extension socket walked through. The nginx guard was added to all five socket blocks and to the
onion `location /`. The three cron loops check the predicate at the top of every iteration.

Exempt paths are deliberately narrow: `/api/admin/backups/status` (so progress stays visible),
`/robots.txt`, and the maintenance page's own assets. Everything else 503s, including `/api/public`
— which matters, see below.

`restore_backup` also quiesces before it starts: it closes local extension sockets and cancels
local social scans, then drains. That only reaches the restoring worker's own tasks; the middleware
in the other three workers is what stops new work arriving there.

### The maintenance page was never shown in production

`http.interceptor.ts:68` read `if (isDevMode() && ... status === 503)`. `isDevMode()` is false in
a production build, so Angular's optimizer removed the whole branch: the redirect to
`/static/maintenance.html` has never run in production. Users got a silently broken app instead of
a maintenance page. The gate is gone, and the status-poll URL is excluded from the redirect so the
admin driving the restore keeps their progress bar instead of being bounced with everyone else.

`maintenance.html` now polls `/api/admin/backups/status` and renders the live operation, phase
message and percentage. Its old reconnect probe hit `/dashboard/home`; the new one hits
`/api/public`, which works *because* the new middleware 503s it — nginx leaves `/api/public`
unguarded, so before the middleware existed there was no origin-independent way to ask "is the app
actually back?" without flapping the user in and out of the app every 5 seconds.

One more client fix: `token-refresh.service.ts` put `catchError` downstream of `switchMap`, so the
first 503 completed the outer observable and tore the refresh timer down permanently. Every user
who sat through a restore was silently logged out ~15 minutes later. The catch moved inside the
inner observable, so a failed tick is skipped and the timer survives.

### Backups that destroyed the thing they were protecting

`create_backup` pruned to `MAX_BACKUPS - 1` *before* writing the new backup. With `MAX_BACKUPS=2`,
a backup that then failed left one good backup where there had been two — and a second failure left
none. Pruning now happens after the new backup is written and its catalog row saved.

Every `shutil.rmtree` ran on the event loop. A large tree blocks long enough to starve the 30s job
heartbeat, and past 120s the staleness sweep marks a *live* job failed and releases the lock —
letting a second backup start on top of the running one, writing into the same directory. All
removals moved to `asyncio.to_thread`.

`_progress_window` was per-run state on a process-lifetime singleton: `restore_backup` set it to
`(5, 35)` and nothing ever reset it, so every later backup in that worker capped at 35%. It is now
a parameter threaded through `_perform_backup`.

### Restores that silently changed the data

Three fidelity gaps, all confirmed:

- **Elasticsearch lost every mapping and setting.** The dump stored only `_source` hits from a
  scroll; restore called `indices.create(index=name)` with no body, producing default dynamic
  mappings. Custom analyzers, normalizers, the 384-dim `dense_vector` embedding field,
  `max_result_window`, shard counts — all gone, and nothing at startup repairs an existing index.
  `_backup_elastic` now writes a `<index>.meta.json` sidecar with mappings and settings, and
  `_restore_elastic` passes them to `indices.create`. Settings that Elasticsearch refuses on create
  (`uuid`, `creation_date`, `provided_name`, `version`, `resize`, `routing`) are stripped.
- **ArangoDB edge collections came back as document collections.** `db.create_collection(name)`
  with no `edge=True` makes a document collection, so restoring `cti_edges` into an Arango that had
  lost it would break the CTI graph. The collection type is now recorded in a `.meta.json` sidecar
  and honoured on restore, including the case where an existing collection's type disagrees with
  the backup — that gets dropped and recreated rather than truncated.
- **A restore was not a restore.** Both `_restore_mongo` and `_restore_arango` drove their loop off
  the dump's files only, so any collection created after the backup was left fully populated: a
  point-in-time restore produced a mixed-epoch database. All three stores now enumerate what is
  live and drop whatever the backup does not contain.

`_validate_restore` only pinged connectivity — `list_collection_names`, `db.collections()`,
`conn.info()` — which passes cleanly against a database that was just wiped, making the rollback
trigger effectively unreachable. `_perform_backup` now writes a `manifest.json` with per-collection
document counts and a `completed` marker; restore refuses a manifest that says `completed: false`,
and validation compares post-restore counts against it. Backups predating the manifest still
restore, with a logged warning instead of count verification.

### Interrupted restores

If the process died inside `_run_restore_engine` the databases were left half-restored, no rollback
was attempted, and nothing recorded that it had happened — the next boot served traffic on an
inconsistent database. A `.restore_in_progress` marker is now written before the first datastore is
touched, naming the source backup and the rollback directory, and cleared only on the success or
rolled-back paths. `service_manager.init_services` calls `resolve_interrupted_restore()`, which
re-enables maintenance mode, logs CRITICAL with the exact `restore_backup.py <rollback>` recovery
command, and fails the job so the status endpoint surfaces it. Holding the site down is deliberate:
a partially restored database must not serve traffic. `start_backup` and `start_restore` refuse with
409 while the marker exists.

Two related leaks: `rollback_*` directories were outside all pruning and listing accounting and
accumulated forever, and nothing checked free space before writing a second full dump onto the same
volume. There is now an age-based rollback sweep and a `shutil.disk_usage` precondition that aborts
with 507 rather than filling the disk mid-restore.

Finally, restore never invalidated the Redis config cache, which has no TTL — so after a restore the
platform kept serving pre-restore system settings indefinitely. `_refresh_caches` reloads config
with `force_db=True` on both the success and rollback paths.

### Stealer logs are never backed up

`stealer_model` is excluded from the backup outright. It is the 150-shard bulk dump index and lives
on a different Elasticsearch host in production; scrolling it into an ndjson file is a large part of
why the server choked. `_is_excluded_index` gates both directions — and the restore side matters
just as much as the backup side, because the new "drop anything absent from the backup" logic would
otherwise have deleted the entire stealer index on the first restore.

### run.sh could leave production down permanently

`run.sh` has `set -e`. The dev and test paths pair `enable_maintenance_mode` with
`trap disable_maintenance_mode EXIT`; both production paths (`production` and `build -p`) set the
flag with no trap, so any failure between enabling and disabling left production hard-503 with no
automatic recovery. `wait_for_application_services` made it worse: an unbounded `until` loop that
hangs forever if the container never turns healthy, with the site down the whole time. Both
production paths now register the trap and clear it at their success points, and the health wait
takes a deadline (`APPLICATION_READY_TIMEOUT`, default 600s) and fails loudly.

### Not addressed

The quiesce only reaches the restoring worker's own tasks — the other three workers' in-flight
coroutines are stopped from *starting* new work by the middleware, but a coroutine already past its
last await keeps going. Making that airtight needs the write helpers themselves to re-check the
predicate (`upsert_alerts_bulk` and `set_scan_running` are the two confirmed unguarded ones), or a
generation token on every write. Mongo indexes are still not recreated after a restore beyond what
`ensure_indexes` rebuilds at boot, and Redis, the bloom-filter volume and GridFS remain outside the
backup entirely.

## Why `run.sh -docs` is slow, and what it is not (2026-08-31)

`npm test run` is fast; `./run.sh -docs` over the same specs is not. The screenshot machinery was the
obvious suspect and it is the wrong one. Measured, not assumed:

- `cy.screenshot()` costs ~300-400ms per call and leaves no residue on later commands. There are 100
  `docsScreenshot` calls in the whole suite, so screenshots account for roughly **40 seconds** across
  a run measured in hours.
- A direct A/B of one spec with and without `CYPRESS_takeScreenshots=true`, against the same warm
  stack, showed no meaningful difference in ordinary test execution.
- The evidence was in the run output all along: the test that *takes* a screenshot
  (`trial-subscription-banner`) finished in 2,020ms, while the three tests that take none cost
  198,842ms, 106,072ms and 90,962ms.
- Ruled out with evidence: `screenshotsFolder` (the only thing the flag changes in `cypress.config.ts`
  is one assignment), `retries` (hard-disabled at 0), `screenshotOnRunFailure` (identical in both
  modes), and `writeDocScreenshot`, which turns out to be dead code — nothing calls that task.

The real costs, largest first:

**`-docs` is not "the suite plus screenshots".** `run.sh:308-310` runs
`docker compose down -v --remove-orphans`, then a full `build -t`, then `restart_ng_serve`. `-v`
destroys every volume, so each docs run executes against an empty Mongo/Elasticsearch with cold
indexes and a cold dev server, while `npm test run` reuses whatever warm stack is already up. That
alone explains a large part of the gap, and it slows tests that take no screenshots — exactly the
reported symptom.

**`waitForStepStability` had no deadline.** `demo-tour.component.ts:2021` resolved only after 180ms
elapsed with no ResizeObserver/MutationObserver event on the step subtree. For enterprise tour steps
2-4 the observed element is `dashboard-consolidated`, which mutates continuously while search results
stream, so every mutation restarted the settle timer and the tour sat in `aria-busy` unbounded. It is
awaited twice per step. The same test was observed swinging 16.6s -> 94s with no code change, purely
because scan jobs from a killed earlier run were still churning the panel. Every sibling helper takes
a cap (`waitForStepTarget` 1500ms, `waitForSidebarRectStability` 700ms); this one now takes
`maxWaitMs = 2000` and clears the deadline in `finish()`.

**The tour runs real, cache-bypassing searches.** `demo_tour.json` sets `triggerSubmitOnNext` on step
1 and `triggerSubmitOnShow` on steps 3 and 4, so each pass issues `/api/search/consolidated/ioc`,
`/api/search/apt-intel` and `/api/urlscan/domain?force_new=true` — `force_new=true` defeats any
result cache. nginx logs show 55s of that traffic in one test, and `blocks background interaction`
pays for it twice because it repeats the set after `cy.reload()`.

**Tour transitions burn fixed timeouts.** Each step chains `waitForStepTarget` (1500/2500ms),
`waitForRenderedSelector` (1500ms), `waitForSidebarControl` / `waitForSidebarProjection` /
`waitForProfileMenuState` (1500ms each) plus `minimumLoadingMs` 350ms. `blocks background interaction`
performs 16 transitions; nginx logged **zero** requests across a 64-second window of that test, so
that minute is entirely client-side tour bookkeeping at ~6-9s per transition.

**`defaultCommandTimeout` is 60000**, 15x the Cypress default, and `requestTimeout`, `responseTimeout`,
`pageLoadTimeout`, `execTimeout` and `taskTimeout` match it. The slow tests land on near-exact
multiples of 60s, which is the signature of commands burning whole retry windows before eventually
succeeding. Lowering it does not make anything faster by itself; it converts silent 60s stalls into
fast, localised failures that name the offending command.

Left alone deliberately: dropping `-v` from the `-docs` teardown would warm the database between runs
but costs deterministic seeding for the screenshots, and lowering the timeouts will surface failures
that are currently being papered over. Both are judgement calls for the operator, not mechanical wins.
