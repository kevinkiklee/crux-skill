# CrUX Metrics Skill Design

## Overview
A Gemini CLI skill (`crux-metrics`) that allows AI coding agents to pull and interpret Chrome User Experience Report (CrUX) metrics via the CrUX API. It provides historical, real-world user experience data for URLs and origins.

## Architecture
- **Skill Root Structure:** The repository root will act as the skill root to support direct installation via Git URL (`gemini skills install https://github.com/kevinkiklee/crux-skill.git`).
- **Core Components:**
  - `SKILL.md`: The main entry point instructing the agent on *when* and *how* to use the skill, emphasizing that CrUX is 28-day historical data and not suitable for immediate code change verification.
  - `scripts/query_crux.cjs`: A zero-dependency Node.js script (using native `fetch`) that queries the CrUX API and formats the output into a concise Markdown table.

## Security & Privacy
- **API Key Management:** The script strictly relies on the `CRUX_API_KEY` environment variable. It will NOT write to local `.env` files to prevent accidental commits.
- **Agent Instructions:** If the key is missing, `SKILL.md` instructs the agent to inform the user to set `export CRUX_API_KEY="your_key"` in their terminal.
- **Obfuscation:** The `query_crux.cjs` script will catch errors and intentionally mask/redact the API key from any output or stack traces before returning data to the agent.

## Implementation Details

### `scripts/query_crux.cjs`
- **Dependencies:** None. Requires Node 18+ for native `fetch`.
- **Arguments:**
  - `--url` (string) OR `--origin` (string) - Mutually exclusive.
  - `--form-factor` (string, optional) - e.g., DESKTOP, PHONE, TABLET.
  - `--ect` (string, optional) - e.g., 4G, 3G.
  - `--history` (boolean, optional) - If passed, queries the `/v1/history:queryHistory` endpoint to retrieve 25-week historical data instead of the standard 28-day rolling data.
- **Output:** A Markdown-formatted table summarizing ALL available metrics (LCP, CLS, INP, FCP, TTFB, and experimental metrics). 
  - For standard queries: shows the Good / Needs Improvement / Poor percentage breakdowns and the 75th percentile (p75) values.
  - For history queries: shows the trend of p75 values across the 25 collection periods, providing a clear view of performance changes over time.
- **Error Handling:** Gracefully handles `404` (insufficient data for origin/URL) and `429` (rate limit) errors, returning clear, LLM-friendly messages instead of raw stack traces.

### `SKILL.md`
- **Trigger:** When the user asks to check real-world performance, Core Web Vitals, or historical speed data for a live site.
- **Constraint:** Explicitly warns the agent: *"Do not use this skill to check the immediate impact of code changes. CrUX is 28-day rolling field data. For immediate feedback, use Lighthouse."*

## Testing Strategy
- Manual verification of the script using a known domain (e.g., `https://developer.chrome.com`).
- Verify error handling by querying a non-existent domain to ensure a clean 404 message.
- Verify security by forcing an invalid API key and ensuring the key is not leaked in the error output.