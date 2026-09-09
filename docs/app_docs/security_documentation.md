(security-documentation)=

# Security Documentation

:::{admonition} Scope
:class: tip

This page documents Orion Intelligence security controls, operational safeguards, and SOC 2 Security readiness notes for the platform documentation set.
:::

:::{admonition} Relationship to Organizational Policies
:class: note

Genesis Technologies maintains its organizational security requirements through internal organizational policies. Those policies are the governing requirements; this page and the related Developer Documentation, User Manual, API Documentation, and operational records describe the implementation procedures, technical controls, system architecture, and operational safeguards that support them.

The policy and control documentation primarily supports readiness for the SOC 2 Security and Availability Trust Services Categories. Additional Trust Services Criteria apply only when they are included in the formally approved examination scope. This documentation supports readiness and evidence collection; it does not represent a claim of SOC 2 certification without an independent examination.
:::

```{contents}
:local:
:depth: 2
```

## 3.1 Security Overview

### Overview

Security is a core part of the Orion Intelligence platform. Orion is designed to support cyber intelligence, threat intelligence, OSINT investigations, data breach analysis, compromise monitoring, network intelligence, and related investigative workflows.

Because the platform may process sensitive intelligence data, tenant-specific information, investigation records, user activity, and system configuration data, security controls are applied across the application, infrastructure, database, and operational layers.

Orion uses a layered security approach to protect platform access, user accounts, tenant data, backend services, databases, and operational workflows. These security layers work together to reduce unauthorized access, protect sensitive information, maintain operational visibility, and support reliable platform operations.

### Security Purpose

The purpose of Orion's security design is to protect the platform, its users, and the data processed within the system.

The security approach is designed to:

Prevent unauthorized access to the platform.

Protect user accounts and authenticated sessions.

Restrict access to features and modules based on roles, licenses, and permissions.

Protect tenant-specific information.

Secure communication between users, frontend services, backend APIs, and supporting systems.

Protect sensitive data during storage and transmission.

Maintain logs and audit records for operational visibility.

Support recovery from system failure, data corruption, or infrastructure disruption.

Support secure and reliable platform operations.

### Security Objectives

Orion Intelligence security controls are designed around the following objectives:

### Security Layers

Orion applies security across multiple layers of the platform:

Authentication

Authorization

Role-Based Access Control

Tenant Isolation

API Security

Encryption

Database Security

Logging and Audit Records

Monitoring

Backup and Recovery

Network Security

Secrets Management

Patch Management

Vulnerability Management

Disaster Recovery

Each security layer is documented separately in the Security Documentation section.

### Security Responsibilities

Security within Orion Intelligence is shared across multiple roles.

Genesis Technologies is responsible for designing, maintaining, and improving the security controls that support the Orion platform.

Administrators are responsible for managing users, reviewing platform activity, maintaining configuration settings, and supporting operational security activities.

Developers are responsible for maintaining secure application code, reviewing changes, fixing vulnerabilities, and following secure development practices.

Infrastructure and Operations Personnel are responsible for managing the hosting environment, firewall rules, SSL certificates, backups, deployments, monitoring, and system-level maintenance.

Authorized Users are responsible for using the platform according to assigned permissions, protecting their credentials, and reporting suspicious activity or security issues when identified.

### Security Summary

Orion Intelligence follows a layered security model that protects the platform across user access, application logic, backend APIs, databases, infrastructure, and operational processes.

The platform combines authentication, authorization, role-based access control, tenant isolation, encryption, logging, monitoring, backup, and network-level protections to support secure platform access, protected data handling, reliable intelligence workflows, and resilient system operations.

## 3.2 Authentication Security

### Overview

Orion Intelligence uses a token-based authentication model to verify user identity and control access to protected platform resources. Authentication is required before users can access dashboards, intelligence modules, search features, reports, administrative pages, and backend API routes.

The authentication flow includes user registration, password hashing, login verification, progressive login throttling, two-factor authentication, session creation, HTTP-only cookie delivery, token validation and refresh, account recovery, password reset, sensitive-action reauthentication, logout, and single active session handling.

### User Registration

During registration, a user provides the required account information, including email address, username, and password.

After the registration request is submitted, the backend validates the provided information and checks whether the email address or username already exists. If the submitted information is valid, the backend creates a new user account.

User passwords are not stored in plain text. Before saving the user record, the backend hashes the password and stores only the hashed password value in the database.

This helps protect user credentials and prevents direct exposure of passwords from stored database records.

### Password Storage

Orion does not store user passwords in plain text. Passwords are hashed before they are saved in the database.

During login, the submitted password is compared against the stored password hash. If the password matches the stored hash, the user is allowed to continue through the authentication process.

### Login Verification

During login, the user provides their username or email address and password. The frontend sends the login request to the backend for verification.

The backend retrieves the user account and compares the submitted password with the stored password hash. If the password is valid, the user proceeds to the next authentication step.

If the credentials are invalid, access is denied and the user is not allowed to continue into the platform.

Login failures are counted against a SHA-256 hash of the normalized email or username. The fifth consecutive unsuccessful attempt creates a 1-minute delay, the sixth creates a 10-minute delay, and the seventh and later consecutive attempts create a 30-minute delay. Locked requests receive HTTP `429` and a `Retry-After` header. A successful login deletes the failure and retry state; inactive failure state expires after 30 minutes.

### Two-Factor Authentication

Orion Intelligence supports two-factor authentication using an authenticator application.

After the user enters valid login credentials, the platform requires an additional one-time password generated by the user's authenticator app. The user must enter this OTP before access is granted.

This adds an additional layer of protection because access requires both:

The user's password

The OTP generated by the authenticator application

If the OTP is valid, the backend completes the authentication process and creates the user session. If the OTP is invalid or expired, access is denied.

The 2FA authenticator secret is encrypted with the tenant Data Encryption Key before persistent storage. During successful verification, the backend can migrate a previously stored plaintext secret to encrypted storage. Enabling or disabling 2FA requires server-side verification of the user's current password.

### Two-Factor Authentication Flow

1. User enters username/email and password.
2. Backend verifies the submitted credentials.
3. Platform requests an OTP from the authenticator app.
4. User enters the OTP.
5. Backend verifies the OTP.
6. If the OTP is valid, the session is created.
7. If the OTP is invalid, access is denied.

### Session Creation

After successful login and two-factor authentication, the backend creates a new session ID for the authenticated user. The session ID is used to track the user's active session and verify that future requests are associated with a valid login.

Each successful login creates a fresh session. If the same user logs in from another browser, device, or location, the backend expires the previous session and keeps only the latest session active.

This ensures that only one active session is maintained for a user account at a time.

### Access Token Generation

After the session is created, the backend generates a signed access token. Browser login, 2FA verification, and refresh requests use cookie-only mode. In this mode, the backend encrypts the access token before placing it in an `HttpOnly` cookie and removes `access_token` and `token_type` from the JSON response.

The browser does not store the access token in local storage and does not read the HTTP-only cookie through JavaScript. The cookie uses `SameSite=Lax`, a 30-minute maximum age, path `/`, and the `Secure` attribute in production. Authenticated browser requests send credentials automatically. Supported non-browser API clients may continue to use Bearer authentication.

### Token Validation

When a user performs an action inside Orion, the browser sends the authentication cookie with the request. The backend decrypts the cookie value, decodes and validates the access token, and checks the associated session. Where supported, the backend can instead read an explicitly supplied Bearer token.

If the token is valid and the session is active, the backend allows the request to continue.

If the token is expired, invalid, malformed, or not linked to an active session, the backend rejects the request and the user is logged out.

### Token Refresh

Access tokens are valid for a limited period of time. To maintain an authenticated session, the frontend may request a refreshed token after a defined interval.

When a browser token-refresh request is received, the backend verifies the existing cookie token and session information. If the session is valid, the backend issues a new token into the HTTP-only cookie and returns session information without exposing the token in the response body.

If the token or session cannot be verified, the backend does not issue a new token and the user is logged out.

### Forgot Password and Password Reset

Orion Intelligence provides a forgot password option for users who are unable to access their accounts.

When a user selects `Recover account?`, the user can request a standard email reset or use the Account Recovery tab with an email address and global recovery key. Both endpoints return a generic success response for correctly formed requests so callers cannot determine whether an email address or recovery key is registered.

For a valid active account in the requested tenant, the backend generates a cryptographically random reset token, stores only its SHA-256 hash, and emails the plaintext token in a tenant-specific reset URL. The token expires after 20 minutes. After the new password is submitted, the backend hashes the submitted token for lookup, verifies tenant and account state, rejects reuse of the current password, updates the password hash, and deletes the reset token and expiry.

The new password is not stored in plain text. It is hashed before being saved in the database.

### Global Recovery Key

Authenticated users can generate or replace a 43-character global recovery key from Account Settings after confirming their current password. The key is generated with a cryptographically secure random source and shown once. The backend stores only the SHA-256 hash. Generating a replacement overwrites the previous hash and invalidates the old key.

During account recovery, the backend hashes the submitted key and compares it with the stored hash using a constant-time comparison. A matching email and recovery key initiates the normal email-based password-reset process. The response remains generic whether the details match or not.

### Sensitive-Action Reauthentication

Changing the current password, changing the 2FA state, or generating/replacing a recovery key requires the current password. The backend verifies the supplied plaintext value against the stored password hash before applying the requested change. Frontend confirmation is a user interface control; backend verification is the enforcement point.

### Password Reset Flow

1. User selects `Recover account?` and chooses Reset password or Account recovery.
2. Frontend validates the email and, where applicable, the 43-character recovery-key format.
3. Backend returns a generic response and sends email only when the account details are valid.
4. User opens the tenant-specific reset link within 20 minutes.
5. Backend hashes and validates the single-use reset token.
6. User enters and confirms a new password that differs from the current password.
7. Backend hashes and saves the new password.
8. Backend deletes the reset token and expiry and clears any forced-reset requirement.

### Single Active Session Handling

Orion Intelligence supports single active session handling for user accounts.

If the same user logs in from a second browser, device, or location, the backend creates a new session for the latest login and expires the previous session.

Any further request from the older session will fail token or session validation, and the previous user session will be logged out.

This helps reduce the risk of stale sessions, shared sessions, or unauthorized continued access from older login locations.

### Logout

When a user logs out, the frontend sends a logout request to the backend. The backend invalidates the active session and prevents the associated token from being used for future requests.

After logout, the response removes the authentication cookie and the frontend clears local session state before redirecting the user to the login page.

### Protected Routes

Protected routes require a valid access token and active session before access is granted.

Protected resources may include:

Dashboards

Intelligence modules

Search APIs

Reports

User profile routes

Administrative routes

Audit logs

System configuration pages

If authentication fails, the backend blocks access and requires the user to log in again.

### Authentication Flow

1. User enters login credentials.
2. Backend checks the progressive login limit and verifies the username/email and password.
3. If enabled, the user enters the OTP and the backend verifies it.
4. Backend creates a new session ID and signed access token.
5. For browser authentication, the encrypted token is set in an HTTP-only cookie and omitted from the JSON body.
6. The browser sends the cookie with protected API requests.
7. Backend decrypts and validates the token and active session.
8. Request is allowed or rejected according to authentication and authorization state.

### Authentication Security Summary

Orion Intelligence uses backend-controlled authentication to verify users before allowing access to protected platform resources. Passwords are stored as hashes, repeated login failures receive progressive delays, users can authenticate with a password and authenticator OTP, and browser access tokens are kept in encrypted HTTP-only cookies rather than local storage.

The platform also supports privacy-preserving password reset, hashed single-use reset tokens, hashed global recovery keys, current-password confirmation for sensitive account changes, encrypted 2FA secrets, and single active session handling. This authentication model helps protect user accounts, platform access, and sensitive intelligence workflows.

## 3.3 Authorization and Role-Based Access Control

### Overview

Orion Intelligence uses authorization and Role-Based Access Control (RBAC) to control what authenticated users are allowed to access within the platform. After a user successfully logs in, Orion determines the user's permitted actions based on their assigned role, tenant association, and license plan.

Authorization is enforced at both the frontend and backend levels. The frontend displays only the modules and options available to the user's role and license, while the backend validates access before allowing requests to protected modules and APIs.

This ensures that users can only access the features, data, and administrative functions that they are authorized to use.

### Authorization Model

The Orion authorization model is based on three main factors:

User Role

Tenant or Company Association

Assigned License Plan

A user must have the correct role and license permissions before accessing specific modules, features, or administrative functions.

For example, a user may belong to a tenant but may only see the modules that are included in that tenant's assigned license. Similarly, an analyst may be allowed to perform investigation and analysis tasks but may not be allowed to access account creation, user management, or tenant administration functions.

### User Roles

Orion Intelligence supports the following primary user roles:

### Admin Role

The Admin role is used for platform-level administration. Admin users have elevated access to manage and oversee the Orion platform.

Admin users may be responsible for:

Managing platform-level configuration

Managing tenants or companies

Managing users

Assigning or reviewing license access

Reviewing system activity

Accessing administrative dashboards

Supporting operational and security management activities

Admin access is intended to be limited to authorized personnel responsible for managing the Orion platform.

### Maintainer Role

The Maintainer role acts as the administrator for a specific tenant or company. A maintainer manages tenant-level operations and users within their assigned tenant.

Maintainer users may be responsible for:

Managing tenant users

Managing tenant-level settings

Reviewing tenant activity

Supporting tenant operations

Managing tenant-specific workflows

Accessing maintainer features where enabled

A maintainer has more privileges than a standard member or analyst but is limited to the tenant or company they are assigned to.

### Member Role

The Member role is assigned to users who are part of a company or tenant. Members can access platform modules and features according to the permissions granted by their role and the license assigned to the tenant.

Members may have access to standard platform functionality, investigation tools, and available modules depending on the tenant's license plan.

Members may have broader visibility than analysts, including access to company or tenant-related areas where permitted.

### Analyst Role

The Analyst role is designed for users who are hired or assigned specifically to perform analysis activities within Orion.

Analysts can access investigation and analysis features that are permitted by their assigned role and license. However, analysts do not have access to administrative functions such as account creation, tenant management, or user management.

The Analyst role is intended for users who need to review, investigate, and analyze intelligence data without managing platform or tenant administration.

### License-Based Access Control

In addition to user roles, Orion uses license-based access control to determine which modules and capabilities are available to a user or tenant.

Each license plan defines the modules and features that are enabled for that account. If a module is not included in the assigned license, the user cannot access that module.

License-based access helps ensure that platform capabilities are delivered according to the customer's selected plan and operational requirements.

### License Plans

Orion Intelligence supports the following license plans:

### Module-Level Access

Module-level access is controlled using a combination of license permissions and user role permissions.

The frontend only displays the modules that are available to the user's role and license. This helps keep the user interface clean and prevents users from seeing features they are not allowed to use.

The backend also checks license and permission rules before allowing access to protected modules or APIs. This means that even if a restricted API endpoint is called directly, the backend validates the user's access before processing the request.

### Frontend Access Control

The frontend applies access control by showing or hiding modules based on the user's assigned role and license.

For example:

A Free user only sees General Intelligence.

An OSINT Basic user sees the modules included in the OSINT Basic license.

An OSINT Advanced user sees additional advanced features such as Stealer Logs, CTI Graph, Mapping, and Geo Fencing.

A Pentester user sees scanning-related functionality.

An Analyst sees analysis-related modules but does not see administrative account management features.

Frontend access control improves usability and reduces confusion by showing users only the features available to them.

### Backend Access Control

The backend enforces authorization before allowing access to protected APIs and restricted modules.

When a user sends a request to a protected backend route, the backend validates:

The user's authentication status

The user's active session

The user's assigned role

The user's tenant or company association

The user's license permissions

The requested module or action

If the user does not have the required role or license permission, the backend rejects the request.

Backend enforcement is the primary security control for authorization because it prevents unauthorized users from bypassing frontend restrictions and directly accessing protected APIs.

### Tenant-Level Access Control

Users are associated with a company or tenant. Tenant-level access control ensures that users only access the data and functionality related to their assigned tenant.

Maintainers manage tenant-level users and settings, while members and analysts operate within the boundaries of their assigned tenant and permissions.

This helps separate tenant operations and prevents users from accessing data or settings belonging to another tenant.

### Restricted Administrative Access

Administrative functions are restricted to authorized roles only.

Functions such as account creation, user management, tenant management, license assignment, system configuration, and administrative review are not available to analyst users.

This separation helps reduce unauthorized administrative activity and supports clear responsibility boundaries between administrators, maintainers, members, and analysts.

### Authorization Flow

1. User logs in successfully.
2. Backend validates authentication and session state.
3. System identifies the user role.
4. System identifies the tenant/company association.
5. System checks the assigned license.
6. Frontend displays allowed modules.
7. User requests access to a module or API.
8. Backend validates role and license permission.
9. Request is allowed or rejected.

### Authorization and RBAC Summary

Orion Intelligence uses role-based and license-based access control to determine what users can access after authentication. Users are assigned roles such as Admin, Maintainer, Member, or Analyst, and access to modules is further controlled by the assigned license plan.

The frontend displays only the modules allowed for the user's role and license, while the backend enforces authorization before processing protected API requests. This ensures that users can only access permitted features, tenant data, and administrative functions.

## 3.4 Encryption

### Overview

Orion Intelligence uses encryption to protect sensitive information during transmission and storage. Encryption controls are applied to help protect communication between users and the platform, as well as selected tenant-sensitive fields stored within the database.

The encryption approach focuses on two main areas:

Encryption in transit

Application-level encryption for tenant-sensitive data

### Encryption in Transit

Orion Intelligence uses HTTPS to protect communication between users and the platform. Web traffic is secured using SSL certificates managed through NGINX.

When users access the Orion web application, communication between the user's browser and the platform is encrypted in transit. This helps protect login credentials, access tokens, API requests, search queries, investigation results, and other transmitted data from unauthorized interception.

### SSL Certificates

SSL certificates are managed locally and configured through NGINX. These certificates are used to enable secure HTTPS communication between client browsers and the Orion platform.

NGINX is responsible for handling SSL traffic and supporting secure reverse-proxy behavior for platform access.

### Application-Level Encryption

Orion Intelligence applies application-level encryption to protect selected tenant-sensitive fields stored in MongoDB.

This means sensitive tenant data is encrypted before it is saved in the database and decrypted only when required for authorized API responses.

### Tenant-Specific Data Encryption

Orion uses a tenant-specific encryption model for protecting sensitive tenant fields.

The application loads a master encryption key. For each tenant, the Key Manager generates a separate Data Encryption Key, also known as a DEK. The tenant DEK is encrypted using the master key and then stored.

Tenant-sensitive fields are encrypted using the tenant DEK before being saved in MongoDB. When the data is required by an authorized user or API response, the same tenant DEK is retrieved and used to decrypt the required data.

This approach helps separate tenant encryption contexts and provides additional protection for tenant-specific information.

### Tenant Encryption Flow

1. Application loads the master encryption key.
2. Key Manager generates a per-tenant Data Encryption Key.
3. Tenant DEK is encrypted using the master key.
4. Encrypted tenant DEK is stored.
5. Tenant fields are encrypted using the tenant DEK.
6. Encrypted tenant fields are saved in MongoDB.
7. Tenant DEK is retrieved when required.
8. Data is decrypted for authorized API responses.

### MongoDB Data Protection

MongoDB stores application records, tenant settings, user-related data, reports, audit logs, and operational records. Tenant-sensitive fields within MongoDB are protected using the application-level encryption process.

The purpose of this approach is to ensure that sensitive tenant fields are not stored in readable form without passing through the application encryption and decryption process.

### Encrypted Data Handling

Encrypted tenant data is handled through the backend application layer.

Users do not directly access encrypted database records. Instead, users access data through the Orion frontend and backend APIs. The backend validates the request, verifies authorization, retrieves the required encrypted data, decrypts it where appropriate, and returns the response to the authorized user.

### Encryption Scope

The current encryption controls cover:

- HTTPS traffic between browsers and the platform.
- Access tokens encrypted before storage in the browser's HTTP-only cookie.
- Tenant-specific Data Encryption Keys protected by the master encryption key.
- Authenticator secrets encrypted using the applicable tenant Data Encryption Key.

Passwords, password-reset tokens, and global recovery keys use one-way hashing rather than reversible encryption. Only their hashes are retained in the database.

### Encryption Responsibilities

The Orion application is responsible for encrypting tenant-sensitive fields before storing them in MongoDB and decrypting them only when required for authorized responses.

Administrators and infrastructure personnel are responsible for maintaining SSL certificate configuration, protecting environment-level secrets, and ensuring that encryption keys are handled securely.

### Encryption Summary

Orion Intelligence protects data in transit using HTTPS and SSL certificates configured through NGINX. For stored tenant-sensitive data, Orion applies application-level encryption using a master encryption key and tenant-specific Data Encryption Keys.

This encryption model helps protect sensitive platform communication and tenant-specific database fields while ensuring that authorized users can access required information through controlled backend APIs.

## 3.5 Logging and Audit Logs

### Overview

Orion Intelligence maintains logs and audit records to support operational visibility, troubleshooting, activity review, and platform monitoring. Logging helps administrators understand system behavior, identify application issues, review user-level actions, and investigate unexpected events.

The platform maintains different types of logs, including application-level logs, error logs, exception logs, user activity logs, and audit logs available through the administrative interface.

### Logging Purpose

The purpose of logging in Orion Intelligence is to:

Record application errors and runtime exceptions.

Track system-level events and operational issues.

Maintain visibility into user-level actions.

Support troubleshooting and debugging.

Help administrators review platform activity.

Support investigation of unusual or unauthorized activity.

Maintain historical records for operational review.

### Application Logs

Application logs capture system-level information generated by Orion backend services and supporting components.

These logs may include:

Runtime errors

Backend exceptions

Failed operations

Service-level issues

Processing errors

API-related errors

System execution events

Application logs are maintained in internal log directories with timestamped records. These logs help the technical team investigate application issues and identify the source of failures or unexpected behavior.

### Error and Exception Logs

Orion captures code-level errors and exceptions generated during platform operation. These logs are used by developers and administrators to identify application defects, failed backend operations, runtime crashes, or processing failures.

Error and exception logs may include:

Error message

Timestamp

Affected service or component

Related backend operation

Exception details

Processing failure information

These records help the technical team diagnose problems and apply fixes where required.

### User Activity Logs

Orion Intelligence records user-level actions where applicable. User activity logs help administrators understand how users interact with the platform and provide visibility into important user operations.

User activity logs may include:

Login activity

Logout activity

Module access

Search activity

Administrative actions

User management actions

Tenant-related actions

Report-related actions

Configuration changes

These logs support platform accountability and help administrators review user behavior within the system.

### Audit Logs

Audit logs are maintained to provide a structured record of important platform activities. These logs are stored in the database and are available to authorized administrators through the internal Audit Logs dashboard.

The Audit Logs dashboard allows administrators to review recorded activities from within the Orion administrative interface.

Audit logs may include:

User actions

Administrative actions

Tenant-level events

Security-relevant activities

System configuration changes

Access-related events

Important operational actions

Audit logs help provide visibility into platform usage and support review of user and administrator activity.

### Log Storage

Orion uses internal storage locations and database-backed records for maintaining logs.

Application-level errors, runtime crashes, and execution exceptions are captured in internal folders with timestamped log records.

User-level actions and audit-related events are stored in the database and made available to authorized administrators through the internal Audit Logs dashboard.

### Log Access

Access to logs is restricted to authorized personnel. Regular users do not have direct access to backend logs, system logs, or administrative audit records.

Log access is generally limited to:

Platform administrators

Authorized maintainers where applicable

Developers responsible for troubleshooting

Infrastructure or operations personnel

This helps ensure that log data is reviewed only by personnel with an operational or administrative need.

### Log Retention

MongoDB logs are maintained indefinitely. This allows the platform to preserve historical operational and audit-related records for long-term review, investigation, and administrative tracking.

Application log retention may depend on the server configuration, available storage, and operational requirements.

### Logging Flow

1. Platform activity occurs.
2. Application or backend service generates a log event.
3. Error, exception, or user action is recorded.
4. Code-level logs are stored in internal log folders.
5. User-level audit events are stored in the database.
6. Authorized administrators review audit logs through the Admin UI.

### Logging and Audit Summary

Orion Intelligence maintains logging and audit capabilities to support troubleshooting, operational visibility, user activity review, and administrative oversight.

Application errors and exceptions are stored in internal log folders with timestamps, while user-level actions and audit events are persisted in the database and exposed through the internal Audit Logs dashboard for authorized administrators.

This logging model helps the platform maintain visibility into system behavior, user activity, and operational events.

## 3.6 Backup and Recovery

### Overview

Orion Intelligence uses a scheduled backup approach to support recovery in the event of system failure, database corruption, infrastructure disruption, or other operational issues affecting platform availability or data integrity.

Backups are maintained to help restore the platform and its critical data when recovery is required. The backup process supports operational continuity and reduces the risk of permanent data loss.

### Backup Purpose

The purpose of the backup process is to protect Orion Intelligence data and system state by maintaining recoverable copies of critical platform information.

The backup process is designed to support recovery from situations such as:

Database corruption

VPS-level failure

Accidental data loss

Application-level failure

Infrastructure disruption

Critical system misconfiguration

Operational recovery needs

### Backup Solution

Orion Intelligence uses Hostinger for scheduled backup support.

Hostinger backups are maintained on a weekly basis and are used to preserve the platform state for disaster recovery and operational recovery purposes.

These backups provide recovery points that can be used by authorized administrators when restoration is required.

### Backup Scope

The backup process is intended to support recovery of critical Orion Intelligence components and data.

The backup scope may include:

Application data

Database data

Platform configuration

User-related records

Tenant-related records

System settings

Operational records

Application state required for recovery

The exact recovery scope depends on the available Hostinger backup configuration and the state of the platform at the time the backup is created.

### Database Backups

Orion Intelligence databases are included in the backup approach through Hostinger weekly backups.

The platform uses multiple data components, including:

MongoDB

Elasticsearch

ArangoDB

Redis

These components support different platform workloads, including document persistence, indexed search, graph analysis, caching, and task coordination. Backups help preserve the data and system state required to restore platform operations when needed.

### Recovery Process

If recovery is required, authorized administrators are responsible for initiating the restoration process using the available Hostinger backup.

The general recovery process includes:

Identify the issue requiring recovery.

Determine the most appropriate available backup point.

Restore the required system state or data from the backup.

Validate that core platform services are operational.

Confirm that users can access the platform and required modules.

Review logs and system behavior after recovery.

### Recovery Responsibilities

Backup and recovery activities are handled by authorized administrators or infrastructure personnel responsible for Orion Intelligence operations.

These personnel are responsible for:

Monitoring backup availability.

Initiating recovery when required.

Restoring platform data or system state.

Validating service functionality after recovery.

Reviewing system behavior after restoration.

Coordinating with the development or operations team if additional fixes are required.

### Backup Frequency

Orion Intelligence uses weekly backups through Hostinger.

The weekly backup schedule provides recurring recovery points that can be used in the event of operational disruption or data recovery requirements.

### Backup Access

Access to backups is restricted to authorized personnel responsible for platform administration, infrastructure management, or recovery operations.

Regular platform users do not have access to backup files, recovery controls, or backup management functions.

### Backup and Recovery Flow

1. Orion platform operates normally.
2. Hostinger creates the scheduled weekly backup.
3. Backup is retained as a recovery point.
4. Operational issue or recovery need occurs.
5. Authorized administrator selects an available backup.
6. System/data restoration is performed.
7. Platform services are validated after recovery.

### Backup and Recovery Summary

Orion Intelligence uses Hostinger weekly backups to support recovery from system failure, data corruption, infrastructure disruption, or other operational issues.

Backups provide recovery points for restoring critical platform data and system state. Recovery activities are performed by authorized administrators or infrastructure personnel, and backup access is restricted to authorized personnel only.

:::{admonition} SOC 2 Readiness Note
:class: note

The following sections document operational and technical controls that support SOC 2 readiness and audit evidence collection. They should be treated as control documentation, not as a claim of SOC 2 certification unless validated through an independent SOC 2 audit.
:::

## 3.7 Monitoring

### Overview

Orion Intelligence uses monitoring to track platform availability and operational health. Monitoring helps administrators identify service disruptions, downtime, or access-related issues affecting the live application or documentation routes.

The current monitoring approach focuses on external availability monitoring using UptimeRobot.

### Monitoring Purpose

The purpose of monitoring is to provide visibility into the availability and operational status of Orion Intelligence.

Monitoring helps the team:

- Track live application availability.
- Detect service downtime.
- Monitor documentation availability.
- Identify service disruptions.
- Support faster operational response.
- Reduce the impact of unexpected outages.
- Maintain visibility into platform uptime.

### Monitoring Tool

Orion Intelligence uses UptimeRobot for external availability monitoring.

UptimeRobot is configured to monitor the live application and documentation routes. If a monitored service becomes unavailable, UptimeRobot provides alerts so that administrators can review the issue and take corrective action.

### Monitored Services

The monitored services may include:

- Orion Intelligence web application
- Public documentation routes
- Platform availability endpoints
- Website or application URLs configured for uptime monitoring

The exact monitored endpoints depend on the current UptimeRobot configuration.

### Availability Monitoring

Availability monitoring checks whether the configured Orion services are reachable and responding as expected.

If a monitored route becomes unavailable, the monitoring tool identifies the disruption and notifies the responsible team or administrator according to the configured alert settings.

This helps the team respond to downtime or service interruption more quickly.

### Alert Handling

When a monitoring alert is received, the responsible administrator or operations personnel reviews the affected service and identifies the cause of the issue.

The general alert handling process includes:

- Review the monitoring alert.
- Confirm whether the affected service is unavailable.
- Check the relevant server, application, or routing component.
- Review application or system logs if required.
- Apply corrective action.
- Confirm that the affected service is restored.
- Continue monitoring for recurrence.

### Monitoring Responsibilities

Monitoring activities are handled by authorized administrators or operations personnel responsible for Orion Intelligence availability and platform operations.

Responsibilities include:

- Maintaining monitoring configuration.
- Reviewing alerts.
- Investigating downtime or service disruption.
- Coordinating with developers or infrastructure personnel when required.
- Confirming service restoration after an outage.
- Reviewing recurring availability issues.

### Monitoring Flow

1. UptimeRobot monitors configured Orion routes.
2. Service availability is checked.
3. If the service is available, monitoring continues.
4. If the service is unavailable, an alert is generated.
5. Administrator reviews the issue.
6. Corrective action is taken.
7. Service availability is confirmed.

### Monitoring Summary

Orion Intelligence uses UptimeRobot to monitor the availability of the live application and documentation routes. Monitoring provides operational visibility into platform uptime and helps administrators identify and respond to service disruptions.

The current monitoring approach supports availability tracking, alert review, and operational response for the configured Orion services.

## 3.8 Network Security

### Overview

Orion Intelligence uses network-level controls to protect platform access, manage traffic routing, and reduce unnecessary exposure of internal services. The platform is hosted on a Virtual Private Server environment and uses firewall rules, HTTPS, SSL certificates, NGINX, Traefik, and containerized service boundaries to support secure network communication.

Network security controls help ensure that only required traffic reaches the platform and that communication between users and the Orion web application is encrypted.

### Network Security Purpose

The purpose of network security in Orion Intelligence is to protect the platform from unauthorized network access and reduce exposure of internal services.

Network security controls are designed to:

- Control inbound traffic to the platform.
- Block unused or unnecessary ports.
- Enforce HTTPS communication.
- Secure browser-to-platform communication.
- Route requests to the correct internal services.
- Reduce direct exposure of backend services.
- Support secure operation of the hosted application environment.

### Hosting Environment

Orion Intelligence is deployed on a Virtual Private Server environment. The VPS provides the underlying compute and network environment required to run the platform services.

The VPS runs Ubuntu as the operating system and hosts the containerized Orion services through Docker and Docker Compose.

The hosting environment supports the following components:

- Web application services
- Backend API services
- Database services
- Cache and coordination services
- Routing services
- Supporting operational services

### Firewall Rules

Orion Intelligence uses strict firewall rules to control network access to the server environment.

The firewall is configured to block unused communication ports and allow only the required traffic needed for platform operation. This reduces the number of exposed services and limits unnecessary inbound access to the server.

Firewall controls help protect the platform by ensuring that only approved network paths are available.

### HTTPS Enforcement

Orion Intelligence enforces HTTPS communication for supported platform traffic.

HTTPS is used to protect communication between users and the platform by encrypting data transmitted between the user's browser and the Orion environment.

This helps protect:

- Login credentials
- Access tokens
- API requests
- Search queries
- Investigation results
- Administrative actions
- Platform responses

### SSL Certificates

SSL certificates are used to secure traffic between users and the Orion platform. These certificates are managed locally and configured through NGINX.

The SSL configuration helps ensure that users connect to the platform through encrypted channels instead of unencrypted communication.

### NGINX

NGINX is used as part of the Orion network and routing layer. It supports static file delivery, SSL certificate handling, HTTPS traffic, and reverse-proxy behavior.

NGINX helps manage external web traffic before requests are routed to internal platform services.

### Traefik

Traefik operates alongside NGINX to support dynamic routing between external requests and internal Docker containers.

Traefik helps route incoming requests to the correct internal service based on the configured routing rules. This supports the platform's containerized architecture by allowing multiple services to operate behind controlled routing boundaries.

### Containerized Network Boundaries

Orion Intelligence uses Docker and Docker Compose to run platform components in containerized environments.

Containerization helps separate frontend, backend, database, crawler, collector, and supporting services into distinct runtime units. Docker Compose defines how these services communicate, share internal networks, and mount persistent volumes.

This containerized approach supports internal service separation and helps organize communication between platform components.

### Network Traffic Flow

External users access Orion Intelligence through the web interface. Incoming traffic is encrypted using HTTPS and processed through the routing layer before reaching the appropriate internal service.

The high-level network traffic flow is:

1. User browser sends an HTTPS request.
2. Firewall rules control allowed traffic.
3. NGINX handles SSL and reverse-proxy routing.
4. Traefik routes the request to the correct internal container.
5. Internal Docker services receive the routed request.
6. Frontend, backend, or supporting services process the request.

### Backend Service Exposure

Backend services are not intended to be directly accessed by regular users. Users interact with Orion through the web interface and exposed platform APIs.

Requests to backend services pass through the platform routing and authentication layers. Protected backend routes require valid authentication before access is granted.

This helps reduce direct exposure of internal backend services and ensures that user requests are processed through controlled application paths.

### Network Administration

Network security configuration is managed by authorized administrators or infrastructure personnel.

Responsibilities may include:

- Managing firewall rules.
- Maintaining SSL certificate configuration.
- Reviewing exposed ports.
- Managing NGINX configuration.
- Managing Traefik routing configuration.
- Supporting VPS-level network security.
- Reviewing network-related issues during troubleshooting.

### Network Security Summary

Orion Intelligence applies network security controls through strict firewall rules, HTTPS enforcement, SSL certificates, NGINX, Traefik, and containerized service boundaries.

The platform is hosted on an Ubuntu-based VPS and uses Docker Compose to manage internal service communication. External traffic is routed through controlled network paths before reaching internal platform services.

This network security model helps reduce unnecessary exposure, protect communication in transit, and support secure access to the Orion Intelligence platform.

## 3.9 API Security

### Overview

Orion Intelligence uses backend API security controls to protect platform services, intelligence modules, user actions, administrative functions, and tenant-level operations. API access is controlled through token-based authentication, session validation, role-based permissions, license-based access, and protected backend routes.

The API layer acts as the main communication boundary between the Orion frontend and backend services. Users interact with the platform through the web interface, and the frontend sends authenticated requests to backend APIs when users perform actions such as searching intelligence data, accessing modules, viewing reports, managing users, or performing administrative tasks.

### API Security Purpose

The purpose of API security in Orion Intelligence is to ensure that backend services are accessed only by authenticated and authorized users.

API security controls are designed to:

- Protect backend services from unauthorized access.
- Validate user identity before processing requests.
- Ensure that access tokens are valid and active.
- Enforce role-based and license-based access.
- Prevent users from accessing modules outside their assigned license.
- Restrict administrative APIs to authorized roles.
- Protect tenant-specific data through backend validation.
- Reject expired, invalid, or unauthorized requests.

### Authentication for APIs

Orion Intelligence APIs use token-based authentication. After a successful browser login, the backend generates an access token, encrypts it into an HTTP-only cookie, and omits it from the response body. The frontend sends requests with credentials enabled but does not read or store the token in local storage.

When the backend receives a protected browser request, it decrypts and validates the cookie token before allowing the request to continue. Supported API integrations can supply a Bearer token directly.

If the token is missing, expired, invalid, malformed, or not linked to an active session, the backend rejects the request and the user is logged out.

### Cookie and Bearer Token Access

Protected backend routes require a valid cookie token or supported Bearer token. The token is used by the backend to verify the identity and active session of the requesting user.

The backend validates the token before processing protected actions such as:

- Accessing intelligence modules
- Performing searches
- Viewing reports
- Accessing dashboard data
- Accessing tenant-specific data
- Managing users
- Viewing audit logs
- Performing administrative actions
- Accessing restricted platform features

### Authentication Endpoint Protection

The login endpoint applies progressive Redis-backed delays to repeated unsuccessful attempts. Redis keys contain a hash of the normalized login identifier rather than the submitted email or username, and failure state has a bounded lifetime. Passwords are never written to the limiter state.

Forgot-password and account-recovery endpoints use generic responses for correctly formed requests. This prevents the API response from confirming whether an email address or recovery-key hash exists. Input-format checks remain separate from account-detail validation.

### Protected Routes

Protected routes are backend API endpoints that require authentication and authorization before access is granted.

When a user sends a request to a protected route, the backend checks whether the request includes valid authentication credentials. If authentication is successful, the backend then checks whether the user has the required role, license, and tenant-level permission to perform the requested action.

If any check fails, the backend rejects the request.

### License-Based API Access

Orion Intelligence enforces license-based access at the backend level. Each license determines which modules and capabilities are available to the user or tenant.

If a user attempts to access a module that is not included in the assigned license, the backend blocks the request.

This means that API access is not controlled only by the frontend. Even if a user tries to directly call a restricted API endpoint, the backend checks the license before allowing access.

### Role-Based API Access

In addition to license checks, Orion Intelligence uses role-based access control to determine whether a user is allowed to perform specific actions.

For example:

- Admin users may access platform-level administrative functions.
- Maintainers may access tenant-level management functions.
- Members may access modules available to their tenant and role.
- Analysts may access investigation and analysis features but cannot access account creation or tenant administration functions.

Backend APIs validate the user role before allowing access to restricted actions.

### Tenant-Level API Access

Users are associated with a company or tenant. Backend APIs validate tenant context before returning tenant-specific information.

Tenant-level checks help ensure that users only access data, modules, settings, and records associated with their assigned tenant.

This prevents users from accessing information belonging to another tenant through direct API requests.

### Frontend and Backend API Security

The frontend improves usability by displaying only the modules and options available to the user's role and license.

However, backend validation remains the main enforcement point. The backend independently verifies access permissions before processing protected API requests.

This creates two layers of control:

- The frontend controls what users can see in the interface.
- The backend controls what users can actually access and execute.

### Unauthorized API Requests

If an API request is unauthorized, expired, invalid, or outside the user's permission level, the backend rejects the request.

Unauthorized requests may occur when:

- The access token is missing.
- The token is expired.
- The token is invalid.
- The session is no longer active.
- The user does not have the required role.
- The user's license does not include the requested module.
- The user attempts to access another tenant's data.
- The requested route is restricted to administrators or maintainers.

When authentication or session validation fails, the platform logs the user out and requires a new login.

### API Request Flow

1. User performs an action in the Orion frontend.
2. Frontend sends the API request with the access token.
3. Backend receives the protected API request.
4. Backend validates the token and session.
5. Backend checks the user role.
6. Backend checks tenant association.
7. Backend checks license/module access.
8. If allowed, the request is processed.
9. If denied, the request is rejected.

### API Security Summary

Orion Intelligence protects backend APIs using token-based authentication, protected routes, session validation, role-based access control, license-based access control, and tenant-level validation.

The frontend only displays modules available to the user's role and license, while the backend performs independent access checks before processing protected requests. This ensures that API access is controlled at the application layer and that users can only access permitted modules, actions, and tenant-specific data.

## 3.10 Tenant Isolation

### Overview

Orion Intelligence supports a tenant-based access model where each company or customer operates within a separate tenant context. Tenant isolation ensures that users can only access the data, settings, alerts, reports, scans, and platform records associated with their assigned tenant.

Tenant isolation is enforced through backend validation, role-based access control, license-based access, and tenant-aware data handling.

### Tenant-Based Access

Each company using Orion Intelligence is treated as a separate tenant. Users are associated with a specific tenant, and their access is limited to the data and modules available within that tenant.

A user belonging to one tenant should not be able to access another tenant's:

- Users
- Alerts
- Reports
- Scans
- Threat feeds
- IOC records
- Settings
- Investigation data
- Saved intelligence records

### Backend Tenant Validation

The backend validates tenant context before returning tenant-specific data or allowing tenant-level actions.

When a user sends a request, the backend checks the authenticated user, active session, assigned role, license permissions, and tenant association before processing the request.

If the user does not belong to the required tenant or does not have permission to perform the requested action, the request is denied.

### Tenant-Level Administration

The Maintainer role acts as the administrator for a specific tenant. Maintainers can manage tenant-level users, settings, and operational workflows within their assigned tenant.

Maintainers do not have platform-wide administrative access and are restricted to their own tenant environment.

### Admin Access to Tenant Alerts

Platform admins may access tenant alerts only when the tenant allows such access. This provides tenants with control over whether their alert information can be reviewed by the platform administrator.

This approach helps maintain tenant privacy while still allowing administrative support when permitted by the tenant.

### IOC Management

Orion Intelligence allows tenants to define Indicators of Compromise (IOCs) for monitoring purposes.

Tenants can add company-related domains and email addresses in the IOC section. These IOCs are used to monitor for future matches. If leaked or exposed data matches a tenant's configured IOC, the platform can notify the tenant.

Examples of tenant-configurable IOCs include:

- Company domains
- Company email addresses

### Additional IOC Requests

If a tenant wants to add other types of IOC data, such as phone numbers, documents, or other sensitive identifiers, the tenant must submit a request to the admin.

The tenant can add such additional IOC data only after admin approval.

This approval step helps control sensitive IOC usage and ensures that additional monitoring identifiers are reviewed before being added to the platform.

### Tenant Data Protection

Tenant-specific data is protected through backend access checks and tenant-aware data handling. Sensitive tenant fields stored in MongoDB are protected using tenant-specific encryption keys where applicable.

This helps ensure that tenant-specific data remains logically separated and accessible only through authorized platform workflows.

### Tenant Isolation Flow

1. User sends a request to Orion.
2. Backend validates authentication and session.
3. Backend identifies the user's tenant.
4. Backend checks role and license permissions.
5. Backend checks the requested tenant data or action.
6. If tenant context is valid, the request is processed.
7. If tenant context is invalid, the request is denied.

### Tenant Isolation Summary

Orion Intelligence uses tenant isolation to separate customer data, settings, users, alerts, reports, scans, IOC records, and investigation workflows. Backend services validate tenant context before returning data or allowing actions.

Tenants can manage their own IOC monitoring for domains and email addresses, while additional sensitive IOC types require admin approval. Platform admins can view tenant alerts only when the tenant allows such access.

## 3.11 Database Security

### Overview

Orion Intelligence uses a multi-database architecture to support application data, indexed intelligence search, graph-based analysis, caching, and background coordination. Database security controls are applied to protect stored data, restrict direct database access, secure database credentials, and ensure that users only access data through authorized application workflows.

The platform uses the following database components:

| Database      | Security-Relevant Purpose                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| MongoDB       | Stores application records, user data, tenant settings, reports, audit logs, and operational records |
| Elasticsearch | Stores indexed intelligence datasets for fast search and retrieval                                   |
| ArangoDB      | Stores graph-based relationship data for CTI Graph and Social Intelligence workflows                 |
| Redis         | Supports caching, task coordination, temporary state, and queue-like workflows                       |

Each database serves a specific purpose within the Orion platform and is accessed through controlled backend services and authorized administrative access.

### Database Security Purpose

The purpose of database security in Orion Intelligence is to protect platform data from unauthorized access, misuse, accidental exposure, and unauthorized modification.

Database security controls are designed to:

- Restrict direct access to databases.
- Ensure users access data through backend APIs only.
- Protect database credentials and passwords.
- Protect tenant-sensitive data.
- Support tenant-level data separation.
- Limit database access to authorized administrators and required backend services.
- Preserve database records through scheduled backups.
- Maintain database logs for long-term review.

### Database Components

Orion Intelligence uses four primary database components.

### MongoDB Security

MongoDB is used for document-based persistence across the Orion platform. It stores user-related records, tenant settings, reports, audit logs, application configurations, and operational records.

Access to MongoDB is restricted to authorized administrators and backend services. Regular platform users do not directly access MongoDB. Users interact with MongoDB-backed data only through the Orion web application and backend APIs.

Tenant-sensitive fields stored in MongoDB are protected using application-level encryption.

### Elasticsearch Security

Elasticsearch is used for high-speed indexed search and retrieval of intelligence datasets. It supports searching across large datasets such as breach records, stealer logs, news data, social intelligence data, and general intelligence records.

Access to Elasticsearch is controlled through backend services. Users do not directly query Elasticsearch. Search requests are submitted through the Orion frontend or APIs, and the backend validates the user's authentication, role, tenant context, and license permissions before querying Elasticsearch.

### ArangoDB Security

ArangoDB is used for graph-based relationship analysis. It stores relationship data used by modules such as CTI Graph and Social Intelligence.

Access to ArangoDB is restricted to backend services and authorized administrators. Users access graph-based data only through controlled platform features and APIs.

The backend is responsible for validating whether the user is allowed to access the requested graph data before returning results.

### Redis Security

Redis is used for caching, temporary state management, task coordination, and queue-like workflows.

Redis supports backend processing and asynchronous operations. It is not directly accessed by regular users. Access is limited to backend services and authorized personnel responsible for maintaining the platform.

Authentication throttling stores only a hashed login identifier, a failure count, and a retry timestamp in Redis. The limiter state expires automatically and is deleted after successful login. Redis does not receive the submitted password or recovery key for this control.

### Database Access Control

Database access is restricted to authorized administrators and required backend services.

Regular users do not have direct access to any database. Users access data only through:

- Orion web application
- Backend APIs
- Authorized platform workflows

Before returning database-backed information, the backend validates:

- User authentication
- Active session
- User role
- Tenant association
- License permissions
- Requested module or action

If the user is not authorized, the backend denies the request.

### Database Credential and Password Protection

Database credentials, passwords, service secrets, and connection strings are protected and are not exposed to regular users.

Database passwords and service credentials are managed through environment configuration and are kept separate from application source code. Access to these credentials is limited to authorized administrators, developers, or infrastructure personnel who require them for deployment, maintenance, or troubleshooting.

Database passwords should not be hardcoded inside the application codebase, shared publicly, or stored in frontend-accessible files.

### User Password Protection

User account passwords are not stored in plain text. During registration or password reset, the backend hashes the password before saving it in the database.

During login, the submitted password is compared against the stored password hash. The original password is not retrieved from the database.

This helps protect user credentials and reduces the risk of password exposure if database records are accessed without authorization.

Password-reset tokens and global recovery keys are also stored only as SHA-256 hashes. Reset tokens expire after 20 minutes and are deleted after successful use; rotating a recovery key replaces the previous hash. Password, 2FA, and recovery-key changes require backend verification of the current password before the account record is modified.

### Tenant-Sensitive Data Protection

Orion Intelligence protects tenant-sensitive MongoDB fields using application-level encryption.

The application loads a master encryption key. For each tenant, the Key Manager generates a separate tenant Data Encryption Key. The tenant DEK is encrypted using the master key and stored securely.

Tenant-sensitive fields are encrypted using the tenant DEK before being saved in MongoDB. When the data is required for an authorized API response, the same tenant DEK is retrieved and used to decrypt the required data.

### Tenant Encryption Flow

1. Application loads the master encryption key.
2. Key Manager generates a per-tenant Data Encryption Key.
3. Tenant DEK is encrypted using the master key.
4. Encrypted tenant DEK is stored.
5. Tenant-sensitive fields are encrypted using the tenant DEK.
6. Encrypted data is saved in MongoDB.
7. Authorized API request requires the protected data.
8. Tenant DEK is retrieved.
9. Data is decrypted for the authorized response.

### Backend-Controlled Database Access

The backend acts as the control layer between users and databases.

Users do not directly connect to MongoDB, Elasticsearch, ArangoDB, or Redis. Instead, all requests pass through backend services where authentication, authorization, role checks, license checks, and tenant checks are performed.

This ensures that database access is controlled by application logic and that users can only retrieve data they are permitted to access.

### Backup Protection

Orion Intelligence databases are backed up through Hostinger weekly backups. These backups support recovery in the event of database corruption, system failure, infrastructure disruption, or operational issues.

Backup access is restricted to authorized personnel responsible for platform administration, infrastructure management, or recovery operations.

### Log Retention

MongoDB logs are maintained indefinitely. This allows long-term review of operational records, audit-related information, and historical platform activity where applicable.

### Database Security Responsibilities

Database security is managed by authorized administrators, developers, and infrastructure personnel responsible for platform operations.

Responsibilities include:

- Managing database access.
- Protecting database credentials and passwords.
- Maintaining environment configuration.
- Reviewing database availability.
- Supporting backup and recovery activities.
- Ensuring users access data through approved application workflows.
- Protecting tenant-sensitive data.
- Maintaining database-related security controls.

### Database Security Summary

Orion Intelligence protects its database layer through restricted access, backend-controlled data retrieval, credential protection, password hashing, tenant-sensitive field encryption, scheduled backups, and long-term MongoDB log retention.

MongoDB, Elasticsearch, ArangoDB, and Redis are used for different platform workloads, but regular users do not directly access these databases. User requests are processed through the Orion frontend and backend APIs, where authentication, role, license, and tenant-level checks are applied before data is returned.

## 3.12 Secrets Management

### Overview

Orion Intelligence uses configuration-based secrets management to handle sensitive runtime settings and service credentials. Secrets and environment-specific values are managed separately from the application source code to reduce the risk of exposing sensitive information inside the codebase.

Secrets management applies to backend services, database connectivity, deployment configuration, authentication settings, feature flags, and other environment-specific platform parameters.

### Secrets Management Purpose

The purpose of secrets management is to protect sensitive configuration values used by the Orion platform.

These values may include:

- Database credentials
- Service credentials
- Authentication secrets
- Encryption keys
- API keys
- Environment variables
- Feature flags
- Testing mode toggles
- Deployment configuration values

Keeping these values separate from source code helps reduce accidental exposure and allows different environments to use different configuration values.

### Environment Configuration

Orion Intelligence uses `.env` files to manage environment variables and runtime configuration.

These files are used to define configuration values required by the application during startup and operation. The backend and supporting services read these values from the environment instead of hardcoding them directly into the application code.

### Separation from Source Code

Sensitive values are not intended to be stored directly inside the source code. Instead, they are maintained through environment configuration files.

This separation allows the application codebase to remain reusable across different environments while keeping environment-specific secrets and credentials outside the main application logic.

### Types of Managed Secrets

The platform may manage the following types of sensitive values through environment configuration:

- Database connection strings
- Database usernames and passwords
- Authentication token secrets
- Encryption master key
- Service configuration values
- Internal API keys
- External integration keys
- Debug or testing flags
- Deployment-specific settings

### Access to Secrets

Access to secrets and environment configuration files is restricted to authorized administrators, developers, or infrastructure personnel who require access for deployment, maintenance, troubleshooting, or operational support.

Regular platform users do not have access to secrets, environment files, backend configuration files, or deployment-level credentials.

### Secrets Management Flow

1. Authorized administrator configures environment values.
2. Sensitive values are stored in environment configuration files.
3. Application services load required values at runtime.
4. Services use secrets for database, authentication, encryption, or integration needs.
5. Sensitive values remain separated from source code.

### Secrets Management Summary

Orion Intelligence manages sensitive runtime configuration through environment variables and `.env` files. This approach separates credentials, keys, service settings, and deployment-specific values from the application source code.

Access to these configuration values is restricted to authorized personnel responsible for deployment, maintenance, and platform operations.

## 3.13 Disaster Recovery

### Overview

Disaster recovery in Orion Intelligence focuses on restoring platform operations after a major disruption, infrastructure failure, database issue, application failure, or other event that affects the availability or usability of the platform.

The disaster recovery approach is based on restoring the Orion environment using available backups, infrastructure access, application deployment files, Docker-based orchestration, and administrative recovery activities.

### Disaster Recovery Purpose

The purpose of disaster recovery is to help restore Orion Intelligence after a serious operational disruption.

Disaster recovery activities are intended to support recovery from events such as:

- VPS failure
- Database corruption
- Application failure
- Infrastructure disruption
- Service misconfiguration
- Unrecoverable deployment issue
- Accidental data loss
- Critical system outage

### Recovery Approach

Orion Intelligence is deployed using a containerized architecture. The platform runs on an Ubuntu-based Virtual Private Server and uses Docker and Docker Compose to manage platform services.

In the event of a major failure, authorized administrators or infrastructure personnel can use available backups and deployment configurations to restore the platform environment.

The recovery approach may include:

- Accessing the VPS or replacement server environment
- Restoring data from available Hostinger backups
- Restoring required configuration files
- Rebuilding and restarting Docker containers
- Validating database availability
- Validating backend API availability
- Validating frontend application access
- Confirming that users can access required platform modules

### Backup-Based Recovery

Orion Intelligence uses weekly Hostinger backups to support recovery from system failure, database corruption, or infrastructure disruption.

These backups provide recovery points that can be used to restore system state and critical platform data when recovery is required.

Backup-based recovery helps reduce the risk of permanent data loss and supports restoration of platform operations after major incidents.

### Container-Based Recovery

Orion Intelligence uses Docker and Docker Compose to manage platform services. This supports recovery by allowing the application environment to be rebuilt and restarted using defined service configurations.

Docker-based recovery may include:

- Rebuilding application containers
- Restarting backend services
- Restarting frontend services
- Restarting supporting services
- Restoring mounted volumes where applicable
- Validating container communication
- Confirming that required services are running

This approach helps restore platform services in a controlled and repeatable manner.

### Recovery Responsibilities

Disaster recovery activities are performed by authorized administrators, infrastructure personnel, or operations team members responsible for maintaining the Orion environment.

Recovery responsibilities may include:

- Identifying the cause of the disruption
- Selecting the appropriate backup or recovery point
- Restoring data or system state
- Rebuilding affected services
- Restarting required containers
- Validating platform functionality
- Reviewing logs after recovery
- Coordinating with developers if application-level fixes are required

### General Disaster Recovery Process

The general disaster recovery process includes:

- Identify the incident or disruption.
- Assess the affected systems or services.
- Determine whether recovery from backup is required.
- Select the appropriate available backup point.
- Restore required data, configuration, or system state.
- Rebuild and restart required services using Docker Compose.
- Validate database, backend, frontend, and supporting services.
- Confirm that users can access the platform.
- Review logs and platform behavior after restoration.
- Apply additional fixes if required.

### Disaster Recovery Flow

1. Major disruption occurs.
2. Administrator reviews affected systems.
3. Recovery requirement is identified.
4. Available backup point is selected.
5. Data or system state is restored.
6. Docker services are rebuilt or restarted.
7. Platform functionality is validated.
8. Users regain access to the platform.
9. Logs and system behavior are reviewed.

### Recovery Validation

After recovery activities are completed, the platform should be validated to confirm that core services are functioning properly.

Validation may include checking:

- Frontend availability
- Backend API availability
- User login
- Database connectivity
- Search functionality
- Key modules
- Admin dashboard access
- Logs and system behavior
- Background services where applicable

This validation helps confirm that the platform has returned to an operational state.

### Disaster Recovery Summary

Orion Intelligence uses a backup-based and container-based recovery approach to support restoration after major service disruption, database corruption, infrastructure failure, or application-level failure.

Weekly Hostinger backups provide recovery points, while Docker and Docker Compose support rebuilding and restarting platform services. Disaster recovery activities are performed by authorized personnel responsible for restoring data, validating services, and returning the platform to an operational state.
