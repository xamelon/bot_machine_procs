# Astryx full parity audit

Date: 2026-10-10
Scope: `procs/src/astryx` React-free port vs `/tmp/procs/ui/packages/core/src` upstream Astryx.

## Verdict

This is **not yet a faithful Astryx port**. It has broad namespace coverage and many token-shaped primitives, but several implementations are approximations. The biggest issue is not missing files; it is that many components were implemented from memory/shape rather than from upstream anatomy, CSS token math, props, and behavior contracts.

Going forward, a component is not considered ported unless it has:

1. upstream source files named in this audit,
2. public prop/anatomy mapping,
3. token-level visual parity for default `md`/balanced states,
4. keyboard/focus/dismissal behavior notes,
5. demo edge cases in `/astryx`.

## Coverage summary

### Present but must be re-audited for true parity

Most public component names exist in `ctx.fns.procs.ui.*`, but many are shallow ports:

- Core display/actions: Button, IconButton, Badge, Banner, Card, Text, Heading, Link, Kbd, Code, CodeBlock, Citation.
- Form-ish: Input/TextInput, Field, FieldLabel, FieldStatus, Selector, Typeahead, FileInput, NumberInput, Slider, Switch, Checkbox, Radio, Tokenizer, PowerSearch.
- Overlays: Dialog, AlertDialog, DropdownMenu, MoreMenu, ContextMenu, Popover, Tooltip, HoverCard, BottomSheet, Toast.
- Layout/navigation: AppShell, TopNav, SideNav, MobileNav, NavMenu, NavIcon, Tabs/TabList, Toolbar, Stack/HStack/VStack/Grid/Center/Section/Divider.
- Data/content: Table, List, MetadataList, TreeList, Outline, OverflowList, Resizable, ScrollableArea, Markdown.
- Chat: partially present after recent work but **not faithful enough**.

### Missing or incorrectly aliased upstream component families

| Upstream | Current port | Status | Notes |
|---|---|---:|---|
| `CommandPalette` | `commandMenu` | ⚠️ alias-ish | Need compare to actual CommandPalette source; current behavior likely not enough. |
| `DateTimeInput` | date+time separate only | ❌ missing | Need explicit component if upstream exports it. |
| `MultiSelector` | `multiselect` | ⚠️ renamed approximation | Need upstream MultiSelector anatomy/option actions/create row. |
| `TabList` | `tabs` | ⚠️ renamed approximation | Need actual TabList anatomy, scroll/edge padding, menu behavior if any. |
| `TextInput` | `input` | ⚠️ alias-ish | Need props/status/clear button/start/end slots parity. |
| `TextArea` | `input({textarea:true})` | ⚠️ alias-ish | Need real textarea sizing/status parity. |
| `Layer`, `Overlay`, hooks | scripts | ⚠️ partial internals | Not public component equivalents, but overlay positioning relies on these. |
| `ChatComposerDrawer` | none | ❌ missing | Public Chat family component. |
| `ChatComposerTokenElement` | none | ❌ missing | Public Chat family component. |
| `ChatDictationButton` | none | ❌ missing | Public Chat family component. |
| `ChatTokenizedText` | none | ❌ missing | Public Chat family component. |
| `ChatPastedTextToken` | none | ❌ missing | Public-ish/internal TSX exists; used by tokenized composer. |

## Priority 0 — must fix before claiming Astryx parity

### 1. Chat family — current port is not faithful

Upstream files:

- `Chat/ChatLayout.tsx`
- `Chat/ChatLayoutScrollButton.tsx`
- `Chat/ChatMessageList.tsx`
- `Chat/ChatMessage.tsx`
- `Chat/ChatMessageBubble.tsx`
- `Chat/ChatMessageMetadata.tsx`
- `Chat/ChatSystemMessage.tsx`
- `Chat/ChatComposer.tsx`
- `Chat/ChatComposerInput.tsx`
- `Chat/ChatSendButton.tsx`
- `Chat/ChatToolCalls.tsx`
- `Chat/ChatComposerDrawer.tsx`
- `Chat/ChatComposerTokenElement.tsx`
- `Chat/ChatDictationButton.tsx`
- `Chat/ChatTokenizedText.tsx`

Current port:

- Has rough modules for layout/list/message/bubble/metadata/system/composer/input/send/toolCalls.
- Missing drawer/token/dictation/tokenized text.
- Recent CSS fixed missing `--asx-radius-chat`, but this is still not enough.

Known mismatches:

| Area | Upstream | Current | Required fix |
|---|---|---|---|
| `ChatLayout` root | flex column, `container-type`, scroll management, sticky/fixed dock, blur layer, density max-widths | approximate sticky dock; demo inside card distorts behavior | Port layout contract exactly; demo in constrained viewport but don't fake card border. |
| `ChatMessageBubble` | max-width `max(80%, 280px)`, neutral bg for both sender defaults, padding by density, group logical radii, metadata/name slot padding and negative gap | partially fixed; density/name/metadata gap not exact | Rebuild CSS block from source token math. |
| `ChatMessage` | sender context, avatar offset when name present, children gap by density | rough HTML; no real context semantics | Encode density/sender attrs and exact slot wrappers. |
| `ChatMessageMetadata` | timestamp/footer/status with separators, direction reverses for user, status labels/icons | rough | Port status map/ordering. |
| `ChatComposer` | shell body radius/padding vars, low/none elevation, header/footer slots, disabled/stop pointer policy, status overlap top/bottom | rough; now visually closer but not source-faithful | Rewrite anatomy and CSS to match source. |
| `ChatComposerInput` | contenteditable/token-capable input in upstream | textarea only | Either document textarea fallback or implement token/contenteditable model. |
| `ChatSendButton` | context-aware send/stop, disabled rules | simple submit button | Add JS/context via DOM attrs. |
| `ChatToolCalls` | single vs multiple collapse, statuses, additions/deletions/stats/error/result detail | flat rows | Port display rules. |

Acceptance for Chat:

- `/astryx` Chat section must show exact upstream cases: density, group, ghost full-width, composer low/none/top/bottom status, disabled+stop, tool calls single/multiple.
- Computed default composer body: radius 28, padding 12, low shadow, footer min-height 32, textarea/input line-height 20.
- Bubble computed default: radius 28, padding `12px 16px`, max-width `max(80%, 280px)`, neutral bg.

### 2. Field / FieldStatus / FieldLabel

Upstream files:

- `Field/Field.tsx`
- `Field/FieldLabel.tsx`
- `Field/inputStyles.stylex.ts`
- `Field/PanelSearchInput.tsx`
- `FieldStatus/FieldStatus.tsx`

Current port:

- Field shell now exists, but was added late and needs source-based audit.

Known mismatches:

- `FieldLabel` color should default to text-secondary; this is now adjusted.
- Optional/required marker text and i18n are hardcoded English.
- `FieldStatus` attached/detached shape is approximate; live-region behavior missing.
- `tooltip` status variant is accepted but not surfaced as on-field icon tooltip.
- `inputStyles` common status/disabled/hover/focus behavior is not centralized across controls.

Required fix:

- Make every field-owning control (`TextInput`, `TextArea`, `Selector`, `Typeahead`, `FileInput`, date/time/number inputs) expose the same field props and status wiring.
- Implement attached status overlap and detached icon exactly from source tokens.

### 3. Selector / Typeahead / MultiSelector

Upstream files:

- `Selector/Selector.tsx`
- `Selector/SelectorOption.tsx`
- `Selector/SelectorBottomSheet.tsx`
- `Selector/hooks.ts`
- `Field/PanelSearchInput.tsx`
- `Typeahead/Typeahead.tsx`
- `Typeahead/BaseTypeahead.tsx`
- `Typeahead/TypeaheadItem.tsx`
- `MultiSelector/MultiSelector.tsx`

Current port:

- Selector/typeahead basic listbox exists.
- Trigger size recently corrected to 32px / `5px 12px` for md.
- Option row md vertical padding corrected to 6px.

Known mismatches:

- No selected-row-over-trigger positioning.
- No adaptive bottom sheet on compact coarse pointer.
- No search row / PanelSearchInput exact treatment for selector-with-search.
- No option sections/dividers/groups.
- No selected mark collapse/reserve nuance.
- Typeahead does not implement token overlay behavior; selected value handling is simple input text.
- MultiSelector is a renamed approximation and lacks upstream create row/option actions/overflow semantics.

Required fix:

- Port selector presentation geometry first.
- Then port Typeahead/BaseTypeahead item and end-lane behavior.
- Then replace `multiselect` with real `multiSelector` alias while keeping old alias optional.

### 4. PowerSearch / Tokenizer

Upstream files:

- `PowerSearch/PowerSearch.tsx`
- `PowerSearch/PowerSearchEditPopover.tsx`
- `PowerSearch/PowerSearchFilterEditor.tsx`
- `PowerSearch/PowerSearchToken.tsx`
- `Tokenizer/Tokenizer.tsx`
- `Token/Token.tsx`

Current port:

- Has working filter token UI, editor, keyboard basics.
- Token row inset and height were partially corrected.

Known mismatches:

- PowerSearch upstream is built on Tokenizer + Typeahead source; ours is custom.
- No true Tokenizer item source / suggestion behavior.
- No nested filters/group editor parity.
- Entity/source behavior is static options only.
- Popover layer width/collision not actual `anchor-size(width)` + viewport inset policy.
- Token focus/removal semantics incomplete vs upstream.

Required fix:

- Port Tokenizer first. Then rebuild PowerSearch on that contract.
- Keep DOM-free server output but use small JS mirroring hooks.

### 5. Overlay / Layer foundation

Upstream families:

- `Layer`
- `Overlay`
- `Dialog`
- `DropdownMenu`
- `Popover`
- `Tooltip`
- `HoverCard`
- `BottomSheet`

Current port:

- Many overlays exist with shared `$script_layer.js`, but collision/flip/adaptive behavior is incomplete.

Known mismatches:

- No true layer runtime placement/collision/viewport inset.
- No adaptive bottom-sheet conversion for selector/dropdown on compact screens.
- Dialog focus trap incomplete.
- Tooltip/HoverCard hover intent/delay incomplete.

Required fix:

- Build a small non-React layer engine: anchor rect, preferred side, flip/slide, max-size CSS vars, focus return, outside press.
- Reuse it for Dropdown/Popover/Selector/PowerSearch.

## Priority 1 — visual/token parity audit required

These components exist and are plausible, but need computed-value checks against upstream source before being marked complete:

| Component | Current risk | Checks needed |
|---|---|---|
| Button/IconButton | likely close | variants, disabled, loading if any, exact active/hover shadows. |
| Card/ClickableCard/SelectableCard | partial | border-inset padding math, theme container padding vars, elevation. |
| Badge | close | label ellipsis anatomy, semantic/non-semantic colors. |
| Banner | likely close-ish | icon/status/action anatomy. |
| Input/TextInput/TextArea | approximate | start/end slots, clear button, status icons, iOS 16px floor. |
| FileInput | default input/dropzone fixed visually | loading/status/disabled tooltip/drag active/multiple validation. |
| Table | basic only | density, selection, sticky, sort, empty, row/cell padding. |
| List/Item | approximate | container padding system, density, markers/actions. |
| MetadataList | likely basic | orientation, gaps, responsive behavior. |
| Tabs/TabList | approximate | edge padding, scroll, menu/overflow, exact tab heights. |
| Stepper | basic | responsive collapse, connector fill, clickable steps. |
| Calendar/DateInput/DateRange/DateTime | simple | keyboard grid, min/max/disabled, presets, localization. |
| Toast | simplified | queue, viewport, dismiss/actions, status semantics. |
| Markdown | uses Bun markdown + regex sanitizer | need allowlist sanitizer and Astryx element mapping. |

## Priority 2 — acceptable as lightweight until needed

These can stay lightweight unless used in real bot screens, but must not be claimed as full parity:

- Avatar, AvatarGroup, Thumbnail, AspectRatio
- Skeleton, Spinner, ProgressBar, StatusDot, Indicator
- Stack/HStack/VStack/Grid/Center/Section/Divider
- Breadcrumbs, Pagination, EmptyState
- Kbd/Code/CodeBlock/BlockQuote/Citation/Link/Text/Heading
- Carousel/Lightbox (behavior still limited)
- TreeList/Outline/OverflowList/Resizable/ScrollableArea (basic only)

## Component-by-component status table

Legend:

- ✅ good candidate, only verify computed values
- ⚠️ exists but partial/simplified
- ❌ missing or wrong abstraction
- 🧱 internal dependency needed for parity

| Component/family | Status | Notes |
|---|---:|---|
| AlertDialog | ⚠️ | Native dialog wrapper; focus/dismissal policy incomplete. |
| AppShell/Nav | ⚠️ | Static responsive approximation. |
| Avatar/AvatarGroup | ✅ | Verify exact sizing/overlap/tokens. |
| Badge | ✅ | Mostly source-aligned after token fixes. |
| Banner | ⚠️ | Needs anatomy/action/status audit. |
| BottomSheet | ⚠️ | Visual only-ish; focus/modal behavior incomplete. |
| Button/IconButton | ✅ | Needs final source computed-value audit. |
| Calendar/Date* | ⚠️ | Major behavior gaps. |
| Card | ⚠️ | Needs border-inset/container-padding source math. |
| Chat family | ⚠️ | High-priority rewrite from source. |
| Checkbox/Radio/Switch/Toggle | ⚠️ | Visual decent; status/field and exact control sizes need audit. |
| CommandPalette | ❌ | Current `commandMenu` is not verified against upstream. |
| Dialog | ⚠️ | Need focus trap and dismissal matrix. |
| Dropdown/More/ContextMenu | ⚠️ | Keyboard partial; no collision/adaptive layer. |
| Field/FieldLabel/FieldStatus | ⚠️ | Recently added; source audit required. |
| FileInput | ⚠️ | Default size fixed; behavior/status incomplete. |
| Input/TextInput/TextArea | ⚠️ | Need real upstream slots/status/clear behavior. |
| List/Item/MetadataList | ⚠️ | Basic only; density/container padding missing. |
| Markdown | ⚠️ | Security/parity issue. |
| MultiSelector | ❌ | Current `multiselect` is approximation. |
| Popover/Tooltip/HoverCard | ⚠️ | No layer collision/hover intent. |
| PowerSearch | ⚠️ | Useful but custom; rebuild on Tokenizer/Typeahead parity. |
| Selector/Typeahead | ⚠️ | Visual closer; behavior/geometry still partial. |
| Table | ⚠️ | Basic table only. |
| Tabs/TabList | ⚠️ | Approximation. |
| Toast | ⚠️ | Simplified. |
| Token/Tokenizer | ⚠️ | Token close; Tokenizer simplified. |
| ToolCalls (Chat) | ⚠️ | Flat approximation. |

## Corrective plan

### Phase 1 — stop drift

- Do not add new component code unless an upstream file is open and cited.
- Every changed component gets a local comment or audit note listing source file(s).
- `/astryx` demos must show upstream edge cases, not invented examples only.

### Phase 2 — foundations

1. Tokens: finish token file parity (`radius-page/chat`, all spacing, shadows, type scale done/verify).
2. Field/input base: port `inputStyles`, `Field`, `FieldLabel`, `FieldStatus`.
3. Layer engine: port enough `Layer/Overlay` behavior for popovers/dropdowns/selectors.

### Phase 3 — high-value components

1. Selector/Typeahead/MultiSelector.
2. Tokenizer/PowerSearch.
3. Chat family.
4. Dialog/Dropdown/Popover/Tooltip.
5. Calendar/date/time.

### Phase 4 — bot dogfood

Migrate real bot screens only after the relevant components have passed source-based parity checks. Otherwise dogfood will bake in approximations.

## Immediate next work recommendation

Start with **Chat family source rewrite**, because the user noticed it immediately and it is currently the clearest example of drift. The rewrite should begin with these files in order:

1. `ChatMessageBubble.tsx` → exact bubble dimensions/radii/slots.
2. `ChatMessage.tsx` + `ChatMessageMetadata.tsx` → sender/density wrappers.
3. `ChatMessageList.tsx` + `ChatLayout.tsx` → density/scroll/dock.
4. `ChatComposer.tsx` + `ChatComposerInput.tsx` + `ChatSendButton.tsx` → composer anatomy and behavior.
5. `ChatToolCalls.tsx` and missing drawer/token/dictation components.
