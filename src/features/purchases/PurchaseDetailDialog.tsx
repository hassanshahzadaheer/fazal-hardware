import { PurchaseOrder } from '../../../shared/types';
import { Modal } from '../../components/ui';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

export default function PurchaseDetailDialog({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={po.poNumber} size="lg">
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-3 gap-4 text-ink-muted">
          <div>
            <div className="text-xs">Supplier</div>
            <div className="text-ink font-medium">{po.supplierName ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs">Date</div>
            <div className="text-ink font-medium">{new Date(po.createdDate).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs">Status</div>
            <div className="text-ink font-medium capitalize">{po.status}</div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
              <tr>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Product</th>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Qty</th>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Rate</th>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {po.items.map((item, i) => (
                <tr key={i} className="hover:bg-surface-sunken/60 transition-colors">
                  <td className="px-3 py-2 text-ink">{item.productName}</td>
                  <td className="px-3 py-2 text-ink-muted">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-3 py-2 text-ink-muted">{formatPKR(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-ink font-medium">{formatPKR(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-surface-sunken border border-border rounded-md p-4 space-y-1.5">
          <div className="flex justify-between text-ink-muted">
            <span>Subtotal</span>
            <span>{formatPKR(po.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Freight</span>
            <span>{formatPKR(po.freightAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold text-ink pt-1.5 border-t border-border">
            <span>Total</span>
            <span>{formatPKR(po.total)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Paid</span>
            <span>{formatPKR(po.paidAmount)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
