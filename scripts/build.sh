#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm --prefix frontend ci --no-audit --no-fund
npm --prefix frontend run build
mvn -B -ntp verify
