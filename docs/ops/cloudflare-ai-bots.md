# AI bot / robots policy

AI crawler access (GPTBot, ClaudeBot, Bytespider, and other managed signals) is **controlled in the Cloudflare dashboard** via Managed Content-Signals / bot management.

The repo `client/public/robots.txt` is secondary:

- Keep a single `User-agent: *` group.
- Do not add a second group that `Allow:`s bots Cloudflare `Disallow`s — that fights the edge policy and confuses operators.
- `/founder` and `/site-index` stay disallowed here.

To change AI bot policy, edit Cloudflare — do not invent API or wrangler changes from this repo unless dashboard credentials and a documented runbook exist.
