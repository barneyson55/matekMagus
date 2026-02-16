# UI-BUFF-001 — Header buff tooltip hover fix

## Context
In the top header (`header-main`), inside `div.buffs`, the buff tooltip/popup jumps upward outside the app window on mouse hover, making it unreadable.

## Goal
Ensure buff tooltips are always visible within the app viewport when hovering a buff icon.

## Implementation notes
- Locate the header buff UI (search for `div.buffs`, `.buffs`, `.buff-tooltip`, `.buff-icon`).
- Fix positioning for header context:
  - Prefer showing tooltip **below** the icon in the header (top-of-viewport safe).
  - Ensure parent is `position: relative` and tooltip uses `position: absolute`.
  - Make sure containers do not clip tooltips (`overflow: visible` where appropriate).
  - Keep `z-index` high enough so tooltip appears above header/content.

### Suggested CSS direction (adapt to existing code)
- In header context, override tooltip placement:
  - `top: calc(100% + 8px); bottom: auto;`
  - `left: 50%; transform: translateX(-50%);`
  - optional: `max-width`, `white-space`, `pointer-events: none`.

## Acceptance Criteria
- Hovering a buff icon in the header shows a tooltip that is fully visible (not outside the app window).
- Tooltip does not cause layout shift.
- Works at common window sizes.
- Existing tests remain green (`npm test` / e2e if present).

## Verify
- Manual: run the app, hover header buff icons, observe tooltip placement.
- If you have Playwright: add/adjust an e2e test to hover and assert tooltip is visible (optional but recommended).
