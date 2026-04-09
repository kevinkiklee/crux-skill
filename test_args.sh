#!/bin/bash
node scripts/query_crux.cjs
if [ $? -eq 0 ]; then
  echo "Expected to fail without URL/origin, but exited 0"
  exit 1
fi
echo "Pass"