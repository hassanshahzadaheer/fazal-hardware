import Database from 'better-sqlite3';

// Sequential, table-backed document counters (PRD §9.4 note: avoid the
// original spec's random-suffix collision risk — see Architecture Decisions
// in docs/IMPLEMENTATION_PLAN.md).
export function nextSequence(db: Database.Database, docType: string): number {
  return db.transaction(() => {
    const info = db
      .prepare('UPDATE doc_sequences SET current_value = current_value + 1 WHERE doc_type = ?')
      .run(docType);
    if (info.changes === 0) {
      throw new Error(`Unknown doc_type for sequence: ${docType}`);
    }
    const row = db.prepare('SELECT current_value FROM doc_sequences WHERE doc_type = ?').get(docType) as {
      current_value: number;
    };
    return row.current_value;
  })();
}

function datestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export function generateInvoiceNumber(db: Database.Database): string {
  const seq = nextSequence(db, 'sale_invoice');
  return `INV-${datestamp()}-${String(seq).padStart(4, '0')}`;
}

export function generatePONumber(db: Database.Database): string {
  const seq = nextSequence(db, 'purchase_order');
  return `PO-${datestamp()}-${String(seq).padStart(4, '0')}`;
}

export function generateQuotationNumber(db: Database.Database): string {
  const seq = nextSequence(db, 'quotation');
  return `QT-${String(seq).padStart(6, '0')}`;
}
