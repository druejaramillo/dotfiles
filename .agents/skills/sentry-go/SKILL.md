---
name: sentry-go
description: Instrument or review Go applications using github.com/getsentry/sentry-go. Use for Sentry transactions, spans, error/panic capture, hub propagation, sampling, or telemetry data protection in Go.
---

# Sentry Go

Read the complete [Go tracing and data-protection rules](references/tracing.md)
when adding or reviewing Sentry instrumentation. Adapted from
`druejaramillo/skills/agents-md/go/tracing/sentry.md` at `123bd0f`.

1. Inspect `go.mod`, Sentry initialization, inbound middleware, and context
   propagation. Check installed SDK/integration versions before using a
   reference example.
2. Choose one transaction owner per request or job. Continue incoming traces
   when supported; add only meaningful spans not already supplied by automatic
   instrumentation. Pass the span context downstream and finish spans once.
3. Check telemetry names and attributes for cardinality and sensitive data.
   Treat events, breadcrumbs, tags, contexts, and spans as externally stored.
   Do not collect raw requests, credentials, PII, arbitrary error text, or
   query parameter values by default.
4. Capture unexpected errors once at their handling boundary. Keep panic
   recovery context-bound; clone hubs for goroutines that mutate scope or
   capture events. Do not flush per request.
5. Apply the reference's review checklist and run available Go tests/checks.
   Report any SDK-version uncertainty or unverified scrubbing and sampling.

Do not add instrumentation just to generate more traces. Do not call telemetry
safe without checking the configured scrubbers and actual attributes.
