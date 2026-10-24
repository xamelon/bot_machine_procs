// Operator accounts from a terminal — the way back in when nobody can sign in.
// Run from the app root (it opens the app database the way the supervisor does):
//
//   bun run users list
//   bun run users add <login> <admin|editor|viewer> [--name "Full Name"] [--password <pw>]
//   bun run users passwd <login> [--password <pw>]
//   bun run users role <login> <admin|editor|viewer>
//   bun run users disable <login> | enable <login> | signout <login>
//
// Without --password a random one is generated and printed once.
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import * as users from "./users";

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(`--${name}`); if (i < 0) return undefined; const value = args[i + 1]; args.splice(i, 2); return value; };
const name = flag("name");
let password = flag("password");
const [command, login, extra] = args;
const db = users.open(users.databasePath(resolve(process.env.APP_ROOT || process.cwd())));
const generated = () => (password ??= randomBytes(12).toString("base64url"));
const find = () => { const user = login ? users.get(db, login) : null; if (!user) throw new users.UserError(`No user ${login ?? ""}`.trim()); return user; };

try {
    switch (command) {
        case "list":
            for (const u of users.list(db)) console.log(`${u.login.padEnd(20)} ${u.role.padEnd(7)} ${u.disabled_at ? "disabled" : "active  "} ${u.name}`);
            break;
        case "add": {
            const user = await users.create(db, { login, role: extra, name, password: generated() });
            console.log(`Created ${user.login} (${user.role}). Password: ${password}`);
            break;
        }
        case "passwd":
            await users.setPassword(db, find().id, generated());
            console.log(`Password for ${login} changed, sessions signed out. Password: ${password}`);
            break;
        case "role": users.setRole(db, find().id, extra); console.log(`${login} is now ${extra}`); break;
        case "disable": users.setDisabled(db, find().id, true); console.log(`${login} disabled`); break;
        case "enable": users.setDisabled(db, find().id, false); console.log(`${login} enabled`); break;
        case "signout": users.revokeAll(db, find().id); console.log(`${login} signed out everywhere`); break;
        default:
            console.log("Usage: users list | add <login> <role> [--name N] [--password P] | passwd <login> [--password P] | role <login> <role> | disable|enable|signout <login>");
            process.exitCode = command ? 1 : 0;
    }
} catch (error) {
    if (!(error instanceof users.UserError)) throw error;
    console.error(error.message);
    process.exitCode = 1;
} finally { db.close(); }
