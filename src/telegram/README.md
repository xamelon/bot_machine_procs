# Telegram adapter

## Webhook authentication and upgrading

Telegram webhooks require `credentials.webhook_secret`, installed via `setWebhook(secret_token=...)` by the connection's Provision action. The secret is random and reused on subsequent provisioning. Both `/bot/webhook/telegram/:publicId` and the legacy `/bot/webhook/telegram` route verify `X-Telegram-Bot-Api-Secret-Token`; a missing configured secret or missing/incorrect header returns 403.

**When upgrading from a version without webhook authentication, re-provision every Telegram connection.** Until provisioning succeeds, existing unauthenticated webhooks are deliberately rejected. Provisioning must be coordinated with deployment; no unauthenticated fallback is provided. Do not print or copy credentials into logs. If a webhook installation fails, retry provisioning.

Only private-chat messages and callbacks enter personal flows. Groups, supergroups, channel messages and inline-message callbacks are not supported by this adapter.

## Incoming photos

Incoming photos store only `{ type: "photo", ref: file_id }`. No `getFile` call is made while parsing. The photo input node stores this file_id rather than a download URL. A file_id belongs to its bot: reuse it only with the originating connection. To resend it, use an attachment with `ref`, not `url`.

Consumers requiring image bytes must resolve/download the file on demand using that connection. Do not persist or expose Telegram download URLs: they contain the bot token and are not permanent links. This change does not rewrite old inbox/session data; audit existing data separately without printing secrets. If a token was exposed outside trusted storage, rotate it through BotFather and re-provision.

## Callback and delivery semantics

Callbacks retain the existing `text`/`payload` parsing contract. After successful inbox insertion (including duplicate delivery), the webhook responds with the `answerCallbackQuery` method and query ID. Telegram executes this response as an API call; there is no separate network request or dependence on outgoing-message flood limits. Failed ingestion does not acknowledge the callback. Telegram does not provide the result of a method executed from the webhook response.

Inbox keys are scoped by connection: `telegram:<connection_id>:<update_id>`. Previously accepted updates used `telegram:<update_id>`; these old keys are not rewritten, so an in-flight redelivery crossing the upgrade can be accepted once more. Coordinate deployment accordingly.

Outgoing delivery supports text and a single photo. Empty text-only messages, unsupported attachments, multiple photos, invalid row sizes and oversized callback data fail permanently instead of silently dropping content or retrying forever. Callback data keeps its JSON envelope and must fit 64 UTF-8 bytes including that envelope. Telegram 400/413/422 responses also stop retries without blocking the recipient; transient errors and flood limits retain retry handling. Message/caption length and HTML validity are still checked by Telegram, not truncated locally.
