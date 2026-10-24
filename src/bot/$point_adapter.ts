// Family `bot.adapter.<channel>`.
// phase=parse: { req, body, channel } -> { input, idempotencyKey } or { response }
// webhookResponse: raw Response returned only after ingest succeeds, including duplicates (VK: plain "ok").
// phase=send:  { message } -> { ok, externalMessageId? } or { ok:false, error, retryAfter?, rateLimited? }
// API calls use bot.platformFetch: it paces requests and persists platform-wide flood pauses.
export default {
    family: true,
    calledWith: "{ phase: 'parse'|'send', req?, body?, channel?, message? }",
    answerWith: "{ input?, idempotencyKey?, webhookResponse?, response?, ok?, externalMessageId?, error?, retryAfter?, rateLimited? }",
};
