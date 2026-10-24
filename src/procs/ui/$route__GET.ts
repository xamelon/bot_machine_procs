export default function (ctx: Context) {
    const b = ctx.fns.procs.ui.button({ label: "Primary", variant: "primary" });
    const s = ctx.fns.procs.ui.button({ label: "Secondary" });
    const g = ctx.fns.procs.ui.button({ label: "Ghost", variant: "ghost" });
    const d = ctx.fns.procs.ui.button({ label: "Delete", variant: "destructive" });
    const banner = ctx.fns.procs.ui.banner({ tone: "info", title: "Core kit ported", body: "React-free Astryx shape, rendered by procs." });
    const field = ctx.fns.procs.ui.field({ label: "Name", hint: "Astryx TextInput shape", control: ctx.fns.procs.ui.input({ name: "name", placeholder: "Type here" }) });
    const table = ctx.fns.procs.ui.table({ columns: [
        { key: "item", label: "Item" }, { key: "available", label: "Available" }, { key: "tag", label: "Tag", render: (row) => ctx.fns.procs.ui.badge({ label: row.tag, variant: row.tag === "Low" ? "warning" : "purple" }) },
    ], rows: [
        { id: 1, item: "Butter Croissant", available: 64, tag: "Fresh" },
        { id: 2, item: "Pancakes", available: 38, tag: "Popular" },
        { id: 3, item: "Belgian Waffle", available: 12, tag: "Low" },
    ] });
    const list = ctx.fns.procs.ui.list({ items: [
        { title: "Order #1043", description: "Placed · 1:59 pm", meta: "+$248", icon: "ph-receipt" },
        { title: "Order #1041", description: "Refunded · 12:40 pm", meta: "−$89", icon: "ph-arrow-counter-clockwise" },
    ] });
    const meta = ctx.fns.procs.ui.metadataList({ items: [
        { label: "Shipping", value: "UPS Ground" },
        { label: "Estimated arrival", value: "Tomorrow by 8pm" },
        { label: "Tracking", value: "UPS 1Z 999 AA1 0123 4567 84" },
    ] });
    const tabs = ctx.fns.procs.ui.tabs({ value: "orders", divider: true, items: [
        { label: "Overview", value: "overview", icon: "ph-house" },
        { label: "Orders", value: "orders", icon: "ph-receipt" },
        { label: "Customers", value: "customers", icon: "ph-users" },
    ] });
    const segmented = ctx.fns.procs.ui.segmentedControl({ name: "period", value: "week", items: [
        { label: "Day", value: "day" },
        { label: "Week", value: "week" },
        { label: "Month", value: "month" },
    ] });
    const toolbar = ctx.fns.procs.ui.toolbar({
        start: `<strong>Orders</strong>${ctx.fns.procs.ui.badge({ label: "Live", variant: "teal" })}`,
        center: segmented,
        end: ctx.fns.procs.ui.button({ label: "Export", variant: "secondary", icon: "ph-download-simple" }),
    });
    const selectable = `<div class="grid gap-3 md:grid-cols-3">
        ${ctx.fns.procs.ui.selectableCard({ title: "Automatic", body: "Let the bot assign conversations.", selected: true, elevation: "low" })}
        ${ctx.fns.procs.ui.selectableCard({ title: "Manual", body: "Route every message to inbox.", variant: "purple" })}
        ${ctx.fns.procs.ui.selectableCard({ title: "Priority", body: "Escalate VIP users first.", variant: "warning" })}
    </div>`;
    const status = `<div class="flex flex-wrap items-center gap-4 text-sm text-[var(--color-asx-text-secondary)]">
        <span class="inline-flex items-center gap-2">${ctx.fns.procs.ui.statusDot({ tone: "success", label: "healthy" })} Healthy</span>
        <span class="inline-flex items-center gap-2">${ctx.fns.procs.ui.statusDot({ tone: "warning", label: "delayed" })} Delayed</span>
        <span class="inline-flex items-center gap-2">${ctx.fns.procs.ui.statusDot({ tone: "error", label: "down" })} Down</span>
        <span class="inline-flex items-center gap-2">${["telegram", "vk", "max", "echo"].map(platform => ctx.fns.procs.ui.platform({ platform })).join("")}${ctx.fns.procs.ui.platform({ platform: "tg", size: "sm" })}</span>
    </div>`;
    const empty = ctx.fns.procs.ui.emptyState({ title: "No broadcasts yet", body: "Create your first campaign when you are ready.", icon: "ph-paper-plane-tilt", action: ctx.fns.procs.ui.button({ label: "New broadcast", variant: "primary" }) });
    const command = ctx.fns.procs.ui.commandMenu({ label: "Open command menu", items: [
        { label: "Create broadcast", description: "Start a new campaign", icon: "ph-paper-plane-tilt", badge: "New" },
        { label: "Invite user", description: "Send an operator invite", icon: "ph-user-plus" },
        { label: "Open inbox", description: "Review incoming messages", icon: "ph-tray" },
        { label: "Export orders", description: "Download CSV report", icon: "ph-download-simple" },
    ] });
    const multiselect = ctx.fns.procs.ui.multiselect({ name: "channels", label: "Channels", placeholder: "Pick channels", values: ["telegram", "web"], items: [
        { label: "Telegram", value: "telegram", description: "Bot conversations" },
        { label: "Web chat", value: "web", description: "Site widget" },
        { label: "Email", value: "email", description: "Support mailbox" },
        { label: "WhatsApp", value: "whatsapp", description: "Business account" },
    ] });
    const dialog = ctx.fns.procs.ui.dialog({ id: "asx-demo-dialog", title: "Archive conversation?", body: "This keeps the transcript searchable and removes it from the active inbox.", trigger: ctx.fns.procs.ui.button({ label: "Open dialog", variant: "secondary", icon: "ph-square-half" }), actions: `<button class="asx-button" data-variant="ghost" data-size="md" type="button" data-asx-dialog-close>Cancel</button>${ctx.fns.procs.ui.button({ label: "Archive", variant: "primary" })}` });
    const dropdown = ctx.fns.procs.ui.dropdownMenu({ label: "More actions", icon: "ph-dots-three", items: [
        { label: "Assign", description: "Move to an operator", icon: "ph-user-plus" },
        { label: "Mark unread", icon: "ph-envelope-simple" },
        { divider: true },
        { label: "Delete", icon: "ph-trash", danger: true },
    ] });
    const toast = ctx.fns.procs.ui.toast({ label: "Show toast", message: "Settings saved", type: "success", action: "Undo" });
    const powerSearch = ctx.fns.procs.ui.powerSearch({ name: "query", placeholder: "Search conversations…", filters: [
        { field: "status", operator: "is", value: "open" },
        { field: "assignee", operator: "contains", value: "Masha" },
    ], fields: [
        { key: "status", label: "Status", icon: "ph-circle-half", operators: [
            { key: "is", label: "is", type: "select", options: [{ label: "Open", value: "open" }, { label: "Closed", value: "closed" }, { label: "Pending", value: "pending" }] },
            { key: "is_not", label: "is not", type: "select", options: [{ label: "Open", value: "open" }, { label: "Closed", value: "closed" }, { label: "Pending", value: "pending" }] },
        ] },
        { key: "assignee", label: "Assignee", icon: "ph-user", operators: [{ key: "contains", label: "contains", type: "text" }, { key: "is_empty", label: "is empty", type: "empty" }] },
        { key: "priority", label: "Priority", icon: "ph-warning", operators: [{ key: "is", label: "is", type: "select", options: [{ label: "Low", value: "low" }, { label: "Medium", value: "medium" }, { label: "High", value: "high" }] }] },
        { key: "tags", label: "Tags", icon: "ph-tag", operators: [{ key: "include", label: "include", type: "string_list" }] },
        { key: "channel", label: "Channel", icon: "ph-link", operators: [{ key: "in", label: "in", type: "enum_list", options: [{ label: "Telegram", value: "telegram" }, { label: "Web", value: "web" }, { label: "Email", value: "email" }] }] },
        { key: "customer", label: "Customer", icon: "ph-user", operators: [{ key: "is", label: "is", type: "entity_list", options: [{ label: "Alice", value: "alice" }, { label: "Bob", value: "bob" }, { label: "Charlie", value: "charlie" }] }] },
        { key: "created", label: "Created", icon: "ph-calendar", operators: [{ key: "after", label: "after", type: "date" }, { key: "between", label: "between", type: "date_range" }] },
    ] });
    const choice = `<div class="grid gap-4 md:grid-cols-2">
        ${ctx.fns.procs.ui.selector({ name: "assignee", label: "Selector", value: "masha", items: [
            { label: "Masha", value: "masha", description: "Online", icon: "ph-user" },
            { label: "Roma", value: "roma", description: "Away", icon: "ph-user" },
            { label: "Support queue", value: "queue", description: "Round-robin", icon: "ph-users" },
        ] })}
        ${ctx.fns.procs.ui.typeahead({ name: "customer", label: "Typeahead", placeholder: "Find customer…", items: [
            { label: "Alice Johnson", value: "alice", description: "alice@example.com", icon: "ph-user-circle" },
            { label: "Bob Smith", value: "bob", description: "bob@example.com", icon: "ph-user-circle" },
            { label: "Charlie Chen", value: "charlie", description: "charlie@example.com", icon: "ph-user-circle" },
        ] })}
    </div>`;
    const formControls = `<div class="grid gap-4 md:grid-cols-2">
        <div class="grid gap-3">
            ${ctx.fns.procs.ui.switch({ name: "auto", label: "Auto assignment", description: "Route new chats automatically", checked: true })}
            ${ctx.fns.procs.ui.checkboxInput({ name: "notify", label: "Notify operators", description: "Send alerts for high priority chats", checked: true })}
        </div>
        ${ctx.fns.procs.ui.radioList({ name: "sla", value: "standard", items: [
            { label: "Fast", value: "fast", description: "Reply within 5 minutes" },
            { label: "Standard", value: "standard", description: "Reply within 1 hour" },
            { label: "Batch", value: "batch", description: "Process later" },
        ] })}
    </div>`;
    const pagination = ctx.fns.procs.ui.pagination({ page: 4, total: 12, href: "/astryx" });
    const advancedOverlays = `<div class="flex flex-wrap items-center gap-3">
        ${ctx.fns.procs.ui.tooltip({ content: "Tiny contextual help", trigger: ctx.fns.procs.ui.button({ label: "Hover tooltip", variant: "secondary" }) })}
        ${ctx.fns.procs.ui.popover({ title: "Popover", body: "A small click-open surface for compact controls.", trigger: ctx.fns.procs.ui.button({ label: "Open popover", variant: "secondary" }) })}
        ${ctx.fns.procs.ui.hoverCard({ title: "Masha Ivanova", body: "Senior operator · online now", trigger: ctx.fns.procs.ui.avatar({ name: "Masha Ivanova", status: "success" }) })}
        ${ctx.fns.procs.ui.contextMenu({ body: `<span class="asx-card inline-block cursor-context-menu px-4 py-3">Right-click me</span>`, items: [
            { label: "Open", icon: "ph-arrow-square-out" },
            { label: "Duplicate", icon: "ph-copy" },
            { label: "Delete", icon: "ph-trash", danger: true },
        ] })}
        ${ctx.fns.procs.ui.moreMenu({ items: [
            { label: "Edit", icon: "ph-pencil" },
            { label: "Archive", icon: "ph-archive" },
            { divider: true },
            { label: "Delete", icon: "ph-trash", danger: true },
        ] })}
        ${ctx.fns.procs.ui.dropdownMenu({ label: "Filter", icon: "ph-funnel", items: [
            { label: "Only unread", type: "checkbox", checked: true, name: "unread" },
            { label: "Has attachment", type: "checkbox", checked: false, name: "attach" },
            { divider: true },
            { label: "Sort by", items: [
                { label: "Newest", icon: "ph-arrow-down" },
                { label: "Oldest", icon: "ph-arrow-up" },
                { label: "Priority", icon: "ph-warning" },
            ] },
            { divider: true },
            { label: "Inbox", type: "radio", checked: true, name: "folder", value: "inbox" },
            { label: "Archive", type: "radio", checked: false, name: "folder", value: "archive" },
        ] })}
    </div>`;
    const inputBatch = `<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        ${ctx.fns.procs.ui.numberInput({ name: "limit", label: "Number", value: 25, min: 1, max: 100 })}
        ${ctx.fns.procs.ui.numberStepper({ name: "retries", label: "Number stepper", value: 3, min: 0, max: 10 })}
        ${ctx.fns.procs.ui.slider({ name: "confidence", label: "Slider", value: 64, showValue: true })}
        ${ctx.fns.procs.ui.dateInput({ name: "date", label: "Date", value: "2026-01-15" })}
        ${ctx.fns.procs.ui.timeInput({ name: "time", label: "Time", value: "14:30" })}
        ${ctx.fns.procs.ui.dateRangeInput({ startName: "from", endName: "to", label: "Date range", start: "2026-01-01", end: "2026-01-31" })}
        ${ctx.fns.procs.ui.fileInput({ name: "file", label: "File input", accept: ".csv,.txt" })}
        ${ctx.fns.procs.ui.textInput({ name: "email", label: "TextInput", type: "email", placeholder: "alice@example.com", description: "Field shell included", status: { type: "success", message: "Looks good" } })}
        ${ctx.fns.procs.ui.textArea({ name: "notes", label: "TextArea", placeholder: "Write notes…", rows: 3, status: { type: "warning", message: "Keep it short" }, statusVariant: "detached" })}
        ${ctx.fns.procs.ui.dateTimeInput({ name: "scheduled_at", label: "DateTimeInput", value: "2026-01-15T14:30", description: "Native segmented fallback" })}
    </div>`;
    const primitives = `<div class="grid gap-4">
        ${ctx.fns.procs.ui.buttonGroup({ body: [ctx.fns.procs.ui.button({ label: "Day" }), ctx.fns.procs.ui.button({ label: "Week", variant: "primary" }), ctx.fns.procs.ui.button({ label: "Month" })].join("") })}
        ${ctx.fns.procs.ui.inputGroup({ start: "@", control: ctx.fns.procs.ui.input({ name: "handle", placeholder: "username" }), end: ctx.fns.procs.ui.kbd({ label: "↵" }) })}
        ${ctx.fns.procs.ui.formLayout({ columns: 2, body: ctx.fns.procs.ui.field({ label: "First", control: ctx.fns.procs.ui.input({ name: "first" }) }) + ctx.fns.procs.ui.field({ label: "Last", control: ctx.fns.procs.ui.input({ name: "last" }) }) })}
        ${ctx.fns.procs.ui.grid({ body: [
            ctx.fns.procs.ui.clickableCard({ title: "Inbox", body: "Review incoming chats", icon: "ph-tray", selected: true }),
            ctx.fns.procs.ui.clickableCard({ title: "Broadcasts", body: "Campaigns and sends", icon: "ph-megaphone" }),
        ].join(""), columns: 2 })}
        ${ctx.fns.procs.ui.item({ title: "Assigned to Masha", description: "Updated 2 minutes ago", start: ctx.fns.procs.ui.avatar({ name: "Masha Ivanova", size: "sm" }), end: ctx.fns.procs.ui.token({ label: "live", selected: true }) })}
        <div class="flex flex-wrap gap-2">${ctx.fns.procs.ui.token({ label: "status", value: "open", removable: true })}${ctx.fns.procs.ui.token({ label: "priority", value: "high", selected: true })}${ctx.fns.procs.ui.indicator({ tone: "success", label: "3" })}</div>
    </div>`;
    const finalGaps = `<div class="grid gap-4 md:grid-cols-2">
        <div class="grid gap-3">
            ${ctx.fns.procs.ui.complexSelector({ name: "plan", label: "Complex selector", value: "pro", items: [
                { label: "Starter", value: "starter", description: "Small teams", icon: "ph-rocket" },
                { label: "Pro", value: "pro", description: "Automation and routing", icon: "ph-lightning", badge: "Popular" },
            ] })}
            ${ctx.fns.procs.ui.collapsible({ title: "Collapsible", open: true, body: "Native details with Astryx styling." })}
        </div>
        <div class="grid gap-3">
            ${ctx.fns.procs.ui.fieldStatus({ tone: "success", message: "Configuration looks valid" })}
            <div class="flex flex-wrap gap-3">${ctx.fns.procs.ui.icon({ name: "ph-sparkle", tone: "accent", size: "lg", label: "Sparkle" })}${ctx.fns.procs.ui.visuallyHidden({ text: "Screen reader only text" })}</div>
            ${ctx.fns.procs.ui.scrollableArea({ height: "140px", body: Array.from({ length: 10 }, (_, i) => ctx.fns.procs.ui.item({ title: `Scrollable item ${i + 1}`, description: "Inside ScrollableArea" })).join("") })}
        </div>
    </div>`;
    const interactionGaps = `<div class="grid gap-4 md:grid-cols-2">
        <div class="grid content-start gap-3">
            ${ctx.fns.procs.ui.tokenizer({ name: "tags", values: ["urgent", "vip"], suggestions: ["urgent", "vip", "billing", "bug", "sales"], placeholder: "Add tag…" })}
            ${ctx.fns.procs.ui.checkboxList({ name: "features", values: ["email"], items: [
                { label: "Email", value: "email", description: "Send email updates" },
                { label: "SMS", value: "sms", description: "Send text messages" },
                { label: "Push", value: "push", description: "Mobile push alerts" },
            ] })}
            <div class="flex flex-wrap gap-2">${ctx.fns.procs.ui.toggleButton({ label: "Bold", icon: "ph-text-b", pressed: true })}${ctx.fns.procs.ui.toggleButton({ label: "Italic", icon: "ph-text-italic" })}</div>
        </div>
        <div class="flex flex-wrap content-start gap-2">
            ${ctx.fns.procs.ui.alertDialog({ id: "asx-alert-demo", title: "Delete broadcast?", body: "This action cannot be undone.", trigger: ctx.fns.procs.ui.button({ label: "Open alert", variant: "destructive" }), confirmLabel: "Delete" })}
            ${ctx.fns.procs.ui.bottomSheet({ id: "asx-sheet-demo", title: "Bottom sheet", trigger: ctx.fns.procs.ui.button({ label: "Open sheet", variant: "secondary" }), body: ctx.fns.procs.ui.list({ items: [
                { title: "Quick reply", description: "Send a saved answer", icon: "ph-chat-circle" },
                { title: "Assign", description: "Move to an operator", icon: "ph-user-plus" },
            ] }) })}
        </div>
    </div>`;
    const dateTime = `<div class="grid gap-4 md:grid-cols-[auto_1fr]">
        ${ctx.fns.procs.ui.calendar({ name: "scheduled", value: "2026-01-15" })}
        <div class="grid content-start gap-3">
            ${ctx.fns.procs.ui.item({ title: "Created", description: "Absolute timestamp", end: ctx.fns.procs.ui.timestamp({ value: "2026-01-15T14:30:00Z", format: "datetime" }) })}
            ${ctx.fns.procs.ui.item({ title: "Last updated", description: "Relative timestamp", end: ctx.fns.procs.ui.timestamp({ value: Date.now() - 1000 * 60 * 42, format: "relative" }) })}
            <div class="flex flex-wrap gap-2">${ctx.fns.procs.ui.timer({ seconds: 125, tone: "success" })}${ctx.fns.procs.ui.timer({ seconds: 35, tone: "warning" })}${ctx.fns.procs.ui.timer({ seconds: 8, tone: "error" })}</div>
        </div>
    </div>`;
    const richContent = `<div class="grid gap-4 lg:grid-cols-2">
        <div class="grid gap-4">
            ${ctx.fns.procs.ui.markdown({ markdown: "## Release notes\nSmall components now compose into larger surfaces.\n- Fast\n- Server-rendered\n- React-free" })}
            ${ctx.fns.procs.ui.codeBlock({ language: "ts", code: "ctx.fns.procs.ui.card({ title: 'Hello', body })" })}
            ${ctx.fns.procs.ui.citation({ title: "Astryx source", source: "github.com/facebook/astryx", href: "https://github.com/facebook/astryx", excerpt: "Design system components ported to server-rendered HTML." })}
        </div>
        <div class="grid gap-4">
            ${ctx.fns.procs.ui.chat({ messages: [
                { author: "Alice", body: "Can you check the broadcast?", time: "10:12" },
                { author: "Bot", body: "Sure, draft is ready for review.", time: "10:13", mine: true, status: "read" },
                { author: "System", body: "Broadcast job queued", time: "10:14" },
            ], composer: ctx.fns.procs.ui.chatComposer({
                name: "reply",
                placeholder: "Reply…",
                footer: ctx.fns.procs.ui.chatToolCalls({ calls: [
                    { name: "export_contacts", status: "complete", duration: "218ms", resultDetail: "1,204 recipients" },
                ] }),
            }) })}
            ${ctx.fns.procs.ui.carousel({ items: [
                ctx.fns.procs.ui.card({ title: "Slide one", body: "Carousel content." }),
                ctx.fns.procs.ui.card({ title: "Slide two", body: "Scrollable snap track." }),
                ctx.fns.procs.ui.card({ title: "Slide three", body: "Native scrolling." }),
            ] })}
            ${ctx.fns.procs.ui.lightbox({ src: "https://picsum.photos/900/600", thumb: "https://picsum.photos/360/240", alt: "Random preview" })}
        </div>
    </div>`;
    const chatShowcase = `<div class="grid gap-6">
        ${ctx.fns.procs.ui.chatLayout({ height: "560px", header: ctx.fns.procs.ui.item({ title: "Alice Johnson", description: "Online · customer", start: ctx.fns.procs.ui.avatar({ name: "Alice Johnson", status: "success", size: "sm" }), end: ctx.fns.procs.ui.badge({ label: "VIP", variant: "purple" }) }), body: ctx.fns.procs.ui.chatMessageList({ density: "balanced", body: [
            ctx.fns.procs.ui.chatSystemMessage({ body: "Alice joined from web chat", icon: "ph-globe" }),
            ctx.fns.procs.ui.chatMessage({ sender: "assistant", author: "Operator", avatar: "none", children: [
                ctx.fns.procs.ui.chatMessageBubble({ body: "Hi Alice — I can help with your order.", name: "Masha", group: "first" }),
                ctx.fns.procs.ui.chatMessageBubble({ body: "Can you share the order number?", metadata: ctx.fns.procs.ui.chatMessageMetadata({ timestamp: "10:12" }), group: "last" }),
            ].join("") }),
            ctx.fns.procs.ui.chatMessage({ sender: "user", author: "Alice", avatar: "none", children: [
                ctx.fns.procs.ui.chatMessageBubble({ body: "Sure — ORD-1043", name: "Alice", mine: true, metadata: ctx.fns.procs.ui.chatMessageMetadata({ timestamp: "10:13", status: "read", mine: true }) }),
            ].join("") }),
            ctx.fns.procs.ui.chatMessage({ sender: "assistant", author: "Bot", children: ctx.fns.procs.ui.chatMessageBubble({ variant: "ghost", width: "100%", body: "I found the order. It is currently out for delivery.", metadata: ctx.fns.procs.ui.chatToolCalls({ calls: [
                { name: "lookup_order", status: "complete", target: "ORD-1043", duration: "184ms", resultDetail: "UPS Ground · arriving today" },
                { name: "draft_reply", status: "running", target: "shipping update" },
            ] }) }) }),
        ].join("") }), scrollButton: ctx.fns.procs.ui.chatLayoutScrollButton({ visible: true }), composer: ctx.fns.procs.ui.chatComposer({ name: "chat-reply", placeholder: "Message Alice…", footer: `<span class="asx-text" data-size="supporting" data-tone="secondary">Shift+Enter for newline</span>`, actions: ctx.fns.procs.ui.button({ label: "Attach", variant: "ghost", icon: "ph-paperclip", size: "sm" }) }) })}
        <div class="grid gap-4 md:grid-cols-3">
            ${ctx.fns.procs.ui.chatMessageList({ density: "compact", align: "top", body: ctx.fns.procs.ui.chatMessage({ sender: "assistant", author: "Compact", body: "Compact density bubble", avatar: "none", timestamp: "9:01" }) })}
            ${ctx.fns.procs.ui.chatMessageList({ density: "balanced", align: "top", body: ctx.fns.procs.ui.chatMessage({ sender: "user", author: "Balanced", body: "Balanced density bubble", avatar: "none", timestamp: "9:02", status: "delivered" }) })}
            ${ctx.fns.procs.ui.chatMessageList({ density: "spacious", align: "top", body: ctx.fns.procs.ui.chatMessage({ sender: "assistant", author: "Spacious", body: "Spacious density bubble", avatar: "none", timestamp: "9:03" }) })}
        </div>
        <div class="grid gap-4 md:grid-cols-2">
            ${ctx.fns.procs.ui.chatMessageList({ density: "balanced", align: "top", body: [
                ctx.fns.procs.ui.chatMessage({ sender: "assistant", author: "Filled bubble", avatar: "none", body: "Default filled bubble" }),
                ctx.fns.procs.ui.chatMessage({ sender: "assistant", author: "Ghost bubble", avatar: "none", variant: "ghost", width: "100%", body: "Ghost keeps text padding and column alignment but removes the bubble background." }),
            ].join("") })}
            ${ctx.fns.procs.ui.chatMessageList({ density: "balanced", align: "top", body: [
                ctx.fns.procs.ui.chatMessage({ sender: "user", author: "User filled", avatar: "none", body: "User filled bubble", status: "read", timestamp: "10:21" }),
                ctx.fns.procs.ui.chatMessage({ sender: "user", author: "User ghost", avatar: "none", variant: "ghost", width: "100%", body: "User ghost variant with explicit full-column width.", status: "delivered", timestamp: "10:22" }),
            ].join("") })}
        </div>
        <div class="grid gap-4 md:grid-cols-2">
            ${ctx.fns.procs.ui.chatComposer({ placeholder: "Default composer…", footer: "Footer slot", actions: ctx.fns.procs.ui.chatDictationButton({ listening: true }) + ctx.fns.procs.ui.button({ label: "Magic", variant: "secondary", icon: "ph-sparkle", size: "sm" }) })}
            ${ctx.fns.procs.ui.chatComposer({ placeholder: "Flat composer with top warning…", elevation: "none", status: { type: "warning", message: "Customer is waiting", position: "top" } })}
            ${ctx.fns.procs.ui.chatComposer({ placeholder: "Disabled while streaming…", disabled: true, status: { type: "error", message: "Connection interrupted" } })}
            ${ctx.fns.procs.ui.chatComposer({ placeholder: "Stop state…", stop: true, value: "Generating response…" })}
            ${ctx.fns.procs.ui.chatComposer({ placeholder: "Composer with drawer…", drawer: ctx.fns.procs.ui.chatComposerDrawer({ count: 3, label: "attachments", body: [ctx.fns.procs.ui.token({ label: "receipt.pdf" }), ctx.fns.procs.ui.token({ label: "photo.jpg" }), ctx.fns.procs.ui.chatPastedTextToken({ text: "Long pasted customer context", label: "Customer context" })].join("") }) })}
            ${ctx.fns.procs.ui.chatMessage({ sender: "assistant", avatar: "none", children: ctx.fns.procs.ui.chatMessageBubble({ body: "", variant: "ghost", width: "100%", metadata: ctx.fns.procs.ui.chatTokenizedText({ text: "Hi @alice, order #1043 is ready", tokens: [{ value: "@alice", label: "Alice", variant: "blue", icon: "ph-user" }, { value: "#1043", label: "#1043", variant: "purple", icon: "ph-receipt" }] }) }) })}
        </div>
    </div>`;
    const shellDemo = ctx.fns.procs.ui.appShell({
        side: ctx.fns.procs.ui.sideNav({ title: "Astryx Bot", menus: [
            { label: "Main", items: [
                { label: "Dashboard", icon: "ph-squares-four" },
                { label: "Inbox", icon: "ph-tray", active: true, badge: "8" },
                { label: "Broadcasts", icon: "ph-megaphone" },
            ] },
            { label: "Setup", items: [
                { label: "Flows", icon: "ph-share-network" },
                { label: "Channels", icon: "ph-link" },
            ] },
        ], footer: ctx.fns.procs.ui.item({ title: "Masha", description: "Online", start: ctx.fns.procs.ui.avatar({ name: "Masha Ivanova", size: "sm", status: "success" }) }) }),
        top: ctx.fns.procs.ui.topNav({ title: "Inbox", center: ctx.fns.procs.ui.segmentedControl({ name: "view", value: "open", items: [{ label: "Open", value: "open" }, { label: "All", value: "all" }] }), end: ctx.fns.procs.ui.button({ label: "New", variant: "primary", icon: "ph-plus" }) }),
        main: ctx.fns.procs.ui.grid({ columns: "repeat(auto-fit, minmax(180px, 1fr))", body: [
            ctx.fns.procs.ui.card({ title: "Open chats", body: ctx.fns.procs.ui.heading({ text: "128", level: 2 }) }),
            ctx.fns.procs.ui.card({ title: "SLA", body: ctx.fns.procs.ui.progressBar({ value: 82, tone: "success" }) }),
            ctx.fns.procs.ui.card({ title: "Queue", body: ctx.fns.procs.ui.avatarGroup({ items: [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }] }) }),
        ].join("") }),
        mobile: ctx.fns.procs.ui.mobileNav({ items: [
            { label: "Home", icon: "ph-house" },
            { label: "Inbox", icon: "ph-tray", active: true, badge: "8" },
            { label: "Flows", icon: "ph-share-network" },
            { label: "Setup", icon: "ph-gear" },
        ] }),
    });
    const structure = `<div class="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div class="grid gap-4">
            ${ctx.fns.procs.ui.treeList({ label: "Flows", items: [
                { label: "Onboarding", icon: "ph-folder", selected: true, children: [
                    { label: "Welcome message", icon: "ph-chat-circle" },
                    { label: "Collect email", icon: "ph-envelope", badge: "2" },
                ] },
                { label: "Support", icon: "ph-folder", children: [
                    { label: "Route by priority", icon: "ph-git-branch" },
                    { label: "Escalate", icon: "ph-warning" },
                ] },
            ] })}
            ${ctx.fns.procs.ui.resizable({ initial: 42, start: ctx.fns.procs.ui.code({ code: "event.type == 'message'", block: true }), end: ctx.fns.procs.ui.emptyState({ compact: true, icon: "ph-layout", title: "Preview", body: "Drag the divider." }) })}
        </div>
        <div class="grid gap-4 content-start">
            ${ctx.fns.procs.ui.outline({ items: [
                { label: "Overview", href: "#", current: true },
                { label: "Fields", href: "#", level: 2 },
                { label: "Validation", href: "#", level: 2 },
                { label: "Advanced", href: "#", level: 3 },
            ] })}
            ${ctx.fns.procs.ui.overflowList({ max: 3, items: [
                ctx.fns.procs.ui.badge({ label: "Telegram", variant: "blue" }),
                ctx.fns.procs.ui.badge({ label: "Web", variant: "teal" }),
                ctx.fns.procs.ui.badge({ label: "Email", variant: "purple" }),
                ctx.fns.procs.ui.badge({ label: "WhatsApp", variant: "success" }),
                ctx.fns.procs.ui.badge({ label: "SMS", variant: "warning" }),
            ] })}
        </div>
    </div>`;
    const wizardStepper = `<div class="grid gap-6">
        ${ctx.fns.procs.ui.stepper({ activeStep: 1, steps: [
            { label: "Account", description: "User and channel", status: "success" },
            { label: "Routing", description: "Assignment rules" },
            { label: "Review", description: "Confirm setup", optional: true },
        ] })}
        ${ctx.fns.procs.ui.stepper({ activeStep: 1, orientation: "vertical", steps: [
            { label: "Import", description: "Upload source CSV", status: "success" },
            { label: "Map fields", description: "Choose destination columns", content: ctx.fns.procs.ui.badge({ label: "Current", variant: "blue" }) },
            { label: "Run", description: "Start processing", disabled: true },
        ] })}
    </div>`;
    const foundation = `<div class="grid gap-4">
        <div>${ctx.fns.procs.ui.breadcrumbs({ items: [{ label: "Bot", href: "/bot" }, { label: "Chats", href: "/bot/chats" }, { label: "Conversation" }] })}</div>
        <div class="grid gap-1">${ctx.fns.procs.ui.heading({ text: "Conversation overview", level: 3 })}${ctx.fns.procs.ui.text({ text: "Typography primitives with Astryx tokens.", tone: "secondary", as: "p" })}</div>
        <div class="flex flex-wrap items-center gap-3">${ctx.fns.procs.ui.avatar({ name: "Masha Ivanova", status: "success" })}${ctx.fns.procs.ui.avatarGroup({ items: [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }, { name: "Dora" }, { name: "Eve" }] })}${ctx.fns.procs.ui.kbd({ label: "⌘K" })}${ctx.fns.procs.ui.code({ code: "ctx.fns.astryx" })}</div>
        <div class="grid gap-2 md:grid-cols-3"><div>${ctx.fns.procs.ui.skeleton({ lines: 3 })}</div><div class="flex items-center gap-3">${ctx.fns.procs.ui.spinner({})}${ctx.fns.procs.ui.text({ text: "Loading…", tone: "secondary" })}</div><div>${ctx.fns.procs.ui.progressBar({ value: 64, tone: "success" })}</div></div>
        ${ctx.fns.procs.ui.blockQuote({ quote: "A boring component library is a good component library.", cite: "Astryx-ish port" })}
    </div>`;
    return { title: "Astryx", main: ctx.fns.procs.ui.page({ page: "astryx", title: "Astryx core kit", lead: "Server-rendered port, no React.", main: [
        banner,
        ctx.fns.procs.ui.card({ title: "Actions", body: `<div class="flex flex-wrap gap-2">${b}${s}${g}${d}</div>` }),
        ctx.fns.procs.ui.card({ title: "Navigation", body: tabs }),
        ctx.fns.procs.ui.card({ title: "Toolbar", body: toolbar }),
        ctx.fns.procs.ui.card({ title: "Interactive", body: `<div class="grid gap-4 md:grid-cols-2"><div>${command}</div><div>${multiselect}</div></div>` }),
        ctx.fns.procs.ui.card({ title: "Foundation", body: foundation }),
        ctx.fns.procs.ui.card({ title: "Power search", body: powerSearch }),
        ctx.fns.procs.ui.card({ title: "Selector & typeahead", body: choice }),
        ctx.fns.procs.ui.card({ title: "Form controls", body: formControls }),
        ctx.fns.procs.ui.card({ title: "Pagination", body: pagination }),
        ctx.fns.procs.ui.card({ title: "Advanced overlays", body: advancedOverlays }),
        ctx.fns.procs.ui.card({ title: "Stepper", body: wizardStepper }),
        ctx.fns.procs.ui.card({ title: "Primitives", body: primitives }),
        ctx.fns.procs.ui.card({ title: "App shell", body: shellDemo }),
        ctx.fns.procs.ui.card({ title: "Rich content", body: richContent }),
        ctx.fns.procs.ui.card({ title: "Chat", body: chatShowcase }),
        ctx.fns.procs.ui.card({ title: "Date & time", body: dateTime }),
        ctx.fns.procs.ui.card({ title: "Interaction gaps", body: interactionGaps }),
        ctx.fns.procs.ui.card({ title: "Final gaps", body: finalGaps }),
        ctx.fns.procs.ui.card({ title: "Structure", body: structure }),
        ctx.fns.procs.ui.card({ title: "Inputs", body: inputBatch }),
        ctx.fns.procs.ui.card({ title: "Overlays", body: `<div class="flex flex-wrap items-center gap-2">${dialog}${dropdown}${toast}</div>` }),
        ctx.fns.procs.ui.card({ title: "Selectable cards", body: selectable }),
        ctx.fns.procs.ui.card({ title: "Field", body: field }),
        ctx.fns.procs.ui.card({ title: "Table", body: table }),
        ctx.fns.procs.ui.card({ title: "List", body: list }),
        ctx.fns.procs.ui.card({ title: "Metadata", body: meta }),
        ctx.fns.procs.ui.card({ title: "Status", body: status + ctx.fns.procs.ui.divider({}) + empty }),
    ].join("") }) };
}
