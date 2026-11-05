# Oputech Sales — UI/UX Design Rules

**Status:** Active implementation guide  
**Applies to:** `app/client`  
**Primary reference viewport:** 390px-wide phone

This document defines the default design and interaction rules for Oputech Sales. New UI should follow these rules unless a documented product requirement justifies an exception.

## 1. Product character

The interface should feel:

- **Operational:** fast to scan and use repeatedly during daily sales work.
- **Calm:** hierarchy comes from spacing, weight, and color—not oversized elements.
- **Compact, not cramped:** controls preserve safe touch targets while visual surfaces remain restrained.
- **Consistent:** components with the same purpose share dimensions, type, color, and behavior.
- **Explicit:** offline, pending, destructive, and disabled states must be understandable without relying on color alone.

Avoid decorative UI that does not improve comprehension. In particular, do not add circular icons to every card or row. Use icons for actions, status, navigation, or recognition—not as filler.

## 2. Design tokens are the source of truth

Global visual values live in `app/client/src/styles/theme.css`.

- Use semantic tokens such as `text-text-heading`, `text-text-secondary`, `text-text-tertiary`, `bg-card`, and `text-status-error`.
- Do not introduce one-off hex colors when a semantic token exists.
- Use the semantic typography utilities registered in `@theme` instead of inventing arbitrary sizes.
- Tailwind utilities remain rem-based; do not change the root font size to force density.

## 3. Typography

Use **Manrope** at weights 400, 500, 600, and 700.

### Type roles

| Role                  | Utility/value               | Default use                          |
| --------------------- | --------------------------- | ------------------------------------ |
| Page title            | `text-page-title` / 20–24px | One primary heading per page         |
| Card or section title | `text-card-title` / 16px    | Content headers and card titles      |
| Body/input text       | `text-base` / 16px          | Reading text and touch-layout inputs |
| Supporting text       | `text-sm` / 14px            | Descriptions and metadata            |
| Button text           | `text-control` / 13px       | Button labels                        |
| Caption/badge         | `text-xs` / 12px            | Short, non-critical information      |
| Primary metric        | `text-metric-lg` / 24px     | Main financial value                 |
| Secondary metric      | `text-metric-md` / 18px     | Supporting financial values          |

### Font weights

- **400 / normal:** body text, descriptions, metadata, and inputs.
- **500 / medium:** buttons, labels, navigation, card titles, and section titles.
- **600 / semibold:** page headings and financial totals.
- **700 / bold:** branding marks only. Do not use bold to compensate for weak hierarchy.

### Text color hierarchy

- Card titles use `text-text-heading`, currently a softer `#303030` in light mode.
- Descriptive metadata inside cards uses `text-text-tertiary`.
- Longer explanatory copy may use `text-text-secondary` for readability.
- Financial values and critical content may use `text-foreground`.
- Do not use raw `slate-*`, `gray-*`, or near-black colors for ordinary card titles.

### Writing and casing

- Use sentence case: “Log expense,” not “Log Expense.”
- Keep action labels short and direct.
- Do not add decorative ellipses to static placeholders. Use “Search products,” not “Search products…”.
- Use an ellipsis only to communicate an action currently in progress, such as “Generating…”.
- Avoid uppercase section labels unless the label is genuinely tertiary. Prefer a standard 16px content header.

## 4. Page layout

### Mobile-first dimensions

- Phone page gutter: **20px** (`px-5`).
- Standard vertical page gap: **20px** (`gap-5`).
- Standard card padding: **16px** (`p-4`).
- Compact card/list padding: **12px** (`p-3`).
- Card internal gaps: **8–12px**.
- Do not use 8px page gutters for primary screens; they make cards and controls appear oversized.

### Responsive behavior

- Phone: below 768px.
- Tablet: 768–1199px; preserve touch-friendly typography and targets.
- Wide desktop: 1200px and above; density may increase through spacing and layout.
- Do not globally shrink text or controls at the tablet breakpoint.
- Change typography only when the semantic role or interaction context changes.
- Use fluid sizing only for page titles or prominent metrics, and always set restrained minimum and maximum values.

## 5. Page headers

Page headers contain a page title, optional description, and optional action.

- Title: `text-page-title font-semibold`.
- Description: `text-sm text-text-secondary`.
- Keep the title and description in the same left column.
- Place a compact action in a fixed right column when needed.
- Allow the description to wrap naturally; it must not push the action onto another row.
- Do not use full-width page-header buttons unless the workflow specifically requires a full-width primary CTA.

Recommended structure:

```tsx
<div className="flex items-start justify-between gap-3">
  <div className="flex min-w-0 flex-col gap-0.5">
    <h1 className="text-page-title font-semibold">Activity</h1>
    <p className="text-text-secondary text-sm text-balance">
      Review sales and expenses by transaction date.
    </p>
  </div>
  <Button variant="outline" className="shrink-0">
    Action
  </Button>
</div>
```

## 6. Content header + content pattern

This is the default way to introduce cards, lists, tables, and stat groups.

- Header row height: **40px** (`min-h-10`).
- Header title: `text-card-title font-medium`.
- Optional control aligns to the right.
- There is **no artificial gap** between the header row and its content (`gap-0`).
- Space belongs between complete sections, not between a section header and its card.

```tsx
<section className="flex flex-col gap-0" aria-labelledby="section-title">
  <div className="flex min-h-10 items-center justify-between gap-3">
    <h2 id="section-title" className="text-card-title font-medium">
      Transactions
    </h2>
    <SectionControl />
  </div>
  <ContentCard />
</section>
```

Examples:

- Reports: **Summary** + Period control → summary cards.
- Reports: **Generated reports** + Sort toggle → report list.
- Activity: **Transactions** + Period/date control → transaction list.
- Overview: **Summary** + Period control → statistic cards.

## 7. Buttons

### Sizes

- Standard button: **44px** high.
- Compact button: **40px** high; use for secondary toolbars and dense desktop UI.
- High-priority CTA: **48px** high; reserve for checkout, login, and consequential bottom-sheet actions.
- Standard label: **13px / medium**.
- Standard button icon: **14px**.
- Icon-only button icon: **16px**.

### Hierarchy

- One primary button per immediate decision area.
- Use outline or ghost treatments for secondary actions.
- Do not place multiple full-width buttons above content when compact inline actions will work.
- Keep button height independent from visual emphasis; use color and placement to communicate priority.
- Binary controls such as Newest/Oldest should toggle immediately rather than opening a selection sheet.

## 8. Inputs and selection controls

- Standard input/select height: **44px**.
- Touch-layout input text: **16px** to prevent iOS focus zoom.
- Standard horizontal padding: **12px**.
- Labels use 14px medium text.
- Search inputs include a 16px leading search icon and no trailing placeholder ellipsis.
- Calendar day targets remain 44 × 44px on touch layouts.

### Period controls

Period selectors in content headers use a lightweight, borderless treatment:

- Visible label: 12px tertiary text, such as “Period”.
- Value: 14px medium secondary text.
- Trigger height: 40px.
- Trailing chevron: 16px.
- Date selectors use a chevron, not a calendar icon, when presented as a content-header period control.
- An applied custom range displays the actual value, for example `10/01/2026 - 10/20/2026`.

### Sort controls

- Place sorting beside the title of the content it affects.
- Binary sorting uses a direct toggle: `Newest ↓` / `Oldest ↑`.
- Period selectors and sort toggles must use the same size, weight, and color.
- Do not pair period and sort as two equally prominent full-width selects.

## 9. Cards and lists

- Use surface, spacing, and subtle shadow before adding borders.
- Standard card title: 16px medium in `text-text-heading`.
- Card description/metadata: 14px normal in `text-text-tertiary`.
- Financial values: semibold with tabular numerals.
- Compact list rows are typically 72–80px tall.
- Empty states should generally fit within 144–160px; avoid oversized empty cards.
- Do not add a circular decorative icon to every card row.
- Retain chevrons when they communicate navigation and status icons when they carry meaning.
- Account avatars are identity, not decoration, and may be retained.

## 10. Summary and metric cards

- Summary sections remain visible even when there is no data; render zero totals when zero is a truthful value.
- Keep the period selector in the same position during loading, empty, and populated states.
- Loading skeletons should match the final card geometry to avoid layout shift.
- Primary metric: 24px semibold.
- Secondary metrics: 18px semibold.
- Use `tabular-nums` for monetary values and counts that users compare vertically.

## 11. Mobile navigation

- Bottom navigation icons: 24px.
- Inactive stroke: 1.75px.
- Active stroke: 2px.
- Do not fill one icon or increase it to 2.5px to indicate selection.
- Active state is communicated primarily through semantic color.
- Labels use 12px medium text.
- Navigation respects bottom safe-area insets.

## 12. Loading, empty, error, and pagination states

- Preserve the surrounding page structure while data loads or is empty.
- Do not move filters between unrelated positions based on whether data exists.
- Empty states explain what will appear and how to proceed.
- Errors include a concise recovery action where possible.
- Do not display disabled Previous/Next controls or “Page 1 of 1” for a single page.
- Pending, blocked, offline, and synced states must use explicit text—not color alone.

## 13. Sheets, dialogs, and destructive actions

- Use bottom sheets for touch-layout selections and short workflows.
- Sheet title: 18px semibold.
- Dialog title: 18px semibold on touch layouts.
- Confirmation dialogs are reserved for consequential actions.
- Destructive actions use explicit verbs such as “Delete report”.
- Do not make every sheet action visually primary; preserve action hierarchy.

## 14. Accessibility

- Use semantic heading order and one `h1` per page.
- All icon-only buttons require an accessible label.
- Decorative icons use `aria-hidden="true"`.
- Status must never rely on color alone.
- Maintain visible keyboard focus.
- Preserve at least 44px touch targets for primary touch interactions.
- Interfaces must remain usable with browser zoom and enlarged text.
- Truncation is acceptable only when the full value is available elsewhere or through an accessible label/title.

## 15. Review checklist

Before shipping a new or changed screen, verify:

### Hierarchy

- Is there one clear page title?
- Are card titles distinct from metadata without using excessive weight?
- Does every content header visually belong to the content beneath it?
- Is there only one primary action per decision area?

### Dimensions

- Are mobile gutters 20px?
- Are standard touch controls 44px?
- Are inputs 16px on touch layouts?
- Are card padding and row heights appropriate for their content?

### Behavior

- Are period controls placed beside the data they affect?
- Is binary sorting an immediate toggle?
- Does custom-range selection display the applied dates?
- Are empty, loading, offline, and error states structurally stable?

### Visual QA

Check at minimum:

- 390px phone
- 430px phone
- 768px tablet
- 1024px tablet
- 1280px desktop
- 1440px desktop
- 125% and 200% browser zoom
- iOS Safari input focus behavior

### Engineering verification

Run:

```bash
pnpm --filter @oputech/sales-client typecheck
pnpm --filter @oputech/sales-client lint
pnpm --filter @oputech/sales-client test
pnpm --filter @oputech/sales-client build
```

Visual verification on a real phone remains required for meaningful mobile UI changes.
