# Security Policy

## Scope

`money-os` may eventually process sensitive financial data. Treat security,
privacy, and abuse prevention as first-order engineering concerns.

## Reporting

Do not open public issues for suspected vulnerabilities.

Until a dedicated contact is published, use GitHub private vulnerability
reporting for this repository once enabled.

## Secure development expectations

- Minimize collection and retention of sensitive data.
- Keep production secrets out of source control and local example files.
- Require explicit review for auth, encryption, permissions, and execution flows.
- Design for least privilege across integrations and internal services.
- Preserve audit trails for user-visible financial actions.
