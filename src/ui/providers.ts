// pi-ai owns login/logout; these controls only answer its interaction prompts.
export default function (ctx: Context, _session: Session | null) {
    const ui = ctx.fns.procs.ui;
    const choices = (name: string, label: string) => ui.selector({ name, label, items: [{ value: "", label: "Loading…" }] });
    const body = `<div class="agent-providers asx-form">
        <form data-provider-connect>${choices("provider", "Provider")}${choices("authType", "Authentication")}
        <div>${ui.button({ label: "Login", type: "submit", size: "sm" })}${ui.button({ label: "Logout", name: "logout", variant: "ghost", size: "sm" })}</div></form>
        <p data-provider-status role="status"></p>
        <div data-provider-events></div>
        <form data-provider-prompt hidden><p data-prompt-message></p>
            ${ui.textInput({ name: "answer", label: "Login response", type: "password", autocomplete: "off" })}
            <div data-prompt-choices hidden>${choices("choice", "Choose an option")}</div>
            ${ui.button({ label: "Continue", type: "submit", size: "sm" })}
        </form>
        ${ui.button({ label: "Cancel login", name: "cancelLogin", variant: "ghost", size: "sm" }).replace("<button", "<button hidden")}
        <form data-provider-model>${choices("model", "Model")}${ui.button({ label: "Use model", type: "submit", size: "sm" })}</form>
        <p data-provider-error role="alert" hidden></p>
    </div>`;
    return ui.dialog({
        id: "llm-providers",
        title: "LLM providers",
        purpose: "form",
        body,
        trigger: ui.button({ label: "Providers", icon: "ph-plugs", variant: "ghost", size: "sm" }),
    }).replace('<dialog ', '<dialog data-providers aria-labelledby="llm-providers-title" ')
        .replace('class="asx-dialog__title"', 'id="llm-providers-title" class="asx-dialog__title"')
        + `<script src="${ui.asset({ href: "/ui/providers.js" })}" defer></script>`;
}
