# Single-project host (prototype)

Install dependencies in the app and in its `procs/` Git submodule (`bun install` in each). The submodule owns the framework and base bot admin; app-specific modules live in app `src/`.

Run from the app repository: `bun run start` (script points at `procs/supervisor/start.ts`).

The host never imports app code. It launches runtime (`APP_ROOT/src/$main.ts`) and Pi Durable as separate children, proxies HTTP, retries child crashes with backoff, and stops retrying after five unstable exits. SIGTERM shuts children down. There is no workspace provisioning or multi-project manager.

## Browser

Open `/bot/channels` on port 4100: the default bot_procs `src/ui/layout.ts` renders admin and Pi side by side. The chat can be resized or collapsed; its width and collapsed state are saved in browser storage. The flow editor stays inside the content pane. This shell is part of the application's source. `/_control/` is a standalone recovery chat independent of runtime files.

## Accounts and sign-in

Operators sign in at `/_auth/login` with a login and password; there is no shared Basic login. Accounts live in the app database (`control_users`, `control_sessions`), created and read by the supervisor itself (`supervisor/users.ts`), not by procs/migrate — it checks a session on every request, including while the runtime is down. Passwords are argon2id; a session is a random token in an HttpOnly, SameSite=Lax cookie (`bot_session`, Secure on HTTPS or the configured `PUBLIC_BASE_URL`), stored only as its SHA-256 and valid 30 days. Five failed sign-ins lock that login for that address for 15 minutes. Login and every other mutating request need a same-origin Origin header.

The first start with no accounts creates `admin` with `CONTROL_PASSWORD` or the password in `.runtime/control/password` (generated, 0600), so an existing installation signs in as before; change it at `/_auth/password`. After that those two are not read again.

Roles, enforced here: **admin** — everything, including Pi (`/_agent/*`), recovery (`/_control/*`) and accounts; **editor** — the whole bot admin, nothing under `/_agent` or `/_control`; **viewer** — the bot admin read-only (GET/HEAD only). The runtime receives the signed-in operator as `x-bot-user` (URI-encoded JSON `{id, login, name, role}`, always replaced by the supervisor) and never the session cookie; `src/$middleware.ts` puts it on `session.user`, and `team.can({ permission })` decides what the UI shows (menu cards by their `permission`, Pi only for admins).

- `/_auth/login`, `/_auth/logout` (POST), `/_auth/password` (own password; signs out other sessions), `/_auth/me`.
- `/_control/users` (admin): GET lists accounts; POST creates one; POST `/_control/users/:id/{password,role,name,disable,enable,signout}`. Form posts (the app's **Team** page, `/team`) redirect back with a notice; JSON gets JSON. The last active admin cannot be demoted or disabled. A password change or disabling ends that user's sessions.
- Locked out: `bun run users list | add <login> <role> | passwd <login> | role | disable | enable | signout` from the app root.

**Public paths** (`supervisor/public.ts`): a module opens part of itself to the outside under `/<module>/public/…` — a page a buyer opens, a provider's webhook, a bot's webhook trigger; the channel webhooks keep `/bot/webhook/…`. These need no sign-in and no Origin (a third party POSTs to them), and are anonymous by construction: no `x-bot-user` even for a signed-in admin, no session cookie, and `x-bot-access: public`, on which `session.public` makes `team.can` refuse everything and the default layout render a bare page (framework stylesheets only, no menu, Pi or scripts). The framework's static files (`/procs/ui|styles/….css|js|svg|woff2`) are readable without signing in so such a page is styled. Underscore namespaces (`/_agent`, `/_control`, `/_auth`) can never be public. A public route treats its input as hostile: verify with the provider, never trust the body.

`CONTROL_AUTH=open` turns sign-in off entirely (loudly logged). Never publish credentials in a URL. Public hosting requires HTTPS. `SUPERVISOR_HOST` defaults to loopback; Compose binds inside the container and publishes only on host loopback.

## Routes

- `/_agent/state`, `/_agent/submit`, `/_agent/abort`: authenticated Pi API.
- `/_agent/auth`, `/_agent/auth/login`, `/_agent/auth/respond`, `/_agent/auth/cancel`, `/_agent/auth/logout`: pi-ai provider login callbacks and credential status (never stored secrets).
- `/_agent/model`: persist the conversation's selected provider/model.
- `/_control/status`, `/_control/restart`: authenticated process control.
- `/bot/webhook/*`, `/<module>/public/*`: public, anonymous transport to runtime (see Public paths).
- `/procs/repl`: denied by the host proxy.
- Mutating admin/control requests require a same-origin Origin header.

## Pi

Open **Providers** in the built-in chat. Select a provider and authentication method, then Login. The UI answers `pi-ai`'s native prompts and displays its OAuth links/device codes. For remote deployments use device code or manual callback input when offered; provider-owned localhost callback servers are not published by Compose. Choose a model and click **Use model**; the choice survives worker restarts in Pi Durable. No restart is needed to login/logout.

All builtin pi-ai providers are registered; only providers with interactive login appear in the UI. Credentials are atomically stored in `.runtime/agent/auth/credentials.json` (0600, directory 0700), outside editable src and conversation history. The stable installation UUID required by ChatGPT login is in the same directory. `pi-ai` owns OAuth exchange, token refresh, login and logout. A pending login expires after 15 minutes and can be cancelled. No custom OAuth implementation or app-owned credential commands are used.

Environment credentials such as `OPENAI_API_KEY` still work; logout removes saved credentials, not environment variables. `PI_MODEL` seeds new conversations only; subsequent UI selection is durable. An unconfigured worker remains available. Tests use fake credentials/providers, with no real model call or external OAuth exchange.

History/tasks persist in `.runtime/agent/session/` using Pi Durable JSONL storage with fsync. JSONL keeps history in memory; replace it with a Bun SQLite adapter for large production sessions. The Node SQLite adapter cannot run on Bun 1.3.14.

Tools: list/read/write/edit, restricted to app src; path traversal and resolved symlink escapes are refused. TS/JS syntax is checked before saving. There is no bash, exec, runtime eval, dependency install or core-update tool. Edits hot reload through the existing framework watcher. This is NOT a full lint/typecheck/test gate, an atomic multi-file apply, or automatic code/DB rollback.

bot_procs owns the default layout, chat/Providers assets and their tests under `src/ui/`, alongside the bot admin routes under `src/bot/`. The generic component library remains under `src/procs/ui/`. An app may explicitly replace `ui/layout.ts`, but does not need a custom layout to use the coding chat. Agent tools edit application `src/` only, not the shared core submodule.

## Security boundary

Tool path checks alone are not an OS sandbox: agent-written application code executes in runtime. Locally, all processes run as the current user, so runtime can modify core through its own code. Do not describe a plain local launch as hard isolation.

Compose uses a read-only image with only src, .runtime and /tmp writable. The core submodule, supervisor and installed dependencies remain in the read-only image; only app src and app data are writable. This still shares a PID namespace/UID between children: runtime can interfere with sibling processes and read shared credentials/data. Separate users/containers and narrowly scoped secrets are required for stronger isolation. This is an operator-only development prototype, not a hostile-code execution service.

## Updates

Operator updates the application checkout, installs dependencies, runs tests, and rebuilds/recreates the image:

```
docker compose up -d --build --force-recreate
```

Only app src is bind-mounted. Shared core updates require updating the submodule gitlink and rebuilding the image. Source edits hot reload except bootstrap/lifecycle changes, which need a runtime restart. Supervisor or dependency updates require rebuilding the image. src and .runtime bind mounts survive image replacement. Pin Pi package versions (currently 1.2.0); its API is experimental. Keep storage backups before upgrades; code rollback does not imply database compatibility.

Tests from this repository: `bun test supervisor src/ui src/procs/ui/resizable.test.ts`. They cover file boundaries/syntax, auth/Origin, blocked REPL, credential persistence/refresh/logout, login callback prompts, UI secret handling, model persistence and recovery during runtime death/restart, without real credentials.
