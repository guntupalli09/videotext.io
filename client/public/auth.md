# Auth.md — VideoText Agent Authentication

> Version: 1.0.0
> Last updated: 2026-06-24
> Contact: support@videotext.io

## Overview

VideoText uses JWT-based authentication for its protected APIs. Agents can authenticate by obtaining a JWT token via the token endpoint.

## Authentication Flow

1. **Register** — `POST https://videotext.io/api/auth/signup` with `{ "email": "...", "password": "..." }`
2. **Login** — `POST https://videotext.io/api/auth/login` with `{ "email": "...", "password": "..." }`
3. **Use token** — Include the returned JWT in the `Authorization: Bearer <token>` header on subsequent API requests.

## Magic Link Authentication

Agents may also authenticate via magic link:

1. **Request link** — `POST https://videotext.io/api/auth/magic-login` with `{ "email": "..." }`
2. Follow the link sent to the email to obtain a session token.

## Discovery Endpoints

| Endpoint | Description |
|----------|-------------|
| `/.well-known/oauth-authorization-server` | OAuth 2.0 authorization server metadata |
| `/.well-known/openid-configuration` | OpenID Connect discovery metadata |
| `/.well-known/oauth-protected-resource` | Protected resource metadata |
| `/.well-known/api-catalog` | API catalog (RFC 9727) |

## Protected Resources

All `/api/*` endpoints require authentication except:

- `POST /api/auth/signup` — Registration
- `POST /api/auth/login` — Login
- `POST /api/auth/magic-login` — Magic link request
- `GET /api/health` — Health check

## Rate Limits

- Free tier: 3 video imports per month
- Pro ($7.99/mo): full transcription, subtitle, translation, batch, and delivery workflow
- Pro annual ($69.99/year): same Pro workflow, save 27% vs monthly

## Terms

- Privacy Policy: https://videotext.io/privacy
- Terms of Service: https://videotext.io/terms
