#!/bin/sh
set -eu

# Run the APK list generator from the repo root and log output for cron.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/.."

cd "$REPO_ROOT"

# If node is not on PATH under cron, try a common fallback
if ! command -v node >/dev/null 2>&1; then
  if [ -x "/usr/bin/node" ]; then
    export PATH="/usr/bin:$PATH"
  elif [ -x "/usr/local/bin/node" ]; then
    export PATH="/usr/local/bin:$PATH"
  fi
fi

node ./scripts/update.js >> ./scripts/cron.log 2>&1
