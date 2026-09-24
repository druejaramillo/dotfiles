<!-- skills-agents: {"version":1,"id":"go-tracing-sentry","layer":"stack","scope":"project","relationship":"all","owner":"observability-maintainers","canonical":["docs/observability/sentry.md"],"review_on":["changes to Sentry SDK, tracing middleware, or telemetry data collection"],"paths":["go.mod","**/*.go"]} -->
# Go Sentry Tracing

Apply these rules when instrumenting Go with `github.com/getsentry/sentry-go`.

## Transactions And Context

- Initialize Sentry once during process startup. Configure environment, release, sampling, stack traces for non-error panics, and event scrubbing there.
- Prefer supported framework middleware or integrations for inbound HTTP transactions. Do not create a second root transaction inside an already instrumented handler.
- Without supported middleware, clone and bind a hub to the request context, continue the incoming trace with `sentry.ContinueFromRequest`, and start one `http.server` transaction. Name it with the method and route template, such as `POST /accounts/{account_id}`, never the raw URL path.
- Pass the transaction or child span context to all downstream work. Code that receives `context.Context` must use it rather than creating `context.Background()` for request-owned work.
- Finish every transaction and span exactly once. Use `defer span.Finish()` or `defer transaction.Finish()` immediately after creation unless the lifetime cannot be scoped lexically.
- Add custom spans only for meaningful business steps, uninstrumented dependencies, and detached work. Do not duplicate automatic HTTP, database, or framework instrumentation, and do not add spans around trivial helpers.
- Use low-cardinality, lowercase recognized operations: `http.server`, `http.client`, `db.query`, `template.render`, `topic.send`, `topic.process`, or `queue.process`. Keep span descriptions stable and free of identifiers, URLs, and user input.
- Use application metrics, not spans, for standalone counters, gauges, or rates that must remain valid independent of trace sampling.

```go
func callProvider(ctx context.Context, client *http.Client, request *http.Request) (*http.Response, error) {
	span := sentry.StartSpan(
		ctx,
		"http.client",
		sentry.WithDescription("POST payment provider"),
	)
	defer span.Finish()

	response, err := client.Do(request.WithContext(span.Context()))
	if err != nil {
		span.SetData("error.type", "upstream_request_failed")
		return nil, err
	}
	span.SetData("http.response.status_code", response.StatusCode)
	return response, nil
}
```

## Semantic Data

- Use current OpenTelemetry semantic-convention keys through `SetData`; use dotted keys instead of deprecated aliases. Record only data that is available without unsafe parsing or collection.
- HTTP server spans use `http.request.method`, `http.route`, and `http.response.status_code`. Client spans use `http.request.method`, `server.address`, and `http.response.status_code`; use an approved, sanitized route template rather than a raw URL when possible.
- Use `http.request.method` plus a low-cardinality route template for HTTP span names. Never use query strings, path IDs, or request bodies in a span name.
- Database spans use `db.system.name`, `db.namespace`, `db.collection.name`, `db.operation.name`, and `db.query.summary` when available. Prefer a low-cardinality query summary or operation plus target for the span name.
- Never record database parameter values. Record `db.query.text` only when it is parameterized or fully scrubbed of literal values and independently approved for collection; otherwise use `db.query.summary`.
- Messaging spans use `messaging.system`, `messaging.operation.name`, `messaging.operation.type`, and a low-cardinality `messaging.destination.template` or safe destination name. Name them as the operation plus destination template.
- Inject trace context when sending messages and extract it before consuming them. Model send, receive, and process as distinct operations; preserve the ambient trace as a link or parent according to the transport and execution model.
- Set sampling-relevant semantic attributes when creating a transaction or span, not after the work completes. Record outcomes such as response status, returned row counts, and message size only when they are safe and useful.
- Set `error.type` only for failed operations. Its value must be a predictable, low-cardinality failure class, not `err.Error()`, a response body, or a provider-generated message.

## Telemetry Data Protection

- Treat all Sentry events, breadcrumbs, tags, contexts, span data, and transaction data as externally stored telemetry.
- Never collect request or response bodies, headers, cookies, authorization values, credentials, API keys, tokens, session data, query parameter values, database parameter values, raw unsanitized SQL, direct PII, or arbitrary error text.
- Never attach email addresses, names, phone numbers, IP addresses, unapproved account identifiers, message contents, conversation identifiers, or message identifiers to telemetry.
- Redact URL credentials and sensitive query values before telemetry. Do not record raw URLs when a route template, hostname, or other low-cardinality safe representation is sufficient.
- Header and body collection is opt-in only after a documented allowlist, size limit, and redaction strategy are approved. Default to collecting neither.
- Enforce the same policy in `BeforeSend` and `BeforeSendTransaction` so automatic instrumentation and exception capture cannot bypass it.

## Errors, Panics, And Delivery

- Return errors to the caller whenever normal control flow can handle them. Capture an unexpected error once, at its final handling boundary, with the hub from the request or job context.
- Before calling `CaptureException`, ensure event scrubbing prevents error strings, causes, request data, and scope data from leaking restricted information. Do not add legacy exception span events or capture the same error at each layer as it propagates.
- Recover panics at serving and background-work boundaries with `sentry.RecoverWithContext(ctx)` or the context-bound hub. Do not use the global hub for request-scoped recovery.
- Call `sentry.Flush` only during orderly process shutdown or immediately before a process is about to exit after capture. Do not flush after each request, span, error, or long-running goroutine event.

## Goroutines And Detached Work

- Clone the current hub before a goroutine changes scope, adds context, or captures an event. Bind the clone to the goroutine context; use the clone for scope mutation and explicit capture, and use context-bound helpers for recovery rather than the global current hub.
- For work that remains part of the request, pass the request span context and bind the cloned hub to it. For work that outlives the request, create a deliberate background context and independent transaction; do not retain a cancelled request context indefinitely.
- Give every background worker its own panic recovery boundary. Do not put job payloads, user-supplied fields, or secrets in the worker scope.

```go
func runRequestOwnedWork(ctx context.Context) {
	hub := sentry.GetHubFromContext(ctx)
	if hub == nil {
		return
	}

	go func(localHub *sentry.Hub) {
		workerCtx := sentry.SetHubOnContext(ctx, localHub)
		defer sentry.RecoverWithContext(workerCtx)

		span := sentry.StartSpan(
			workerCtx,
			"function",
			sentry.WithDescription("recalculate aggregate"),
		)
		defer span.Finish()

		// Pass span.Context() to work that belongs to this request.
	}(hub.Clone())
}
```

## Review Checklist

- Confirm there is one inbound root transaction, with continued trace context and a route-normalized name.
- Confirm all custom spans represent meaningful work, have recognized low-cardinality operations, receive the parent context, and finish once.
- Confirm HTTP, database, messaging, and failure data use appropriate semantic keys without deprecated aliases or high-cardinality values.
- Confirm all raw bodies, headers, cookies, credentials, tokens, query values, direct PII, arbitrary error text, and message content are excluded or scrubbed before export.
- Confirm unexpected errors are captured once at the final boundary, panic recovery is context-bound, and flushing is reserved for process termination.
- Confirm each goroutine clones its hub before scope mutation or capture, and detached work uses an intentional independent trace lifecycle.
