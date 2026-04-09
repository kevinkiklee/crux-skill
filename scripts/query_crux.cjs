#!/usr/bin/env node
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

async function queryHistory() {
  const endpoint = `https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${API_KEY}`;
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