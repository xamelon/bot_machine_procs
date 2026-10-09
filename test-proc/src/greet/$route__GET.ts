// The handler never reads the query: the middleware already put the answer on
// the session, and the session arrived without being passed.
export default function (_ctx: Context, session: Session, _opts: { req: Request }) {
    return { greeting: `${(session as any).greeting}, ${(session as any).who}` };
}
