# ADR-002: Self-hosted target app with injectable defects

Status: Accepted

## Context

Public demo sites can change or go down, and we cannot break them on purpose.
That makes "my tests detect defects" impossible to prove or reproduce.

## Decision

Add a dependency-free Node app that mirrors the SauceDemo data-test contract.
Defects are switched on with the DEFECT environment variable. A runner executes
the suite once per defect and records which were caught.

## Consequences

- Defect detection is reproducible and independent of third-party uptime.
- Results describe this seeded defect set, not general bug-finding ability.
- The app must be kept in step with the page-object contract.
