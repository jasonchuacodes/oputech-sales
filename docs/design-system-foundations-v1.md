# Oputech Sales — Design System Foundations v1.0

**Status:** Active implementation source of truth
**Platform:** Mobile-first POS and business operations PWA
**Reference:** Screenshots under `/assets`

## Product intent

Oputech Sales should feel fast, calm, and dependable during daily sales work. The interface prioritizes touch interaction, clear financial information, offline confidence, and low-friction transaction entry.

## Adaptive layout

- **Phone, below 768px:** bottom navigation, one-column pages, full-width bottom sheets.
- **Tablet, 768–1199px:** compact navigation rail, touch-sized controls, adaptive one/two-column pages, constrained sheets.
- **Desktop, 1200px and above:** persistent sidebar, split panes, and tables where scanning benefits from them.
- Standard phone page gutter: `20px`.
- Account for device safe-area insets in fixed navigation and sheets.

## Color tokens

| Token   |     Value | Purpose                         |
| ------- | --------: | ------------------------------- |
| Canvas  | `#F5F5F5` | Application background          |
| Surface | `#FFFFFF` | Cards, sheets, inputs           |
| Text    | `#101010` | Primary content                 |
| Primary | `#17434D` | Actions and selected navigation |
| Success | `#32765A` | Synced, complete, active        |
| Warning | `#B47B31` | Pending and attention           |
| Error   | `#B64E4A` | Destructive and failed          |
| Info    | `#47769B` | Informational state             |

Status must never be communicated by color alone.

## Typography

Use **Manrope** at weights 400, 500, 600, and 700. Use tabular numerals for financial values. Inputs remain at least 16px on touch layouts to prevent mobile browser zoom.

## Components

- Primary controls are at least `48px` high.
- Secondary icon actions have at least a `44 × 44px` target.
- Input radius: `8px`; card radius: `12px`; sheet radius: `20px`.
- Default cards use a white background and `shadow-xs`, not a visible outline.
- Borders are reserved for inputs, separators, selected states, and semantic emphasis.
- Selects and date pickers open as bottom sheets on touch layouts.
- Confirmation dialogs are reserved for consequential actions.
- Responsive data uses cards on phone/tablet and may become a table on wide desktop.

## Navigation

Admin navigation: Home, Sell, Activity, Reports, More. Catalog and Users are available under More and directly in the desktop sidebar.

Sales-user navigation: Sell, Activity, Reports, More.

## Core workflows

1. **Sell:** search products → add quantities → review cart → choose payment → confirm.
2. **Activity:** choose date → review sales/expenses → log expenses, manage unprocessed entries, or generate a report for pending activity.
3. **Reports:** review generated reports → admin review/remittance.
4. **Catalog:** search/filter → add/edit product → confirm destructive actions.
5. **Users:** review status/roles → add/edit/reset password.

## Offline behavior

- Saving a sale or expense succeeds locally before synchronization.
- Pending, blocked, offline, and synced states must be explicit.
- Never imply that an online-only administrative mutation succeeded while offline.
- Preserve drafts and queued operations across reloads.
