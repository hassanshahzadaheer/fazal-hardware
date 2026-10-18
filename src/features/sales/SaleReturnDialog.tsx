import { useState } from 'react';
import { X } from 'lucide-react';
import { SaleInvoice } from '../../../shared/types';

export default function SaleReturnDialog({
  invoice,
  onClose,
  onReturned,
}: {
  invoice: SaleInvoice;
  onClose: () => void;
  onReturned: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setQty = (productId: number, value: string) => setQuantities((prev) => ({ ...prev, [productId]: value }));

  const handleSubmit = async () => {
    setError(null);
    const items = invoice.items
      .map((item) => ({ productId: item.productId, quantity: Number(quantities[item.productId] || 0) }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      setError('Enter a return quantity for at least one item.');
      return;
    }

    setSubmitting(true);
    const res = await window.api.sales.return(invoice.id, items, notes || null);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    onReturned();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827]">Return — {invoice.invoiceNumber}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280] text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Sold Qty</th>
                <th className="px-3 py-2 font-medium w-28">Return Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {invoice.items.map((item) => (
                <tr key={item.productId}>
                  <td className="px-3 py-2 text-[#111827]">{item.productName}</td>
                  <td className="px-3 py-2 text-[#6B7280]">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={quantities[item.productId] ?? ''}
                      onChange={(e) => setQty(item.productId, e.target.value)}
                      className="w-full px-2 py-1 border border-[#E5E7EB] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#6B7280] hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
            >
              {submitting ? 'Processing…' : 'Process Return'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
