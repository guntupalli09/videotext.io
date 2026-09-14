# Caddy access logs and request correlation

## Current config

- **TLS + proxy only:** `deploy/Caddyfile` terminates HTTPS and `reverse_proxy`s to `localhost:3001`. CORS (origin allowlist and `Access-Control-Allow-Headers`) is owned by Express. Do not handle `OPTIONS` in Caddy.
- **Request ID:** Optional. If you enable Caddy’s `request_id` module, use `header_up X-Request-Id {request_id}` so the API can echo it. The API also generates `x-request-id` when the header is missing.
- **Logs:** When Caddy runs non-interactively (e.g. systemd), access logs go to stderr in **JSON** by default.

## Optional: explicit JSON access log

To force JSON format and include request ID in log entries, you can add a `log` block to your server:

```caddyfile
api.videotext.io {
    request_id
    log {
        output stdout
        format json
    }
    reverse_proxy localhost:3001
}
```

Caddy’s default JSON access log includes fields such as `request_id`, `method`, `uri`, `status`, `duration`, and `size`. Check the [Caddy log directive](https://caddyserver.com/docs/caddyfile/directives/log) for the exact schema.

## Correlating with API/worker

1. From the browser or client, read the response header **x-request-id** (or use the one you sent).
2. In Caddy logs: `grep "<request_id>" /var/log/caddy/access.log` (or `jq 'select(.request_id=="<id>")'` if logs are JSON lines).
3. In API/worker logs: `grep "<request_id>"` in your structured logs (or search in Sentry by tag `request_id`).

This links a single user request across Caddy → API → worker.
