// The `services.service.*` family — the same point libs/services declares in a
// real host, so the fixture can show a module that PROVIDES a service. `family`
// means the suffix is who answers: `$hook_services.service.greeter.ts` provides
// the service "greeter", and that is what `modules[].provides` is read from.
export default { family: true, calledWith: "{}", answerWith: "a service spec: { cmd, env?, ready? }" };
