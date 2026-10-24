// Family `bot.adapter.<channel>`.
// phase=parse: { req, body, channel, connection } -> { input, idempotencyKey, webhookReply? } or { response }
// webhookReply: JSON API method returned only after ingest succeeds (Telegram callback acknowledgement).
// webhookResponse: raw Response returned only after ingest succeeds, including duplicates (VK: plain "ok").
// phase=send: { message } -> { ok, externalMessageId? } or { ok:false, error, retryAfter?, rateLimited?, permanent? }
// permanent: content cannot be delivered as-is; stop retries without blocking the recipient.
// API calls use bot.platformFetch: it paces requests and persists platform-wide flood pauses.
export default {
    family: true,
    calledWith: "{ phase: 'parse'|'send', req?, body?, channel?, message? }",
    answerWith: "{ input?, idempotencyKey?, webhookReply?, webhookResponse?, response?, ok?, externalMessageId?, error?, retryAfter?, rateLimited?, permanent? }",
};
