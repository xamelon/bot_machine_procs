// Family `bot.adapter.<channel>`.
// phase=parse: { req, body, channel } -> { input, idempotencyKey } or { response }
// phase=send:  { message } -> { ok, externalMessageId? } or { ok:false, error, retryAfter? }
export default {
    family: true,
    calledWith: "{ phase: 'parse'|'send', req?, body?, channel?, message? }",
    answerWith: "{ input?, idempotencyKey?, response?, ok?, externalMessageId?, error?, retryAfter? }",
};
