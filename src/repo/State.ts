// The Git checkout this admin commits. Unset means the app root
// (`ctx.state.root`); tests point it at a scratch repository.
//
// `github` is one sign-in in progress, in this process's memory only: the
// device code while the operator authorizes, then the token while they pick a
// repository. It is dropped once the deploy key is added, on cancel, or when
// it expires — it is never written anywhere or rendered.
export type State = {
    root?: string;
    github?: {
        deviceCode: string;
        userCode: string;
        verificationUri: string;
        interval: number;
        expiresAt: number;
        token?: string;
        login?: string;
    };
};
