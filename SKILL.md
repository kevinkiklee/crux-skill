---
name: crux-metrics
description: Pulls Chrome User Experience Report (CrUX) metrics to get historical, real-world user experience data for URLs and origins. Do NOT use for immediate feedback on local code changes.
---

# CrUX Metrics Skill

This skill allows you to query the Chrome User Experience Report (CrUX) API for real-world field data regarding performance metrics (like LCP, CLS, INP, FCP, TTFB).

## Critical Constraints
- **Historical Data Only:** CrUX is 28-day rolling field data. **Do not use this skill to check the immediate impact of code changes.** For immediate feedback on a change you just made, use Lighthouse or a local performance tool instead.

## Authentication
This skill requires a CrUX API key. 
1. Check if the `CRUX_API_KEY` environment variable is set.
2. If it is NOT set, you MUST ask the user to provide one or set it themselves by running: `export CRUX_API_KEY="your_api_key"` in their terminal before proceeding.

## Usage
Run the Node.js script to query metrics:

```bash
node scripts/query_crux.cjs [options]
```

### Options
- `--url <url>` : Query for a specific page URL. (Mutually exclusive with origin)
- `--origin <origin>` : Query for an entire origin (e.g., `https://example.com`).
- `--form-factor <factor>` : (Optional) `DESKTOP`, `PHONE`, or `TABLET`.
- `--ect <ect>` : (Optional) Effective connection type, e.g., `4G`, `3G`.
- `--history` : (Optional) Query the History API for 25-week trend data instead of the standard 28-day snapshot.

### Example
```bash
node scripts/query_crux.cjs --url https://developer.chrome.com --form-factor DESKTOP
```