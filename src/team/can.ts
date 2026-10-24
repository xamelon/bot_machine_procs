// May the current operator do this? Permissions are the strings on `$app_*.json`
// cards (`permission`) and on routes that check them. The supervisor enforces
// the hard edges itself (viewers cannot POST, only admins reach /_agent and
// /_control); this decides what the UI offers.
//
// A public request (session.public) may do nothing. No user otherwise means no
// sign-in in front of this runtime — everything is allowed.
const ROLES: Record<string, string[]> = {
    admin: ["*"],
    editor: ["bot.view", "bot.edit"],
    viewer: ["bot.view"],
};

export default function (_ctx: Context, session: Session | null, opts: { permission?: string }): boolean {
    if (session?.public) return false;
    if (!opts.permission) return true;
    const user = session?.user;
    if (!user) return true;
    const granted = ROLES[user.role] ?? [];
    return granted.includes("*") || granted.includes(opts.permission);
}
