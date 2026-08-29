# ADR 0001: Use a modular monorepo

- **Status:** Accepted
- **Date:** 2026-08-29

## Context

The prototype includes two user interfaces, several backend/ML concerns, shared schemas, and infrastructure. A six-person student team needs one discoverable place to coordinate these parts without premature service-repository overhead.

## Decision

Use a modular monorepo organized into `apps`, `services`, `packages`, `data`, `infrastructure`, and `docs`. Each module owns a README that defines its purpose and boundary. Shared contracts live in one versioned package.

## Consequences

- Architecture and ownership remain visible to the whole team.
- Prototype components can share fixtures and contracts easily.
- CI can later run only for affected modules.
- Modules must avoid hidden cross-directory imports so they can be deployed independently in the future.

