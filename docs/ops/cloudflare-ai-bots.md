# AI bot / robots policy (Cloudflare + repo)

VideoText wants **citation and retrieval** (ChatGPT, Claude, Perplexity, Copilot, Apple Intelligence search) and **does not want training** on site content.

Repo `client/public/robots.txt` allows retrieval crawlers (`GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `ClaudeBot`, `anthropic-ai`, `PerplexityBot`, `Applebot`, `bingbot`) and keeps `Content-Signal: search=yes,ai-train=no,use=reference`.

**That file is not enough.** Cloudflare prepends **Managed robots** from AI Crawl Control / bot settings. If the dashboard still `Disallow`s `GPTBot`, `ClaudeBot`, or `PerplexityBot`, those crawlers stay blocked even after this repo deploys.

Do **not** change Cloudflare via API or Wrangler unless dashboard credentials and a documented runbook exist. Use the dashboard steps below.

## Goal after the dashboard change

Live `https://videotext.io/robots.txt` should:

- **Not** `Disallow: /` for `GPTBot`, `ClaudeBot`, `PerplexityBot`, `ChatGPT-User`, `anthropic-ai`, or `Applebot`
- Keep `Content-Signal` as **ai-train=no**, **use=reference** (cite OK, train no)
- May still `Disallow` training-only / scrapers (`Google-Extended`, `Applebot-Extended`, `Bytespider`, `CCBot`)

## Dashboard steps (videotext.io zone)

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/) and open the **videotext.io** zone.

2. **AI Crawl Control** (primary control)
   1. Open **AI Crawl Control** (zone search, or **Security** → **AI Crawl Control**).
   2. Open the **Crawlers** / **Security** tab (the table of named AI crawlers).
   3. Set **Allow** for retrieval/citation crawlers:
      - **GPTBot** (OpenAI crawl)
      - **ChatGPT-User** / **OAI-SearchBot** if listed (user-initiated ChatGPT fetch / ChatGPT search)
      - **ClaudeBot** (Anthropic)
      - **PerplexityBot**
      - **Applebot** (Apple search — not Applebot-Extended)
      - Bing / Copilot stays allowed via normal search bots
   4. Training can **stay off / Block**:
      - **Google-Extended**
      - **Applebot-Extended**
      - **CCBot**, **Bytespider**, and other archive/scraper rows
   5. If a crawler has **Enforce robots.txt**, that is fine once the repo file allows retrieval bots.

3. **Bots / Bot Fight / “Block AI bots”**
   1. Go to **Security** → **Bots**.
   2. If **Block AI bots** (or a single “block all AI crawlers” toggle) is **on**, it will 403 retrieval bots regardless of `robots.txt`.
   3. Prefer the newer **category** controls if present (Search / Agent / Training):
      - **Search** (and retrieval/citation): **Allow**
      - **Training**: **Block** (or leave off)
      - **Agent**: Allow only if you want on-demand fetches (ChatGPT-User); otherwise leave default
   4. Do not turn on a blanket “block AI” rule that includes GPTBot / ClaudeBot / PerplexityBot.

4. **Managed robots.txt**
   1. After the Allow/Block changes, re-fetch `https://videotext.io/robots.txt`.
   2. The `# BEGIN Cloudflare Managed content` block should **no longer** `Disallow: /` for GPTBot, ClaudeBot, or PerplexityBot.
   3. If those `Disallow` lines remain, a crawler row is still **Block**, or another WAF custom rule is overriding AI Crawl Control.

5. **WAF conflict check** (only if crawlers are still blocked)
   1. **Security** → **Security rules** (or **WAF** → **Custom rules**).
   2. Look for an **AI Crawl Control** rule and any older “block AI user-agents” rule.
   3. Allowed crawlers must not be denied by an earlier custom rule. Do not invent new WAF rules from this repo.

## Verify

```bash
curl -sS https://videotext.io/robots.txt
```

Confirm:

- No `User-agent: GPTBot` / `ClaudeBot` / `PerplexityBot` group with `Disallow: /`
- `Content-Signal` still prefers **ai-train=no** and **use=reference**
- `/founder` and `/site-index` stay disallowed in the origin file

Optional: after 24–48 hours, AI Crawl Control → **Crawlers** should show non-zero allowed requests for GPTBot / ClaudeBot / PerplexityBot if those operators recrawl.

## Repo rules (keep in sync)

- `client/public/robots.txt` must **not** `Disallow` GPTBot, ClaudeBot, or PerplexityBot.
- Keep `Disallow: /founder` and `Disallow: /site-index`.
- Scraper `Disallow` for Bytespider / CCBot is optional and currently present.
- Origin `robots.txt` is secondary to the Cloudflare managed block until the dashboard matches.
