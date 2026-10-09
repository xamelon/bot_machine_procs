// ctx.state.greeter — what this module collected. A loader writes into its OWN
// module's state, like any other code here: the framework owns no bucket for it.
export type State = { phrases?: Record<string, { name: string; module: string; rel: string; abs: string; resource: { text: string } }> };
