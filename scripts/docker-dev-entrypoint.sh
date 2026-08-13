#!/bin/sh
# Ensures pnpm workspace deps exist inside Docker volumes (bind mount hides image node_modules).
set -e

WORKSPACE_ROOT="${EPIC_WORKSPACE_ROOT:?EPIC_WORKSPACE_ROOT is required}"
MARKER="${WORKSPACE_ROOT}/node_modules/.docker-deps-ready"
ORIGIN="$(pwd)"

cd "${WORKSPACE_ROOT}"

if [ ! -f "${MARKER}" ]; then
  echo "Installing pnpm dependencies in ${WORKSPACE_ROOT}..."
  CI=true pnpm install --frozen-lockfile --config.confirmModulesPurge=false
  touch "${MARKER}"
fi

cd "${ORIGIN}"
exec "$@"
