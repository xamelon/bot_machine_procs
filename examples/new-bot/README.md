# New bot using the shared image

Copy this directory into a new repository. No submodule, Dockerfile or app `$main.ts` is needed. The image contains the core at `/bot_machine`; this repository mounts at `/app`. Put your functions and pages under `src/app/`, with calls through `ctx.fns`.

## First start

```sh
cp .env.example .env
# For private GHCR packages: use a GitHub classic PAT with read:packages.
docker login ghcr.io
# Generate bun.lock with the same Bun version as the runtime (also works without Bun on the host).
docker compose run --rm --no-deps bot bun install
# Commit package.json and bun.lock after adding dependencies.
docker compose up -d
docker compose logs --tail 50 bot
```

Open http://localhost:4100/bot/channels (custom app page: `/app`). Login is `admin`; on first start a generated password is saved to `.runtime/control/password`. Read that file locally and change the password in the UI. Never commit `.env` or `.runtime`.

`procs.prod` in package.json specifies lifecycle modules and their configuration. SQLite, credentials, sessions and uploads stay in `.runtime/`; back it up before updates. External bot tokens and provider settings are configured separately. Production webhooks require HTTPS through a reverse proxy and an appropriate `PUBLIC_BASE_URL`. The port is bound only to loopback.

## Development and updates

`WATCH=1` enables source watching in dev mode (production mode disables watching). `AGENT_REPL=1` explicitly grants the authenticated admin's agent arbitrary runtime evaluation; it is off in this example. Agent file tools expose `src/` for edits and `core/` for read-only inspection. These are not separate applications: the core and app share one runtime and ctx.

Pin an image tag or digest, then run `docker compose pull && docker compose up -d`. The supervisor applies outstanding DB migrations. Keep a DB backup and the previous image reference for rollback. GitHub registry authentication is stored for the user running Docker commands.

This minimal example runs as root inside the container. For a dedicated host UID/GID, provide a matching user entry in the image and make the dependency volume writable; setting `user:` alone can break SSH. No host Docker socket is mounted.

Git integration is not configured in this minimal template. If enabling agent commits/pushes, initialize the bot repository, configure author identity and deploy credentials, set `REPO_ROOT`, and mount `.git/hooks` read-only. If deploy-key paths must also work on the host, mount the checkout at the same host path as well and protect hooks through both mount paths. Never bake deploy keys into the image.
