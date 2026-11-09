# Meeting Notes — Client Call — 2026-11-09

Client reviewed the "Add/Update Product" screen (snapshot shared) and requested a few changes before we proceed.

## Reference
Client-shared screenshot: Inventory Management System → Product's tab (fields: Product Code, Product Name, Company, Category, Color/Mode, Packing Size, Pur Price, Sale Price, Min Sale Price, Length, Width, Reorder Level; grid columns: ID, Name, Category, Balance; filter: Starting With / Containing).

## Requested Changes

- **Product Code field**
  - Needs its own **separate text box**, distinct from the auto-generated ID shown in the grid.
  - Client wants to manually enter/view a code here.
  - Format: **dashes only** (e.g. `UV-NOVA-7946`) — **no commas**, no other separators.

- **Match field layout to client's screenshot**
  - We've already built part of this screen, but it must be reconciled against the client's reference image so it matches his mental model.
  - Go field-by-field against the screenshot list above (names, order, grouping) — don't change our overall structure, just align the fields so it's recognizable to him.

- **Full keyboard navigation — no mouse**
  - Client explicitly wants to operate the Add Product form using **Enter / Tab only**, no mouse clicks.
  - Needs correct tab order through all fields, and Enter should behave like Tab (move to next field / submit on the last field).

## Developer Notes / Do Not Forget

1. Product Code is a **manual, user-editable text input** — not just a display of the system-generated ID. Confirm with client whether it's free-text or validated against the `XX-XXX-####` dash pattern before building validation.
2. Audit current Add Product form fields against the screenshot and list any mismatches before changing code.
3. Implement explicit `tabIndex` order and an Enter-key handler that advances focus field-to-field (and submits on the final field) — this is a client-stated requirement, not a nice-to-have.
