# ADR 0001: Keep Wellfarm in one repository

## Status

Accepted

## Context

Wellfarm contains a web application, local API, shared contracts, data preparation, model training, and product documentation. Keeping these parts together makes the portfolio project easier to run, review, and evolve without premature service-repository overhead.

## Decision

Use one repository with explicit `apps`, `platform`, `services`, `packages`, `data`, `docs`, and `infrastructure` boundaries.

## Consequences

- Contracts and sample fixtures remain easy to share.
- One commit can update an API and its consumer together.
- Large data and model artifacts must remain ignored.
- Module boundaries must be maintained through documentation and imports rather than separate repositories.
