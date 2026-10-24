// Operator accounts and their sessions, owned by the supervisor.
//
// They live in the application's own database (the `control_` prefix names the
// owner), but the supervisor creates and reads these tables itself rather than
// through procs/migrate: it checks a session on every request, including when
// the runtime is down or has not migrated yet, and it never loads app code.
//
// Passwords are argon2id (Bun.password). A session is a random token in an
// HttpOnly cookie; only its SHA-256 is stored, so the table alone opens nothing
// and a session can be revoked (logout, password change, disabling the user).
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { randomBytes, createHash } from "node:crypto";

export const ROLES = ["admin", "editor", "viewer"] as const;
export type Role = typeof ROLES[number];
export type User = { id: string; login: string; name: string; role: Role; disabled_at: string | null; created_at: string; updated_at: string };

export const SESSION_DAYS = 30;
export const MIN_PASSWORD = 8;

// The app's database, resolved the way procs/db resolves it: env DATABASE_URL
// over package.json procs.prod["procs/db"].url over the framework default,
// relative to the app root.
export function databasePath(root: string, env: Record<string, string | undefined> = process.env): string {
    let url = env.DATABASE_URL;
    if (!url) {
        try { url = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))?.procs?.prod?.["procs/db"]?.url; } catch { /* no package.json */ }
    }
    url ||= ".runtime/dev.sqlite";
    return url === ":memory:" || isAbsolute(url) ? url : resolve(root, url);
}

export function open(path: string): Database {
    if (path !== ":memory:" && !existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
    const db = new Database(path);
    // Two processes write this file; wait for the other one's lock instead of
    // failing with SQLITE_BUSY.
    db.exec("PRAGMA busy_timeout = 5000");
    ensureSchema(db);
    return db;
}

export function ensureSchema(db: Database) {
    db.exec(`CREATE TABLE IF NOT EXISTS control_users (
        id TEXT PRIMARY KEY,
        login TEXT NOT NULL UNIQUE COLLATE NOCASE,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
        password_hash TEXT NOT NULL,
        disabled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS control_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES control_users(id),
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT
    )`);
    db.exec("CREATE INDEX IF NOT EXISTS control_sessions_user ON control_sessions(user_id)");
}

const now = () => new Date().toISOString();
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const COLUMNS = "id, login, name, role, disabled_at, created_at, updated_at";

export class UserError extends Error {}

function checkLogin(login: unknown): string {
    const value = typeof login === "string" ? login.trim() : "";
    if (!/^[a-zA-Z0-9._-]{2,64}$/.test(value)) throw new UserError("Login: 2–64 characters, latin letters, digits, dot, dash or underscore");
    return value;
}
function checkRole(role: unknown): Role {
    if (!ROLES.includes(role as Role)) throw new UserError(`Role must be one of ${ROLES.join(", ")}`);
    return role as Role;
}
function checkPassword(password: unknown): string {
    if (typeof password !== "string" || password.length < MIN_PASSWORD) throw new UserError(`Password must be at least ${MIN_PASSWORD} characters`);
    if (password.length > 1024) throw new UserError("Password is too long");
    return password;
}
function checkName(name: unknown, fallback: string): string {
    const value = typeof name === "string" ? name.trim() : "";
    if (value.length > 100) throw new UserError("Name is too long");
    return value || fallback;
}

export function list(db: Database): User[] {
    return db.query(`SELECT ${COLUMNS} FROM control_users ORDER BY login`).all() as User[];
}
export function get(db: Database, idOrLogin: string): User | null {
    return (db.query(`SELECT ${COLUMNS} FROM control_users WHERE id = ? OR login = ?`).get(idOrLogin, idOrLogin) as User) ?? null;
}
export function count(db: Database): number {
    return (db.query("SELECT count(*) n FROM control_users").get() as any).n;
}

// `bootstrap` takes the existing operator password as it is: the first admin
// is created from CONTROL_PASSWORD, which predates the length rule.
export async function create(db: Database, opts: { login: unknown; name?: unknown; role: unknown; password: unknown; bootstrap?: boolean }): Promise<User> {
    const login = checkLogin(opts.login);
    const role = checkRole(opts.role);
    if (opts.bootstrap && (typeof opts.password !== "string" || !opts.password)) throw new UserError("Empty bootstrap password");
    const hash = await Bun.password.hash(opts.bootstrap ? opts.password as string : checkPassword(opts.password));
    if (get(db, login)) throw new UserError(`User ${login} already exists`);
    const id = randomBytes(8).toString("hex");
    const at = now();
    db.query("INSERT INTO control_users (id, login, name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(id, login, checkName(opts.name, login), role, hash, at, at);
    return get(db, id)!;
}

function require(db: Database, id: string): User {
    const user = get(db, id);
    if (!user) throw new UserError("No such user");
    return user;
}
// The last active admin cannot be demoted or disabled: nobody could manage
// accounts afterwards except from a terminal.
function guardLastAdmin(db: Database, user: User) {
    if (user.role !== "admin" || user.disabled_at) return;
    const admins = (db.query("SELECT count(*) n FROM control_users WHERE role = 'admin' AND disabled_at IS NULL").get() as any).n;
    if (admins <= 1) throw new UserError("This is the last active admin");
}

export async function setPassword(db: Database, id: string, password: unknown) {
    const user = require(db, id);
    const hash = await Bun.password.hash(checkPassword(password));
    db.query("UPDATE control_users SET password_hash = ?, updated_at = ? WHERE id = ?").run(hash, now(), user.id);
    revokeAll(db, user.id);
}
export function setRole(db: Database, id: string, role: unknown) {
    const user = require(db, id);
    const next = checkRole(role);
    if (next !== "admin") guardLastAdmin(db, user);
    db.query("UPDATE control_users SET role = ?, updated_at = ? WHERE id = ?").run(next, now(), user.id);
}
export function setName(db: Database, id: string, name: unknown) {
    const user = require(db, id);
    db.query("UPDATE control_users SET name = ?, updated_at = ? WHERE id = ?").run(checkName(name, user.login), now(), user.id);
}
export function setDisabled(db: Database, id: string, disabled: boolean) {
    const user = require(db, id);
    if (disabled) guardLastAdmin(db, user);
    db.query("UPDATE control_users SET disabled_at = ?, updated_at = ? WHERE id = ?").run(disabled ? now() : null, now(), user.id);
    if (disabled) revokeAll(db, user.id);
}

// A fixed hash to verify against when the login is unknown, so a wrong login
// and a wrong password take the same time.
let dummy: Promise<string> | null = null;
export async function verify(db: Database, login: unknown, password: unknown): Promise<User | null> {
    const row = typeof login === "string" ? db.query(`SELECT ${COLUMNS}, password_hash FROM control_users WHERE login = ?`).get(login.trim()) as any : null;
    const candidate = typeof password === "string" ? password.slice(0, 1024) : "";
    const ok = await Bun.password.verify(candidate, row?.password_hash ?? await (dummy ??= Bun.password.hash(randomBytes(16).toString("hex"))));
    if (!ok || !row || row.disabled_at) return null;
    const { password_hash, ...user } = row;
    return user;
}

export function startSession(db: Database, userId: string, meta: { ip?: string | null; userAgent?: string | null } = {}): string {
    const token = randomBytes(32).toString("base64url");
    const at = new Date();
    const expires = new Date(at.getTime() + SESSION_DAYS * 86400_000);
    db.query("DELETE FROM control_sessions WHERE expires_at < ?").run(at.toISOString());
    db.query("INSERT INTO control_sessions (token_hash, user_id, created_at, expires_at, last_seen_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(hashToken(token), userId, at.toISOString(), expires.toISOString(), at.toISOString(), meta.ip ?? null, (meta.userAgent ?? "").slice(0, 300) || null);
    return token;
}

// The user behind a session token, or null. `last_seen_at` is touched at most
// every ten minutes so a page full of requests is not a page full of writes.
export function sessionUser(db: Database, token: string | null | undefined): User | null {
    if (!token) return null;
    const hash = hashToken(token);
    const row = db.query(`SELECT u.id, u.login, u.name, u.role, u.disabled_at, u.created_at, u.updated_at, s.last_seen_at
        FROM control_sessions s JOIN control_users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ? AND u.disabled_at IS NULL`).get(hash, now()) as any;
    if (!row) return null;
    if (Date.now() - Date.parse(row.last_seen_at) > 10 * 60_000) db.query("UPDATE control_sessions SET last_seen_at = ? WHERE token_hash = ?").run(now(), hash);
    const { last_seen_at, ...user } = row;
    return user;
}
export function endSession(db: Database, token: string | null | undefined) {
    if (token) db.query("DELETE FROM control_sessions WHERE token_hash = ?").run(hashToken(token));
}
export function revokeAll(db: Database, userId: string) {
    db.query("DELETE FROM control_sessions WHERE user_id = ?").run(userId);
}

// Failed logins, per client address and login. Five misses lock that pair for
// fifteen minutes; a success clears it. In memory: a restart forgives.
export function limiter(max = 5, windowMs = 15 * 60_000) {
    const fails = new Map<string, { n: number; until: number }>();
    const key = (ip: string, login: string) => `${ip}|${login.trim().toLowerCase()}`;
    return {
        locked(ip: string, login: string) {
            const entry = fails.get(key(ip, login));
            if (!entry) return false;
            if (entry.until < Date.now()) { fails.delete(key(ip, login)); return false; }
            return entry.n >= max;
        },
        fail(ip: string, login: string) {
            const k = key(ip, login);
            const entry = fails.get(k);
            const fresh = !entry || entry.until < Date.now();
            fails.set(k, { n: fresh ? 1 : entry!.n + 1, until: Date.now() + windowMs });
        },
        clear(ip: string, login: string) { fails.delete(key(ip, login)); },
    };
}
