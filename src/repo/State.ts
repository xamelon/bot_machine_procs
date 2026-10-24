// The Git checkout this admin commits. Unset means the app root
// (`ctx.state.root`); tests point it at a scratch repository.
export type State = {
    root?: string;
};
