// ctx.state.procs?.repl — the REPL's own state.
export type State = {
    // Automatically renewed and mirrored into .runtime/repl-token (0600).
    token?: string;
    renewing?: Promise<string>;
    renewalTimer?: ReturnType<typeof setTimeout>;
};
