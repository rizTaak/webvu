# Webvu

Mini websites for small businesses. Each user gets `<slug>.webvu.io`.

`SPEC.md` is the source of truth — it is updated before code changes, per `CLAUDE.md`.

## Layout

```
packages/shared/   Zod schemas, component registry, reserved slugs — used by API and UI
webvu-api/         NestJS + TypeORM + Postgres
webvu-ui/          Next.js 16 — product page, dashboard, admin, and the site renderer
webvu-infra/       AWS CDK (not part of the npm workspace)
```

## Running locally

Everything runs on one machine. No AWS account, no Google project, no Stripe
account, and no internet connection is required — see `SPEC.md` §
Local Development for why, and what stands in for each.

**Prerequisites:** Node 22 (20 works but some packages warn), Docker.

### 1. Configuration

```bash
cp .env.example .env
cp webvu-api/.env.example webvu-api/.env
cp webvu-ui/.env.example webvu-ui/.env.local
```

Every value is a local default. Nothing in those files is a real secret.

### 2. Dependencies

```bash
npm install          # single workspace install from the repo root
npm run build:shared # webvu-api and webvu-ui both import @webvu/shared
```

### 3. Supporting services

```bash
./scripts/dev-up.sh
```

**Use this rather than `docker compose up -d`.** Caddy runs in a container but
has to reach the dev servers on the host, and on Docker Desktop + WSL2 that
address is this distro's IP, which changes whenever WSL restarts. The script
detects it. See the comments in `Caddyfile` for the full explanation.

Starts Postgres, Redis, MinIO (standing in for S3), Mailpit (SMTP sink), and
Caddy (host-based routing on port 80).

### 4. Database

```bash
cd webvu-api
npm run migration:run
npm run seed          # idempotent — safe to re-run
```

### 5. Dev servers

Two terminals, both from the repo root:

```bash
npm run dev:api   # :3000
npm run dev:ui    # :3001
```

They run on the host rather than in containers so reload stays fast. The first
API compile takes a couple of minutes on `/mnt/c` under WSL2.

> **File watching does not work reliably on `/mnt/c` under WSL2.** Windows
> drive mounts do not deliver inotify events, so Next and Nest will not notice
> new files — a route you just added will 404, and an edit may serve stale
> output. **Restart the dev server after adding or renaming files.**
>
> Note that Next renames its process once running, so `pkill -f "next dev"`
> misses it. Kill by port instead:
>
> ```bash
> ss -ltnp | grep ':3001' | grep -oP 'pid=\K[0-9]+' | xargs -r kill -9
> ```
>
> Moving the repository into the Linux filesystem (`~/repos/webvu`) restores
> normal watching and is substantially faster.

### Then

| URL | |
|---|---|
| http://webvu.localhost | Product page |
| http://beardbaker.webvu.localhost | Seeded website |
| http://lapsed.webvu.localhost | Suspended website — 404s by design |
| http://localhost:8025 | Mailpit |
| http://localhost:9001 | MinIO console (`webvu` / `webvu-local-secret`) |
| http://localhost:3000/api/docs | Swagger |

Chrome, Edge and Firefox resolve `*.localhost` to `127.0.0.1` with no
hosts-file editing.

### Optional: HTTPS

```bash
CADDY_SCHEME=https CADDY_TLS_DIRECTIVE="tls internal" ./scripts/dev-up.sh
```

Caddy issues certificates from its own local CA. Use this when working on auth
or cookies: `Secure` cookies are not set over plain http, and Google will not
register an `http://` redirect URI for a host other than `localhost`. On WSL2
the browser runs on Windows, so trust Caddy's root CA in the **Windows**
certificate store.

## Tests

```bash
npm test                              # all workspaces
cd webvu-api && npm run test:e2e      # integration, against a real Postgres
```

The integration suite creates and drops its own `webvu_test` database, so it
never touches development data.

## Current state

The walking skeleton is in place: a published website renders on its subdomain
through the full path. Of the 24 catalogue components only `hero` is built out;
the rest render as placeholders, which is by design — see `SPEC.md` §
Placeholder Rendering.

Not yet built: the dashboard and admin route trees (those hosts 404), auth,
and every entity beyond `User` and `Website`.
