# ADR 0002: Identify sample data explicitly

## Status

Accepted

## Context

Regional views need stable records during development, but presenting those records as live surveillance would be misleading.

## Decision

Every non-user regional fixture is marked as sample data. Product copy must distinguish live weather, model output, saved local records, cached results, and sample regional records.

## Consequences

- Screens remain understandable before enough local records exist.
- Automated tests can use deterministic fixtures.
- Portfolio viewers are not misled about external integrations or official coverage.
- Sample labels may be removed only when the corresponding view is backed by real, consented local data.
