# crux-metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a zero-dependency Gemini CLI skill that pulls historical and standard CrUX metrics via the CrUX API using Node.js.

**Architecture:** A lightweight Node.js script (`scripts/query_crux.cjs`) driven by a well-documented `SKILL.md` entry point. It fetches from the CrUX API using native `fetch` and formats results into LLM-friendly Markdown tables.

**Tech Stack:** Node.js (v18+), native fetch, bash.

---

### Task 1: Initialize Project and SKILL.md

**Files:**
- Create: `SKILL.md`

- [ ] **Step 1: Write the SKILL.md content**

Create the skill entry point that instructs the agent on usage, API key setup, and constraints.

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add SKILL.md
git commit -m "feat: add SKILL.md entry point"
```

---

### Task 2: Script Setup & Argument Parsing

**Files:**
- Create: `scripts/query_crux.cjs`

- [ ] **Step 1: Write the failing argument test script**

Create `test_args.sh` to test the script's basic validation.

```bash
#!/bin/bash
node scripts/query_crux.cjs
if [ $? -eq 0 ]; then
  echo "Expected to fail without URL/origin, but exited 0"
  exit 1
fi
echo "Pass"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `chmod +x test_args.sh && ./test_args.sh`
Expected: FAIL with "Cannot find module" or "Expected to fail..."

- [ ] **Step 3: Write minimal implementation**

```javascript
const args = process.argv.slice(2);
let url = null;
let origin = null;
let formFactor = null;
let ect = null;
let history = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url') url = args[++i];
  else if (args[i] === '--origin') origin = args[++i];
  else if (args[i] === '--form-factor') formFactor = args[++i];
  else if (args[i] === '--ect') ect = args[++i];
  else if (args[i] === '--history') history = true;
}

if (!url && !origin) {
  console.error("Error: You must provide either --url or --origin.");
  process.exit(1);
}

if (url && origin) {
  console.error("Error: --url and --origin are mutually exclusive.");
  process.exit(1);
}

if (!process.env.CRUX_API_KEY) {
  console.error("Error: CRUX_API_KEY environment variable is not set.");
  process.exit(1);
}

console.log("Args parsed successfully.");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./test_args.sh`
Expected: PASS (because `url` and `origin` are missing, it exits 1).

Run: `CRUX_API_KEY="test" node scripts/query_crux.cjs --url https://example.com`
Expected: `Args parsed successfully.`

- [ ] **Step 5: Commit**

```bash
git add scripts/query_crux.cjs test_args.sh
git commit -m "feat: add argument parsing and api key validation"
```

---

### Task 3: Standard API Fetch and Formatting

**Files:**
- Modify: `scripts/query_crux.cjs`

- [ ] **Step 1: Write manual mock/test instruction**

Create `test_standard.sh` to run a query (needs a real key or we just test the error output for 400 with a dummy key).

```bash
#!/bin/bash
# Using a dummy key should result in an API error but it shouldn't crash.
CRUX_API_KEY="dummy" node scripts/query_crux.cjs --url https://developer.chrome.com
```

- [ ] **Step 2: Run test to verify it fails**

Run: `chmod +x test_standard.sh && ./test_standard.sh`
Expected: "Args parsed successfully." (Not doing the fetch yet).

- [ ] **Step 3: Write minimal implementation**

Replace the `console.log("Args parsed successfully.");` in `scripts/query_crux.cjs` with the fetch logic.

```javascript
const API_KEY = process.env.CRUX_API_KEY;

function maskKey(str) {
  if (!API_KEY) return str;
  return str.split(API_KEY).join('***REDACTED***');
}

async function queryStandard() {
  const endpoint = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${API_KEY}`;
  const body = {};
  if (url) body.url = url;
  if (origin) body.origin = origin;
  if (formFactor) body.formFactor = formFactor;
  if (ect) body.effectiveConnectionType = ect;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 404) {
        console.log(`No CrUX data found for the provided ${url ? 'URL' : 'origin'}.`);
        return;
      }
      console.error(maskKey(`API Error: ${res.status} - ${JSON.stringify(data)}`));
      process.exit(1);
    }

    if (!data.record || !data.record.metrics) {
      console.log("No metrics found in the response.");
      return;
    }

    console.log(`### CrUX Standard Metrics for ${url || origin}\n`);
    console.log(`| Metric | Good % | Needs Improv. % | Poor % | p75 |`);
    console.log(`|---|---|---|---|---|`);

    for (const [metricName, metricData] of Object.entries(data.record.metrics)) {
      const bins = metricData.histogram || [];
      const good = bins[0] ? (bins[0].density * 100).toFixed(2) : 'N/A';
      const ni = bins[1] ? (bins[1].density * 100).toFixed(2) : 'N/A';
      const poor = bins[2] ? (bins[2].density * 100).toFixed(2) : 'N/A';
      const p75 = metricData.percentiles ? metricData.percentiles.p75 : 'N/A';
      
      console.log(`| **${metricName}** | ${good} | ${ni} | ${poor} | ${p75} |`);
    }

  } catch (err) {
    console.error(maskKey(`Fetch Error: ${err.message}`));
    process.exit(1);
  }
}

if (!history) {
  queryStandard();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./test_standard.sh`
Expected: Output showing "API Error: 400" with the API key `***REDACTED***`.

- [ ] **Step 5: Commit**

```bash
git add scripts/query_crux.cjs test_standard.sh
git commit -m "feat: implement standard metrics fetch and markdown formatting"
```

---

### Task 4: History API Fetch and Formatting

**Files:**
- Modify: `scripts/query_crux.cjs`

- [ ] **Step 1: Write manual mock/test instruction**

Create `test_history.sh`

```bash
#!/bin/bash
CRUX_API_KEY="dummy" node scripts/query_crux.cjs --url https://developer.chrome.com --history
```

- [ ] **Step 2: Run test to verify it fails**

Run: `chmod +x test_history.sh && ./test_history.sh`
Expected: It does nothing because the `if (history)` branch is empty.

- [ ] **Step 3: Write minimal implementation**

Append to `scripts/query_crux.cjs`:

```javascript
async function queryHistory() {
  const endpoint = `https://chromeuxreport.googleapis.com/v1/history:queryHistoryRecord?key=${API_KEY}`;
  const body = {};
  if (url) body.url = url;
  if (origin) body.origin = origin;
  if (formFactor) body.formFactor = formFactor;
  if (ect) body.effectiveConnectionType = ect;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 404) {
        console.log(`No CrUX historical data found for the provided ${url ? 'URL' : 'origin'}.`);
        return;
      }
      console.error(maskKey(`API Error: ${res.status} - ${JSON.stringify(data)}`));
      process.exit(1);
    }

    if (!data.record || !data.record.metrics) {
      console.log("No historical metrics found in the response.");
      return;
    }

    const periods = data.record.collectionPeriods.map(p => 
      `${p.firstDate.year}-${String(p.firstDate.month).padStart(2, '0')}-${String(p.firstDate.day).padStart(2, '0')}`
    );

    console.log(`### CrUX Historical Metrics (p75 Trend) for ${url || origin}\n`);
    
    // Header
    let header = `| Metric | `;
    let divider = `|---|`;
    // limit to last 5 periods for display compactness, or show all? 
    // Spec says "shows the trend of p75 values across the 25 collection periods".
    // 25 columns in markdown might be too wide, let's output all.
    for (const p of periods) {
      header += `${p} | `;
      divider += `---|`;
    }
    console.log(header);
    console.log(divider);

    for (const [metricName, metricData] of Object.entries(data.record.metrics)) {
      const p75s = metricData.percentilesTimeseries ? metricData.percentilesTimeseries.p75s : [];
      let row = `| **${metricName}** | `;
      for (const val of p75s) {
        row += `${val !== null ? val : 'N/A'} | `;
      }
      console.log(row);
    }

  } catch (err) {
    console.error(maskKey(`Fetch Error: ${err.message}`));
    process.exit(1);
  }
}

if (history) {
  queryHistory();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./test_history.sh`
Expected: Output showing "API Error: 400" with redacted key.

- [ ] **Step 5: Commit**

```bash
git add scripts/query_crux.cjs test_history.sh
git commit -m "feat: implement history metrics fetch and formatting"
```

---

### Task 5: Cleanup and Final Testing

**Files:**
- Modify: `scripts/query_crux.cjs`
- Remove: `test_args.sh`, `test_standard.sh`, `test_history.sh`

- [ ] **Step 1: Write a cleanup step**

```bash
rm test_args.sh test_standard.sh test_history.sh
```

- [ ] **Step 2: Add executable permissions**

```bash
chmod +x scripts/query_crux.cjs
```

- [ ] **Step 3: Add shebang to script**

Modify `scripts/query_crux.cjs` to add `#!/usr/bin/env node` at the very top.

```javascript
#!/usr/bin/env node
const args = process.argv.slice(2);
// ... rest of the script
```

- [ ] **Step 4: Commit**

```bash
git add scripts/query_crux.cjs
git commit -a -m "chore: cleanup test scripts and make crux script executable"
```
