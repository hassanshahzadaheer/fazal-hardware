import { X } from 'lucide-react';
import { SaleInvoice } from '../../../shared/types';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

export default function SaleDetailDialog({ invoice, onClose }: { invoice: SaleInvoice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827]">{invoice.invoiceNumber}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4 text-[#6B7280]">
            <div>
              <div className="text-xs">Customer</div>
              <div className="text-[#111827] font-medium">{invoice.customerName ?? 'Walk-in'}</div>
            </div>
            <div>
              <div className="text-xs">Date</div>
              <div className="text-[#111827] font-medium">{new Date(invoice.createdDate).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs">Price Tier</div>
              <div className="text-[#111827] font-medium capitalize">{invoice.priceTier}</div>
            </div>
            <div>
              <div className="text-xs">Status</div>
              <div className="text-[#111827] font-medium capitalize">{invoice.status}</div>
            </div>
          </div>

          <table className="w-full">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280] text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Rate</th>
                <th className="px-3 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-[#111827]">{item.productName}</td>
                  <td className="px-3 py-2 text-[#6B7280]">
                    {item.quantity} {item.unit}
                    {item.length && item.width ? ` (${item.length}×${item.width})` : ''}
                  </td>
                  <td className="px-3 py-2 text-[#6B7280]">{formatPKR(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-[#111827] font-medium">{formatPKR(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1.5 pt-2 border-t border-[#E5E7EB]">
            <div className="flex justify-between text-[#6B7280]">
              <span>Subtotal</span>
              <span>{formatPKR(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Discount</span>
              <span>-{formatPKR(invoice.discountAmount)}</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Freight</span>
              <span>{formatPKR(invoice.freightAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-[#111827]">
              <span>Total</span>
              <span>{formatPKR(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Paid</span>
              <span>{formatPKR(invoice.paidAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
