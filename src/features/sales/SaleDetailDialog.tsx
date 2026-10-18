import { SaleInvoice } from '../../../shared/types';
import { Modal } from '../../components/ui';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

export default function SaleDetailDialog({ invoice, onClose }: { invoice: SaleInvoice; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={invoice.invoiceNumber} size="lg">
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4 text-ink-muted">
          <div>
            <div className="text-xs">Customer</div>
            <div className="text-ink font-medium">{invoice.customerName ?? 'Walk-in'}</div>
          </div>
          <div>
            <div className="text-xs">Date</div>
            <div className="text-ink font-medium">{new Date(invoice.createdDate).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs">Price Tier</div>
            <div className="text-ink font-medium capitalize">{invoice.priceTier}</div>
          </div>
          <div>
            <div className="text-xs">Status</div>
            <div className="text-ink font-medium capitalize">{invoice.status}</div>
          </div>
        </div>

        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-sunken text-left text-ink-muted text-[12px] uppercase tracking-wide border-b border-border">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Rate</th>
                <th className="px-3 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-ink">{item.productName}</td>
                  <td className="px-3 py-2 text-ink-muted">
                    {item.quantity} {item.unit}
                    {item.length && item.width ? ` (${item.length}×${item.width})` : ''}
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
            <span>{formatPKR(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Discount</span>
            <span>-{formatPKR(invoice.discountAmount)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Freight</span>
            <span>{formatPKR(invoice.freightAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-ink pt-1 border-t border-border">
            <span>Total</span>
            <span>{formatPKR(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Paid</span>
            <span>{formatPKR(invoice.paidAmount)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
