// ctx.state.procs.styles — the stylesheets, in the order the layout links them:
// the framework's leads, a module's cascades over it.
//
// `css` is the bundled sheet this process built (styles.build), kept in memory
// and served by styles.current. `http.loadRoutes` replaces these records on
// every reload, so a missing `css` only means "build on the next request".
export type State = Array<{ href: string; abs: string; key: string; css?: string }>;
