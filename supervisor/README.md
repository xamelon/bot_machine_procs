# Single-project host (prototype)

Install dependencies in the app and in its `procs/` Git submodule (`bun install` in each). The submodule owns the framework and base bot admin; app-specific modules live in app `src/`.

Run from the app repository: `bun run start` (script points at `procs/supervisor/start.ts`).

The host never imports app code. It launches runtime (`APP_ROOT/src/$main.ts`) and Pi Durable as separate children, proxies HTTP, retries child crashes with backoff, and stops retrying after five unstable exits. SIGTERM shuts children down. There is no workspace provisioning or multi-project manager.

## Browser

Open `/bot/channels` on port 4100: the default bot_procs `src/ui/layout.ts` renders admin and Pi side by side. The chat can be resized or collapsed; its width and collapsed state are saved in browser storage. The flow editor stays inside the content pane. This shell is part of the application's source. `/_control/` is a standalone recovery chat independent of runtime files.

Login: username `admin`; set `CONTROL_PASSWORD` or read the generated password from `.runtime/control/password` (0600). Never publish credentials in a URL. Public hosting requires HTTPS. `SUPERVISOR_HOST` defaults to loopback; Compose binds inside the container and publishes only on host loopback.

- `/_agent/state`, `/_agent/submit`, `/_agent/abort`: authenticated Pi API.
- `/_agent/auth`, `/_agent/auth/login`, `/_agent/auth/respond`, `/_agent/auth/cancel`, `/_agent/auth/logout`: pi-ai provider login callbacks and credential status (never stored secrets).
- `/_agent/model`: persist the conversation's selected provider/model.
- `/_control/status`, `/_control/restart`: authenticated process control.
- `/bot/webhook/*`: public POST transport to runtime.
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
