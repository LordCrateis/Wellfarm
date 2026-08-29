# Application API

The API is the trusted entry point for clients and coordinates cases, users, reports, referrals, and downstream inference services.

## Planned responsibilities

- Authenticate users and enforce farmer, official, and laboratory roles.
- Accept scans through short-lived image-upload URLs.
- Validate crop, location precision, consent, and field metadata.
- Return diagnosis and referral status without exposing internal prompts or credentials.
- Serve district summaries and monthly report metadata.
- Record audit events for sensitive reads and changes.

## Initial resource outline

```text
POST /v1/scans
GET  /v1/scans/{scan_id}
GET  /v1/districts/{district_id}/summary
GET  /v1/referrals
POST /v1/referrals/{referral_id}/findings
GET  /v1/reports/monthly
```

The exact contract will be versioned in `packages/contracts` before implementation.

