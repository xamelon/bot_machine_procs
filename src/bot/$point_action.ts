// Family `bot.action.<name>`. A hook answers with the action result
// `{ context?, outputs?, nextNodeId?, completed? }`. Called as
// fn(ctx, null, { session, input, params }).
export default {
    family: true,
    calledWith: "{ session, input, params }",
    answerWith: "{ context?, outputs?, nextNodeId?, completed? }",
};
