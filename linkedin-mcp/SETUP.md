# VideoText.io LinkedIn MCP Server — Setup Guide

## Architecture

```
Claude Code / Claude Desktop
  ↓ (MCP Protocol - stdio)
LinkedIn MCP Server
  ├── Content Generator (OpenAI GPT-4o)
  ├── Image Generator (DALL-E 3)
  ├── LinkedIn Marketing API
  └── Scheduler (node-cron)
```

## 1. LinkedIn Developer Setup

### Create a LinkedIn App

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com)
2. Click **Create App**
3. Fill in:
   - App name: `VideoText Content Bot`
   - LinkedIn Page: Select your VideoText.io company page
   - Logo: Upload VideoText logo
4. Under **Products**, request access to:
   - **Share on LinkedIn** (for posting)
   - **Marketing Developer Platform** (for analytics)
5. Under **Auth** tab, add OAuth 2.0 redirect URL:
   ```
   http://localhost:3000/callback
   ```
6. Note your **Client ID** and **Client Secret**

### Get Access Token

Run the OAuth flow to get tokens. You need these scopes:
- `w_member_social` — Post on behalf of the company
- `w_organization_social` — Post as company page
- `r_organization_social` — Read post analytics
- `rw_organization_admin` — Manage company page

Quick token generation (for development):
```bash
# 1. Open in browser:
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/callback&scope=w_member_social%20w_organization_social%20r_organization_social%20rw_organization_admin

# 2. After authorization, you'll get a code in the redirect URL

# 3. Exchange code for token:
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -d grant_type=authorization_code \
  -d code=YOUR_CODE \
  -d redirect_uri=http://localhost:3000/callback \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

### Find Your Organization ID

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR"
```

## 2. Environment Setup

```bash
cd linkedin-mcp
cp .env.example .env
# Fill in all values in .env
npm install
```

## 3. Usage

### As MCP Server (with Claude)

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "videotext-linkedin": {
      "command": "npx",
      "args": ["tsx", "/path/to/videotext.io/linkedin-mcp/src/index.ts"],
      "env": {
        "LINKEDIN_CLIENT_ID": "...",
        "LINKEDIN_CLIENT_SECRET": "...",
        "LINKEDIN_ACCESS_TOKEN": "...",
        "LINKEDIN_ORGANIZATION_ID": "...",
        "OPENAI_API_KEY": "..."
      }
    }
  }
}
```

Then in Claude you can say:
- "Generate a LinkedIn post about our speed advantage"
- "Post to LinkedIn about video accessibility"
- "Create a weekly content calendar"
- "Start the daily posting scheduler"
- "Show me our LinkedIn analytics"

### As CLI

```bash
# Preview a post
npm run generate-content

# Generate with specific theme
npx tsx src/cli.ts generate competitor-comparison

# Post immediately
npm run post-now

# Generate weekly calendar
npx tsx src/cli.ts week

# Start auto-posting (daily at 9am UTC, weekdays)
npm run schedule
```

## 4. MCP Tools Reference

| Tool | Description |
|------|-------------|
| `generate_post` | Generate a post preview (no publishing) |
| `post_to_linkedin` | Generate and publish immediately |
| `generate_weekly_calendar` | Create Mon-Fri content plan |
| `manage_scheduler` | Start/stop/status of auto-poster |
| `get_analytics` | Follower count and post metrics |
| `list_content_options` | Browse themes and hooks |

## 5. Content Themes

| ID | Name | Best For |
|----|------|----------|
| `pain-point` | Pain Point Agitation | Highest engagement |
| `social-proof` | Social Proof | Building trust |
| `education` | Educational | Shareability |
| `competitor-comparison` | Competitor Takedown | Conversion |
| `behind-the-scenes` | Build in Public | Founder brand |
| `trend-jacking` | Trend Jacking | Reach/virality |
| `use-case` | Use Case Story | ICP targeting |
| `hot-take` | Contrarian Hot Take | Comments/debate |

## 6. Customization

### Adjust Posting Schedule

In `.env`:
```bash
# Every weekday at 9am UTC
POST_SCHEDULE="0 9 * * 1-5"

# Twice daily (9am and 2pm UTC)
POST_SCHEDULE="0 9,14 * * 1-5"

# Every day including weekends
POST_SCHEDULE="0 9 * * *"
```

### Add New Themes

Edit `src/templates/content-themes.ts` — add to `CONTENT_THEMES` array.

### Add New Hooks

Edit `src/templates/content-themes.ts` — add to `VIRAL_HOOKS` array.
