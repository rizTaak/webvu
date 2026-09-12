#!/usr/bin/env bash
#
# Starts the local stack. Use this rather than `docker compose up -d`.
#
# Caddy runs in a container but has to reach the API and UI dev servers, which
# run on the host. Where "the host" is depends on the Docker flavour:
#
#   Docker Desktop + WSL2   containers live in a separate VM. Neither
#                           host.docker.internal (that resolves to the Windows
#                           host) nor the compose bridge gateway reaches this
#                           distro — only the distro's own IP does, and that
#                           changes whenever WSL restarts.
#   Docker Engine on Linux  host.docker.internal works via host-gateway.
#
# So we detect it at start time instead of hardcoding it.
#
# SPEC.md § Local Development.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -z "${CADDY_UPSTREAM_HOST:-}" ]; then
  # Primary source address of this machine — the interface a container on the
  # same virtual switch can route back to.
  CADDY_UPSTREAM_HOST="$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')"
fi

if [ -z "${CADDY_UPSTREAM_HOST:-}" ]; then
  echo "Could not detect the host address; falling back to host.docker.internal" >&2
  CADDY_UPSTREAM_HOST="host.docker.internal"
fi

export CADDY_UPSTREAM_HOST
echo "Caddy will reach host services at ${CADDY_UPSTREAM_HOST}"

docker compose up -d "$@"

cat <<EOF

Stack up. Dev servers still run on the host:

  npm run dev:api     (port 3000)
  npm run dev:ui      (port 3001)

Then:
  http://webvu.localhost               product page
  http://beardbaker.webvu.localhost    seeded website
  http://localhost:8025                Mailpit
  http://localhost:9001                MinIO console
EOF
