# Boundary discipline

Read when parsing external data, handling validation/errors, or wiring framework
adapters. Concentrate validation at real boundaries; keep the shell thin.

## Pattern

- **At boundaries:** parse CLI arguments, configuration, network payloads,
  external APIs, storage data, and other untrusted representations into the
  domain model. Validate what the boundary can establish and return real errors.
- **Inside:** use the constructed types and propagate errors. Avoid repeatedly
  checking a fact that the boundary and type actually established.
- **Across the boundary:** expose domain concepts, not transport, storage, or
  framework-private representations. Keep general mechanism separate from
  special-purpose boundary policy.

Keep business transformations pure where practical so they can be checked without
framework setup. Examples include parsing bytes into typed state, constructing a
prompt from structured data, and assessing/scoring a result. Mechanical shell
wiring calls that logic rather than embedding the business decisions.

## Applications and limits

Validate configuration when parsing it. Avoid redundant deep nil checks when the
boundary truly established non-nil state. A type or successful parse does not
prove every runtime fact: retain necessary nil/interface checks, security guards,
resource-error handling, and invariant enforcement that the language cannot
establish. Follow repository and language guidance rather than trusting internal
code unconditionally.

Ask whether new data is crossing a boundary, whether a previously established
fact has changed, and whether the shell can call a pure transformation. Validation
of a new threat, runtime condition, or ownership invariant is not redundant merely
because execution is internal.

Adapted from pstack's `principle-boundary-discipline` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
