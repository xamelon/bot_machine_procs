// The signed-in operator, set by src/$middleware.ts from the supervisor's
// `x-bot-user` header. `sub` repeats `id` for the logger (`user.id`).
// `public` marks an anonymous request to a public path: nobody, with no rights.
export type Session = {
    user?: { sub: string; id: string; login: string; name: string; role: "admin" | "editor" | "viewer" };
    public?: boolean;
};
