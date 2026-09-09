(organizational-security-policies)=

# Organizational Security Policies

:::{admonition} Policy authority
:class: important

These policies define the organizational security requirements for Genesis Technologies and the Orion Intelligence platform. They are the governing policy layer for the implementation procedures, technical controls, and operational safeguards described throughout the Orion documentation.

Policy approval, effective dates, exceptions, and review records must be maintained by the designated policy owner. This documentation supports SOC 2 readiness and evidence collection; it does not represent a claim of certification without an independent examination.
:::

```{contents}
:local:
:depth: 2
```

## 4.1 Information Security Policy

### Document Control

| Field            | Details                              |
|------------------|--------------------------------------|
| Document Name    | Information Security Policy          |
| Company          | Genesis Technologies                 |
| Product / System | Orion Intelligence                   |
| Version          | 1.0                                  |
| Owner            | Management / Security Owner          |
| Approved By      | Management                           |
| Effective Date   | To be defined                        |
| Review Frequency | Annually or when major changes occur |

### 1. Purpose

The purpose of this policy is to define the overall information security requirements for Genesis Technologies and the Orion Intelligence platform.

This policy establishes the company’s commitment to protecting systems, data, users, customers, tenants, source code, infrastructure, and business operations from unauthorized access, misuse, loss, disruption, or exposure.

### 2. Scope

This policy applies to:

- Genesis Technologies employees
- Contractors
- Developers
- Administrators
- Authorized users
- Orion Intelligence systems
- Company systems and accounts
- Source code repositories
- Databases and infrastructure
- Customer and tenant data
- Internal documents and operational records
- Third-party services used for business or product operations

### 3. Policy Statement

Genesis Technologies must maintain reasonable administrative, technical, and operational security controls to protect company information systems and the Orion Intelligence platform.

Security controls must support the protection of confidentiality, integrity, availability, privacy, and reliable operation of company systems and customer-facing services.

### 4. Policy Requirements

Genesis Technologies requires that:

- Access to systems and data is limited to authorized users.
- Users are assigned access based on role and business need.
- Sensitive data is protected from unauthorized access or disclosure.
- Authentication is required for protected systems and platform features.
- Passwords and credentials are protected from exposure.
- Source code and configuration files are protected from unauthorized access.
- Production systems and infrastructure are accessed only by authorized personnel.
- Security incidents and suspicious activity are reported promptly.
- Changes to systems are reviewed and controlled.
- Backups and recovery activities are maintained for critical systems.
- Logs and monitoring are used where required for operational and security visibility.
- Security policies are reviewed and updated when required.

### 5. Roles and Responsibilities

Management is responsible for approving security policies and ensuring security responsibilities are assigned.

The Security Owner is responsible for maintaining security documentation, reviewing risks, and supporting security activities.

Administrators are responsible for managing access, reviewing activity, and supporting secure system operations.

Developers are responsible for following secure development practices and protecting source code, credentials, and systems.

Employees, contractors, and authorized users are responsible for following company security requirements and reporting suspicious activity.

### 6. Policy Exceptions

Exceptions to this policy must be reviewed and approved by management or the Security Owner.

Exceptions should include the reason, affected system, risk, approval details, and review date.

### 7. Policy Review

This policy must be reviewed at least annually or when significant changes occur to the company, Orion Intelligence, infrastructure, security requirements, or business operations.

### 8. Compliance

Failure to comply with this policy may result in access removal, corrective action, disciplinary action, contract termination, or other action approved by management.

## 4.2 Access Control Policy

### Document Control

| Field            | Details                              |
|------------------|--------------------------------------|
| Document Name    | Access Control Policy                |
| Company          | Genesis Technologies                 |
| Product / System | Orion Intelligence                   |
| Version          | 1.0                                  |
| Owner            | Management / Security Owner          |
| Approved By      | Management                           |
| Effective Date   | To be defined                        |
| Review Frequency | Annually or when major changes occur |

### 1. Purpose

The purpose of this policy is to define how access to Genesis Technologies systems and Orion Intelligence resources is granted, managed, reviewed, changed, and removed.

This policy helps ensure that users only access systems, data, modules, and functions required for their authorized responsibilities.

### 2. Scope

This policy applies to access for:

- Company systems
- Orion Intelligence platform
- User accounts
- Administrative accounts
- Tenant accounts
- Source code repositories
- Databases
- Infrastructure
- APIs
- Logs and audit records
- Third-party services used for business or product operations

### 3. Policy Statement

Access to Genesis Technologies systems and Orion Intelligence must be controlled based on business need, user role, tenant association, and approved authorization.

Users must not receive unnecessary, excessive, or unauthorized access.

### 4. Policy Requirements

Genesis Technologies requires that:

- Access is granted only after approval.
- Access is based on least privilege.
- Users are assigned unique accounts where applicable.
- Users must not share accounts, passwords, tokens, or OTP codes.
- Browser authentication tokens must be protected from frontend script access, must not be stored in browser local storage, and must use approved `HttpOnly`, `Secure` production, `SameSite`, path, and expiry controls.
- Repeated unsuccessful authentication attempts must be throttled using approved progressive delays.
- Sensitive account changes must require reauthentication with the current password.
- Authentication sessions must expire, be invalidated on logout, and follow the approved single-active-session control.
- Administrative access is restricted to authorized personnel.
- Production access is limited to users with approved operational responsibility.
- Database access is restricted to authorized personnel only.
- Repository access is granted only to approved developers and authorized users.
- Tenant users only access data belonging to their assigned tenant.
- Orion Intelligence module access is controlled by role and license.
- Access is updated when a user’s role or responsibility changes.
- Access is removed when no longer required.
- Access must be reviewed periodically.

### 5. Orion Intelligence Roles

Orion Intelligence uses role-based access control.

| Role       | Description                                              |
|------------|----------------------------------------------------------|
| Admin      | Platform-level administrative role                       |
| Maintainer | Tenant-level administrator role                          |
| Member     | Standard tenant user role                                |
| Analyst    | Analysis-focused role with limited administrative access |

Access assigned to each role must match the user’s responsibility and approved business need.

### 6. Access Request and Approval

Access requests should include the user, system, role, tenant, access level, and reason for access.

Access must be approved by an authorized person such as management, the Security Owner, platform administrator, tenant maintainer, or system owner.

### 7. Access Removal

Access must be removed when:

- Employment or contract ends.
- A user no longer needs access.
- A user changes role.
- A tenant user is removed.
- Access is suspected to be misused.
- Temporary access expires.
Access removal should be completed promptly.

### 8. Access Review

User access must be reviewed periodically to confirm that assigned permissions are still appropriate.

Reviews should include administrative users, tenant users, repository access, infrastructure access, database access, and third-party service access where applicable.

### 9. Roles and Responsibilities

Management is responsible for approving access control requirements.

Administrators are responsible for granting, modifying, reviewing, and removing access.

Maintainers are responsible for managing tenant-level users where permitted.

Users are responsible for protecting their accounts and using only approved access.

### 10. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 11. Policy Review

This policy must be reviewed at least annually or when major changes occur to access controls, roles, systems, infrastructure, or business operations.

### 12. Compliance

Failure to comply with this policy may result in access removal, investigation, disciplinary action, or other corrective action.

## 4.3 Password Policy

### Document Control

| Field            | Details                              |
|------------------|--------------------------------------|
| Document Name    | Password Policy                      |
| Company          | Genesis Technologies                 |
| Product / System | Orion Intelligence                   |
| Version          | 1.0                                  |
| Owner            | Management / Security Owner          |
| Approved By      | Management                           |
| Effective Date   | To be defined                        |
| Review Frequency | Annually or when major changes occur |

### 1. Purpose

The purpose of this policy is to define password and credential protection requirements for Genesis Technologies systems and the Orion Intelligence platform.

This policy helps protect user accounts, administrative access, service accounts, databases, infrastructure, and company systems from unauthorized access.

### 2. Scope

This policy applies to:

- Employee accounts
- Contractor accounts
- Orion Intelligence user accounts
- Administrative accounts
- Infrastructure accounts
- Database accounts
- Repository accounts
- Service credentials
- API keys and tokens
- Password reset processes

### 3. Policy Statement

Passwords and credentials must be protected from unauthorized access, sharing, exposure, and misuse.

Passwords must not be stored, transmitted, or handled in a way that exposes them to unauthorized users.

### 4. Policy Requirements

Genesis Technologies requires that:

- Passwords must not be shared.
- Passwords must not be stored in plain text.
- User passwords must be hashed before storage.
- Passwords must not be written in source code.
- Passwords must not be committed to repositories.
- Passwords must not be stored in frontend-accessible files.
- Default passwords must be changed before use.
- Temporary passwords must be changed where applicable.
- Strong and unique passwords should be used for company systems.
- Administrative and service credentials must be restricted to authorized personnel.
- Compromised or suspected exposed passwords must be changed promptly.
- Password reset must follow an approved process.
- Password-reset responses must not disclose whether an account or recovery credential exists.
- Password-reset tokens must be short-lived, single-use, and stored only as hashes.
- Global account-recovery keys must be generated securely, displayed only once, stored only as hashes, and invalidated when replaced.
- Current-password verification must be enforced by the backend before password, 2FA, or recovery-key changes.

### 5. Orion Intelligence Password Handling

Orion Intelligence must protect user passwords by hashing them before storage.

During login, the submitted password must be verified against the stored password hash. Plain-text passwords must not be retrievable from the database.

Orion Intelligence must apply progressive delays to repeated unsuccessful login attempts and clear the failure state after successful authentication or approved expiry.

### 6. Multi-Factor Authentication

Where supported, multi-factor authentication or two-factor authentication should be used to strengthen account security, especially for privileged or sensitive accounts. Stored authenticator secrets must be encrypted using the approved tenant-scoped encryption mechanism.

### 7. Administrative and Service Credentials

Administrative passwords, database credentials, API keys, access tokens, encryption keys, and service credentials must be protected with restricted access.

Such credentials must be managed through approved configuration or secure storage methods and must not be exposed to regular users.

### 8. Password Reset

Password reset must be performed through an approved password reset process.

Passwords must not be reset or shared through insecure channels such as public chat, plain text messages, or unauthorized communication methods.

Orion Intelligence reset links must expire after 20 minutes, be tenant-bound, be accepted only for active accounts, and be invalidated after successful use. Standard reset and recovery requests must return generic responses to prevent account enumeration.

Users are responsible for saving global recovery keys in an approved secure location. A recovery key must never be treated as a substitute for the user's password during normal login, and an old key must be discarded after rotation.

### 9. Roles and Responsibilities

Management is responsible for approving password security requirements.

Administrators are responsible for supporting account and password management.

Developers are responsible for ensuring passwords and secrets are not exposed in code, logs, or repositories.

Users are responsible for protecting their passwords and reporting suspected compromise.

### 10. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 11. Policy Review

This policy must be reviewed at least annually or when major changes occur to authentication, password handling, or account security requirements.

### 12. Compliance

Failure to comply with this policy may result in access removal, investigation, disciplinary action, or other corrective action.

## 4.4 Acceptable Use Policy

### Document Control

| Field            | Details                              |
|------------------|--------------------------------------|
| Document Name    | Acceptable Use Policy                |
| Company          | Genesis Technologies                 |
| Product / System | Orion Intelligence                   |
| Version          | 1.0                                  |
| Owner            | Management / Security Owner          |
| Approved By      | Management                           |
| Effective Date   | To be defined                        |
| Review Frequency | Annually or when major changes occur |

### 1. Purpose

The purpose of this policy is to define acceptable and prohibited use of Genesis Technologies systems, accounts, tools, infrastructure, repositories, and the Orion Intelligence platform.

This policy helps reduce misuse, unauthorized access, data exposure, service disruption, and security risk.

### 2. Scope

This policy applies to:

- Employees
- Contractors
- Developers
- Administrators
- Orion Intelligence users
- Company systems and accounts
- Source code repositories
- Infrastructure and databases
- Internal tools
- Third-party services used for company work
- Company-approved devices and networks

### 3. Policy Statement

Genesis Technologies systems and Orion Intelligence resources must be used responsibly, securely, lawfully, and only for authorized business purposes.

Users must not use company systems or product resources for unauthorized, harmful, illegal, abusive, or unethical activity.

### 4. Acceptable Use Requirements

Users must:

- Use company systems only for approved work purposes.
- Access only systems and data they are authorized to use.
- Protect credentials, tokens, OTP codes, and access keys.
- Follow company security policies.
- Handle sensitive information responsibly.
- Use approved tools and communication channels.
- Report suspected misuse, suspicious activity, or security incidents.
- Avoid actions that may disrupt system availability or performance.

### 5. Prohibited Activities

Users must not:

- Access systems, data, or tenant information without authorization.
- Attempt to bypass authentication, authorization, tenant, role, or license controls.
- Share passwords, tokens, OTP codes, API keys, or service credentials.
- Use another user’s account.
- Upload malicious or unauthorized code.
- Introduce malware, ransomware, spyware, or harmful scripts.
- Disable or bypass security controls.
- Copy or share confidential information without approval.
- Store secrets in source code or public locations.
- Use company systems for illegal, abusive, or unauthorized personal activity.
- Perform unauthorized testing, scanning, or exploitation of company systems.

### 6. Use of Orion Intelligence

Orion Intelligence must be used only for authorized cybersecurity, OSINT, threat intelligence, investigation, monitoring, analysis, and approved business purposes.

Users must use the platform according to assigned roles, tenant permissions, license access, and applicable legal or contractual requirements.

### 7. Use of Source Code and Infrastructure

Source code repositories, deployment environments, infrastructure, databases, backups, and configuration files must be accessed only by authorized personnel.

Users must not copy, modify, expose, or share source code, credentials, infrastructure access, or sensitive configuration without approval.

### 8. Monitoring and Review

Genesis Technologies may review system activity, logs, audit records, repository activity, infrastructure activity, and platform usage when required for security, operations, troubleshooting, compliance, or misuse investigation.

Monitoring must be performed by authorized personnel for legitimate business and security purposes.

### 9. Roles and Responsibilities

Management is responsible for approving acceptable use requirements.

Administrators are responsible for reviewing misuse where required.

Developers are responsible for using repositories, code, credentials, and infrastructure securely.

Users are responsible for using systems responsibly and reporting suspicious activity.

### 10. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 11. Policy Review

This policy must be reviewed at least annually or when major changes occur to company systems, Orion Intelligence, infrastructure, or acceptable use requirements.

### 12. Compliance

Failure to comply with this policy may result in access removal, investigation, disciplinary action, contract termination, or other corrective action.

## 4.5 Data Classification Policy

### Document Control

| Field            | Details                              |
|------------------|--------------------------------------|
| Document Name    | Data Classification Policy           |
| Company          | Genesis Technologies                 |
| Product / System | Orion Intelligence                   |
| Version          | 1.0                                  |
| Owner            | Management / Security Owner          |
| Approved By      | Management                           |
| Effective Date   | To be defined                        |
| Review Frequency | Annually or when major changes occur |

### 1. Purpose

The purpose of this policy is to define how Genesis Technologies classifies and protects company, customer, tenant, product, and operational data.

This policy helps ensure that data is handled according to its sensitivity, business value, and security requirements.

### 2. Scope

This policy applies to:

- Company documents
- Customer and tenant data
- Orion Intelligence records
- Investigation data
- Reports
- Logs and audit records
- Source code
- Configuration files
- Credentials and secrets
- Databases
- Backups
- Internal operational records

### 3. Policy Statement

Genesis Technologies must classify information based on sensitivity and apply appropriate handling, access, storage, sharing, and protection requirements.

Users must handle data according to its classification and must not share sensitive information without authorization.

### 4. Data Classification Levels

Genesis Technologies uses the following classification levels:

| Classification | Description                                                         |
|----------------|---------------------------------------------------------------------|
| Public         | Information approved for public release                             |
| Internal       | Information intended for internal company use                       |
| Confidential   | Sensitive business, product, customer, or tenant information        |
| Restricted     | Highly sensitive information requiring the strongest access control |

### 5. Public Data

Public data may be shared externally after approval.

Examples include approved website content, public product descriptions, public documentation, and approved announcements.

Public data must not contain credentials, internal configurations, sensitive technical details, customer information, or tenant data.

### 6. Internal Data

Internal data is intended for use within Genesis Technologies.

Examples include internal notes, project plans, process documents, non-public operational information, and internal training material.

Internal data should not be shared outside the company without approval.

### 7. Confidential Data

Confidential data is sensitive information that requires restricted access.

Examples include customer records, tenant records, investigation data, reports, audit logs, source code, non-public architecture, business agreements, and security documentation.

Confidential data must be accessed only by authorized users with a valid business need.

### 8. Restricted Data

Restricted data is highly sensitive and must be tightly controlled.

Examples include passwords, database credentials, API keys, access tokens, encryption keys, .env files, infrastructure credentials, administrative credentials, and backup access credentials.

Restricted data must be accessible only to authorized personnel who require it for approved work.

### 9. Data Handling Requirements

Genesis Technologies requires that:

- Public data is reviewed before release.
- Internal data is limited to authorized company use.
- Confidential data is shared only with authorized users.
- Restricted data is strongly protected and access-limited.
- Sensitive data is not shared through insecure channels.
- Tenant data is not disclosed to unauthorized users.
- Source code is treated as confidential information.
- Credentials and secrets are treated as restricted information.
- Data is retained, transferred, and disposed of according to approved requirements.

### 10. Roles and Responsibilities

Management is responsible for approving data classification requirements.

Administrators are responsible for controlling access to sensitive data.

Developers are responsible for protecting source code, configuration, and secrets.

Users are responsible for handling information according to its classification.

### 11. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, affected data, risk, approval, and review date.

### 12. Policy Review

This policy must be reviewed at least annually or when major changes occur to data handling, Orion Intelligence, customer requirements, or security requirements.

### 13. Compliance

Failure to comply with this policy may result in access removal, investigation, disciplinary action, contract termination, or other corrective action.

## 4.6 Incident Response Policy

### Document Control

| Field            | Details                                |
|------------------|----------------------------------------|
| Document Name    | Incident Response Policy               |
| Company          | Genesis Technologies                   |
| Product / System | Orion Intelligence                     |
| Version          | 1.0                                    |
| Owner            | Management / Security Owner            |
| Approved By      | Management                             |
| Effective Date   | To be defined                          |
| Review Frequency | Annually or when major incidents occur |

### 1. Purpose

The purpose of this policy is to define how Genesis Technologies identifies, reports, reviews, and responds to security incidents affecting company systems, Orion Intelligence, customer data, tenant data, infrastructure, source code, or business operations.

### 2. Scope

This policy applies to:

- Security incidents
- Suspicious activity
- Unauthorized access
- Data exposure
- Credential compromise
- Malware or malicious activity
- System misuse
- Infrastructure or application compromise
- Orion Intelligence platform incidents
- Third-party service incidents affecting company operations

### 3. Policy Statement

Genesis Technologies must maintain a defined approach for responding to security incidents in a timely and controlled manner.

All suspected incidents must be reported, reviewed, documented where applicable, and handled by authorized personnel.

### 4. Policy Requirements

Genesis Technologies requires that:

- Suspected incidents are reported promptly.
- Incidents are reviewed by authorized personnel.
- Incident severity is assessed based on potential impact.
- Appropriate containment actions are taken where required.
- Affected systems, users, or credentials are reviewed.
- Evidence is preserved where applicable.
- Corrective actions are assigned and tracked.
- Significant incidents are reviewed after resolution.
- Customers or tenants are notified when required by legal, contractual, or business obligations.

### 5. Incident Examples

Incidents may include:

- Unauthorized account access
- Exposed passwords, tokens, or API keys
- Access to another tenant’s data
- Malware or suspicious files
- Unauthorized infrastructure access
- Unauthorized database access
- Loss or exposure of confidential information
- Security control bypass
- Abuse or misuse of Orion Intelligence features
- Service compromise or attempted compromise

### 6. Roles and Responsibilities

Management is responsible for approving incident response requirements and supporting major incident decisions.

The Security Owner is responsible for coordinating incident review and response activities.

Administrators are responsible for reviewing access, logs, accounts, and affected systems.

Developers are responsible for fixing application-level issues related to incidents.

Users are responsible for reporting suspected incidents or suspicious activity.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or after major incidents, major platform changes, or significant changes to security requirements.

### 9. Compliance

Failure to report or properly handle security incidents may result in access removal, investigation, disciplinary action, contract termination, or other corrective action.

## 4.7 Business Continuity Policy

### Document Control

| Field            | Details                                       |
|------------------|-----------------------------------------------|
| Document Name    | Business Continuity Policy                    |
| Company          | Genesis Technologies                          |
| Product / System | Orion Intelligence                            |
| Version          | 1.0                                           |
| Owner            | Management / Security Owner                   |
| Approved By      | Management                                    |
| Effective Date   | To be defined                                 |
| Review Frequency | Annually or when major business changes occur |

### 1. Purpose

The purpose of this policy is to define Genesis Technologies’ requirements for maintaining critical business and platform operations during disruptions.

This policy supports continuity of important services, operational responsibilities, customer support, and Orion Intelligence platform activities.

### 2. Scope

This policy applies to:

- Genesis Technologies business operations
- Orion Intelligence operations
- Customer-facing services
- Critical systems and infrastructure
- Development and deployment activities
- Support and administrative activities
- Third-party services required for operations
- Employees, contractors, administrators, and developers

### 3. Policy Statement

Genesis Technologies must identify critical operations and maintain reasonable continuity measures to reduce disruption to business activities and Orion Intelligence services.

Business continuity planning must support continued operation or timely recovery of important company and product functions.

### 4. Policy Requirements

Genesis Technologies requires that:

- Critical business and platform functions are identified.
- Key personnel and responsibilities are defined.
- Important systems and dependencies are documented.
- Backup and recovery capabilities are maintained for critical systems.
- Communication responsibilities are defined for major disruptions.
- Continuity plans are reviewed when major operational changes occur.
- Disruptions are assessed based on business and customer impact.
- Recovery actions are prioritized based on criticality.

### 5. Critical Operations

Critical operations may include:

- Orion Intelligence platform availability
- Backend and frontend service operations
- Database availability
- Customer and tenant access
- Administrative access
- Security monitoring and incident response
- Backup and recovery activities
- Development and deployment support
- Customer communication where required

### 6. Roles and Responsibilities

Management is responsible for approving continuity requirements and making business-level decisions during major disruptions.

The Security Owner supports continuity planning for security-related events.

Administrators and infrastructure personnel are responsible for restoring and maintaining system operations.

Developers are responsible for supporting application-level recovery and fixes.

Employees and contractors are responsible for following continuity instructions during disruptions.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major changes occur to business operations, infrastructure, product architecture, or customer requirements.

### 9. Compliance

Failure to follow business continuity requirements may result in corrective action approved by management.

## 4.8 Disaster Recovery Policy

### Document Control

| Field            | Details                                             |
|------------------|-----------------------------------------------------|
| Document Name    | Disaster Recovery Policy                            |
| Company          | Genesis Technologies                                |
| Product / System | Orion Intelligence                                  |
| Version          | 1.0                                                 |
| Owner            | Management / Security Owner                         |
| Approved By      | Management                                          |
| Effective Date   | To be defined                                       |
| Review Frequency | Annually or when major infrastructure changes occur |

### 1. Purpose

The purpose of this policy is to define disaster recovery requirements for restoring Orion Intelligence systems, data, and services after major disruption, infrastructure failure, data loss, or system failure.

### 2. Scope

This policy applies to:

- Orion Intelligence platform services
- Production infrastructure
- Databases
- Backups
- Application services
- Docker-based services
- Deployment configuration
- Critical operational data
- Personnel involved in recovery activities

### 3. Policy Statement

Genesis Technologies must maintain disaster recovery capabilities to support restoration of critical systems and data after major incidents or service disruptions.

Recovery activities must be performed by authorized personnel using approved backups, deployment files, infrastructure access, and recovery procedures.

### 4. Policy Requirements

Genesis Technologies requires that:

- Critical systems and data are included in recovery planning.
- Backups are maintained for recovery purposes.
- Backup access is restricted to authorized personnel.
- Recovery activities are performed by authorized administrators or infrastructure personnel.
- Restored systems are validated before normal use.
- Recovery actions are documented where applicable.
- Major recovery events are reviewed after completion.
- Recovery planning is updated when significant system or infrastructure changes occur.

### 5. Recovery Priorities

Recovery priorities should consider:

- Platform availability
- Database restoration
- Backend API availability
- Frontend access
- Authentication and user access
- Administrative access
- Critical modules and services
- Logs and operational visibility
- Customer or tenant impact

### 6. Roles and Responsibilities

Management is responsible for approving disaster recovery requirements and supporting major recovery decisions.

Administrators and infrastructure personnel are responsible for restoring systems, data, services, and infrastructure.

Developers are responsible for supporting application-level recovery and resolving software issues.

The Security Owner supports review of recovery-related security risks.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major changes occur to infrastructure, backups, databases, deployment architecture, or recovery requirements.

### 9. Compliance

Failure to follow disaster recovery requirements may result in corrective action approved by management.

## 4.9 Vendor Management Policy

### Document Control

| Field            | Details                                     |
|------------------|---------------------------------------------|
| Document Name    | Vendor Management Policy                    |
| Company          | Genesis Technologies                        |
| Product / System | Orion Intelligence                          |
| Version          | 1.0                                         |
| Owner            | Management / Security Owner                 |
| Approved By      | Management                                  |
| Effective Date   | To be defined                               |
| Review Frequency | Annually or when major vendor changes occur |

### 1. Purpose

The purpose of this policy is to define how Genesis Technologies reviews and manages third-party vendors and services that support company operations, Orion Intelligence, infrastructure, development, monitoring, backups, or customer-facing services.

### 2. Scope

This policy applies to third parties used for:

- Hosting or infrastructure
- Source code repositories
- CI/CD workflows
- Monitoring
- Backups
- Communication
- Development tools
- Security tools
- Customer or tenant support
- Other services that may access, store, process, or support company data

### 3. Policy Statement

Genesis Technologies must review and manage vendors based on the type of service provided, business importance, and potential security or operational risk.

Vendors that support critical systems or have access to sensitive data must receive greater review and oversight.

### 4. Policy Requirements

Genesis Technologies requires that:

- Critical vendors are identified.
- Vendor purpose and service ownership are documented where applicable.
- Vendor access is limited to approved business needs.
- Vendors handling sensitive data are reviewed for security risk.
- Vendor accounts and credentials are protected.
- Vendor access is removed when no longer required.
- Vendor risks are reviewed periodically.
- Major vendor changes are reviewed before implementation.
- Vendor incidents affecting company systems are reviewed and addressed.

### 5. Vendor Risk Considerations

Vendor review may consider:

- Type of data accessed or processed
- Criticality to Orion Intelligence operations
- Access to infrastructure or systems
- Availability impact if the vendor fails
- Security features provided by the vendor
- Contractual or legal requirements
- Backup, monitoring, or recovery dependency
- Vendor support and reliability

### 6. Roles and Responsibilities

Management is responsible for approving vendor relationships and business-level vendor decisions.

The Security Owner is responsible for supporting vendor risk review.

Administrators are responsible for managing vendor access where applicable.

System owners are responsible for reviewing whether vendor services are still required.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major vendors, vendor access, systems, or business requirements change.

### 9. Compliance

Failure to follow vendor management requirements may result in corrective action approved by management.

## 4.10 Risk Management Policy

### Document Control

| Field            | Details                             |
|------------------|-------------------------------------|
| Document Name    | Risk Management Policy              |
| Company          | Genesis Technologies                |
| Product / System | Orion Intelligence                  |
| Version          | 1.0                                 |
| Owner            | Management / Security Owner         |
| Approved By      | Management                          |
| Effective Date   | To be defined                       |
| Review Frequency | Annually or when major risks change |

### 1. Purpose

The purpose of this policy is to define how Genesis Technologies identifies, reviews, evaluates, and manages risks that may affect company systems, Orion Intelligence, customer data, tenant data, infrastructure, security, availability, or business operations.

### 2. Scope

This policy applies to risks related to:

- Orion Intelligence platform
- Company systems
- Security controls
- Infrastructure
- Databases
- Source code
- Vendors
- Access control
- Data protection
- Availability
- Development and deployment
- Business operations

### 3. Policy Statement

Genesis Technologies must maintain a risk management approach to identify and address risks that could affect the security, reliability, availability, confidentiality, privacy, or operation of company systems and Orion Intelligence.

Risks must be reviewed based on likelihood, impact, and business importance.

### 4. Policy Requirements

Genesis Technologies requires that:

- Risks are identified from systems, processes, vendors, incidents, vulnerabilities, and operational changes.
- Risks are assessed based on likelihood and impact.
- High-priority risks are reviewed by management or the Security Owner.
- Risk treatment decisions are documented where applicable.
- Risk owners are assigned where required.
- Mitigation actions are tracked where applicable.
- Accepted risks are approved by management or authorized personnel.
- Risks are reviewed periodically.

### 5. Risk Treatment Options

Risk treatment may include:

- Mitigating the risk through controls or fixes
- Accepting the risk with approval
- Transferring the risk where appropriate
- Avoiding the risk by changing or stopping the activity

### 6. Roles and Responsibilities

Management is responsible for approving risk management requirements and accepting significant risks.

The Security Owner is responsible for coordinating risk reviews and maintaining risk-related documentation.

Administrators, developers, and infrastructure personnel are responsible for identifying and addressing risks in their areas of responsibility.

Employees and contractors are responsible for reporting risks, weaknesses, or suspicious activity when identified.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when significant business, technical, vendor, infrastructure, or security changes occur.

### 9. Compliance

Failure to follow risk management requirements may result in corrective action approved by management.

## 4.11 Cryptography and Encryption Policy

### Document Control

| Field            | Details                                       |
|------------------|-----------------------------------------------|
| Document Name    | Cryptography and Encryption Policy            |
| Company          | Genesis Technologies                          |
| Product / System | Orion Intelligence                            |
| Version          | 1.0                                           |
| Owner            | Management / Security Owner                   |
| Approved By      | Management                                    |
| Effective Date   | To be defined                                 |
| Review Frequency | Annually or when major security changes occur |

### 1. Purpose

The purpose of this policy is to define requirements for using encryption and cryptographic controls to protect sensitive Genesis Technologies and Orion Intelligence data.

### 2. Scope

This policy applies to:

- Sensitive company data
- Customer and tenant data
- User credentials
- Authentication tokens
- Encryption keys
- Database records
- Backups
- Application traffic
- Configuration secrets
- Infrastructure credentials

### 3. Policy Statement

Genesis Technologies must use approved encryption and cryptographic controls where required to protect sensitive data during storage, transmission, authentication, and system operation.

Encryption must be used in a controlled manner and managed by authorized personnel.

### 4. Policy Requirements

Genesis Technologies requires that:

- Sensitive data must be protected using approved encryption methods where applicable.
- Data transmitted over public networks must use secure communication channels.
- User passwords must not be stored in plain text.
- Passwords must be protected using secure hashing before storage.
- Encryption keys must be protected from unauthorized access.
- Secrets, keys, and credentials must not be stored in source code.
- Encryption keys must be accessible only to authorized personnel or approved systems.
- Weak or outdated cryptographic methods should not be used.
- Encryption controls should be reviewed when major system or security changes occur.

### 5. Key Protection

Encryption keys, master keys, API keys, tokens, and related secrets must be treated as restricted information.

Key-related requirements include:

- Keys must not be shared publicly.
- Keys must not be committed to repositories.
- Keys must not be exposed in frontend-accessible files.
- Key access must be limited to authorized personnel and systems.
- Suspected exposed keys must be reviewed and replaced where required.

### 6. Roles and Responsibilities

Management is responsible for approving encryption requirements.

The Security Owner is responsible for reviewing encryption-related risks and requirements.

Developers are responsible for using approved cryptographic methods and avoiding exposure of keys or secrets.

Administrators are responsible for protecting encryption-related configuration and access.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major changes occur to encryption methods, authentication, data storage, infrastructure, or security requirements.

### 9. Compliance

Failure to comply with this policy may result in access removal, investigation, disciplinary action, or other corrective action.

## 4.12 Physical Security Policy

### Document Control

| Field            | Details                                        |
|------------------|------------------------------------------------|
| Document Name    | Physical Security Policy                       |
| Company          | Genesis Technologies                           |
| Product / System | Orion Intelligence                             |
| Version          | 1.0                                            |
| Owner            | Management / Security Owner                    |
| Approved By      | Management                                     |
| Effective Date   | To be defined                                  |
| Review Frequency | Annually or when major workplace changes occur |

### 1. Purpose

The purpose of this policy is to define physical security requirements for protecting company devices, work areas, documents, and equipment used to support Genesis Technologies and Orion Intelligence operations.

### 2. Scope

This policy applies to:

- Employees
- Contractors
- Company work areas
- Company laptops and devices
- Printed documents
- Storage media
- Networking equipment
- Workstations
- Devices used to access company systems
- Devices used to support Orion Intelligence development or operations

### 3. Policy Statement

Genesis Technologies must protect company devices, workspaces, and physical assets from unauthorized access, loss, theft, damage, or misuse.

Personnel must take reasonable steps to secure devices and sensitive information in physical environments.

### 4. Policy Requirements

Genesis Technologies requires that:

- Company devices must be protected from theft, loss, and unauthorized use.
- Devices used for company work must not be left unattended in unsecured locations.
- Screens should be locked when devices are unattended.
- Sensitive documents should not be left exposed in public or shared spaces.
- Access to work areas containing sensitive systems or documents should be limited to authorized personnel.
- Lost or stolen devices must be reported promptly.
- Storage media containing sensitive data must be protected.
- Company equipment must be returned when employment or contract work ends.

### 5. Remote and Home Working

Employees and contractors working remotely must protect company devices and information from unauthorized physical access.

Remote working requirements include:

- Keep company devices secure.
- Avoid exposing sensitive information in public locations.
- Use approved devices and accounts for company work.
- Prevent unauthorized persons from accessing company systems or documents.

### 6. Roles and Responsibilities

Management is responsible for approving physical security requirements.

Employees and contractors are responsible for protecting devices, documents, and company information in their possession.

Administrators are responsible for supporting secure device and access management where applicable.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major changes occur to office use, remote work, equipment handling, or physical security requirements.

### 9. Compliance

Failure to comply with this policy may result in corrective action approved by management.

## 4.13 Remote Access Policy

### Document Control

| Field            | Details                                       |
|------------------|-----------------------------------------------|
| Document Name    | Remote Access Policy                          |
| Company          | Genesis Technologies                          |
| Product / System | Orion Intelligence                            |
| Version          | 1.0                                           |
| Owner            | Management / Security Owner                   |
| Approved By      | Management                                    |
| Effective Date   | To be defined                                 |
| Review Frequency | Annually or when remote access methods change |

### 1. Purpose

The purpose of this policy is to define requirements for secure remote access to Genesis Technologies systems, Orion Intelligence resources, repositories, infrastructure, and administrative services.

### 2. Scope

This policy applies to remote access for:

- Employees
- Contractors
- Developers
- Administrators
- Infrastructure personnel
- Source code repositories
- Orion Intelligence systems
- Production infrastructure
- Databases
- Third-party services used for company operations

### 3. Policy Statement

Remote access to Genesis Technologies systems must be authorized, secured, and limited to users with a valid business need.

Remote access must not be used in a way that exposes company systems, credentials, customer data, tenant data, or Orion Intelligence infrastructure to unauthorized access.

### 4. Policy Requirements

Genesis Technologies requires that:

- Remote access must be approved before use.
- Remote access must be limited to authorized personnel.
- Users must authenticate using approved accounts.
- Privileged remote access must be restricted.
- Credentials, tokens, and keys used for remote access must be protected.
- Remote access must not be shared with unauthorized users.
- Production access must be limited to approved operational needs.
- Remote sessions should be terminated when work is complete.
- Lost, stolen, or compromised devices used for remote access must be reported promptly.
- Remote access must be removed when no longer required.

### 5. Privileged Remote Access

Privileged remote access includes access to production systems, VPS environments, databases, deployment settings, backups, firewall rules, SSL certificates, and administrative accounts.

Privileged remote access must be granted only to authorized personnel and used only for approved maintenance, deployment, troubleshooting, security, or recovery activities.

### 6. Roles and Responsibilities

Management is responsible for approving remote access requirements.

Administrators are responsible for granting, reviewing, and removing remote access.

Developers and infrastructure personnel are responsible for protecting remote access credentials and using access only for approved work.

Users are responsible for reporting suspicious activity or suspected credential compromise.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major changes occur to remote access methods, infrastructure, access tools, or security requirements.

### 9. Compliance

Failure to comply with this policy may result in access removal, investigation, disciplinary action, contract termination, or other corrective action.

## 4.14 Change Management Policy

### Document Control

| Field            | Details                                          |
|------------------|--------------------------------------------------|
| Document Name    | Change Management Policy                         |
| Company          | Genesis Technologies                             |
| Product / System | Orion Intelligence                               |
| Version          | 1.0                                              |
| Owner            | Management / Security Owner                      |
| Approved By      | Management                                       |
| Effective Date   | To be defined                                    |
| Review Frequency | Annually or when major development changes occur |

### 1. Purpose

The purpose of this policy is to define requirements for reviewing, approving, testing, and deploying changes to Genesis Technologies systems and the Orion Intelligence platform.

### 2. Scope

This policy applies to changes involving:

- Application code
- Backend services
- Frontend application
- APIs
- Databases
- Infrastructure
- Docker and deployment configuration
- Security controls
- Dependencies
- Source code repositories
- Production systems
- Third-party service configuration

### 3. Policy Statement

Changes to company systems and Orion Intelligence must be controlled to reduce the risk of service disruption, security weakness, data loss, unauthorized modification, or operational failure.

Changes must be reviewed, tested where applicable, and approved before production deployment.

### 4. Policy Requirements

Genesis Technologies requires that:

- Changes must have a clear business or technical purpose.
- Changes must be reviewed before implementation.
- Code changes should be reviewed before merging or deployment.
- Security-impacting changes must receive appropriate review.
- Production changes must be performed by authorized personnel.
- Changes should be tested before production deployment where applicable.
- Emergency changes must be reviewed after implementation.
- Failed changes must be corrected or rolled back where possible.
- Change records should be maintained where applicable.
- Unauthorized changes are not permitted.

### 5. Change Types

Changes may include:

- Standard changes
- Normal application changes
- Infrastructure changes
- Configuration changes
- Security changes
- Emergency fixes
- Dependency updates
- Database-related changes
The level of review should match the risk and impact of the change.

### 6. Roles and Responsibilities

Management is responsible for approving change management requirements.

Developers are responsible for preparing, reviewing, testing, and documenting application changes.

Administrators and infrastructure personnel are responsible for managing infrastructure and production changes.

The Security Owner is responsible for reviewing changes that may affect security controls or risk.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major changes occur to development, deployment, infrastructure, or operational processes.

### 9. Compliance

Failure to comply with this policy may result in change rollback, access removal, investigation, disciplinary action, or other corrective action.

## 4.15 Secure Development Policy

### Document Control

| Field            | Details                                          |
|------------------|--------------------------------------------------|
| Document Name    | Secure Development Policy                        |
| Company          | Genesis Technologies                             |
| Product / System | Orion Intelligence                               |
| Version          | 1.0                                              |
| Owner            | Management / Security Owner                      |
| Approved By      | Management                                       |
| Effective Date   | To be defined                                    |
| Review Frequency | Annually or when major development changes occur |

### 1. Purpose

The purpose of this policy is to define secure development requirements for designing, building, testing, reviewing, and maintaining Genesis Technologies software and the Orion Intelligence platform.

### 2. Scope

This policy applies to:

- Developers
- Contractors involved in development
- Application code
- Backend services
- Frontend application
- APIs
- Source code repositories
- Dependencies
- Security fixes
- Development, testing, and deployment workflows

### 3. Policy Statement

Genesis Technologies must follow secure development practices to reduce security weaknesses, protect source code, prevent credential exposure, and support reliable software delivery.

Security must be considered during design, development, review, testing, and maintenance activities.

### 4. Policy Requirements

Genesis Technologies requires that:

- Source code must be stored in approved repositories.
- Code changes should be reviewed before deployment.
- Developers must not hardcode passwords, tokens, API keys, or secrets.
- Sensitive configuration must be kept separate from source code.
- Input validation and access control must be considered during development.
- Authentication and authorization logic must be protected from unauthorized changes.
- Browser authentication tokens must use approved HTTP-only cookie controls and must not be exposed through frontend-accessible storage or JSON response bodies.
- Authentication endpoints must implement approved controls for brute-force resistance and account-enumeration prevention.
- Password-reset tokens, recovery keys, and other recovery secrets must be generated securely and retained only in protected or one-way-hashed form as appropriate.
- Security-sensitive account operations must enforce authorization and reauthentication on the backend.
- Dependencies should be reviewed and updated when required.
- Identified vulnerabilities must be reviewed and remediated based on risk.
- Testing should be performed before production deployment where applicable.
- Security issues found during development must be tracked until resolved or accepted.

### 5. Source Code Protection

Source code is confidential company information and must be protected from unauthorized access, copying, modification, or disclosure.

Repository access must be limited to authorized personnel based on role and business need.

### 6. Security Review

Security review should be performed for changes that may affect:

- Authentication
- Authentication rate limiting and session-cookie handling
- Authorization
- User roles
- Tenant access
- Data protection
- API security
- Encryption
- Password reset, account recovery, and sensitive-action reauthentication
- Secrets management
- Infrastructure configuration
- Administrative functions

### 7. Roles and Responsibilities

Management is responsible for approving secure development requirements.

Developers are responsible for writing secure code, reviewing changes, protecting credentials, and fixing identified vulnerabilities.

Administrators are responsible for supporting secure repository and deployment access.

The Security Owner is responsible for supporting security review and risk-based remediation.

### 8. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 9. Policy Review

This policy must be reviewed at least annually or when major changes occur to development practices, repositories, deployment workflows, or security requirements.

### 10. Compliance

Failure to comply with this policy may result in change rejection, access removal, investigation, disciplinary action, contract termination, or other corrective action.

## 4.16 Logging and Monitoring Policy

### Document Control

| Field            | Details                                         |
|------------------|-------------------------------------------------|
| Document Name    | Logging and Monitoring Policy                   |
| Company          | Genesis Technologies                            |
| Product / System | Orion Intelligence                              |
| Version          | 1.0                                             |
| Owner            | Management / Security Owner                     |
| Approved By      | Management                                      |
| Effective Date   | To be defined                                   |
| Review Frequency | Annually or when major monitoring changes occur |

### 1. Purpose

The purpose of this policy is to define logging and monitoring requirements for Genesis Technologies systems and the Orion Intelligence platform.

This policy supports operational visibility, troubleshooting, security review, availability monitoring, and investigation of suspicious activity.

### 2. Scope

This policy applies to:

- Orion Intelligence platform activity
- Application logs
- Error and exception logs
- Audit logs
- Administrative activity
- User activity where applicable
- Infrastructure activity
- Monitoring tools
- Database and service logs
- Security-relevant events

### 3. Policy Statement

Genesis Technologies must maintain logging and monitoring practices to support system reliability, security visibility, issue investigation, and operational awareness.

Logs and monitoring data must be protected from unauthorized access and reviewed when required.

### 4. Policy Requirements

Genesis Technologies requires that:

- Important system activity should be logged where applicable.
- Application errors and exceptions should be recorded.
- Administrative activity should be logged where applicable.
- User activity should be recorded where required for audit or operational purposes.
- Logs must be accessible only to authorized personnel.
- Logs must not intentionally expose passwords, secrets, tokens, or sensitive credentials.
- Monitoring must be used to track important system availability.
- Security-relevant events must be reviewed when required.
- Log retention must follow business, operational, and security requirements.

### 5. Monitoring Requirements

Monitoring should be used to identify availability issues, service disruption, system errors, or operational failures.

Monitoring alerts should be reviewed by authorized personnel and handled based on severity and business impact.

### 6. Roles and Responsibilities

Management is responsible for approving logging and monitoring requirements.

The Security Owner is responsible for reviewing security-relevant logging requirements.

Administrators are responsible for reviewing logs, monitoring alerts, and operational issues where required.

Developers are responsible for ensuring application errors and security-relevant events are logged appropriately.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major changes occur to logging, monitoring, infrastructure, application architecture, or security requirements.

### 9. Compliance

Failure to comply with this policy may result in investigation, corrective action, access removal, or other action approved by management.

## 4.17 Backup Policy

### Document Control

| Field            | Details                                     |
|------------------|---------------------------------------------|
| Document Name    | Backup Policy                               |
| Company          | Genesis Technologies                        |
| Product / System | Orion Intelligence                          |
| Version          | 1.0                                         |
| Owner            | Management / Security Owner                 |
| Approved By      | Management                                  |
| Effective Date   | To be defined                               |
| Review Frequency | Annually or when major backup changes occur |

### 1. Purpose

The purpose of this policy is to define backup requirements for Genesis Technologies systems and the Orion Intelligence platform.

This policy supports data protection, operational recovery, disaster recovery, and reduction of data loss risk.

### 2. Scope

This policy applies to:

- Orion Intelligence production data
- Databases
- Application configuration
- Deployment-related files
- Critical operational records
- Logs and audit records where applicable
- Backups managed by hosting or infrastructure services
- Systems required to restore platform operations

### 3. Policy Statement

Genesis Technologies must maintain backups for critical systems and data required to support recovery from accidental loss, corruption, failure, or disruption.

Backup access must be restricted to authorized personnel.

### 4. Policy Requirements

Genesis Technologies requires that:

- Critical systems and data must be included in backup planning.
- Backups must be performed on a defined schedule.
- Backup access must be limited to authorized personnel.
- Backups must be protected from unauthorized access or misuse.
- Backup availability must support recovery needs.
- Backup restoration must be performed only by authorized personnel.
- Restored systems or data must be validated where applicable.
- Backup requirements must be reviewed when major system changes occur.

### 5. Backup Frequency

Orion Intelligence backups are supported through scheduled hosting-level backups and through application-level backups produced by the platform itself.

Application-level scheduled backups are controlled by the Scheduled Backup setting in System Settings. When enabled, Orion Intelligence creates a backup automatically every 3 days without administrator interaction. Administrators may also create an on-demand backup at any time from the Backup and Restore page.

Each application-level backup captures MongoDB collections, ArangoDB collections, Elasticsearch indices, application logs, and static resource files.

The platform retains only the 2 most recent backups. When a new backup would exceed that limit, the oldest existing backup is deleted automatically. This retention limit is shared between scheduled and on-demand backups, and must be accounted for when determining whether platform-managed backups alone satisfy recovery requirements. Where longer retention is required, hosting-level or off-platform backups must be used in addition to platform-managed backups.

Backup frequency and retention must be reviewed periodically to ensure they remain appropriate for business and recovery needs.

### 6. Roles and Responsibilities

Management is responsible for approving backup requirements.

Administrators and infrastructure personnel are responsible for managing backup access, recovery support, and restoration activities.

The Security Owner is responsible for reviewing backup-related security risks where applicable.

Developers may support restoration validation where application-level review is required.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major changes occur to infrastructure, databases, hosting, recovery requirements, or backup services.

### 9. Compliance

Failure to comply with this policy may result in corrective action approved by management.

## 4.18 Privacy and Data Protection Policy

### Document Control

| Field            | Details                                      |
|------------------|----------------------------------------------|
| Document Name    | Privacy and Data Protection Policy           |
| Company          | Genesis Technologies                         |
| Product / System | Orion Intelligence                           |
| Version          | 1.0                                          |
| Owner            | Management / Security Owner                  |
| Approved By      | Management                                   |
| Effective Date   | To be defined                                |
| Review Frequency | Annually or when major privacy changes occur |

### 1. Purpose

The purpose of this policy is to define privacy and data protection requirements for personal, customer, tenant, and sensitive information handled by Genesis Technologies and Orion Intelligence.

This policy helps ensure that data is collected, accessed, processed, stored, shared, retained, and protected responsibly.

### 2. Scope

This policy applies to:

- Personal data
- Customer data
- Tenant data
- User account data
- Investigation-related data
- Reports
- Logs and audit records
- Contact information
- Platform records
- Data stored, processed, or accessed through Orion Intelligence

### 3. Policy Statement

Genesis Technologies must protect personal and sensitive data from unauthorized access, disclosure, misuse, alteration, or loss.

Data must be handled only for approved business, operational, security, or product purposes.

### 4. Policy Requirements

Genesis Technologies requires that:

- Personal and sensitive data is collected only for approved purposes.
- Data access is limited to authorized users with business need.
- Tenant data is protected from unauthorized access by other tenants.
- Sensitive data is classified and handled according to its sensitivity.
- Data must not be shared externally without approval or valid business reason.
- Data must not be used for unauthorized personal purposes.
- Data must be protected during storage and transmission where applicable.
- Data retention must follow business, legal, contractual, or operational requirements.
- Data deletion or removal requests must be reviewed according to approved procedures.
- Suspected data exposure must be reported and handled as a security incident.

### 5. Data Sharing

Customer, tenant, personal, or confidential data must not be shared with unauthorized parties.

Data sharing must be approved and limited to the minimum information required for the approved purpose.

### 6. Data Retention and Disposal

Data must be retained only as long as required for business, operational, legal, contractual, security, or product purposes.

When data is no longer required, it should be deleted, archived, or disposed of according to approved requirements.

### 7. Roles and Responsibilities

Management is responsible for approving privacy and data protection requirements.

The Security Owner is responsible for supporting data protection review and incident handling.

Administrators are responsible for controlling access to sensitive data.

Developers are responsible for designing systems that protect sensitive data.

Users are responsible for handling data according to this policy.

### 8. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, affected data, risk, approval, and review date.

### 9. Policy Review

This policy must be reviewed at least annually or when major changes occur to data processing, privacy requirements, customer requirements, legal requirements, or Orion Intelligence functionality.

### 10. Compliance

Failure to comply with this policy may result in access removal, investigation, disciplinary action, contract termination, or other corrective action.

## 4.19 Mobile Device / Endpoint Security Policy

### Document Control

| Field            | Details                                       |
|------------------|-----------------------------------------------|
| Document Name    | Mobile Device / Endpoint Security Policy      |
| Company          | Genesis Technologies                          |
| Product / System | Orion Intelligence                            |
| Version          | 1.0                                           |
| Owner            | Management / Security Owner                   |
| Approved By      | Management                                    |
| Effective Date   | To be defined                                 |
| Review Frequency | Annually or when major endpoint changes occur |

### 1. Purpose

The purpose of this policy is to define security requirements for laptops, desktops, mobile devices, and other endpoints used to access Genesis Technologies systems or Orion Intelligence resources.

This policy helps reduce risks from lost devices, compromised devices, unauthorized access, malware, and data exposure.

### 2. Scope

This policy applies to:

- Employee devices
- Contractor devices
- Company laptops and desktops
- Mobile devices used for company work
- Devices used for development
- Devices used for administration
- Devices used for remote access
- Devices used to access repositories, infrastructure, databases, or Orion Intelligence

### 3. Policy Statement

Devices used to access Genesis Technologies systems must be protected from unauthorized access, misuse, malware, loss, theft, or exposure of sensitive information.

Users are responsible for protecting devices used for company work.

### 4. Policy Requirements

Genesis Technologies requires that:

- Devices used for company work must be protected with authentication.
- Devices must be locked when unattended.
- Devices must not be shared with unauthorized users.
- Lost or stolen devices must be reported promptly.
- Devices used for privileged access must be handled with additional care.
- Company data must not be stored on unauthorized devices unless approved.
- Users must avoid using insecure or untrusted devices for company access.
- Security updates should be applied where required.
- Malware or suspicious device activity must be reported.
- Company access must be removed from devices when no longer required.

### 5. Remote Work and Endpoint Use

Users working remotely must ensure that devices used for company work are protected from unauthorized physical or logical access.

Sensitive company information should not be exposed in public places, shared devices, or insecure environments.

### 6. Roles and Responsibilities

Management is responsible for approving endpoint security requirements.

Administrators are responsible for supporting endpoint access control where applicable.

Users are responsible for securing devices, reporting lost or compromised devices, and following this policy.

Developers and administrators are responsible for protecting devices used for source code, infrastructure, database, or production access.

### 7. Policy Exceptions

Exceptions to this policy must be approved by management or the Security Owner and documented with a reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major changes occur to remote work, endpoint use, device management, or access requirements.

### 9. Compliance

Failure to comply with this policy may result in access removal, investigation, disciplinary action, contract termination, or other corrective action.

## 4.20 Vulnerability Management Policy

### Document Control

| Field            | Details                                            |
|------------------|----------------------------------------------------|
| Document Name    | Vulnerability Management Policy                    |
| Company          | Genesis Technologies                               |
| Product / System | Orion Intelligence                                 |
| Version          | 1.0                                                |
| Owner            | Management / Security Owner                        |
| Approved By      | Management                                         |
| Effective Date   | To be defined                                      |
| Review Frequency | Annually or when major vulnerability changes occur |

### 1. Purpose

The purpose of this policy is to define requirements for identifying, reviewing, prioritizing, tracking, and remediating vulnerabilities that may affect Genesis Technologies systems or the Orion Intelligence platform.

### 2. Scope

This policy applies to vulnerabilities affecting:

- Application code
- Backend services
- Frontend application
- APIs
- Dependencies
- Source code repositories
- Containers
- Operating system packages
- Databases
- Infrastructure
- Third-party services
- Configuration and deployment settings

### 3. Policy Statement

Genesis Technologies must maintain a vulnerability management approach to reduce security risk across systems, applications, infrastructure, and supporting services.

Identified vulnerabilities must be reviewed, prioritized, and remediated based on severity, impact, and business risk.

### 4. Policy Requirements

Genesis Technologies requires that:

- Vulnerabilities are identified through approved review, testing, scanning, monitoring, or reporting methods.
- Vulnerabilities are assessed based on severity and potential impact.
- High-risk vulnerabilities are prioritized for remediation.
- Vulnerability remediation is assigned to appropriate owners.
- Fixes are tested where applicable before deployment.
- Vulnerabilities are tracked until resolved, accepted, or otherwise addressed.
- Accepted risks must be approved by authorized personnel.
- Vulnerability management activities must be reviewed periodically.

### 5. Remediation Requirements

Remediation may include:

- Applying security patches
- Updating vulnerable dependencies
- Fixing application code
- Updating configuration
- Restricting access
- Disabling vulnerable functionality
- Replacing insecure components
- Applying compensating controls
The selected remediation must be based on risk, business impact, and technical feasibility.

### 6. Roles and Responsibilities

Management is responsible for approving vulnerability management requirements and accepting significant risks.

The Security Owner is responsible for coordinating vulnerability review and tracking.

Developers are responsible for fixing application and dependency vulnerabilities.

Administrators and infrastructure personnel are responsible for addressing infrastructure, server, database, and configuration vulnerabilities.

Users are responsible for reporting suspected weaknesses or security concerns.

### 7. Policy Exceptions

Exceptions or accepted vulnerabilities must be approved by management or the Security Owner and documented with the reason, risk, approval, and review date.

### 8. Policy Review

This policy must be reviewed at least annually or when major changes occur to systems, infrastructure, security tools, development practices, or vulnerability management requirements.

### 9. Compliance

Failure to comply with this policy may result in investigation, corrective action, change rejection, access removal, or other action approved by management.
