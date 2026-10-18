import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Quotation } from '../../../shared/types';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

export default function ViewQuotationDialog({
  quotation,
  onClose,
}: {
  quotation: Quotation;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const handleConvert = () => {
    // NewSalePage reads this via useLocation().state and pre-fills the cart,
    // passing quotationId back on submit so sales.create() can atomically link
    // + flip the quotation's status (the fix for the legacy conversion bug).
    navigate('/sales/new', { state: { fromQuotation: quotation } });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827]">{quotation.quotationNumber}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4 text-[#6B7280]">
            <div>
              <div className="text-xs">Customer</div>
              <div className="text-[#111827] font-medium">{quotation.customerName ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs">Valid Until</div>
              <div className="text-[#111827] font-medium">{quotation.validUntil ?? '—'}</div>
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
              {quotation.items.map((item, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-[#111827]">{item.productName}</td>
                  <td className="px-3 py-2 text-[#6B7280]">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-3 py-2 text-[#6B7280]">{formatPKR(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-[#111827] font-medium">{formatPKR(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between font-semibold text-[#111827] pt-2 border-t border-[#E5E7EB]">
            <span>Total</span>
            <span>{formatPKR(quotation.total)}</span>
          </div>

          {quotation.status !== 'converted' && (
            <button
              onClick={handleConvert}
              className="w-full py-2.5 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D]"
            >
              Convert to Sale Invoice
            </button>
          )}
          {quotation.status === 'converted' && (
            <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-2 text-center">
              Already converted to invoice #{quotation.convertedToInvoiceId}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
