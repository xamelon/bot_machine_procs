type Step = {
    label: string;
    description?: string;
    status?: "accent" | "success" | "warning" | "error";
    optional?: boolean;
    disabled?: boolean;
    content?: string;
};

export default function (ctx: Context, _session: Session | null, opts: {
    steps: Step[]; activeStep?: number; orientation?: "horizontal" | "vertical"; density?: "compact" | "balanced" | "spacious"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const active = opts.activeStep ?? 0;
    const orientation = opts.orientation ?? "horizontal";
    const icon = (i: number, step: Step) => {
        if (i < active) return `<span class="asx-stepper__indicator" data-state="complete" data-status="${esc(step.status ?? "success")}"><i class="ph ph-check" aria-hidden="true"></i></span>`;
        if (i === active) return `<span class="asx-stepper__indicator" data-state="active" data-status="${esc(step.status ?? "accent")}"><span></span></span>`;
        return `<span class="asx-stepper__indicator" data-state="upcoming" data-status="${esc(step.status ?? "accent")}">${esc(i + 1)}</span>`;
    };
    const items = opts.steps.map((step, i) => {
        const state = i < active ? "complete" : i === active ? "active" : "upcoming";
        return `<li class="asx-stepper__step" data-state="${state}" data-status="${esc(step.status ?? "accent")}"${step.disabled ? ` aria-disabled="true"` : ""}>
            <div class="asx-stepper__rail">${icon(i, step)}</div>
            <div class="asx-stepper__main">
                <div class="asx-stepper__label-row"><span class="asx-stepper__label">${esc(step.label)}</span>${step.optional ? `<span class="asx-stepper__optional">Optional</span>` : ""}</div>
                ${step.description ? `<div class="asx-stepper__description">${esc(step.description)}</div>` : ""}
                ${step.content ? `<div class="asx-stepper__content">${step.content}</div>` : ""}
            </div>
        </li>`;
    }).join("");
    return `<ol class="asx-stepper ${esc(opts.class ?? "")}" data-orientation="${esc(orientation)}" data-density="${esc(opts.density ?? "balanced")}" aria-label="Progress">${items}</ol>`;
}
