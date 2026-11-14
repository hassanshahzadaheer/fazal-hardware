# Meeting Notes — Client Call — 2026-11-14

Follow-up client review of the Add Product screen, Sales screen, navigation and a new Sales Listing / Quotation requirements. Builds on [2026-11-09-client-call.md](2026-11-09-client-call.md).

## 1. Add Product Screen

### Fields to remove (circled in red on client screenshot)
- **Pricing:** Min Sale Price, Wholesale Price
- **Units:** Selling Unit, Purchase Unit, Items Per Purchase Unit (entire Units section)
- **Other:** Variant Details, Shelf/Rack Location
- **Barcode:** the field circled in the screenshot is to be removed from the *form layout*, but see "Barcode" below — barcode must still work in the Add Product modal.

> ⚠️ Open point: the screenshot circles Barcode as a removal, yet the notes say "barcode needs to be functional on the Add Product modal". Confirm with client: keep the Barcode field (and make scan/type work) vs. remove it. Current reading: **keep and make functional**; the other circled fields are removed.

### Dropdowns
- All dropdowns must be **searchable** (type to filter).
- **Enter key opens the list** (keyboard-only operation; consistent with the Enter/Tab navigation requirement from 2026-11-09).

### Categories
- Only **3 categories**: **Wood**, **Plywood**, **Hardware**.

### Product Code
- Can be created **without dashes**.
- Users may use **symbols / special characters** (supersedes the dash-only rule from 2026-11-09).

### Barcode
- Barcode input in the Add Product modal must be **functional** (scan or type).

### Length / Width → Sales auto-fetch
- If a product is added with **Length and Width**, the Sales screen must **auto-fetch** those dimensions.
- No re-entry of L/W in sales (the blank L / W cells circled in the Sales "Review Items" screenshot should be pre-filled from the product).

## 2. Navigation
- Sidebar label **"Suppliers" → "Company"**.

## 3. Sales Module

### A. Sales Listing
Currently a **Refresh** button is required to show records — this behaviour must change (records load automatically).

- Add **search**.
- Add **date-wise filtering**.
- Add **ascending / descending sort by date**.
- Clicking the **date column arrow toggles** asc/desc.

### B. Sales View and Edit
The View option shows the products belonging to a selected sale. Required:
- View all products in a sale.
- **Edit** an existing sales record.
- Update product **quantities** and **prices**.
- **Save** changes to the existing record.
- Support **bulk editing** of multiple product entries where required.
- Options to **add** and **delete** line entries.

## 4. Quotation Screen

### C. Automatic Product Details
After selecting a product, the system should auto-retrieve:
- Product name
- Company name
- Product number
- UV
- Dimensions
- Size
- Weight
- Height
- Available rate / price
- Other stored product details

The user should only need to enter **quantity** and change **price** when required.

### D. Keyboard-Based Data Entry
Enter-key flow to minimise mouse use:
1. Product search → select product
2. Product selection → move to Quantity
3. Quantity → move to Price
4. Price → move to next field
5. Final entry → move to Save

## Developer Notes / Do Not Forget

1. Resolve the Barcode ambiguity (see Add Product) before removing fields.
2. Product Code validation must now **allow any characters** — drop the dash-only pattern added after the 2026-11-09 call.
3. Removing Min Sale / Wholesale Price, Units and Variant/Rack fields affects the Sales screen too (Price Type "Wholesale", selling unit, rack search) — check dependents before deleting schema/columns; prefer hiding in UI over dropping DB columns.
4. Category list is fixed to 3 values — check existing products with other categories (migration/fallback).
5. Sales L/W auto-fetch relies on product dimensions being stored (Length/Width fields remain on the product form).
6. Sales edit must adjust stock/ledger consistently when quantities change, add or delete lines.
