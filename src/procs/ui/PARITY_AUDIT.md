# Astryx port parity audit

Scope: React-free procs port in `procs/src/astryx` vs upstream `/tmp/procs/ui/packages/core/src`.

## Summary

- Component namespace coverage: effectively complete for public core component directories.
- Visual token direction: good for light theme basics.
- Behavior parity: partial. Several complex upstream components are full subsystems; our versions are simplified HTML/CSS/small-JS ports.

## Priority 0 — correctness blockers

| Component | Current state | Gap | Next action |
|---|---|---|---|
| `Markdown` | Uses `Bun.markdown.html` + minimal sanitizer | Sanitizer is regex-based; no allowlist DOM sanitizer; no full Astryx Markdown components/table/code rendering parity | Build allowlist sanitizer and map rendered elements to Astryx classes; add XSS fixtures |
| `Dialog` / `AlertDialog` | Native `<dialog>` with close/backdrop | No focus trap policy, labelledby/describedby wiring, required/form/info dismissal parity, directional animation | Port Dialog Header semantics, focus return, dismissal matrix |
| `DropdownMenu` / `MoreMenu` / `ContextMenu` | Roving focus, typeahead, checkbox/radio items, submenus with ArrowRight/Left, Escape, trigger keyboard open | No adaptive bottom sheet on narrow screens; collision/flip not implemented | Add placement flip and narrow-screen sheet |
| `Popover` / `Tooltip` / `HoverCard` | Absolute panels | No collision detection, anchor positioning, viewport inset, hover intent/delay | Build tiny layer engine or anchor-position fallback |

## Priority 1 — high-value complex components

| Component | Current state | Gap | Next action |
|---|---|---|---|
| `PowerSearch` | Token/filter editor with keyboard: field menu Arrow/Home/End/typeahead, token arrows/delete/edit, Backspace last token, value editors for text/select/empty/string_list/enum_list/entity_list/date/date_range | Missing nested filters, entity search sources, editor width policy, full Tokenizer integration | Continue value-editor parity and integrate Tokenizer |
| `Tokenizer` | Simple free-token input | Missing overflow behavior, typeahead menu, keyboard model, token focus/removal semantics | Port focus model and suggestion surface |
| `Selector` / `Typeahead` / `ComplexSelector` | Keyboard listbox: Arrow/Home/End/Enter/Escape, typeahead filter, aria-expanded/selected | Missing async sources, multi-select variants, disabled/read-only nuance | Add loading/empty/disabled polish and ARIA tests |
| `Calendar` / date inputs | Simple monthly calendar + native date inputs | Missing date range, presets, localization, disabled dates, keyboard grid navigation | Port calendar grid keyboard and date-range state |
| `Stepper` | Basic wizard track | Missing responsive collapse, clickable steps, connector fill animation, density/status nuance | Port compact summary + onStepClick behavior |

## Priority 2 — visual/UX parity

| Component | Current state | Gap | Next action |
|---|---|---|---|
| `AppShell` / nav | Static shell | Missing real responsive collapse, active route handling, mobile drawer/sheet details | Dogfood on bot shell after components stabilize |
| `Chat` | Simple message list | Missing attachments/composer/reactions/thread states | Expand when chat screens are migrated |
| `Carousel` / `Lightbox` | Basic scroll + overlay | Missing focus, keyboard, thumbnails, swipe, media metadata | Add keyboard and close/focus semantics |
| `Table` / `List` / `MetadataList` | Good basic rendering | Missing all density/selection/sort/sticky/empty variants | Improve when used in real screens |

## Priority 3 — mostly acceptable/simple

These are fine as lightweight ports unless a real screen needs more:

- `Badge`, `Banner`, `Button`, `IconButton`
- `Card`, `SelectableCard`, `ClickableCard`
- `Text`, `Heading`, `Link`, `Kbd`, `Code`, `CodeBlock`, `Citation`
- `Skeleton`, `Spinner`, `ProgressBar`, `StatusDot`, `Indicator`
- `Avatar`, `AvatarGroup`, `Thumbnail`, `AspectRatio`
- `Stack`, `HStack`, `VStack`, `Grid`, `Center`, `Section`, `Divider`
- `CheckboxInput`, `CheckboxList`, `RadioList`, `Switch`, `ToggleButton`
- `NumberInput`, `FileInput`, `Slider`, `NumberStepper`
- `TreeList`, `Outline`, `OverflowList`, `Resizable`, `ScrollableArea`

## Recommended execution order

1. Overlay/Layer foundation: Popover, DropdownMenu, Dialog, Tooltip, HoverCard.
2. Choice engine: Selector, Typeahead, Tokenizer.
3. PowerSearch on top of choice/tokenizer.
4. Calendar/date-range.
5. Stepper responsive/clickable behavior.
6. Dogfood AppShell on real bot screens.

## Acceptance criteria for “done”

For each priority 0/1 component:

- Visual: screenshot compared against Astryx docs/source examples.
- Keyboard: documented key paths work.
- ARIA: roles/labels/states match expected semantics.
- Dismissal/focus: open/close/focus return rules verified.
- Security: rendered user content sanitized where applicable.
- Demo: `/astryx` includes the edge cases, not only happy path.
