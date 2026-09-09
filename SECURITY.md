# Security Policy

Orion Intelligence takes the security of its users, data, and services seriously. We welcome responsible reports from
security researchers and the wider community.

## Supported Code

Security fixes are applied to the current code on the `trusted-main` branch and, when applicable, the latest published
release. Older revisions, forks, and modified third-party deployments are not maintained by Orion Intelligence.

## Report a Vulnerability

Please **do not** disclose a suspected vulnerability through a public issue, discussion, pull request, or social-media
post. Submit it privately through the:

[GitHub private vulnerability reporting form](https://github.com/Orion-Intelligence/Orion-Intelligence/security/advisories/new)

Include as much of the following information as possible:

- The affected component, endpoint, feature, or configuration.
- A clear description of the vulnerability and its potential impact.
- Reproduction steps or a minimal proof of concept.
- Any required permissions, account state, or deployment conditions.
- Suggested remediation, if available.
- Your preferred contact and attribution details.

Do not include user data, credentials, access tokens, or other sensitive material beyond what is strictly necessary to
demonstrate the issue.

## Response Targets

We aim to:

- Acknowledge a new report within 8 hours.
- Validate and prioritize the report as quickly as practical.
- Provide progress updates while remediation is underway.
- Deliver a short-term mitigation for confirmed critical issues within 2 days, whenever feasible.

These are response targets rather than guarantees. Resolution time depends on severity, complexity, affected systems,
and the coordination required for a safe release.

## Scope

This policy covers security issues in:

- Code and configuration maintained in this repository.
- Orion Platform web, API, authentication, tenant-isolation, and data-processing functionality.
- Official Orion Intelligence services when testing can be performed safely and without disrupting other users.

The following are generally outside the scope of this policy:

- Vulnerabilities in unrelated third-party services or software with no demonstrated Orion-specific impact.
- Automated scanner output without a validated security impact.
- Social engineering, phishing, physical attacks, denial-of-service testing, or traffic flooding.
- Availability reports that do not involve a security vulnerability.
- Issues that require an already-compromised operating system or unsupported deployment.

## Research Guidelines

When investigating a potential vulnerability:

- Use accounts and data that you own or are explicitly authorized to test.
- Access only the minimum data required to demonstrate the issue.
- Do not modify or delete data, establish persistence, or move beyond the access needed for verification.
- Avoid actions that degrade service availability or affect other users.
- Stop testing and report immediately if you encounter sensitive or personal data.
- Keep the report confidential until a coordinated disclosure date has been agreed upon.

## Coordinated Disclosure

Once a report is validated, we:

- Reproduce the issue from the steps supplied and confirm which components, endpoints, and versions are affected.
- Share the assessed severity and the planned remediation with the reporter, and keep them updated until the fix ships.
- Agree a disclosure date with the reporter before publishing any detail, and ask that the report stay confidential
  until that date.
- Publish a GitHub security advisory once a fix or mitigation is available, listing the affected and fixed versions.
- Credit the reporter in that advisory under the name and contact they supply, or omit attribution when they ask to
  remain anonymous.

## Safe Harbor

Orion Intelligence considers research performed in good faith and in accordance with this policy to be authorized. We
will not pursue legal action against researchers for accidental, good-faith violations of this policy when they stop,
notify us promptly, and cooperate in preventing further harm. This safe harbor does not bind third parties or authorize
activity against systems and data owned by others.
