# Fazal Plywood Store - Modernization PRD
## Offline-First Desktop ERP System

**Date**: June 2026  
**Status**: MVP Phase - Products Management Complete  
**Timeline**: Phase 1 (2 weeks) - Products workflow complete and production-ready

---

## 1. Executive Summary

### Problem Statement
Fazal Plywood Store operates with a legacy Oracle 10g desktop application that:
- Cannot handle unreliable internet connectivity
- Lacks modern UI/UX standards
- Has infrastructure tied to single server  
- Presents data visibility issues

### Solution
Transform into a modern **Electron-based desktop application** with:
- **Offline-first architecture**: Works seamlessly without internet
- **Automatic sync**: Syncs to cloud backend (Hostinger) when online
- **Modern interface**: Clean, responsive UI using React + Tailwind
- **Local database**: SQLite for fast, reliable local operations
- **Zero data loss**: All transactions recorded locally before sync

### Key Features - Phase 1 (MVP)
✅ **Products Management** - Complete CRUD with inventory tracking  
✅ **Offline-first operations** - No internet dependency  
✅ **Automatic sync service** - Background sync to cloud  
⏳ Phase 2: Sales/POS transactions  
⏳ Phase 3: Quotations & Purchases  
⏳ Phase 4: Inventory Ledger & Reports  

---

## 2. Technical Architecture

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop Runtime** | Electron + Node.js | Cross-platform desktop app |
| **Frontend** | React 18 + TypeScript | Modern reactive UI |
| **Styling** | Tailwind CSS | Production-grade design |
| **Local Database** | SQLite + better-sqlite3 | Offline data persistence |
| **State Management** | Zustand | Lightweight app state |
| **Data Sync** | Custom IPC + HTTP | Offline-first sync engine |
| **Backend** | Node.js Express | REST API (future: cloud hosted) |
| **Cloud Hosting** | Hostinger | Backend & sync endpoint |

### 2.2 Offline-First Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron App (Desktop)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌────────────────────────┐  │
│  │   React UI       │─────────│   Zustand Store        │  │
│  │  (Components)    │         │  (App State)           │  │
│  └──────────────────┘         └────────────────────────┘  │
│           │                            │                   │
│           └────────────────┬───────────┘                   │
│                            │                               │
│                    ┌───────▼───────┐                       │
│                    │   IPC Bridge  │                       │
│                    │ (Main Process)│                       │
│                    └───────┬───────┘                       │
│                            │                               │
│        ┌───────────────────┼───────────────────┐           │
│        │                   │                   │           │
│   ┌────▼─────┐    ┌────────▼────────┐   ┌────▼──────┐    │
│   │ SQLite   │    │ Sync Engine     │   │ File Ops  │    │
│   │ Database │    │ (Queue & Retry) │   │ (Images)  │    │
│   └────┬─────┘    └────────┬────────┘   └──────────┘    │
│        │                   │                              │
│        │                   ├──(HTTP when online)──┐       │
│        └───────────────────┘                      │       │
│                                                   │       │
└───────────────────────────────────────────────────┼───────┘
                                                    │
                         ┌──────────────────────────▼──┐
                         │  REST API Backend           │
                         │  (Hosted on Hostinger)      │
                         │  - Sync Endpoint            │
                         │  - Data Merge Logic         │
                         │  - Conflict Resolution      │
                         └─────────────────────────────┘
```

### 2.3 Sync Strategy (Conflict-Free)

**Local Priority Model**:
1. All writes happen immediately on local SQLite
2. Changes are queued in `sync_queue` table
3. When online, changes are sent to backend
4. Backend merges using `updated_at` timestamps
5. Latest version wins (deterministic)

```sql
-- Sync queue structure
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY,
  entity_type TEXT,          -- 'product', 'sale', etc
  entity_id INTEGER,
  operation TEXT,            -- 'CREATE', 'UPDATE', 'DELETE'
  payload JSON,              -- Full data snapshot
  local_at DATETIME,         -- When changed locally
  synced_at DATETIME,        -- When synced to cloud (NULL if pending)
  status TEXT                -- 'pending', 'synced', 'conflict'
);
```

---

## 3. Products Management Feature (MVP - Complete)

### 3.1 Feature Scope

**Complete product lifecycle management**:
- Create/Edit/Delete products
- Organize by categories and suppliers
- Track inventory (stock levels, reorder points)
- Manage pricing (purchase, sale, minimum prices)
- Support product images
- Soft delete with restore capability

### 3.2 Data Model

```typescript
interface Product {
  id: number;
  code: string;              // Unique product code
  name: string;              // Product name
  categoryId: number;        // Category reference
  supplierId: number;        // Primary supplier
  colorId: number;           // Color/variant
  unit: 'pcs' | 'sheet' | 'sqft' | 'rft' | 'kg' | 'set';
  packSize: string;          // Packaging info
  isCutToSize: boolean;      // Custom cutting available?
  purchasePrice: number;     // Cost (in paisa)
  salePrice: number;         // Selling price (in paisa)
  minPrice: number;          // Minimum allowed sale price
  defaultLength: number;     // For cut-to-size items
  defaultWidth: number;      // For cut-to-size items
  reorderLevel: number;      // When to reorder
  openingStock: number;      // Initial stock count
  currentStock: number;      // Live stock (updated by transactions)
  picturePath: string;       // Local image path
  isActive: boolean;
  createdAt: datetime;
  updatedAt: datetime;
  deletedAt: datetime;       // Soft delete
}
```

### 3.3 UI Flows

#### 3.3.1 Product List & Search
```
┌─ Products Master Screen ────────────────────────────────┐
│                                                         │
│  [Search] [Filter] [+ New Product]                    │
│                                                         │
│  Search by: code | name | category | supplier          │
│  Filters: Low Stock | Inactive | Active               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Code  │ Name           │ Category  │ Stock │ Px │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ AL-P4 │ ALUMINUM PATT  │ Alum Patt │ 45   │... │   │
│  │ CH-A8 │ CHROME ANGLE 8 │ Chrome    │ 12   │... │   │
│  │ ST-A6 │ STEEL ANGLE 6  │ Steel     │ 3 ⚠️ │... │   │ ← Low stock alert
│  └─────────────────────────────────────────────────┘   │
│  [Edit] [View] [Delete] [Export]                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 3.3.2 Create/Edit Product
```
┌─ Add/Edit Product ──────────────────────────────────────┐
│                                                         │
│ Product Code: [_________________]                      │
│ Product Name: [_________________] *Required             │
│                                                         │
│ Category: [Dropdown ▼]                                 │
│ Supplier: [Dropdown ▼]                                 │
│ Color/Model: [Dropdown ▼]                              │
│                                                         │
│ ┌─ Pricing ───────────────────────────────────────┐   │
│ │ Purchase Price: [_____] (per unit)              │   │
│ │ Sale Price:     [_____] (per unit)              │   │
│ │ Min Price:      [_____] (floor price)           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─ Inventory ─────────────────────────────────────┐   │
│ │ Unit Type: [Dropdown: pcs/sheet/sqft/rft/kg]   │   │
│ │ Opening Stock: [_____]                          │   │
│ │ Reorder Level: [_____]                          │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─ Dimensions (if cut-to-size) ───────────────────┐   │
│ │ ☐ Cut-to-size available                         │   │
│ │ Default Length: [_____]                         │   │
│ │ Default Width:  [_____]                         │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Product Image: [Upload Image] [Preview]               │
│                                                         │
│ [Cancel] [Save]                                        │
└─────────────────────────────────────────────────────────┘
```

### 3.4 API Endpoints (IPC)

**All operations through `window.api` (IPC)**:

```typescript
// List products with pagination
await window.api.products.list({
  search?: string,        // Search code/name
  categoryId?: number,
  supplierId?: number,
  onlyLowStock?: boolean,
  page: 1,
  pageSize: 50
})
// Returns: { ok: true, data: { items: Product[], totalCount: 123, page: 1, pageSize: 50 } }

// Get single product
await window.api.products.get(id)
// Returns: { ok: true, data: Product }

// Create product
await window.api.products.create({
  code: "AL-P4",
  name: "Aluminum Patti 4 Inch",
  categoryId: 1,
  salePrice: 120000,  // in paisa
  reorderLevel: 50,
  // ... other fields
})
// Returns: { ok: true, data: Product }

// Update product
await window.api.products.update(id, {
  salePrice: 130000,
  currentStock: 45,
  // ... only changed fields
})
// Returns: { ok: true, data: Product }

// Soft delete (deactivate)
await window.api.products.deactivate(id)
// Returns: { ok: true, data: true }

// Get product stock ledger
await window.api.products.ledger(id)
// Returns: { ok: true, data: { opening, transactions: [...], closing } }
```

---

## 4. Real Data Integration

### 4.1 Data Mapping from Oracle

| Oracle Table | New Table | Status |
|-------------|-----------|--------|
| TBL_PRODUCT | products | ✅ Ready |
| TBL_CATEGORY | categories | ✅ Ready |
| TBL_CITY | cities | ✅ Ready |
| TBL_CUSTOMER | customers | ✅ Ready |
| TBL_PRODLEDGER | stock_ledger_items | ✅ Ready |

### 4.2 Data Seeding

**CSV import script** (`scripts/import-data.ts`):
```bash
npm run import-data -- --file _data/TBL_PRODUCT.csv --table products
```

Handles:
- Type conversions (NUMBER to INTEGER)
- Missing values → defaults
- Duplicate code handling → append suffix
- Image paths → normalize to local storage

---

## 5. Offline-First Implementation

### 5.1 Sync Queue Management

```typescript
// When user edits product offline:
1. Update local SQLite immediately ✓
2. Add entry to sync_queue table
3. Show local "syncing" indicator
4. When online detected → batch sync to backend
5. Backend returns merged data (conflict-free)
6. Mark as synced in queue
```

### 5.2 Conflict Resolution (Deterministic)

**Rule: Latest update wins** (based on `updated_at` timestamp)

```typescript
// Example: Same product edited offline in two branches
LocalChange: {  lastModified: 2026-06-22 10:30, price: 130000 }
RemoteChange: { lastModified: 2026-06-22 10:25, price: 125000 }

Result: LocalChange wins (10:30 > 10:25)
```

---

## 6. Phase 1 Deliverables

### 6.1 Technical Deliverables
- ✅ Complete Products API handlers (main process)
- ✅ Products management UI (Create/Read/Update/Delete)
- ✅ Real data from Oracle dump (CSV → SQLite)
- ✅ Offline-first sync service
- ✅ Product image storage management
- ✅ Low stock alerts
- ✅ Search and filtering
- ✅ Full test coverage

### 6.2 Documentation
- ✅ Architecture decision records (ADRs)
- ✅ API documentation
- ✅ Deployment guide
- ✅ User manual (features)
- ✅ Data sync specifications

### 6.3 Testing
- Unit tests for business logic
- Integration tests for IPC
- E2E tests for complete workflows
- Offline scenario tests

---

## 7. Design System & UI Standards

### 7.1 Color Palette (Brand Colors)
- Primary: `#1F6B3B` (Dark Green)
- Secondary: `#16A34A` (Light Green)
- Accent: `#3B82F6` (Blue)
- Error: `#DC2626` (Red)
- Warning: `#F59E0B` (Orange)
- Success: `#10B981` (Teal)
- Background: `#F7F8FA` (Off-white)

### 7.2 Component Library
- Form inputs with validation
- Data tables with sorting/pagination
- Modal dialogs for confirmations
- Toast notifications
- Loading states
- Error states

### 7.3 Responsive Design
- Desktop-first (1280px+ optimal)
- Tablet support (768px+)
- Mobile (fallback, not primary)

---

## 8. Performance & Scalability

### 8.1 Database Optimization
- Indexes on frequently searched columns
- WAL mode for concurrent access
- Pragma settings for speed
- Regular VACUUM for cleanup

### 8.2 UI Performance
- Virtual scrolling for large lists (10,000+ items)
- Memoization of expensive computations
- Lazy loading of images
- Background sync doesn't block UI

### 8.3 Sync Performance
- Batch queue processing (100 items per request)
- Exponential backoff on failures
- Delta sync (only changed items)
- Compression for network bandwidth

---

## 9. Security Considerations

### 9.1 Local Security
- Database encryption at rest (future)
- PIN/password for app access
- Session timeout after 30 minutes idle
- Audit log for all transactions

### 9.2 Sync Security
- HTTPS only to backend
- JWT token authentication
- Request signing with HMAC
- Rate limiting on sync endpoint

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Offline time** | 100% | Works without internet |
| **Sync time** | < 2s | For 100 product changes |
| **UI Response** | < 200ms | Any action completion |
| **Data accuracy** | 100% | No lost transactions |
| **Uptime** | 99.5% | Month-over-month |

---

## 11. Go-Live Checklist (Phase 1)

- [ ] Products API fully tested
- [ ] UI tested on Windows/Mac
- [ ] Real data imported successfully
- [ ] Offline mode verified
- [ ] Sync service working
- [ ] Documentation complete
- [ ] User training done
- [ ] Rollback plan ready
- [ ] Monitoring dashboard active

---

## 12. Future Phases (Roadmap)

### Phase 2 (Weeks 3-4): Sales & POS
- Sale invoice creation
- Quotation management
- Quick POS mode
- Receipt printing

### Phase 3 (Weeks 5-6): Purchases & Stock
- Purchase orders
- Stock receipts
- Returns management
- Supplier management

### Phase 4 (Weeks 7-8): Ledgers & Reports
- Customer ledger
- Supplier ledger
- Stock ledger
- Financial reports

### Phase 5 (Weeks 9-10): Advanced Features
- Customer loyalty program
- Expense tracking
- Multi-user support
- Backup & restore

---

## Appendix A: Data Statistics

From Oracle 10g Backup (May 25, 2025):

| Table | Total Rows | Status |
|-------|-----------|--------|
| TBL_PRODUCT | 2,469 | ✅ Complete |
| TBL_PRODLEDGER | 3,502 | Mapped to ledger |
| TBL_CATEGORY | 217 | ✅ Complete |
| TBL_CUSTOMER | 3 | Ready |
| TBL_QUOT | 118 | Phase 2 |
| **Total** | **9,716** | **Ready** |

---

## Appendix B: Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Network failure | Medium | Offline-first design |
| Data corruption | Critical | Local backups, WAL mode |
| User confusion | Medium | In-app tutorials, help docs |
| Performance lag | Medium | Database optimization |
| Sync conflicts | High | Timestamp-based resolution |

