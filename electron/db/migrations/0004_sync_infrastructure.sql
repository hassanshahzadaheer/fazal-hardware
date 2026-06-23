-- ===== Offline-first Sync Infrastructure =====

-- Sync queue for tracking changes that need to be synced to backend
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,          -- 'product', 'sale', 'quotation', etc
  entity_id INTEGER NOT NULL,         -- ID of the entity being changed
  operation TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
  payload JSON NOT NULL,              -- Full data snapshot of the change
  local_at TEXT NOT NULL,             -- When the change was made locally (ISO datetime)
  synced_at TEXT,                     -- When synced to cloud (NULL if pending)
  sync_attempt_count INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
CREATE INDEX idx_sync_queue_local_at ON sync_queue(local_at);

-- ===== Product Stock Ledger =====

-- Tracks all stock movements (purchases, sales, adjustments, etc)
CREATE TABLE IF NOT EXISTS product_ledger_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('opening', 'purchase', 'sale', 'return', 'adjustment', 'damage', 'sample')),
  transaction_id INTEGER,            -- Reference to the transaction (purchase_id, sale_id, etc)
  quantity REAL NOT NULL,
  balance_after REAL NOT NULL,
  transaction_date TEXT NOT NULL,
  reference TEXT,                    -- Purchase order#, Invoice#, etc
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_product_ledger_product ON product_ledger_items(product_id);
CREATE INDEX idx_product_ledger_date ON product_ledger_items(transaction_date);
CREATE INDEX idx_product_ledger_type ON product_ledger_items(transaction_type);

-- ===== Settings for Offline Sync =====

-- Track last sync times to support incremental/delta sync
CREATE TABLE IF NOT EXISTS sync_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_full_sync TEXT,               -- Last full sync timestamp
  last_delta_sync TEXT,              -- Last incremental sync
  backend_url TEXT,                  -- API endpoint
  device_id TEXT UNIQUE,             -- Unique ID for this device
  is_syncing INTEGER DEFAULT 0,      -- Flag to prevent concurrent syncs
  pending_count INTEGER DEFAULT 0,   -- Count of pending changes
  updated_at TEXT NOT NULL
);

-- Initialize sync metadata
INSERT OR IGNORE INTO sync_metadata (id, device_id, updated_at) 
VALUES (1, printf('%s-%s', datetime('now'), hex(randomblob(8))), datetime('now'));
