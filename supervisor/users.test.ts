import { test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as users from "./users";

test("accounts: hashed passwords, revocable sessions, last admin kept", async () => {
    const db = users.open(":memory:");
    const admin = await users.create(db, { login: "admin", role: "admin", password: "first-password" });
    expect(admin).toMatchObject({ login: "admin", name: "admin", role: "admin", disabled_at: null });
    const stored = db.query("SELECT password_hash FROM control_users").get() as any;
    expect(stored.password_hash).toStartWith("$argon2id$");
    await expect(users.create(db, { login: "ADMIN", role: "viewer", password: "another-pass" })).rejects.toThrow("already exists");
    await expect(users.create(db, { login: "a b", role: "viewer", password: "another-pass" })).rejects.toThrow("Login");
    await expect(users.create(db, { login: "bob", role: "owner", password: "another-pass" })).rejects.toThrow("Role");
    await expect(users.create(db, { login: "bob", role: "viewer", password: "short" })).rejects.toThrow("at least");

    expect(await users.verify(db, "admin", "wrong")).toBeNull();
    expect(await users.verify(db, "nobody", "first-password")).toBeNull();
    expect((await users.verify(db, "admin", "first-password"))?.id).toBe(admin.id);

    const token = users.startSession(db, admin.id);
    expect(users.sessionUser(db, token)?.login).toBe("admin");
    expect(users.sessionUser(db, token + "x")).toBeNull();
    expect(JSON.stringify(db.query("SELECT * FROM control_sessions").all())).not.toContain(token);

    // A password change ends every session.
    await users.setPassword(db, admin.id, "second-password");
    expect(users.sessionUser(db, token)).toBeNull();
    expect(await users.verify(db, "admin", "first-password")).toBeNull();

    // The last active admin can be neither demoted nor disabled…
    expect(() => users.setRole(db, admin.id, "editor")).toThrow("last active admin");
    expect(() => users.setDisabled(db, admin.id, true)).toThrow("last active admin");
    // …but once there is another one, they can.
    const second = await users.create(db, { login: "second", role: "admin", password: "second-admin" });
    users.setRole(db, admin.id, "editor");
    expect(users.get(db, "admin")?.role).toBe("editor");

    // Disabling ends sessions and refuses sign-in.
    const t2 = users.startSession(db, admin.id);
    users.setDisabled(db, admin.id, true);
    expect(users.sessionUser(db, t2)).toBeNull();
    expect(await users.verify(db, "admin", "second-password")).toBeNull();
    users.setDisabled(db, admin.id, false);
    expect((await users.verify(db, "admin", "second-password"))?.id).toBe(admin.id);

    // An expired session is nobody.
    const t3 = users.startSession(db, second.id);
    db.query("UPDATE control_sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    expect(users.sessionUser(db, t3)).toBeNull();
    db.close();
});

test("failed sign-ins lock a login per address for a while", () => {
    const limit = users.limiter(3, 60_000);
    for (let i = 0; i < 3; i++) { expect(limit.locked("1.1.1.1", "admin")).toBe(false); limit.fail("1.1.1.1", "admin"); }
    expect(limit.locked("1.1.1.1", "Admin ")).toBe(true);
    expect(limit.locked("2.2.2.2", "admin")).toBe(false);
    limit.clear("1.1.1.1", "admin");
    expect(limit.locked("1.1.1.1", "admin")).toBe(false);
});

test("the database is the app's: DATABASE_URL, then package.json procs.prod", async () => {
    const root = await mkdtemp(join(tmpdir(), "users-db-"));
    try {
        expect(users.databasePath(root, {})).toBe(join(root, ".runtime/dev.sqlite"));
        await Bun.write(join(root, "package.json"), JSON.stringify({ procs: { prod: { "procs/db": { url: ".runtime/app.sqlite" } } } }));
        expect(users.databasePath(root, {})).toBe(join(root, ".runtime/app.sqlite"));
        expect(users.databasePath(root, { DATABASE_URL: "/data/x.sqlite" })).toBe("/data/x.sqlite");
    } finally { await rm(root, { recursive: true, force: true }); }
});
