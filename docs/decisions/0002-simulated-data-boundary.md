# ADR 0002: Make simulated-data boundaries visible

- **Status:** Accepted
- **Date:** 2026-08-29

## Context

Round 1 requires a convincing end-to-end demonstration before representative field datasets and production integrations are available. Hidden simulation would undermine the proposal and make validation claims unreliable.

## Decision

Every synthetic record includes a `data_source` marker. Interfaces display a “Demo data” label whenever simulated records contribute to a view or recommendation. Documentation separates implemented, mocked, and planned capabilities.

## Consequences

- Judges can distinguish the working interface from future architecture.
- Demo fixtures remain useful for repeatable testing.
- Analytics and screenshots cannot be mistaken for field evidence.

