#!/bin/bash
# Using a dummy key should result in an API error but it shouldn't crash.
CRUX_API_KEY="dummy" node scripts/query_crux.cjs --url https://developer.chrome.com