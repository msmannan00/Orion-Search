# PyCharm 2026.2.1 inspection findings

Profile: Default. Scope: git-tracked first-party files.
Excluded: JSON/NDJSON, SVG, logs, build output, node_modules, venv/site-packages, .angular, coverage, orion-extension-unpacked, vendored assets/libs.

**Total 2732** — ERROR 188, WARNING 498, WEAK WARNING 2046

## By inspection

| count | E | W | WW | inspection |
|---:|---:|---:|---:|---|
| 818 | 0 | 0 | 818 | `JSIgnoredPromiseFromCall` — Result of method call returning a promise is ignored |
| 316 | 0 | 0 | 316 | `JSDeprecatedSymbols` — Deprecated symbol used |
| 266 | 0 | 0 | 266 | `AngularNgOptimizedImage` — Issues with ngSrc usage in img tags |
| 221 | 68 | 37 | 116 | `PyUnresolvedReferencesInspection` — Unresolved references |
| 219 | 0 | 0 | 219 | `HttpUrlsUsage` — Link with unencrypted protocol |
| 107 | 70 | 37 | 0 | `Annotator` — Annotator |
| 96 | 0 | 0 | 96 | `MarkdownIncorrectTableFormatting` — Incorrect table formatting |
| 63 | 0 | 63 | 0 | `JSUnusedGlobalSymbols` — Unused global symbol |
| 62 | 0 | 62 | 0 | `UndefinedParamsPresent` — Undefined parameters |
| 52 | 0 | 52 | 0 | `CssUnusedSymbol` — Unused selector |
| 50 | 0 | 50 | 0 | `HtmlDeprecatedAttribute` — Obsolete attribute |
| 50 | 0 | 0 | 50 | `PyUnusedParameterInspection` — Unused parameter |
| 48 | 0 | 48 | 0 | `PyUnreachableCodeInspection` — Unreachable code |
| 45 | 0 | 0 | 45 | `BadExpressionStatementJS` — Expression statement which is not assignment or call |
| 39 | 0 | 39 | 0 | `HtmlUnknownTarget` — Unresolved file in a link |
| 32 | 0 | 0 | 32 | `PyShadowingNamesInspection` — Shadowing names from outer scopes |
| 28 | 28 | 0 | 0 | `TypeScriptUnresolvedReference` — Unresolved TypeScript reference |
| 27 | 0 | 0 | 27 | `PyStringConversionWithoutDunderMethodInspection` — String conversion without dunder method |
| 18 | 0 | 18 | 0 | `PointlessBooleanExpressionJS` — Pointless statement or boolean expression |
| 15 | 0 | 15 | 0 | `JSUnusedLocalSymbols` — Unused local symbol |
| 14 | 0 | 0 | 14 | `PyShadowingBuiltinsInspection` — Shadowing built-in names |
| 11 | 11 | 0 | 0 | `AngularUnusedComponentImport` — Unused import in an Angular component declaration |
| 10 | 0 | 10 | 0 | `HtmlUnknownAttribute` — Unknown attribute |
| 9 | 0 | 0 | 9 | `PyRedundantParenthesesInspection` — Redundant parentheses |
| 9 | 0 | 0 | 9 | `PyMethodParametersInspection` — Improper first parameter |
| 8 | 0 | 8 | 0 | `ES6PreferShortImport` — Import can be shortened |
| 8 | 0 | 0 | 8 | `TypeScriptRedundantGenericType` — Redundant type arguments |
| 7 | 0 | 7 | 0 | `CssOverwrittenProperties` — Overwritten property |
| 7 | 0 | 7 | 0 | `JSUnusedAssignment` — Unused assignment |
| 6 | 0 | 6 | 0 | `PyUnboundLocalVariableInspection` — Unbound local variables |
| 6 | 0 | 6 | 0 | `JSSuspiciousNameCombination` — Suspicious variable/parameter name combination |
| 5 | 0 | 0 | 5 | `PyUnusedLocalVariableInspection` — Unused local symbols |
| 5 | 0 | 0 | 5 | `CssNonIntegerLengthInPixels` — Non-integer length in pixels |
| 4 | 4 | 0 | 0 | `JsonStandardCompliance` — Compliance with JSON standard |
| 4 | 0 | 4 | 0 | `PyRedeclarationInspection` — Redeclared names without usages |
| 4 | 0 | 4 | 0 | `CommaExpressionJS` — Comma expression |
| 4 | 0 | 4 | 0 | `CssRedundantUnit` — Redundant measure unit |
| 4 | 0 | 0 | 4 | `CssReplaceWithShorthandSafely` — Properties may be safely replaced with a shorthand |
| 3 | 0 | 3 | 0 | `PyDeprecationInspection` — Deprecated function, class, or module |
| 3 | 0 | 3 | 0 | `HtmlUnknownBooleanAttribute` — Incorrect boolean attribute |
| 3 | 0 | 3 | 0 | `AngularUndefinedBinding` — Undefined binding |
| 2 | 2 | 0 | 0 | `Stylelint` — Stylelint |
| 2 | 2 | 0 | 0 | `CssInvalidPropertyValue` — Invalid property value |
| 2 | 2 | 0 | 0 | `CssUnresolvedCustomProperty` — Unresolved custom property |
| 2 | 0 | 2 | 0 | `PyArgumentListInspection` — Incorrect call arguments |
| 2 | 0 | 2 | 0 | `RegExpUnnecessaryNonCapturingGroup` — Unnecessary non-capturing group |
| 2 | 0 | 2 | 0 | `HtmlWrongAttributeValue` — Wrong attribute value |
| 2 | 0 | 2 | 0 | `ReservedWordUsedAsNameJS` — Reserved word used as name |
| 2 | 0 | 0 | 2 | `RegExpSimplifiable` — Regular expression can be simplified |
| 2 | 0 | 0 | 2 | `PySimplifyBooleanCheckInspection` — Redundant boolean variable check |
| 1 | 1 | 0 | 0 | `AngularForBlockNonIterableVar` — Non-iterable type in @for block |
| 1 | 0 | 1 | 0 | `CssUnknownProperty` — Unknown property |
| 1 | 0 | 1 | 0 | `PyUnusedImportsInspection` — Unused imports |
| 1 | 0 | 1 | 0 | `UnnecessaryContinueJS` — Unnecessary 'continue' statement |
| 1 | 0 | 1 | 0 | `TrivialIfJS` — Redundant 'if' statement |
| 1 | 0 | 0 | 1 | `PyComparisonWithNoneInspection` — Using equality operators to compare with None |
| 1 | 0 | 0 | 1 | `PyInconsistentReturnsInspection` — Inconsistent return statements |
| 1 | 0 | 0 | 1 | `ShellCheck` — ShellCheck |

## All findings


### backend/static/swagger-code.css

- L1 **ERROR** `Stylelint` — Stylelint: no configuration provided for /home/morgan-freeman/Workspace/Orion/Orion-Intelligence/backend/static/swagger-code.css
- L307 **ERROR** `CssInvalidPropertyValue` — Mismatched property value (initial | inherit | unset | revert | revert-layer)
- L307 **ERROR** `CssInvalidPropertyValue` — Mismatched property value <padding-top>(&lt;padding-top&gt;{1,4})

### backend/tests/cases/auth/test_session_manager.py

- L229 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'get_current_user'
- L242 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'get_current_user'
- L275 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'get_current_role'
- L333 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'create_access_token'
- L336 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'has_onboarding'
- L337 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference '_tenant_fernet'
- L357 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference '_tenant_fernet'
- L408 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'has_onboarding'

### backend/tests/cases/search/test_search_model.py

- L281 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'AsyncClient'
- L299 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'AsyncClient'
- L374 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'AsyncClient'

### backend/tests/cases/service/test_alert_job_service.py

- L248 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'datetime'
- L293 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'datetime'

### backend/tests/cases/service/test_alert_webhook_manager_service.py

- L24 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'to_thread'

### backend/tests/cases/service/test_insight_job_service.py

- L184 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference '_insight_job__fetch_elastic_insight'
- L213 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference '_insight_job__fetch_elastic_insight'

### backend/tests/cases/service/test_mail_manager_service.py

- L80 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'process_app_variables'
- L81 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'to_thread'
- L119 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'process_app_variables'
- L120 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'to_thread'
- L169 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference '_tenant_system_mail_config'
- L182 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'process_app_variables'
- L183 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'to_thread'

### backend/tests/cases/service/test_resource_manager_service.py

- L12 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'SYSTEM_DIR'
- L27 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'SYSTEM_DIR'

### backend/tests/cases/service/test_system_log_manager_service.py

- L21 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference '_log_roots'

### client/cypress/fixtures/feeder/leak/_ransomfeed.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'

### client/cypress/fixtures/feeder/news/_hackread.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'

### client/cypress/fixtures/feeder/shared/_mastodon_sample.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'

### client/cypress/fixtures/feeder/shared/_pastebin_sample.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'

### client/cypress/fixtures/feeder/shared/_reddit_sample.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'

### client/cypress/fixtures/feeder/social/_twitter.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'

### client/cypress/fixtures/feeder/unique/_apt_sample.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'FetchConfig'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'FetchProxy'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'ThreatType'

### client/cypress/fixtures/feeder/unique/_defacement_sample.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'

### client/cypress/fixtures/feeder/unique/_exploit_sample.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'

### client/cypress/fixtures/feeder/unique/_forum_sample.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'

### client/cypress/fixtures/feeder/unique/_malware_sample.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'FetchConfig'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'FetchProxy'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'ThreatType'

### client/cypress/fixtures/feeder/unique/_tracking_sample.py

- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'crawler'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleModel'
- L1 **ERROR** `PyUnresolvedReferencesInspection` — Unresolved reference 'RuleType'

### client/src/app/pages/dashboard/dashboard.component.ts

- L31 **ERROR** `AngularUnusedComponentImport` — <html>Pipe <code><span style="">TranslatePipe</span></code> is never used in a component template</html>

### client/src/app/pages/geo-fencing/satellite-intel/map-entities/aircraft/components/aircraft-marker-icon/aircraft-marker-icon.component.ts

- L6 **ERROR** `AngularUnusedComponentImport` — <html>Pipe <code><span style="">TranslatePipe</span></code> is never used in a component template</html>

### client/src/app/pages/geo-fencing/satellite-intel/map-entities/ships/components/ship-marker-icon/ship-marker-icon.component.ts

- L6 **ERROR** `AngularUnusedComponentImport` — <html>Pipe <code><span style="">TranslatePipe</span></code> is never used in a component template</html>

### client/src/app/pages/homepage/home-search/home-search.component.ts

- L20 **ERROR** `AngularUnusedComponentImport` — <html>Component <code><span style="">DemoTourComponent</span></code> is never used in a component template</html>

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-chat/dashboard-result-chat.component.html

- L7 **ERROR** `AngularForBlockNonIterableVar` — <html>Type <code><span style="color:#000080;">string&#32;</span><span style="">|&#32;</span><span style="color:#000080;">string</span><span style="">[]</span></code> must have a <code><span style="">[Symbol.iterator]()</span></code> method that returns an iterator.</html>

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-exploit/dashboard-result-exploit.component.ts

- L26 **ERROR** `AngularUnusedComponentImport` — <html>Directive <code><span style="">TooltipDirective</span></code> is never used in a component template</html>

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-social/dashboard-result-social.component.ts

- L23 **ERROR** `AngularUnusedComponentImport` — <html>Pipe <code><span style="">DatePipe</span></code> is never used in a component template</html>

### client/src/app/pages/root-searches/ai-workspace/ai-workspace.component.html

- L84 **ERROR** `Annotator` — Unclosed string literal #loc
- L85 **ERROR** `Annotator` — Unexpected token 'compact' #loc
- L86 **ERROR** `Annotator` — Unexpected token 'analyst' #loc
- L86 **ERROR** `Annotator` — Unexpected token 'assistant' #loc
- L86 **ERROR** `Annotator` — Unexpected token 'for' #loc
- L86 **ERROR** `Annotator` — Unexpected token 'summaries' #loc
- L86 **ERROR** `Annotator` — Unexpected token 'notes' #loc
- L86 **ERROR** `Annotator` — Unexpected token 'quick' #loc
- L86 **ERROR** `Annotator` — Unexpected token 'next' #loc
- L86 **ERROR** `Annotator` — Unexpected token 'guidance' #loc
- L86 **ERROR** `Annotator` — Unexpected token 'without' #loc
- L86 **ERROR** `Annotator` — Unexpected token 'leaving' #loc
- L87 **ERROR** `Annotator` — Unexpected token 'the' #loc
- L88 **ERROR** `Annotator` — Unexpected token 'dashboard' #loc
- L88 **ERROR** `Annotator` — Name expected #loc
- L88 **ERROR** `Annotator` — Unclosed string literal #loc

### client/src/app/pages/root-searches/credentials/password-schema/password-schema.component.ts

- L10 **ERROR** `AngularUnusedComponentImport` — <html>Directive <code><span style="">NgClass</span></code> is never used in a component template</html>

### client/src/app/pages/social-cti/home-menu/home-menu.component.html

- L21 **ERROR** `Annotator` — Tag start is not closed #loc
- L99 **ERROR** `Annotator` — Closing tag matches nothing #loc

### client/src/app/pages/social-cti/profile-detail/resource-media-section/resource-media-section.component.html

- L4 **ERROR** `Annotator` — Tag start is not closed #loc
- L25 **ERROR** `Annotator` — Tag start is not closed #loc
- L25 **ERROR** `Annotator` — Closing tag matches nothing #loc
- L44 **ERROR** `Annotator` — Closing tag matches nothing #loc

### client/src/app/pages/user-management/auditlog/auditlog.component.ts

- L25 **ERROR** `AngularUnusedComponentImport` — <html>Component <code><span style="">ChatWidgetComponent</span></code> is never used in a component template</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-artifacts-section/case-artifacts-section.html

- L175 **ERROR** `Annotator` — Unclosed string literal #loc
- L176 **ERROR** `Annotator` — Unexpected token 'DOCX' #loc
- L176 **ERROR** `Annotator` — Name expected #loc
- L176 **ERROR** `Annotator` — Unclosed string literal #loc
- L442 **ERROR** `Annotator` — Unclosed string literal #loc
- L443 **ERROR** `Annotator` — Unexpected token 'DOCX' #loc
- L443 **ERROR** `Annotator` — Name expected #loc
- L443 **ERROR** `Annotator` — Unclosed string literal #loc

### client/src/app/pages/user-management/sidebar-user-homepage/sidebar-user-homepage.component.ts

- L33 **ERROR** `AngularUnusedComponentImport` — <html>Component <code><span style="">HomeInsightComponent</span></code> is never used in a component template</html>

### client/src/app/pages/user-management/sidebar-user-system-settings/sidebar-user-system-settings.component.ts

- L31 **ERROR** `AngularUnusedComponentImport` — <html>Component <code><span style="">UserImagePickerComponent</span></code> is never used in a component template</html>

### client/src/app/shared/partials/json-api-viewer/json-viewer/json-viewer.component.ts

- L8 **ERROR** `AngularUnusedComponentImport` — <html>Pipe <code><span style="">TranslatePipe</span></code> is never used in a component template</html>

### client/src/assets/data/mail_template_data/alert_mail_template.html

- L8 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type email_title
- L13 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type preheader
- L21 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type email_title
- L26 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type recipient_name
- L28 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type friendly_message
- L34 **ERROR** `Annotator` — Unexpected token '(' #loc
- L34 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type summary_label
- L34 **ERROR** `TypeScriptUnresolvedReference` — <html>Unresolved pipe <code><span style="color:#660e7a;">default</span></code></html>
- L43 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type scan_status
- L44 **ERROR** `Annotator` — Unexpected token '(' #loc
- L44 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type total_alerts_label
- L44 **ERROR** `TypeScriptUnresolvedReference` — <html>Unresolved pipe <code><span style="color:#660e7a;">default</span></code></html>
- L44 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type total_alerts
- L45 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type event_date
- L51 **ERROR** `Annotator` — Unterminated expansion form #loc
- L55 **ERROR** `Annotator` — Unexpected token '(' #loc
- L55 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type module_rows_heading
- L55 **ERROR** `TypeScriptUnresolvedReference` — <html>Unresolved pipe <code><span style="color:#660e7a;">default</span></code></html>
- L62 **ERROR** `Annotator` — Unterminated expansion form #loc
- L64 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type row
- L65 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type row
- L67 **ERROR** `Annotator` — Unterminated expansion form #loc
- L71 **ERROR** `Annotator` — Unterminated expansion form #loc
- L72 **ERROR** `Annotator` — Unterminated expansion form #loc
- L83 **ERROR** `Annotator` — Unterminated expansion form #loc
- L85 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type row
- L86 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type row
- L88 **ERROR** `Annotator` — Unterminated expansion form #loc
- L92 **ERROR** `Annotator` — Unterminated expansion form #loc
- L93 **ERROR** `Annotator` — Unterminated expansion form #loc
- L99 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type action_url
- L99 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type action_label
- L105 **ERROR** `Annotator` — Unterminated expansion form #loc
- L108 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type closing_message

### client/src/assets/data/mail_template_data/mail_template.html

- L8 **ERROR** `Annotator` — Unterminated expansion form #loc
- L13 **ERROR** `Annotator` — Unterminated expansion form #loc
- L13 **ERROR** `Annotator` — Unterminated expansion form #loc
- L13 **ERROR** `Annotator` — Unterminated expansion form #loc
- L21 **ERROR** `Annotator` — Unterminated expansion form #loc
- L21 **ERROR** `Annotator` — Unterminated expansion form #loc
- L21 **ERROR** `Annotator` — Unterminated expansion form #loc
- L25 **ERROR** `Annotator` — Unterminated expansion form #loc
- L28 **ERROR** `Annotator` — Unterminated expansion form #loc
- L33 **ERROR** `Annotator` — Unterminated expansion form #loc
- L38 **ERROR** `Annotator` — Unterminated expansion form #loc
- L38 **ERROR** `Annotator` — Unterminated expansion form #loc
- L38 **ERROR** `Annotator` — Unterminated expansion form #loc
- L46 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type username
- L48 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type email
- L50 **ERROR** `Annotator` — Unterminated expansion form #loc
- L51 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type password
- L53 **ERROR** `Annotator` — Unterminated expansion form #loc
- L54 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type subject
- L59 **ERROR** `Annotator` — Unterminated expansion form #loc
- L59 **ERROR** `Annotator` — Unterminated expansion form #loc
- L59 **ERROR** `Annotator` — Unterminated expansion form #loc
- L59 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type url
- L64 **ERROR** `Annotator` — Unterminated expansion form #loc
- L64 **ERROR** `Annotator` — Unterminated expansion form #loc
- L64 **ERROR** `Annotator` — Unterminated expansion form #loc
- L73 **ERROR** `Annotator` — Unterminated expansion form #loc
- L75 **ERROR** `Annotator` — Unterminated expansion form #loc
- L78 **ERROR** `Annotator` — Unterminated expansion form #loc
- L87 **ERROR** `Annotator` — Unterminated expansion form #loc
- L89 **ERROR** `Annotator` — Unterminated expansion form #loc
- L92 **ERROR** `Annotator` — Unterminated expansion form #loc

### client/src/assets/data/mail_template_data/takedown_template.html

- L23 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type domain
- L30 **ERROR** `TypeScriptUnresolvedReference` — Unresolved variable or type custom_message

### docs/_static/custom.css

- L1 **ERROR** `Stylelint` — Stylelint: no configuration provided for /home/morgan-freeman/Workspace/Orion/Orion-Intelligence/docs/_static/custom.css
- L42 **ERROR** `CssUnresolvedCustomProperty` — Cannot resolve <code>--border</code> custom property
- L59 **ERROR** `CssUnresolvedCustomProperty` — Cannot resolve <code>--color-background-secondary</code> custom property

### docs/api_docs/ALL.md

- L1089 **ERROR** `JsonStandardCompliance` — JSON standard does not allow trailing comma
- L1093 **ERROR** `JsonStandardCompliance` — JSON standard does not allow trailing comma

### docs/api_docs/reports/strategic.md

- L56 **ERROR** `JsonStandardCompliance` — JSON standard does not allow trailing comma
- L60 **ERROR** `JsonStandardCompliance` — JSON standard does not allow trailing comma

### .github/workflows/build.yml

- L17 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "fetch-depth"
- L21 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "node-version"
- L156 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "name"
- L157 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "path"
- L158 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "retention-days"

### .github/workflows/codacy-repository-analysis.yml

- L21 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "java-version"
- L22 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "distribution"
- L27 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "project-token"
- L28 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "verbose"
- L29 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "upload"
- L30 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "max-allowed-issues"

### .github/workflows/codacy.yml

- L32 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "java-version"
- L33 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "distribution"
- L38 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "project-token"
- L39 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "verbose"
- L40 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "output"
- L41 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "format"
- L42 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "gh-code-scanning-compat"
- L43 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "max-allowed-issues"
- L89 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "sarif_file"
- L95 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "sarif_file"
- L101 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "sarif_file"

### .github/workflows/codeql.yml

- L43 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "languages"
- L44 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "build-mode"
- L54 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "category"
- L55 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "upload"

### .github/workflows/scorecard.yml

- L26 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "persist-credentials"
- L31 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "repo_token"
- L32 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "results_file"
- L33 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "results_format"
- L34 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "publish_results"
- L39 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "name"
- L40 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "path"
- L41 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "retention-days"
- L46 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "sarif_file"

### .github/workflows/test.yml

- L17 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "fetch-depth"
- L21 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "node-version"
- L209 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "name"
- L210 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "path"
- L216 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "if-no-files-found"
- L217 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "retention-days"
- L222 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "name"
- L223 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "path"
- L224 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "if-no-files-found"
- L225 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "retention-days"
- L253 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "fetch-depth"
- L257 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "node-version"
- L394 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "name"
- L395 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "path"
- L396 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "if-no-files-found"
- L397 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "retention-days"
- L414 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "fetch-depth"
- L419 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "name"
- L420 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "path"
- L425 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "name"
- L426 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "path"
- L440 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "project-token"
- L441 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "coverage-reports"
- L534 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "name"
- L535 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "path"
- L540 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "if-no-files-found"
- L541 **WARNING** `UndefinedParamsPresent` — Undefined parameter: "retention-days"

### backend/orion/api/interactive/case_manager/case_manager.py

- L497 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L498 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L499 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L501 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L504 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L507 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L510 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L513 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L515 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L518 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L521 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L522 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L525 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L528 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L532 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L534 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L548 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L554 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L560 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L561 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L562 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L563 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L564 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L565 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L566 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L567 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L568 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L569 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L570 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L571 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L572 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L573 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L577 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L586 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L590 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L592 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L605 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L609 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L617 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L637 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L644 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L646 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L647 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L649 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L655 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable

### backend/orion/api/interactive/case_manager/case_share_manager.py

- L94 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable

### backend/orion/api/interactive/case_manager/status_board_config.py

- L55 **WARNING** `PyArgumentListInspection` — Unexpected argument
- L56 **WARNING** `PyArgumentListInspection` — Unexpected argument
- L73 **WARNING** `PyUnboundLocalVariableInspection` — Local variable 'tenant' might be referenced before assignment

### backend/orion/api/interactive/graph_manager/graphs_model.py

- L164 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable

### backend/orion/api/interactive/search_manager/search_query_generator.py

- L294 **WARNING** `RegExpUnnecessaryNonCapturingGroup` — Unnecessary non-capturing group <code>(?:https?://)</code>

### backend/orion/api/server/crawl_manager/crawl_model.py

- L664 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'logs' for class 'LogModel'

### backend/orion/api/server/entity_manager/entity_manager.py

- L1039 **WARNING** `PyUnboundLocalVariableInspection` — Local variable 'edge_type' might be referenced before assignment

### backend/orion/management/jobs/alert/dynamic_scanning_processor.py

- L81 **WARNING** `PyUnreachableCodeInspection` — This code is unreachable
- L86 **WARNING** `PyUnboundLocalVariableInspection` — Local variable 'result_list' might be referenced before assignment
- L89 **WARNING** `PyUnboundLocalVariableInspection` — Local variable 'result_list' might be referenced before assignment

### backend/orion/management/jobs/alert/scanning_processor.py

- L95 **WARNING** `PyUnboundLocalVariableInspection` — Local variable 'result' might be referenced before assignment
- L135 **WARNING** `PyUnboundLocalVariableInspection` — Local variable 'result' might be referenced before assignment

### backend/orion/management/managers/test_manager.py

- L374 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'warning' for class 'log'
- L378 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'warning' for class 'log'

### backend/orion/services/log_manager/log_controller.py

- L12 **WARNING** `PyDeprecationInspection` — Soft deprecated. Use the subprocess module instead.

### backend/orion/services/mongo_manager/shared_model/db_alert_model.py

- L41 **WARNING** `PyDeprecationInspection` — datetime.datetime.utcnow() is deprecated and scheduled for removal in a future version. Use timezone-aware objects to represent datetimes in UTC: datetime.datetime.now(datetime.UTC).
- L42 **WARNING** `PyDeprecationInspection` — datetime.datetime.utcnow() is deprecated and scheduled for removal in a future version. Use timezone-aware objects to represent datetimes in UTC: datetime.datetime.now(datetime.UTC).

### backend/orion/services/redis_manager/redis_controller.py

- L117 **WARNING** `PyUnresolvedReferencesInspection` — Cannot find reference 'exceptions' in 'redis.asyncio'

### backend/routes/docs/docs.py

- L2242 **WARNING** `PyRedeclarationInspection` — Redeclared 'SYSTEM_INFO_DOCS' defined above without usage
- L2244 **WARNING** `PyRedeclarationInspection` — Redeclared 'REPORT_DOCS' defined above without usage
- L2249 **WARNING** `PyRedeclarationInspection` — Redeclared 'DYNAMIC_DOCS' defined above without usage
- L2260 **WARNING** `PyRedeclarationInspection` — Redeclared 'SEARCH_DOCS' defined above without usage

### backend/static/403.html

- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'assets'
- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'images'
- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'shared'
- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'logo-wide-light.svg'
- L29 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'assets'
- L29 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'libs'
- L29 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'error-handler.component.css'
- L60 **WARNING** `HtmlUnknownAttribute` — Attribute priority is not allowed here
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'assets'
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'images'
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'shared'
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'server-icon.svg'

### backend/static/404.html

- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'assets'
- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'images'
- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'shared'
- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'logo-wide-light.svg'
- L29 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'assets'
- L29 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'libs'
- L29 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'error-handler.component.css'
- L60 **WARNING** `HtmlUnknownAttribute` — Attribute priority is not allowed here
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'assets'
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'images'
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'shared'
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'server-icon.svg'

### backend/static/500.html

- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'assets'
- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'images'
- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'shared'
- L9 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'logo-wide-light.svg'
- L29 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'assets'
- L29 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'libs'
- L29 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'error-handler.component.css'
- L60 **WARNING** `HtmlUnknownAttribute` — Attribute priority is not allowed here
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'assets'
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'images'
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'shared'
- L60 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'server-icon.svg'

### backend/static/maintenance.html

- L7 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'maintenance-assets'
- L7 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'logo_url_default.png'
- L8 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'maintenance-assets'
- L8 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'logo_url_default.png'
- L35 **WARNING** `CssOverwrittenProperties` — Property min-height is overwritten
- L36 **WARNING** `CssOverwrittenProperties` — Property min-height is overwritten
- L37 **WARNING** `CssOverwrittenProperties` — Property min-height overwrites property min-height
- L213 **WARNING** `HtmlUnknownTarget` — Cannot resolve directory 'maintenance-assets'
- L213 **WARNING** `HtmlUnknownTarget` — Cannot resolve file 'logo_url_default.png'

### backend/static/swagger-code.css

- L113 **WARNING** `CssUnusedSymbol` — Selector opblock-filter-input is never used
- L127 **WARNING** `CssUnusedSymbol` — Selector opblock-filter-input is never used
- L143 **WARNING** `CssUnusedSymbol` — Selector opblock-filter-input is never used
- L152 **WARNING** `CssUnusedSymbol` — Selector opblock-filter-input is never used
- L163 **WARNING** `CssUnusedSymbol` — Selector opblock-filter-input is never used
- L183 **WARNING** `CssUnusedSymbol` — Selector opblock is never used
- L192 **WARNING** `CssUnusedSymbol` — Selector opblock is never used
- L192 **WARNING** `CssUnusedSymbol` — Selector opblock-get is never used
- L199 **WARNING** `CssUnusedSymbol` — Selector opblock is never used
- L199 **WARNING** `CssUnusedSymbol` — Selector opblock-get is never used
- L205 **WARNING** `CssUnusedSymbol` — Selector opblock-section-header is never used
- L215 **WARNING** `CssUnusedSymbol` — Selector opblock-tag-section is never used
- L228 **WARNING** `CssUnusedSymbol` — Selector opblock-tag is never used
- L258 **WARNING** `CssUnusedSymbol` — Selector opblock-tag is never used
- L263 **WARNING** `CssUnusedSymbol` — Selector opblock is never used
- L277 **WARNING** `CssUnusedSymbol` — Selector opblock is never used
- L281 **WARNING** `CssUnusedSymbol` — Selector json-schema-2020-12-accordion is never used
- L289 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-control is never used
- L294 **WARNING** `CssUnusedSymbol` — Selector opblock-summary is never used
- L294 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-control is never used
- L298 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-control is never used
- L310 **WARNING** `CssUnusedSymbol` — Selector opblock-summary is never used
- L315 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-path-description-wrapper is never used
- L321 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-method is never used
- L331 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-method is never used
- L337 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-path is never used
- L347 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-description is never used
- L352 **WARNING** `CssUnusedSymbol` — Selector authorization__btn is never used
- L391 **WARNING** `CssUnusedSymbol` — Selector opblock-tag-section is never used
- L392 **WARNING** `CssUnusedSymbol` — Selector opblock is never used
- L398 **WARNING** `CssUnusedSymbol` — Selector authorization__btn is never used
- L549 **WARNING** `CssUnusedSymbol` — Selector json-schema-2020-12-keyword__name is never used
- L581 **WARNING** `CssUnusedSymbol` — Selector json-schema-2020-12-accordion__children is never used
- L586 **WARNING** `CssUnusedSymbol` — Selector json-schema-2020-12__title is never used
- L597 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-path-description-wrapper is never used
- L602 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-control is never used
- L606 **WARNING** `CssUnusedSymbol` — Selector opblock-summary-control is never used
- L623 **WARNING** `CssUnusedSymbol` — Selector json-schema-2020-12__attribute--primary is never used
- L655 **WARNING** `CssUnusedSymbol` — Selector json-schema-2020-12-accordion is never used
- L666 **WARNING** `CssUnusedSymbol` — Selector json-schema-2020-12__attribute--primary is never used
- L906 **WARNING** `CssUnusedSymbol` — Selector client_id_password is never used
- L907 **WARNING** `CssUnusedSymbol` — Selector client_secret_password is never used
- L916 **WARNING** `CssUnusedSymbol` — Selector client_id_password is never used
- L917 **WARNING** `CssUnknownProperty` — Unknown CSS property <code>required</code>

### backend/tests/cases/auth/test_session_manager.py

- L57 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_redis' for class 'type'
- L58 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_session_ttl' for class 'type'
- L74 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'get_current_user' for class 'type'
- L77 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_redis' for class 'type'
- L78 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_redis' for class 'type'
- L88 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'get_current_user' for class 'type'
- L98 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'get_current_user' for class 'type'
- L108 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'get_current_user' for class 'type'
- L111 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_redis' for class 'type'
- L119 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'get_current_user' for class 'type'
- L223 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'get_current_role' for class 'type'
- L224 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'get_current_status' for class 'type'
- L232 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'get_current_role' for class 'type'
- L247 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'get_current_status' for class 'type'
- L258 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'create_access_token' for class 'type'
- L269 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_engine' for class 'type'
- L270 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_redis' for class 'type'
- L277 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'create_access_token' for class 'type'
- L289 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_redis' for class 'type'
- L296 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'create_access_token' for class 'type'
- L305 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_redis' for class 'type'
- L306 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_engine' for class 'type'
- L339 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'verify_2fa_and_issue' for class 'type'
- L348 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_engine' for class 'type'
- L360 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'verify_2fa_and_issue' for class 'type'
- L370 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'refresh_token' for class 'type'
- L381 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'refresh_token' for class 'type'
- L394 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference '_redis' for class 'type'
- L398 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'refresh_token' for class 'type'
- L411 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'refresh_token' for class 'type'
- L429 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'has_onboarding' for class 'type'
- L435 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'has_onboarding' for class 'type'

### backend/tests/cases/search/test_search_model.py

- L379 **WARNING** `PyUnresolvedReferencesInspection` — Unresolved attribute reference 'detail' for class 'Exception'

### backend/tests/cases/service/test_insight_job_service.py

- L3 **WARNING** `PyUnusedImportsInspection` — Unused import statement <code>import asyncio</code>

### client/cypress/e2e/05-user-management.cy.ts

- L293 **WARNING** `JSUnusedAssignment` — Variable initializer is redundant

### client/cypress/e2e/18-case-management.cy.ts

- L23 **WARNING** `ES6PreferShortImport` — Import can be shortened
- L24 **WARNING** `ES6PreferShortImport` — Import can be shortened

### client/cypress/e2e/controllers/03-flow.controller.ts

- L89 **WARNING** `JSUnusedGlobalSymbols` — Unused function openHomepage

### client/cypress/e2e/controllers/04-searching.controller.ts

- L74 **WARNING** `JSUnusedGlobalSymbols` — Unused function typeDashboardSearch
- L93 **WARNING** `JSUnusedGlobalSymbols` — Unused function openExploitSubmenu
- L97 **WARNING** `JSUnusedGlobalSymbols` — Unused function typeExploitSearch

### client/cypress/e2e/controllers/05-user-management.controller.ts

- L328 **WARNING** `JSUnusedLocalSymbols` — Unused parameter reopenPopup

### client/cypress/e2e/controllers/10-tenant-management.controller.ts

- L124 **WARNING** `JSUnusedGlobalSymbols` — Unused function completeTenantOnboardingIfNeeded
- L137 **WARNING** `JSUnusedGlobalSymbols` — Unused function setCurrentTenantAlertVisibility

### client/cypress/e2e/controllers/16-feeder-management.controller.ts

- L134 **WARNING** `JSUnusedGlobalSymbols` — Unused function openFeederScriptTab
- L372 **WARNING** `JSUnusedGlobalSymbols` — Unused function uploadFixtureRecordsForAllFeederRules

### client/cypress/support/constants.ts

- L3 **WARNING** `JSUnusedGlobalSymbols` — Unused constant ENTITY_FILTERS
- L17 **WARNING** `JSUnusedGlobalSymbols` — Unused constant SORT_OPTIONS
- L19 **WARNING** `JSUnusedGlobalSymbols` — Unused constant SEARCH_BY_OPTIONS
- L26 **WARNING** `JSUnusedGlobalSymbols` — Unused constant SAFE_SEARCH_OPTIONS
- L27 **WARNING** `JSUnusedGlobalSymbols` — Unused constant NETWORK_OPTIONS
- L28 **WARNING** `JSUnusedGlobalSymbols` — Unused constant CONTENT_TYPES
- L31 **WARNING** `JSUnusedGlobalSymbols` — Unused constant FLOW_GENERAL_INTELLIGENCE_SECTIONS
- L32 **WARNING** `JSUnusedGlobalSymbols` — Unused constant FLOW_DATA_BREACH_SECTIONS
- L33 **WARNING** `JSUnusedGlobalSymbols` — Unused constant FLOW_DEFACEMENT_SECTIONS
- L34 **WARNING** `JSUnusedGlobalSymbols` — Unused constant FLOW_SOCIAL_SECTIONS
- L35 **WARNING** `JSUnusedGlobalSymbols` — Unused constant FLOW_EXPLOIT_SECTIONS
- L36 **WARNING** `JSUnusedGlobalSymbols` — Unused constant FLOW_WEB_SCANS_SECTIONS
- L38 **WARNING** `JSUnusedGlobalSymbols` — Unused constant DOMAIN_SCANNER_TEST_DOMAINS

### client/src/app/pages/api/text-analysis/text-analysis.component.html

- L6 **WARNING** `JSUnusedGlobalSymbols` — Unused constant analysisForm
- L155 **WARNING** `JSUnusedLocalSymbols` — Unused constant fieldIdx

### client/src/app/pages/cti-graph/graphs.component.ts

- L1042 **WARNING** `JSUnusedAssignment` — Variable initializer is redundant
- L1043 **WARNING** `JSUnusedAssignment` — Variable initializer is redundant
- L1387 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to this.groupExpandedState[nodeId]

### client/src/app/pages/cti-graph/sidebar/sidebar.component.html

- L5 **WARNING** `Annotator` — Missing name #loc
- L5 **WARNING** `Annotator` — Missing name #loc
- L5 **WARNING** `Annotator` — Missing name #loc
- L5 **WARNING** `Annotator` — Missing name #loc
- L5 **WARNING** `Annotator` — Missing name #loc
- L5 **WARNING** `Annotator` — Missing name #loc

### client/src/app/pages/demo-tour/demo-tour/demo-tour.component.html

- L7 **WARNING** `Annotator` — Unrecognized HTML Attribute #loc
- L7 **WARNING** `Annotator` — Unrecognized HTML Attribute #loc
- L7 **WARNING** `Annotator` — Unrecognized HTML Attribute #loc
- L7 **WARNING** `Annotator` — Unrecognized HTML Attribute #loc
- L7 **WARNING** `Annotator` — Unrecognized HTML Attribute #loc
- L7 **WARNING** `Annotator` — Unrecognized HTML Attribute #loc
- L11 **WARNING** `Annotator` — Unrecognized HTML Attribute #loc
- L11 **WARNING** `Annotator` — Unrecognized HTML Attribute #loc
- L11 **WARNING** `Annotator` — Unrecognized HTML Attribute #loc
- L11 **WARNING** `Annotator` — Unrecognized HTML Attribute #loc

### client/src/app/pages/demo-tour/demo-tour/demo-tour.component.ts

- L1522 **WARNING** `UnnecessaryContinueJS` — <code>continue</code> is unnecessary as the last statement in a loop

### client/src/app/pages/geo-fencing/satellite-intel/map-entities/aircraft/components/aircraft-marker-icon/aircraft-marker-icon.component.html

- L3 **WARNING** `HtmlWrongAttributeValue` — Wrong attribute value

### client/src/app/pages/geo-fencing/threat-lens/threat-lens.html

- L129 **WARNING** `HtmlUnknownAttribute` — Attribute priority is not allowed here

### client/src/app/pages/homepage/home-insight/home-insight.component.html

- L68 **WARNING** `JSUnusedLocalSymbols` — Unused constant i
- L68 **WARNING** `JSUnusedLocalSymbols` — Unused constant last
- L152 **WARNING** `JSUnusedLocalSymbols` — Unused constant first

### client/src/app/pages/homepage/home-insight/home-insight.component.ts

- L107 **WARNING** `JSUnusedGlobalSymbols` — Unused method trimUrl

### client/src/app/pages/homepage/search-filters/search-filters.component.ts

- L123 **WARNING** `JSUnusedGlobalSymbols` — Unused method toggleExpand

### client/src/app/pages/homepage/world-heatmap/world-heatmap.component.ts

- L520 **WARNING** `JSUnusedGlobalSymbols` — Unused method getReportsByCountry

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-apt/dashboard-result-apt.component.ts

- L266 **WARNING** `JSUnusedGlobalSymbols` — Unused method getDescription
- L344 **WARNING** `JSUnusedGlobalSymbols` — Unused method getBadgeClass

### client/src/app/pages/intel-panel/result-insights/result-insights.component.html

- L162 **WARNING** `JSUnusedLocalSymbols` — Unused constant isLast

### client/src/app/pages/manage-profiles/manage-profiles.component.html

- L13 **WARNING** `JSUnusedLocalSymbols` — Unused constant row

### client/src/app/pages/report/templates/report-chat/report-chat.component.ts

- L311 **WARNING** `JSUnusedGlobalSymbols` — Unused method getMetadataRows

### client/src/app/pages/root-searches/ai-workspace/ai-directory/ai-directory.html

- L170 **WARNING** `HtmlWrongAttributeValue` — Wrong attribute value

### client/src/app/pages/root-searches/ai-workspace/ai-workspace.component.html

- L86 **WARNING** `CommaExpressionJS` — Comma expression
- L86 **WARNING** `CommaExpressionJS` — Comma expression

### client/src/app/pages/root-searches/ai-workspace/nexus-chat.service.ts

- L164 **WARNING** `JSUnusedGlobalSymbols` — Unused method pollNexusReportChat
- L176 **WARNING** `JSUnusedGlobalSymbols` — Unused method getNexusChatReply

### client/src/app/pages/root-searches/credentials/credential.component.ts

- L293 **WARNING** `CommaExpressionJS` — Comma expression

### client/src/app/pages/root-searches/dashboard-consolidated/dashboard-consolidated.component.ts

- L344 **WARNING** `JSUnusedGlobalSymbols` — Unused method isIpReportExpandable
- L498 **WARNING** `JSUnusedGlobalSymbols` — Unused method shouldShowSection
- L516 **WARNING** `TrivialIfJS` — <code>if</code> statement can be simplified

### client/src/app/pages/root-searches/dashboard-consolidated/defacement-results/threat-results.component.html

- L38 **WARNING** `JSUnusedLocalSymbols` — Unused constant last

### client/src/app/pages/root-searches/network-intel/dns-section/dns-section.component.ts

- L91 **WARNING** `JSUnusedGlobalSymbols` — Unused method isProgressSegmentActive

### client/src/app/pages/root-searches/network-intel/network-intel.ts

- L243 **WARNING** `JSUnusedGlobalSymbols` — Unused method openGeoCoordinatesModal
- L266 **WARNING** `JSUnusedGlobalSymbols` — Unused method openGeoRangesModal
- L350 **WARNING** `JSUnusedGlobalSymbols` — Unused method getGeoRangePreview
- L359 **WARNING** `JSUnusedGlobalSymbols` — Unused method getGeoRangeExtraCount
- L1617 **WARNING** `JSUnusedAssignment` — Variable initializer is redundant

### client/src/app/pages/root-searches/network-intel/security-scan/security-scan.component.html

- L32 **WARNING** `JSUnusedGlobalSymbols` — Unused constant printReportButton
- L189 **WARNING** `JSUnusedLocalSymbols` — Unused constant idx
- L194 **WARNING** `JSUnusedLocalSymbols` — Unused constant jdx

### client/src/app/pages/root-searches/network-intel/shodan-section/shodan-section.component.ts

- L60 **WARNING** `JSUnusedGlobalSymbols` — Unused method isProgressSegmentActive

### client/src/app/pages/scan-report/scan-report.component.html

- L105 **WARNING** `JSUnusedLocalSymbols` — Unused constant sectionIdx

### client/src/app/pages/social-cti/home-menu/home-menu.component.html

- L1 **WARNING** `Annotator` — Missing name #loc
- L1 **WARNING** `Annotator` — Missing name #loc
- L1 **WARNING** `Annotator` — Missing name #loc
- L1 **WARNING** `Annotator` — Missing name #loc
- L1 **WARNING** `Annotator` — Missing name #loc
- L1 **WARNING** `Annotator` — Missing name #loc
- L21 **WARNING** `Annotator` — Missing name #loc
- L21 **WARNING** `Annotator` — Missing name #loc
- L21 **WARNING** `HtmlUnknownBooleanAttribute` — [class.border-[#57a5eb] requires value

### client/src/app/pages/social-cti/profile-detail/resource-feed-section/resource-feed-section.component.html

- L119 **WARNING** `Annotator` — Missing name #loc

### client/src/app/pages/social-cti/profile-detail/resource-media-section/resource-media-section.component.html

- L4 **WARNING** `AngularUndefinedBinding` — <html>Attribute <code><span style="color:#0000ff;font-weight:bold;">[class.aspect-[3</span></code> is not allowed here</html>
- L4 **WARNING** `Annotator` — Missing name #loc
- L4 **WARNING** `HtmlUnknownBooleanAttribute` — [class.aspect-[3 requires value
- L25 **WARNING** `AngularUndefinedBinding` — <html>Attribute <code><span style="color:#0000ff;font-weight:bold;">[class.bg-black</span></code> is not allowed here</html>
- L25 **WARNING** `Annotator` — Missing name #loc
- L25 **WARNING** `HtmlUnknownBooleanAttribute` — [class.bg-black requires value

### client/src/app/pages/social-cti/profile-listing/profile-listing.component.ts

- L301 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to this.loadingByRequestKey()[this.getRequestKey(stateKey, platformData)]
- L601 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to this.loadingByRequestKey()[this.getRequestKey(stateKey, platformData)]
- L671 **WARNING** `JSUnusedLocalSymbols` — Unused parameter platform
- L927 **WARNING** `JSUnusedLocalSymbols` — Unused parameter platformData

### client/src/app/pages/social-cti/profile-popups/manage-profiles-modal/manage-profiles-modal.component.html

- L3 **WARNING** `Annotator` — Missing name #loc

### client/src/app/pages/social-cti/social-mapper.component.html

- L62 **WARNING** `Annotator` — Missing name #loc

### client/src/app/pages/social-cti/user-graph/social-user-graph.component.html

- L1 **WARNING** `Annotator` — Missing name #loc
- L26 **WARNING** `Annotator` — Missing name #loc

### client/src/app/pages/social-cti/utils/social-user-graph.util.ts

- L719 **WARNING** `HtmlUnknownAttribute` — Attribute x is not allowed here
- L719 **WARNING** `HtmlUnknownAttribute` — Attribute y is not allowed here
- L719 **WARNING** `HtmlUnknownAttribute` — Attribute width is not allowed here
- L719 **WARNING** `HtmlUnknownAttribute` — Attribute height is not allowed here

### client/src/app/pages/tenant/tenant-management/add-tenant/add-tenant.component.html

- L3 **WARNING** `Annotator` — Missing name #loc

### client/src/app/pages/tenant/tenant-management/view-tenant/view-tenant.component.html

- L465 **WARNING** `Annotator` — Missing name #loc

### client/src/app/pages/tenant/tenant-management/view-tenant/view-tenant.component.ts

- L127 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to this.appService.configData().appSettings.ai_endpoint_enabled

### client/src/app/pages/tenant/tenant.component.ts

- L50 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to !tenantPrivileged

### client/src/app/pages/user-management/auditlog/services/auditlog.service.ts

- L17 **WARNING** `JSUnusedGlobalSymbols` — Unused method reloadAuditData

### client/src/app/pages/user-management/sidebar-user-case-management/case-management-service/case-pdf-export.service.ts

- L183 **WARNING** `JSSuspiciousNameCombination` — 'tableBorderWidth' should probably not be assigned to 'bottom'
- L188 **WARNING** `JSSuspiciousNameCombination` — 'tableBorderWidth' should probably not be assigned to 'bottom'
- L193 **WARNING** `JSSuspiciousNameCombination` — 'tableBorderWidth' should probably not be assigned to 'bottom'

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-artifacts-section/case-artifacts-section.html

- L443 **WARNING** `CommaExpressionJS` — Comma expression

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-details.ts

- L645 **WARNING** `JSUnusedAssignment` — Variable initializer is redundant

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-edit-drawer/case-edit-drawer.html

- L3 **WARNING** `Annotator` — Missing name #loc

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-tracking-board-settings/case-tracking-board-settings.html

- L33 **WARNING** `AngularUndefinedBinding` — <html>Directive that provides attribute <code><span style="color:#0000ff;font-weight:bold;">cdkDrag</span></code> is out of scope of the current template</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-tracking-board/case-tracking-board.css

- L32 **WARNING** `CssRedundantUnit` — Unit of measure <code>%</code> is redundant
- L44 **WARNING** `CssRedundantUnit` — Unit of measure <code>%</code> is redundant
- L54 **WARNING** `CssRedundantUnit` — Unit of measure <code>%</code> is redundant

### client/src/app/pages/user-management/sidebar-user-case-management/model/entity-details/entity-details.ts

- L121 **WARNING** `JSUnusedGlobalSymbols` — Unused method getEntityTypeOtherError
- L125 **WARNING** `JSUnusedGlobalSymbols` — Unused method getEntitySourceOtherError

### client/src/app/pages/user-management/sidebar-user-case-management/sidebar-user-case-management.html

- L94 **WARNING** `JSUnusedLocalSymbols` — Unused constant i
- L94 **WARNING** `ReservedWordUsedAsNameJS` — Reserved word 'case' used as name
- L161 **WARNING** `JSUnusedLocalSymbols` — Unused constant i
- L161 **WARNING** `ReservedWordUsedAsNameJS` — Reserved word 'case' used as name

### client/src/app/pages/user-management/sidebar-user-case-management/sidebar-user-case-management.ts

- L205 **WARNING** `JSUnusedGlobalSymbols` — Unused method toggleArchivedCases

### client/src/app/pages/user-management/sidebar-user-homepage/add-custom-alert/add-custom-alert.component.ts

- L172 **WARNING** `JSUnusedGlobalSymbols` — Unused method getAlertTypeLabel

### client/src/app/pages/user-management/sidebar-user-homepage/category-alert-report/alert-detail-drawer/category-alert-detail-drawer.component.html

- L4 **WARNING** `Annotator` — Missing name #loc

### client/src/app/pages/user-management/sidebar-user-homepage/category-alert-report/category-alert-report.component.html

- L37 **WARNING** `JSUnusedGlobalSymbols` — Unused constant fileInput

### client/src/app/pages/user-management/sidebar-user-homepage/category-alert-report/category-alert-report.component.ts

- L263 **WARNING** `JSUnusedGlobalSymbols` — Unused method isAlertExpanded
- L267 **WARNING** `JSUnusedGlobalSymbols` — Unused method toggleAlertExpanded
- L275 **WARNING** `JSUnusedGlobalSymbols` — Unused method exportAlert
- L686 **WARNING** `JSUnusedGlobalSymbols` — Unused method sliceString
- L687 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to typeof text !== 'string'
- L696 **WARNING** `JSUnusedGlobalSymbols` — Unused method hasAlertUrl
- L910 **WARNING** `JSUnusedGlobalSymbols` — Unused method filterByDate

### client/src/app/pages/user-management/sidebar-user-homepage/sidebar-user-homepage.component.ts

- L155 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to !tenantPrivileged

### client/src/app/pages/user-management/sidebar-user-ioc/sidebar-user-ioc.component.ts

- L58 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to !tenantPrivileged

### client/src/app/pages/user-management/sidebar-user-log-manager/sidebar-user-log-manager.component.ts

- L108 **WARNING** `JSUnusedGlobalSymbols` — Unused method deleteFile

### client/src/app/pages/user-management/sidebar-user-settings/sidebar-settings.util.ts

- L27 **WARNING** `JSUnusedGlobalSymbols` — Unused function toggleEditState

### client/src/app/pages/user-management/sidebar-user-settings/tenant-settings/tenant-settings.component.ts

- L194 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to response?.app?.slack_configured
- L197 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to response?.app?.jira_configured
- L198 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to response?.tenant?.slack_connected
- L201 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to response?.tenant?.jira_connected

### client/src/app/pages/user-management/sidebar-user-system-settings/sidebar-user-system-settings.component.ts

- L87 **WARNING** `JSUnusedAssignment` — Variable initializer is redundant
- L333 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to response?.app?.slack_configured
- L336 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to response?.app?.jira_configured
- L337 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to response?.tenant?.slack_connected
- L340 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to response?.tenant?.jira_connected

### client/src/app/shared/model/extension/extension.model.ts

- L11 **WARNING** `JSUnusedGlobalSymbols` — Unused interface ExtensionSession

### client/src/app/shared/partials/alert-notification/alert-notification.component.ts

- L457 **WARNING** `JSUnusedGlobalSymbols` — Unused method getScanError

### client/src/app/shared/partials/filters/filters.component.ts

- L106 **WARNING** `JSUnusedGlobalSymbols` — Unused method onNumberInputChange

### client/src/app/shared/partials/ioc-search/ioc-search.component.html

- L47 **WARNING** `HtmlUnknownAttribute` — Attribute priority is not allowed here

### client/src/app/shared/partials/ioc-search/ioc-search.component.ts

- L5 **WARNING** `ES6PreferShortImport` — Import can be shortened
- L6 **WARNING** `ES6PreferShortImport` — Import can be shortened
- L8 **WARNING** `ES6PreferShortImport` — Import can be shortened
- L9 **WARNING** `ES6PreferShortImport` — Import can be shortened
- L10 **WARNING** `ES6PreferShortImport` — Import can be shortened

### client/src/app/shared/partials/json-api-viewer/json-viewer/json-viewer.component.html

- L9 **WARNING** `Annotator` — Missing name #loc

### client/src/app/shared/partials/profile/profile.component.html

- L18 **WARNING** `HtmlUnknownAttribute` — Attribute priority is not allowed here

### client/src/app/shared/partials/report-interactions/report-user-sidebar/report-user-sidebar.component.html

- L4 **WARNING** `Annotator` — Missing name #loc

### client/src/app/shared/partials/result/result.component.ts

- L62 **WARNING** `JSUnusedGlobalSymbols` — Unused field selectedSearchBy
- L317 **WARNING** `JSUnusedGlobalSymbols` — Unused method toggleScan
- L321 **WARNING** `JSUnusedGlobalSymbols` — Unused method onScanSelected

### client/src/app/shared/partials/result/services/home.search.service.ts

- L22 **WARNING** `JSUnusedGlobalSymbols` — Unused method openOverlay

### client/src/app/shared/partials/takedown-action/takedown-action.component.ts

- L163 **WARNING** `JSUnusedAssignment` — Variable initializer is redundant

### client/src/app/shared/partials/tenant-ioc-selector/tenant-ioc-selector.component.ts

- L9 **WARNING** `ES6PreferShortImport` — Import can be shortened

### client/src/app/shared/services/export/graph-export.service.ts

- L463 **WARNING** `JSSuspiciousNameCombination` — 'TABLE_BORDER_WIDTH' should probably not be assigned to 'bottom'
- L478 **WARNING** `JSSuspiciousNameCombination` — 'TABLE_BORDER_WIDTH' should probably not be assigned to 'bottom'
- L490 **WARNING** `JSSuspiciousNameCombination` — 'TABLE_BORDER_WIDTH' should probably not be assigned to 'bottom'
- L714 **WARNING** `RegExpUnnecessaryNonCapturingGroup` — Unnecessary non-capturing group <code>(?:banner|headers?|response|request)</code>
- L800 **WARNING** `JSUnusedGlobalSymbols` — Unused method fitSingleLineStrict
- L833 **WARNING** `JSUnusedGlobalSymbols` — Unused method drawClippedText

### client/src/app/shared/services/scan-notification.service.ts

- L99 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to response?.has_more
- L177 **WARNING** `PointlessBooleanExpressionJS` — Can be simplified to (response as ScanJobDuplicateChoiceResponse)?.requires_confirmation

### client/src/app/shared/utils/moderation-mapping.ts

- L30 **WARNING** `JSUnusedGlobalSymbols` — Unused function getModerationConfig

### client/src/assets/data/mail_template_data/alert_mail_template.html

- L15 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L15 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L15 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L15 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L17 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L18 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L18 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L18 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L18 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L40 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L40 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L40 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L40 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L61 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L61 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L61 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L61 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L65 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L82 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L82 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L82 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L82 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L96 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L96 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L96 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc

### client/src/assets/data/mail_template_data/mail_template.html

- L15 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L15 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L15 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L15 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L17 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L18 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L18 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L18 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L18 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L43 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L43 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L43 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L43 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L56 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L56 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L56 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc

### client/src/assets/data/mail_template_data/takedown_template.html

- L9 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L9 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L9 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L9 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L11 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L12 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L12 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L12 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc
- L12 **WARNING** `HtmlDeprecatedAttribute` — Obsolete attribute #loc

### client/src/styles.scss

- L365 **WARNING** `CssOverwrittenProperties` — Property height is overwritten
- L366 **WARNING** `CssOverwrittenProperties` — Property height overwrites property height
- L367 **WARNING** `CssOverwrittenProperties` — Property min-height is overwritten
- L368 **WARNING** `CssOverwrittenProperties` — Property min-height overwrites property min-height
- L966 **WARNING** `CssRedundantUnit` — Unit of measure <code>%</code> is redundant

### docs/_static/custom.css

- L66 **WARNING** `CssUnusedSymbol` — Selector ethical-sidebar is never used
- L70 **WARNING** `CssUnusedSymbol` — Selector orion-shot-btn is never used
- L90 **WARNING** `CssUnusedSymbol` — Selector orion-shot-btn is never used
- L95 **WARNING** `CssUnusedSymbol` — Selector orion-shot-btn is never used
- L99 **WARNING** `CssUnusedSymbol` — Selector orion-shot-btn is never used
- L104 **WARNING** `CssUnusedSymbol` — Selector orion-shot-btn is never used
- L108 **WARNING** `CssUnusedSymbol` — Selector orion-shot-btn is never used
- L114 **WARNING** `CssUnusedSymbol` — Selector orion-shot-btn is never used
- L119 **WARNING** `CssUnusedSymbol` — Selector ethical-sidebar is never used

### .github/workflows/build.yml

- L28 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### .github/workflows/test.yml

- L28 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L264 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### backend/configs/app_dependency.py

- L203 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'status_required' from outer scope
- L228 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'bool' of 'set[Any] | bool' does not have attribute '__contains__'
- L246 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'bool' of 'set[Any] | bool' does not have attribute 'update'

### backend/configs/token_auth_provider.py

- L31 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Request[State] | None' does not have attribute 'state'
- L75 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'username'

### backend/orion/api/interactive/account_manager/account_manager.py

- L196 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'is_default'
- L196 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'user_quota'
- L196 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'user_quota'
- L205 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'id'
- L207 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'licenses'
- L365 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'license'
- L373 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful
- L420 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'license'

### backend/orion/api/interactive/alert_manager/alert_mail_helper.py

- L66 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'email'
- L66 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'username'
- L149 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'item' from outer scope

### backend/orion/api/interactive/alert_manager/alert_manager.py

- L99 **WEAK WARNING** `PyRedundantParenthesesInspection` — Remove redundant parentheses
- L104 **WEAK WARNING** `PyRedundantParenthesesInspection` — Remove redundant parentheses
- L104 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'email'
- L104 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'username'
- L203 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'tenant' value is not used
- L211 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'item' from outer scope
- L438 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'id'
- L641 **WEAK WARNING** `PyRedundantParenthesesInspection` — Remove redundant parentheses

### backend/orion/api/interactive/auditlog_manager/audit_log_manager.py

- L68 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute 'split'
- L98 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'dict[Any, Any]' of 'dict[Any, Any] | Any' does not have attribute '__and__'

### backend/orion/api/interactive/auth_manager/auth_manager.py

- L58 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'status'
- L67 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'twofa_enabled'
- L68 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'twofa_secret'
- L70 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'username'
- L77 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'username'
- L79 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'username'
- L85 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'username'
- L88 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'tenant_uuid'
- L91 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'role'
- L91 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'role'
- L99 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'tenant_uuid'
- L109 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'status'
- L117 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'role'
- L122 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'username'
- L129 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'tenant_uuid'
- L129 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'id'
- L131 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'tenant_uuid'
- L133 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'username'
- L133 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'status'
- L133 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'subscription'
- L133 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'account_verify_at'
- L134 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'license'
- L134 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'licenses'

### backend/orion/api/interactive/case_manager/case_manager.py

- L504 **WEAK WARNING** `PyRedundantParenthesesInspection` — Remove redundant parentheses
- L719 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'type'
- L737 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'files'
- L760 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'download' value is not used
- L785 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'files'
- L790 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'fileResourceId'
- L791 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'fileName'
- L792 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'fileType'
- L856 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'files'
- L861 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'fileResourceId'
- L864 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'files'
- L907 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'current_user' value is not used
- L1111 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'files'
- L1121 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'fileName'
- L1132 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'fileId'
- L1134 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'integrityStatus'

### backend/orion/api/interactive/case_manager/case_share_manager.py

- L124 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'tokenHash'
- L128 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'revokedAt'
- L130 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'expiresAt'
- L138 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'shareId'
- L149 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'expiresAt'

### backend/orion/api/interactive/case_manager/models/case_models.py

- L377 **WEAK WARNING** `PyRedundantParenthesesInspection` — Remove redundant parentheses

### backend/orion/api/interactive/case_manager/status_board_config.py

- L67 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful
- L70 **WEAK WARNING** `PyMethodParametersInspection` — Usually first parameter of such methods is named 'cls'

### backend/orion/api/interactive/feedback_manager/feedback_manager.py

- L82 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'license'
- L136 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful
- L144 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful
- L152 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful
- L354 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'updated_at'
- L360 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'recommended'
- L361 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'trust_state'
- L361 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'trust_state'

### backend/orion/api/interactive/feeder_manager/feeder_helper.py

- L235 **WEAK WARNING** `PyUnusedLocalVariableInspection` — Local variable 'record' value is not used
- L300 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'author_id'
- L301 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'author_name'

### backend/orion/api/interactive/feeder_manager/feeder_manager.py

- L46 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'int | None' does not have attribute '__gt__'
- L376 **WEAK WARNING** `PyComparisonWithNoneInspection` — Comparison with None performed with equality operators

### backend/orion/api/interactive/profile_manager/profile_manager.py

- L80 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'get'
- L107 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'session_id'
- L114 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'username'
- L157 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'get'

### backend/orion/api/interactive/resource_manager/resource_manager.py

- L56 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'id'
- L64 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute 'startswith'
- L158 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute 'startswith'

### backend/orion/api/interactive/scan_job_manager/scan_job_manager.py

- L34 **WEAK WARNING** `PyMethodParametersInspection` — Usually first parameter of such methods is named 'cls'
- L60 **WEAK WARNING** `PyMethodParametersInspection` — Usually first parameter of such methods is named 'cls'
- L63 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'Buffer' doesn't define '__str__' or '__repr__', so the result might not be useful
- L63 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful
- L63 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'object' string value might not be useful
- L95 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'decode'
- L97 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'decode'
- L154 **WEAK WARNING** `PyRedundantParenthesesInspection` — Remove redundant parentheses

### backend/orion/api/interactive/scheduler_manager/scheduler_manager.py

- L66 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__', '__repr__', or '__format__', so the result might not be useful
- L177 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'property' doesn't define '__str__', '__repr__', or '__format__', so the result might not be useful

### backend/orion/api/interactive/search_manager/internal/search_defacement_controller.py

- L80 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L126 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'record' from outer scope
- L167 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'group' from outer scope

### backend/orion/api/interactive/search_manager/search_query_generator.py

- L234 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'int' of 'list[Any] | int' does not have attribute 'append'
- L256 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'int' of 'list[Any] | int' does not have attribute 'append'
- L302 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L487 **WEAK WARNING** `PyUnusedLocalVariableInspection` — Local variable 'm_platform' value is not used
- L741 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'split'

### backend/orion/api/interactive/social_manager/social_model.py

- L69 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful
- L102 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'dict[Any, Any] | None | Any' does not have attribute 'get'
- L102 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'dict[Any, Any] | None | Any' does not have attribute 'get'
- L104 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'dict[Any, Any] | None | Any' does not have attribute 'get'
- L104 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'dict[Any, Any] | None | Any' does not have attribute 'get'
- L530 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful
- L531 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful
- L628 **WEAK WARNING** `PyRedundantParenthesesInspection` — Remove redundant parentheses

### backend/orion/api/interactive/system_log_manager/system_log_manager.py

- L195 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'stat' from outer scope

### backend/orion/api/interactive/takedown_manager/takedown_manager.py

- L111 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'Buffer' doesn't define '__str__' or '__repr__', so the result might not be useful
- L111 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'object' string value might not be useful

### backend/orion/api/interactive/tenant_manager/tenant_manager.py

- L126 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__', '__repr__', or '__format__', so the result might not be useful
- L128 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__', '__repr__', or '__format__', so the result might not be useful
- L181 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute 'encode'
- L248 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute 'encode'
- L498 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute 'encode'
- L512 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute 'encode'
- L614 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute 'encode'
- L816 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful

### backend/orion/api/server/config_manager/config_controller.py

- L64 **WEAK WARNING** `PyMethodParametersInspection` — Usually first parameter of such methods is named 'cls'
- L68 **WEAK WARNING** `PyMethodParametersInspection` — Usually first parameter of such methods is named 'cls'
- L119 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'db_tenant_model | None' does not have attribute 'id'
- L143 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'db_tenant_model | None' does not have attribute 'is_default'
- L147 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'value'
- L148 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'value'
- L156 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'db_tenant_model | None' does not have attribute 'is_default'
- L184 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful

### backend/orion/api/server/crawl_manager/crawl_index_generator.py

- L83 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful
- L100 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__' or '__repr__', so the result might not be useful

### backend/orion/api/server/crawl_manager/crawl_model.py

- L116 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__', '__repr__', or '__format__', so the result might not be useful
- L118 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__', '__repr__', or '__format__', so the result might not be useful
- L511 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'None | Any | None' does not have attribute '_build_parser_payload'
- L523 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'None | Any | None' does not have attribute '_build_feeder_file_content'
- L664 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'log' from outer scope

### backend/orion/api/server/entity_manager/entity_manager.py

- L64 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'None | Any | None' does not have attribute '_refresh_arango_handles'
- L820 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'cluster_key' from outer scope
- L820 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'cluster_label' from outer scope
- L964 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'dict[str, Any] | None' does not have attribute '__setitem__'
- L964 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'dict[str, Any] | None' does not have attribute '__getitem__'
- L1074 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'edge' from outer scope
- L1083 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'vertex' from outer scope
- L1135 **WEAK WARNING** `PyUnusedLocalVariableInspection` — Local variable 'aggregate_document_ids' value is not used
- L1578 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'property_value_key' from outer scope
- L1578 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'property_display_value' from outer scope
- L1720 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__', '__repr__', or '__format__', so the result might not be useful

### backend/orion/api/server/entity_manager/entity_request_generator.py

- L68 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'depth_level' value is not used
- L232 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'depth_level' value is not used
- L406 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'secondary_depth_level' value is not used

### backend/orion/api/server/nexus_manager/stream_manager.py

- L97 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Response | None' does not have attribute 'aiter_lines'
- L126 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Response | None' does not have attribute 'aclose'
- L193 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'dict[str, str] | None' does not have attribute '__setitem__'
- L195 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'dict[str, str] | None' does not have attribute '__setitem__'
- L252 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Task[Any] | None' does not have attribute 'cancel'

### backend/orion/helper_manager/helper_controller.py

- L45 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'log' from outer scope
- L61 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__', '__repr__', or '__format__', so the result might not be useful
- L331 **WEAK WARNING** `RegExpSimplifiable` — <code>[^\s]</code> can be simplified to '\S'
- L488 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'item' from outer scope

### backend/orion/management/jobs/alert/category_processor.py

- L41 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'summary' value is not used
- L79 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'category' value is not used

### backend/orion/management/jobs/alert/result_mappers.py

- L123 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute '__getitem__'

### backend/orion/management/jobs/alert/scanning_processor.py

- L63 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L120 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'network_intel'

### backend/orion/management/jobs/alert/tenant_ioc_service.py

- L28 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__', '__repr__', or '__format__', so the result might not be useful
- L45 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute 'encode'

### backend/orion/management/managers/cronjob_manager.py

- L100 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'tenant' from outer scope

### backend/orion/management/managers/test_manager.py

- L162 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'indices' from outer scope
- L163 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'idx' from outer scope
- L172 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'e' from outer scope
- L247 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'idx' from outer scope
- L281 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'e' from outer scope
- L315 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'd' from outer scope
- L380 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'fp' from outer scope
- L381 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'docs' from outer scope

### backend/orion/middleware/middlewares/content_block_middleware.py

- L24 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'id'

### backend/orion/middleware/middlewares/content_security_policy_middleware.py

- L118 **WEAK WARNING** `PyRedundantParenthesesInspection` — Remove redundant parentheses

### backend/orion/services/elastic_manager/elastic_controller.py

- L40 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L43 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### backend/orion/services/log_manager/log_controller.py

- L92 **WEAK WARNING** `PyUnusedLocalVariableInspection` — Local variable 'e' value is not used
- L128 **WEAK WARNING** `PyUnusedLocalVariableInspection` — Local variable 'e' value is not used

### backend/orion/services/mail_manager/mail_manager.py

- L94 **WEAK WARNING** `PyRedundantParenthesesInspection` — Remove redundant parentheses
- L162 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'e' from outer scope
- L171 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'e' from outer scope
- L199 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'e' from outer scope
- L238 **WEAK WARNING** `PyStringConversionWithoutDunderMethodInspection` — Type 'None' doesn't define '__str__', '__repr__', or '__format__', so the result might not be useful

### backend/orion/services/mongo_manager/shared_model/db_auth_models.py

- L114 **WEAK WARNING** `PyMethodParametersInspection` — Usually first parameter of a method is named 'self'

### backend/orion/services/mongo_manager/shared_model/db_system_settings.py

- L38 **WEAK WARNING** `PyMethodParametersInspection` — Usually first parameter of a method is named 'self'

### backend/orion/services/mongo_manager/shared_views/tenant_admin_view.py

- L20 **WEAK WARNING** `PySimplifyBooleanCheckInspection` — Expression can be simplified
- L34 **WEAK WARNING** `PySimplifyBooleanCheckInspection` — Expression can be simplified

### backend/orion/services/redis_manager/redis_controller.py

- L124 **WEAK WARNING** `PyInconsistentReturnsInspection` — Missing return statement on some paths

### backend/orion/services/session_manager/session_manager.py

- L74 **WEAK WARNING** `PyMethodParametersInspection` — Usually first parameter of such methods is named 'cls'
- L170 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'role'
- L176 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'role'
- L189 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'timedelta' of 'timedelta | None | Any' does not have attribute 'timestamp'
- L191 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'timedelta' of 'timedelta | None | Any' does not have attribute 'timestamp'

### backend/orion/services/stix_manager/converters/stix_minimal.py

- L152 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### backend/routes/admin_routes.py

- L20 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'license'
- L41 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'id'
- L50 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'id'

### backend/routes/ai_routes.py

- L95 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L95 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'current_user' value is not used

### backend/routes/api_routes.py

- L701 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'force_new' value is not used

### backend/routes/auth_routes.py

- L77 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'token' from outer scope
- L90 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'token' from outer scope
- L98 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'id'
- L119 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'token' from outer scope

### backend/routes/docs/docs.py

- L25 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L239 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L254 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L265 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L276 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L287 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L295 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L300 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L501 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L583 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L629 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L656 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L658 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L659 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L659 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L850 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L851 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L858 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L859 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L862 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L863 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1084 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1085 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1648 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1650 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1656 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1671 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1679 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2049 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2050 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2061 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2062 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### backend/routes/extension_routes.py

- L46 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'id'
- L108 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'id'

### backend/routes/helper/route_test_helper.py

- L120 **WEAK WARNING** `PyMethodParametersInspection` — Usually first parameter of a method is named 'self'
- L129 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Any | None' does not have attribute 'value'

### backend/routes/public_api_routes.py

- L55 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'id'
- L60 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'id'
- L69 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'id'
- L90 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Address | None' does not have attribute 'host'

### backend/routes/tenant_routes.py

- L270 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'current_user' value is not used
- L349 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'id'

### backend/routes/test_routes.py

- L112 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'param' value is not used
- L120 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'param' value is not used
- L133 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'param' value is not used
- L145 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'param' value is not used
- L153 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'param' value is not used
- L161 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'param' value is not used
- L193 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'file' value is not used
- L201 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'user_id' value is not used
- L201 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'file' value is not used
- L210 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'file' value is not used
- L354 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L363 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L372 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L381 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L390 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L399 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L407 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L415 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L423 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L431 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L439 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L447 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L455 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L463 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L503 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L511 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'payload' value is not used
- L519 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'data' value is not used
- L537 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'tab' value is not used

### backend/static/swagger-code.css

- L562 **WEAK WARNING** `CssReplaceWithShorthandSafely` — Properties may be safely replaced with 'margin' shorthand
- L563 **WEAK WARNING** `CssReplaceWithShorthandSafely` — Properties may be safely replaced with 'margin' shorthand
- L564 **WEAK WARNING** `CssReplaceWithShorthandSafely` — Properties may be safely replaced with 'margin' shorthand
- L565 **WEAK WARNING** `CssReplaceWithShorthandSafely` — Properties may be safely replaced with 'margin' shorthand

### backend/tests/cases/auth/test_account_manager.py

- L216 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute '__contains__'

### backend/tests/cases/auth/test_auth_rate_limiter.py

- L25 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'Mapping[str, str] | None' does not have attribute '__getitem__'

### backend/tests/cases/auth/test_session_manager.py

- L401 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'None' of 'str | None' does not have attribute '__contains__'

### backend/tests/cases/fake_model/fakes.py

- L23 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member '(self: Self@FakeDoc) -> dict[str, Any]' of '(self: Self@FakeDoc) -> dict[str, Any] | type[dict]' does not have attribute '__getitem__'
- L104 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'args' value is not used
- L104 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'kwargs' value is not used
- L191 **WEAK WARNING** `PyShadowingBuiltinsInspection` — Shadows built-in name 'id'
- L191 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'request_timeout' value is not used

### backend/tests/cases/search/test_search_model.py

- L104 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'record_name' value is not used
- L104 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'url' value is not used
- L366 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'exc' from outer scope

### backend/tests/cases/service/test_alert_job_service.py

- L104 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'return_document' value is not used

### backend/tests/cases/service/test_config_controller_service.py

- L25 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### backend/tests/cases/service/test_entity_graph_batch_service.py

- L40 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'self' value is not used
- L92 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'self' value is not used

### backend/tests/cases/service/test_insight_job_service.py

- L233 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'self' value is not used

### client/cypress/e2e/03-flow.cy.ts

- L112 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call

### client/cypress/e2e/05-user-management.cy.ts

- L262 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L314 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L333 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L350 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L469 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L470 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L471 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L475 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call

### client/cypress/e2e/06-account-management.cy.ts

- L92 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call

### client/cypress/e2e/08-social-management.cy.ts

- L25 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L26 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L27 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L30 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L31 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L35 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L36 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L38 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L88 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L295 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call

### client/cypress/e2e/11-Pagination.cy.ts

- L4 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L7 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored

### client/cypress/e2e/13-consolidated.cy.ts

- L36 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L47 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L51 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L234 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L244 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call

### client/cypress/e2e/21-ai-chat.cy.ts

- L60 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L80 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L116 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L182 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L186 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L215 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call

### client/cypress/e2e/controllers/03-flow.controller.ts

- L23 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L34 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L38 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L43 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L45 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L59 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L66 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L78 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L83 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L90 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from loginAsAdmin is ignored
- L91 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L92 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L93 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L94 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L98 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L105 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L125 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L135 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L136 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L137 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L138 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L139 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L141 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L142 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L147 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L148 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L150 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L159 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L160 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L165 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L167 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L172 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L174 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L175 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L176 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L177 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L185 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from select is ignored
- L189 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L190 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L191 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L192 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clear is ignored
- L193 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L194 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L195 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L197 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L199 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L205 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L208 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L211 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L212 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L213 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L215 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L219 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L220 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L226 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L227 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L228 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L229 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L230 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L231 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L232 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L235 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L240 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L242 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L245 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored

### client/cypress/e2e/controllers/04-searching.controller.ts

- L24 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L31 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L34 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L42 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L46 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L60 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L67 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L71 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L75 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L77 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L78 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L83 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L85 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L86 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from typeSlow is ignored
- L90 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from typeSlow is ignored
- L102 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L106 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L110 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L111 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L116 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L132 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L133 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L134 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L138 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L144 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L146 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L150 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L157 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L162 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L172 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L173 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L177 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored

### client/cypress/e2e/controllers/05-user-management.controller.ts

- L20 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L37 **WEAK WARNING** `TypeScriptRedundantGenericType` — Explicit type argument HTMLElement can be removed
- L39 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L41 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L42 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L54 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L55 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L69 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L73 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L102 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from select is ignored
- L110 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from each is ignored
- L116 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L125 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L127 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L128 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L136 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L140 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L158 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L161 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L162 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L170 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L174 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L188 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L193 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L194 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L202 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L206 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L212 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L213 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L214 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L215 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L216 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L217 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L218 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L225 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L226 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L227 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L234 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L239 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L244 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToBottom is ignored
- L252 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L258 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L262 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L269 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L270 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L275 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L276 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visitLoginWithCleanAuthState is ignored
- L277 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L278 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L279 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L280 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForLoginRequest is ignored
- L284 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L285 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToBottom is ignored
- L289 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L290 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L291 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L292 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L293 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L294 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L295 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L296 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L297 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L298 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L299 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L314 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L315 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from check is ignored
- L316 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L317 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L318 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L319 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from submit is ignored
- L320 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L325 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from logout is ignored
- L329 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L338 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L339 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L340 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L341 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from docsScreenshot is ignored
- L343 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L344 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L345 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L348 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L350 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from blur is ignored
- L351 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L353 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from blur is ignored
- L354 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L356 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from blur is ignored
- L357 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L359 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L360 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L362 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L363 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L364 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L365 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L367 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L368 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L369 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L370 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from docsScreenshot is ignored
- L371 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L373 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L374 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L378 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L379 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L393 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from log is ignored
- L398 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L402 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L403 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L406 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L407 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L408 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L410 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L411 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored

### client/cypress/e2e/controllers/07-cti-management.controller.ts

- L2 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L3 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L4 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L5 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L6 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L7 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L12 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L16 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L20 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L21 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L25 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from viewport is ignored
- L33 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L34 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L35 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored

### client/cypress/e2e/controllers/08-social-extension.controller.ts

- L7 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L8 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L9 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L16 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L17 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L21 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L25 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L27 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L28 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L32 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L33 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L37 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L41 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L42 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L43 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L47 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L48 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L49 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from docsScreenshot is ignored
- L51 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L52 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L53 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L60 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L61 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L63 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L68 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L73 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L74 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L75 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L76 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored

### client/cypress/e2e/controllers/08-social-management.controller.ts

- L20 **WEAK WARNING** `TypeScriptRedundantGenericType` — Explicit type argument HTMLElement can be removed
- L104 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from remember is ignored
- L105 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from remember is ignored
- L106 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from remember is ignored
- L107 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from remember is ignored
- L108 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from remember is ignored
- L111 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L114 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L117 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L120 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L137 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L144 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L149 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L151 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L152 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L153 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L154 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L155 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L156 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L157 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L158 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L159 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L172 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L173 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L174 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L175 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L176 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L178 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L179 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from docsScreenshot is ignored
- L192 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L196 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored

### client/cypress/e2e/controllers/09-system-management.controller.ts

- L2 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L3 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L7 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L15 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L20 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L25 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L30 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L34 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored

### client/cypress/e2e/controllers/10-tenant-management.controller.ts

- L31 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from viewport is ignored
- L38 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L63 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L68 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L74 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L75 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L76 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L89 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L92 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clearCookies is ignored
- L93 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clearLocalStorage is ignored
- L94 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L95 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L97 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visitLoginWithCleanAuthState is ignored
- L99 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L100 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L101 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L102 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForLoginRequest is ignored
- L107 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L111 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clearAllEmails is ignored
- L112 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L113 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L114 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L115 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L116 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L117 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L120 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L130 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L131 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L132 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L133 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L139 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L141 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L142 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToBottom is ignored
- L149 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L153 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L154 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L157 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L170 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L181 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clearCookies is ignored
- L182 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from origin is ignored
- L183 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L189 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L190 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L191 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L194 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L202 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L203 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L204 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L205 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L207 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L210 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L211 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L218 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L219 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L222 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L224 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L225 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L227 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L231 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L236 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L237 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L238 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L239 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L240 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L241 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L248 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L249 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L256 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L260 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L266 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L281 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L282 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L283 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L290 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L292 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L297 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L321 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L322 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToBottom is ignored
- L326 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L332 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L335 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L336 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToBottom is ignored
- L342 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L349 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L350 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L351 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L358 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L363 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L368 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L373 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L378 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L383 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L390 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L392 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L394 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L397 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L410 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L414 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L423 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L427 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L431 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L434 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L449 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L457 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L479 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L485 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from each is ignored
- L486 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L491 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L492 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L493 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L494 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L499 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L504 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from check is ignored
- L505 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L513 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from check is ignored
- L514 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L522 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L526 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L531 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L560 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L575 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L578 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L581 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L586 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L587 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L588 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L592 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L593 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L594 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L599 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L602 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L605 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L606 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L608 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L613 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L617 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L618 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L622 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L623 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L627 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L631 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L635 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L638 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L644 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L647 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L651 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L654 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L655 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L663 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L664 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L665 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L671 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L675 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L680 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L681 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clearAllEmails is ignored
- L682 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L685 **WEAK WARNING** `TypeScriptRedundantGenericType` — Explicit type argument HTMLElement can be removed
- L693 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L702 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L703 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L704 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L718 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L719 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L722 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L725 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L758 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L785 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L790 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L795 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L798 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L799 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForTenantAlertScanComplete is ignored
- L835 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L875 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L887 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored

### client/cypress/e2e/controllers/13-consolidated.controller.ts

- L17 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L27 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L38 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from select is ignored
- L42 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L43 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L52 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L61 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L67 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L73 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L77 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L81 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L82 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L83 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from startInterceptTracking is ignored
- L84 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L85 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForIntercepts is ignored
- L89 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L93 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L100 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L112 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L122 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L129 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L130 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from closeSideFilter is ignored
- L131 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L141 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L143 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from startInterceptTracking is ignored
- L147 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L149 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L151 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForIntercepts is ignored
- L162 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L165 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L166 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L170 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L171 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L173 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from startInterceptTracking is ignored
- L178 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L179 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForIntercepts is ignored
- L182 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L188 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L195 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L199 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L202 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L203 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L204 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L205 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L206 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L209 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L210 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L211 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L214 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L215 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L216 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L217 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L220 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L222 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L223 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L224 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L225 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L227 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L231 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L232 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L233 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L235 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L236 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L237 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from check is ignored
- L238 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from check is ignored
- L239 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L240 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L243 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollIntoView is ignored
- L244 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L248 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from openSideFilter is ignored
- L266 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L272 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from log is ignored
- L274 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L279 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L281 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L282 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L283 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L288 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L293 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L299 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L301 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L305 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L310 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from each is ignored
- L314 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L324 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L330 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from log is ignored
- L331 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L338 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L342 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L350 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L357 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L359 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L362 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L368 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L369 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L370 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored

### client/cypress/e2e/controllers/14-scans-management.controller.ts

- L2 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L6 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L10 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L14 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from invoke is ignored

### client/cypress/e2e/controllers/15-search-api-validation.controller.ts

- L31 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L45 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L518 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L519 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L520 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L524 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L527 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L532 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L540 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L543 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L548 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L552 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L555 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L661 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L751 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L754 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L759 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L763 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L765 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L768 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L774 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L775 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from openSideFilter is ignored
- L778 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L790 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from select is ignored
- L795 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L796 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L797 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L802 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L806 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from typeOption is ignored
- L808 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L826 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clickOption is ignored
- L847 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L853 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L855 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L856 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L861 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L866 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L867 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L872 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L876 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L879 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L880 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L885 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L888 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L891 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L894 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L895 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L901 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L937 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored

### client/cypress/e2e/controllers/16-feeder-management.controller.ts

- L31 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from loginAsAdmin is ignored
- L32 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L33 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L34 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L35 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L39 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L40 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L41 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L42 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L43 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L44 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForLoginRequest is ignored
- L45 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L46 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L47 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L48 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored
- L64 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L69 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L87 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from select is ignored
- L88 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L90 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L94 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L95 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L96 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L114 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L118 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L144 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L154 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L157 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from selectFile is ignored
- L158 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L159 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L164 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from openAddTab is ignored
- L177 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L180 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from selectFile is ignored
- L181 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L196 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L197 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L213 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L224 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L225 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L226 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L227 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L250 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L251 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L252 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L253 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L254 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L274 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L275 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L280 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L281 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L283 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from select is ignored
- L285 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L289 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L295 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L301 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L325 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L335 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L337 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L338 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from assertFirstRowStatus is ignored
- L355 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from each is ignored
- L379 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from each is ignored
- L408 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from each is ignored

### client/cypress/e2e/controllers/18-case-management.controller.ts

- L39 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L48 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L55 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L56 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L60 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L61 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L65 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L77 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L79 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToBottom is ignored
- L83 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L108 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L112 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L115 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToBottom is ignored
- L147 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L160 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L162 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L168 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L172 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L183 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L200 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L201 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L202 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L221 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L233 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L242 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L245 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L250 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L256 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L260 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L264 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L269 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L270 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L278 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L279 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L280 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from select is ignored
- L281 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from select is ignored
- L282 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from select is ignored
- L283 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from select is ignored
- L284 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L286 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from docsScreenshot is ignored
- L288 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L292 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L297 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L298 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L299 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L300 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L313 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L318 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L321 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L327 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L332 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L333 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L334 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L335 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L353 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L354 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L356 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L358 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L363 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L365 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L368 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored

### client/cypress/e2e/controllers/20-takedown-requests.controller.ts

- L82 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L95 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L116 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L124 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L128 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L129 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L130 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L131 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L132 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L136 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L141 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L142 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L143 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L144 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L145 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L146 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L147 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L151 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L152 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L153 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L154 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L155 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L156 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L157 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L158 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L163 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L164 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L166 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L167 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from within is ignored
- L168 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L169 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L174 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L175 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L176 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from and is ignored

### client/cypress/support/commands.ts

- L58 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clearCookies is ignored
- L59 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clearLocalStorage is ignored
- L60 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visit is ignored
- L71 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L72 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L73 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L82 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from reload is ignored
- L178 **WEAK WARNING** `BadExpressionStatementJS` — Expression statement is not assignment or call
- L199 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L200 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L201 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L202 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L211 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L214 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from wait is ignored
- L215 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L223 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L224 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visitLoginWithCleanAuthState is ignored
- L225 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForLoginForm is ignored
- L226 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L227 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L228 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L229 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForLoginRequest is ignored
- L232 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L243 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L244 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from visitLoginWithCleanAuthState is ignored
- L245 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForLoginForm is ignored
- L246 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L247 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from type is ignored
- L248 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L249 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from waitForLoginRequest is ignored
- L252 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L267 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored
- L274 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollTo is ignored
- L275 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L276 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L277 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L278 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clearCookies is ignored
- L279 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from clearLocalStorage is ignored
- L312 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from scrollDashboardToTop is ignored
- L313 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L314 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from should is ignored
- L327 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L335 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from click is ignored
- L338 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from request is ignored

### client/cypress/support/e2e.ts

- L8 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from as is ignored
- L157 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from intercept is ignored

### client/src/app/app.config.ts

- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L27 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/api/dashboard-api/dashboard-api.component.html

- L45 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L91 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L99 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L107 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L115 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L128 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L310 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L391 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/api/dashboard-api/dashboard-api.component.ts

- L34 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/api/ioc-extractor/file-scanner.component.html

- L8 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L70 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L78 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L86 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L94 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/api/text-analysis/text-analysis.component.html

- L73 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L79 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L85 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L91 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L112 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/api/text-analysis/text-analysis.component.ts

- L43 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/app/app.component.ts

- L20 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/cti-graph/advanced-builder-popup/advanced-builder-popup.component.ts

- L14 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/cti-graph/graphs.component.html

- L23 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L27 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L133 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L145 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L148 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/cti-graph/graphs.component.ts

- L37 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/dashboard/dashboard-sidebar/dashboard-collapsed-sidebar/dashboard-sidebar-collapsed.component.html

- L3 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L12 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/dashboard/dashboard-sidebar/dashboard-sidebar-items/dashboard-sidebar-items.component.html

- L3 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/dashboard/dashboard-sidebar/dashboard-sidebar.component.html

- L173 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L198 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L369 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L391 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/dashboard/dashboard.component.ts

- L36 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/demo-tour/demo-tour/demo-tour.component.ts

- L1781 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1817 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/directory/directory-list/directory-list.component.ts

- L15 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/geo-fencing/satellite-intel/map-overlays/country-boundary-map-renderer.ts

- L8 **WEAK WARNING** `TypeScriptRedundantGenericType` — Explicit type argument Geometry, GeoJsonProperties can be removed
- L38 **WEAK WARNING** `TypeScriptRedundantGenericType` — Explicit type argument Geometry, GeoJsonProperties can be removed
- L40 **WEAK WARNING** `TypeScriptRedundantGenericType` — Explicit type argument Geometry, GeoJsonProperties can be removed

### client/src/app/pages/geo-fencing/satellite-intel/satellite-intel.ts

- L109 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from loadMapEntities is ignored

### client/src/app/pages/geo-fencing/satellite-intel/ui-overlays/month-compare-section/month-compare-section.component.html

- L102 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L124 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/geo-fencing/threat-lens/threat-lens.html

- L68 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L129 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/geo-fencing/threat-lens/ui-overlays/category-layers/threat-lens-category-layers.component.html

- L8 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/geo-fencing/threat-lens/ui-overlays/feed-panel/threat-lens-feed-panel.component.html

- L17 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/homepage/home-search/home-search.component.html

- L76 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L97 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/homepage/search-filters/search-filters.component.html

- L11 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L29 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L52 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L100 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/homepage/search-filters/search-filters.component.ts

- L18 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/homepage/selected-filter-bar/selected-filter-bar.component.html

- L14 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L21 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L27 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L32 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L65 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/homepage/selected-filter-bar/selected-filter-bar.component.ts

- L15 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/intel-panel/dashboard-result-container/dashboard-result-container.component.ts

- L56 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-apt/dashboard-result-apt.component.html

- L13 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L21 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L29 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L59 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L123 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-apt/dashboard-result-apt.component.ts

- L21 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-chat/dashboard-result-chat.component.html

- L18 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L23 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L30 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-defacement/dashboard-result-defacement.component.html

- L13 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L21 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L29 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L67 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-defacement/dashboard-result-defacement.component.ts

- L21 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L223 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-exploit/dashboard-result-exploit.component.html

- L13 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L21 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L29 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L37 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L65 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-exploit/dashboard-result-exploit.component.ts

- L31 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-social/dashboard-result-social.component.html

- L20 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L25 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L32 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/intel-panel/dashboard-results/dashboard-result-social/dashboard-result-social.component.ts

- L31 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/intel-panel/dashboard-results/dashboard-results-general-grid/dashboard-results-general.component.html

- L15 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L22 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L29 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/intel-panel/result-insights/result-insights.component.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L26 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L57 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L63 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L105 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L110 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L150 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L155 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/legal/extension-privacy/extension-privacy.component.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/legal/project-privacy/project-privacy.component.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/login/login-container/login-container.component.html

- L17 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L28 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L36 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L41 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L78 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L116 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L120 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L123 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L126 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L130 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L133 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L137 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L141 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L164 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L182 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L191 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L201 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/profile/user-profile-activity/user-profile-activity.component.html

- L38 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/report/templates/report-chat/report-chat.component.html

- L156 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L162 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/report/templates/report-chat/report-chat.component.ts

- L39 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/report/templates/report-defacement/report-defacement.component.html

- L67 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L73 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/report/templates/report_general/report.component.html

- L103 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L109 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L154 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L159 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L177 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/report/templates/report_general/report.component.ts

- L35 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/ai-workspace/ai-chat-sidebar/ai-chat-sidebar.component.ts

- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L13 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L14 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L15 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L16 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L16 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L18 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L19 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L19 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L30 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/ai-workspace/ai-summary/ai-summary.component.html

- L4 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/root-searches/ai-workspace/ai-summary/ai-summary.component.ts

- L16 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/ai-workspace/ai-workspace.component.html

- L20 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L25 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L80 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L117 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L183 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/root-searches/ai-workspace/chat-share/chat-share.component.html

- L5 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/root-searches/ai-workspace/chat-widget/chat-widget.component.html

- L4 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L18 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L21 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L42 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L65 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L81 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/root-searches/ai-workspace/chat-widget/chat-widget.component.ts

- L24 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/credentials/credential-list/credential-list.component.html

- L58 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L110 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/root-searches/credentials/credential-list/credential-list.component.ts

- L17 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/credentials/credential.component.html

- L11 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L19 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L27 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L35 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L43 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L47 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L51 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/root-searches/credentials/credential.component.ts

- L50 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/dashboard-consolidated/consolidated-scan/consolidated-scan.component.html

- L92 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### client/src/app/pages/root-searches/dashboard-consolidated/consolidated-scan/consolidated-scan.component.ts

- L24 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/dashboard-consolidated/dashboard-consolidated.component.html

- L36 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L67 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L89 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/root-searches/dashboard-consolidated/dashboard-consolidated.component.ts

- L51 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L512 **WEAK WARNING** `RegExpSimplifiable` — <code>[^\s]</code> can be simplified to '\S'

### client/src/app/pages/root-searches/dashboard-consolidated/defacement-results/threat-results.component.html

- L18 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L26 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L32 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/root-searches/network-intel/dns-section/dns-section.component.ts

- L17 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/network-intel/ip-detail/ip-detail.component.ts

- L107 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### client/src/app/pages/root-searches/network-intel/modal/geo-coordinates-modal/geo-coordinates-modal.component.ts

- L321 **WEAK WARNING** `TypeScriptRedundantGenericType` — Explicit type argument Geometry can be replaced with

### client/src/app/pages/root-searches/network-intel/network-intel.html

- L34 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L42 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L51 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L63 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/root-searches/network-intel/network-intel.ts

- L31 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/network-intel/security-scan/security-scan.component.ts

- L38 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/network-intel/seo-repo-scan-section/seo-repo-scan-section.component.ts

- L19 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/network-intel/shodan-section/shodan-section.component.ts

- L16 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/network-intel/vulnerability-section/vulnerability-result/vulnerability-result.component.ts

- L20 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/root-searches/network-intel/vulnerability-section/vulnerability-section.component.ts

- L20 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/scan-report/scan-report.component.html

- L47 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L55 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L63 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L71 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L86 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/scan-report/scan-report.component.ts

- L31 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/signup/signup.component.html

- L14 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L25 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L38 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L44 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L86 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/social-cti/profile-detail/connections-popup/social-connections-popup.component.html

- L28 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/social-cti/profile-detail/profile-tabs-section/profile-tabs-section.component.html

- L7 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L18 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L78 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L369 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/social-cti/profile-detail/resource-feed-section/resource-feed-section.component.html

- L26 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L102 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L119 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/social-cti/profile-detail/resource-media-section/resource-media-section.component.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/social-cti/profile-detail/resource-people-section/resource-people-section.component.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/social-cti/profile-detail/resource-work-section/resource-work-section.component.html

- L8 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/social-cti/profile-listing/default-list-section.component.html

- L78 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L80 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### client/src/app/pages/social-cti/profile-listing/profile-listing.component.ts

- L36 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/social-cti/user-graph/social-user-graph.component.html

- L45 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L206 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L212 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L218 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/tenant/tenant-management/view-profile/manage-profile.component.ts

- L24 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/tenant/tenant-management/view-tenant/tenant-ioc-drawer-content/tenant-ioc-drawer-content.component.html

- L15 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L23 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/tenant/tenant-management/view-tenant/view-tenant.component.html

- L82 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L310 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/tenant/tenant-management/view-tenant/view-tenant.component.ts

- L30 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/tenant/tenant.component.html

- L1 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L14 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L27 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/auditlog/auditlog-list/auditlog-list.component.ts

- L16 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-case-management/model/admin-tenant-alerts/admin-tenant-alerts.html

- L82 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-artifacts-section/case-artifacts-section.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-artifacts-section/case-artifacts-section.ts

- L17 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-closure-section/case-closure-section.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-closure-section/case-closure-section.ts

- L16 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-details.animations.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L7 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L9 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L9 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L11 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L12 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L13 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L13 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L17 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L18 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L19 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L20 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L20 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L22 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L23 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L23 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L27 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L28 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L29 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L30 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L30 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L32 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L33 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L34 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L34 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L38 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L39 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L40 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L41 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L41 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L43 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L44 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L44 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-details.ts

- L51 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L166 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored
- L194 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-header-actions/case-header-actions.ts

- L13 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-linked-cases-section/case-linked-cases-section.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-linked-cases-section/case-linked-cases-section.ts

- L16 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-primary-entity-section/case-primary-entity-section.html

- L22 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-primary-entity-section/case-primary-entity-section.ts

- L15 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-related-entities-section/case-related-entities-section.html

- L7 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-related-entities-section/case-related-entities-section.ts

- L15 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-summary-section/case-summary-section.ts

- L15 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-tasks-section/case-tasks-section.html

- L5 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-details/case-tasks-section/case-tasks-section.ts

- L17 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-share/case-share.component.html

- L5 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-tracking-board-settings/case-tracking-board-settings.ts

- L67 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-tracking-board/case-tracking-board.html

- L29 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-case-management/model/case-tracking-board/case-tracking-board.ts

- L128 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored

### client/src/app/pages/user-management/sidebar-user-case-management/model/entity-details/entity-details.html

- L129 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L145 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L207 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-case-management/sidebar-user-case-management.html

- L135 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L139 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L180 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L184 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-event-management/sidebar-user-event-management.component.html

- L74 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L82 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L90 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L98 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L143 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-event-management/sidebar-user-event-management.component.ts

- L35 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-feeder/sidebar-user-feeder.component.ts

- L22 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L184 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored

### client/src/app/pages/user-management/sidebar-user-homepage/add-custom-alert/add-custom-alert.component.ts

- L19 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L136 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### client/src/app/pages/user-management/sidebar-user-homepage/alert-scan-loading/alert-scan-loading.component.ts

- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L14 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L15 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L16 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L17 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L18 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L18 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L21 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L22 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L23 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L24 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L24 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-homepage/category-alert-report/alert-detail-drawer/category-alert-detail-drawer.component.html

- L23 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-homepage/category-alert-report/category-alert-report.component.html

- L15 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L19 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L26 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L34 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L43 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L50 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L67 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L74 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L81 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L88 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-homepage/category-alert-report/category-alert-report.component.ts

- L235 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored
- L478 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored
- L486 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored
- L494 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored
- L503 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored
- L510 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored
- L517 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored
- L537 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored
- L540 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored

### client/src/app/pages/user-management/sidebar-user-homepage/sidebar-user-homepage.component.html

- L20 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L34 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L57 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L74 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L83 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L90 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L97 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L107 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-homepage/sidebar-user-homepage.component.ts

- L36 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-log-manager/sidebar-user-log-manager.component.ts

- L22 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-settings/account-settings.component.ts

- L25 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-settings/tenant-settings/tenant-settings.component.ts

- L24 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/sidebar-user-settings/user-image-picker/user-image-picker.component.html

- L3 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L5 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-system-settings/sidebar-user-system-settings.component.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/pages/user-management/sidebar-user-system-settings/sidebar-user-system-settings.component.ts

- L32 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L238 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### client/src/app/pages/user-management/takedown-requests/takedown-rejection-popup/takedown-rejection-popup.component.ts

- L13 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/pages/user-management/takedown-requests/takedown-requests.component.html

- L71 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### client/src/app/pages/welcome/welcome.component.html

- L3 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L7 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/sections/api/phone-lookup/phone-lookup.component.html

- L9 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L23 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/sections/api/phone-lookup/phone-lookup.component.ts

- L23 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/services/core/app/app.service.ts

- L105 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from loadDemoTourConfig is ignored
- L133 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L153 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/advanced.row.motion.animation.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L9 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L9 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/app.animations.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L9 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L10 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L11 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L12 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L12 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/chat.bot.animation.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/chat.overlay.animation.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L9 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L9 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/dashboard.global.animations.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/dashboard.item.animation.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/filter.animation.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L7 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/message.notification.animation.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L9 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L9 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/popup.animations.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L7 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L11 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L12 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L13 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L14 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L14 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L16 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L17 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L17 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/row.animations.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/scan.animations.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L7 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/search.filter.animation.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L7 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/sidebar.animations.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L2 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L7 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L8 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L11 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L12 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L13 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L14 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L14 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L16 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L17 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L17 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/animations/vulnerability.content.motion.animation.ts

- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L1 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L3 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L4 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L5 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L6 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L7 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L7 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L10 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L11 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L12 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L12 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/directive/base.listing.directive.ts

- L74 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored
- L103 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored

### client/src/app/shared/partials/alert-notification/alert-notification.component.html

- L12 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/alert-notification/alert-notification.component.ts

- L33 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/partials/code-block/code-block.component.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L11 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/confirmation-popup/confirmation-popup.component.ts

- L15 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/partials/empty-query/empty-query.component.html

- L2 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/empty-result/empty-result.component.html

- L3 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/error-handler/error-handler.component.html

- L23 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/extension-manager/extension-manager.component.html

- L3 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/filters/date-picker/date-picker.component.html

- L7 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/filters/filters.component.ts

- L21 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/partials/forgot-password/reset-password.component.html

- L3 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/header/dashboard-header/dashboard-header.component.html

- L19 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L31 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/ioc-search/ioc-search.component.html

- L47 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/ioc-search/ioc-search.component.ts

- L28 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/partials/json-api-viewer/json-api-viewer.component.html

- L5 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L18 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/json-api-viewer/json-viewer/json-viewer.component.html

- L16 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L49 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/message-notification/message-notification.component.ts

- L13 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/partials/notification/notification.component.html

- L3 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L8 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/notification/notification.component.ts

- L18 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/partials/onion-search-engine/cross-search-card.component.html

- L31 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L98 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L101 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/password-confirmation-popup/password-confirmation-popup.component.ts

- L11 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/partials/profile/profile.component.html

- L18 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L35 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L78 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L84 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L90 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L95 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L100 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/record-sidebar/record-sidebar.component.html

- L19 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L42 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L76 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/report-interactions/report-user-sidebar/report-user-sidebar.component.html

- L10 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L52 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/report-interactions/report-user-sidebar/report-user-sidebar.component.ts

- L59 **WEAK WARNING** `JSIgnoredPromiseFromCall` — Promise returned from navigate is ignored

### client/src/app/shared/partials/report-mapping/report-mapping.component.html

- L6 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L12 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/report-mapping/report-mapping.component.ts

- L28 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L272 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### client/src/app/shared/partials/result-components/result-list/result-list.component.ts

- L12 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/partials/result/result.component.html

- L52 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L72 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L86 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L265 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/result/result.component.ts

- L13 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L39 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative
- L48 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/partials/scroll-top/scroll-top.component.html

- L2 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/sidebar-shell/sidebar-shell.component.html

- L5 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L10 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L16 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L19 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/social-icon/social-icon.component.ts

- L8 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/support/support.component.ts

- L15 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/partials/tenant-ioc-selector/tenant-ioc-selector.component.html

- L7 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L20 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L31 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>
- L47 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/partials/trail-notification/trail-notification.component.html

- L5 **WEAK WARNING** `AngularNgOptimizedImage` — <html>Use <code><span style="color:#000000;">ngSrc</span></code> (<code><span style="color:#000000;">NgOptimizedImage</span></code> directive) to improve performance</html>

### client/src/app/shared/services/result-row-helper.service.ts

- L104 **WEAK WARNING** `JSDeprecatedSymbols` — Deprecated symbol used, consult docs for better alternative

### client/src/app/shared/services/scan-notification.service.ts

- L95 **WEAK WARNING** `TypeScriptRedundantGenericType` — Explicit type argument ScanJobNotificationResponse can be removed

### client/src/app/shared/utils/formatters.ts

- L19 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### client/src/assets/data/mail_template_data/alert_mail_template.html

- L99 **WEAK WARNING** `CssNonIntegerLengthInPixels` — Float px values may render differently on different browsers
- L113 **WEAK WARNING** `CssNonIntegerLengthInPixels` — Float px values may render differently on different browsers

### client/src/assets/data/mail_template_data/mail_template.html

- L59 **WEAK WARNING** `CssNonIntegerLengthInPixels` — Float px values may render differently on different browsers
- L83 **WEAK WARNING** `CssNonIntegerLengthInPixels` — Float px values may render differently on different browsers

### client/src/assets/data/mail_template_data/takedown_template.html

- L35 **WEAK WARNING** `CssNonIntegerLengthInPixels` — Float px values may render differently on different browsers

### docs/api_docs/ALL.md

- L36 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L266 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L281 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L292 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L303 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L314 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L322 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L327 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L499 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L638 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L684 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L724 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L726 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L727 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L727 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1080 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1081 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1088 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1089 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1092 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1093 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1836 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1838 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1844 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1859 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1867 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2328 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2329 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2340 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2341 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2543 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2544 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/convert_to_md.py

- L34 **WEAK WARNING** `PyShadowingNamesInspection` — Shadows name 'doc' from outer scope
- L64 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'bool' of 'bool | None' does not have attribute 'get'
- L66 **WEAK WARNING** `PyUnresolvedReferencesInspection` — Member 'bool' of 'bool | None' does not have attribute 'get'

### docs/api_docs/dynamic/apk_scan.md

- L41 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/dynamic/deep_ip_scan.md

- L283 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L285 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/dynamic/dynamic_user_email.md

- L44 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L45 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/dynamic/geo_camera.md

- L240 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted

### docs/api_docs/dynamic/geo_camera_ranges.md

- L220 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted

### docs/api_docs/dynamic/onion_search.md

- L39 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L41 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/reports/breach.md

- L21 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L23 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L24 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L24 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/reports/defacement.md

- L81 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/reports/stix.md

- L84 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L130 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/reports/strategic.md

- L47 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L48 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L55 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L56 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L59 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L60 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/search/breach.md

- L104 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L106 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L112 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L127 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L135 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/search/strategic.md

- L76 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L77 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L88 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L89 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/source_docs.py

- L29 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L247 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L262 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L273 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L284 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L295 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L303 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L308 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L519 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L607 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L653 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L685 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L687 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L688 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L688 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L895 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L896 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L903 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L904 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L907 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L908 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1153 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1154 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1756 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1758 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1764 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1779 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1787 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2182 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2183 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2194 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2195 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/support/wayback_scan.md

- L40 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/system-info/directory.md

- L33 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/api_docs/system-info/insight.md

- L215 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L230 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L241 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L252 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L263 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L271 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L276 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure

### docs/app_docs/company_and_product_scope.md

- L21 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted

### docs/app_docs/developer_documentation.md

- L46 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L66 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L114 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L149 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L166 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L326 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L372 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted

### docs/app_docs/introduction_to_modules.md

- L31 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted

### docs/app_docs/introduction_to_platform.md

- L97 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted

### docs/app_docs/organizational_security_policies.md

- L22 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L109 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L174 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L233 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L346 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L458 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L502 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L581 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L674 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L765 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L853 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L942 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1028 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1116 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1200 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1283 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1376 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1480 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1564 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1645 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1738 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1821 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted

### docs/app_docs/security_documentation.md

- L1322 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted

### docs/app_docs/swagger_api_reference.md

- L64 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L190 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L253 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L266 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L267 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L337 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L405 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L473 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L529 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L631 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L713 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L760 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L826 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L858 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L927 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1009 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1066 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1179 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1182 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1256 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1310 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1368 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1428 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1481 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1516 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1547 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1568 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1570 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1571 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1571 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1618 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1684 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1751 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1792 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1833 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1853 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1854 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1861 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1862 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1865 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1866 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L1899 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L1985 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L2022 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L2121 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L2149 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2150 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2161 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2162 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2305 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L2334 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2336 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2345 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2367 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2384 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2468 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L2496 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2497 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2508 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2509 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2652 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L2680 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2681 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2692 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2693 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2896 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L2924 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2925 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2936 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L2937 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L3080 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3217 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3348 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3415 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3482 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3545 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3612 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3664 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3718 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3797 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3840 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L3901 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L3970 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4004 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L4065 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4134 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4168 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L4228 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4297 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4331 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L4392 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4461 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4495 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L4556 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4625 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4659 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L4720 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4789 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4823 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L4884 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L4953 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5017 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L5073 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L5129 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L5185 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L5204 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5206 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5232 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L5259 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5463 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5478 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5489 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5500 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5511 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5519 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5524 **WEAK WARNING** `HttpUrlsUsage` — HTTP links are not secure
- L5618 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted

### docs/app_docs/user_manual.md

- L346 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L387 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L913 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L2122 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted
- L2262 **WEAK WARNING** `MarkdownIncorrectTableFormatting` — Table is not correctly formatted

### docs/conf.py

- L49 **WEAK WARNING** `PyUnusedParameterInspection` — Parameter 'app' value is not used

### docs/scripts/generate_docs.sh

- L99 **WEAK WARNING** `ShellCheck` — Use ./*glob* or -- *glob* so names with dashes won't become options.
