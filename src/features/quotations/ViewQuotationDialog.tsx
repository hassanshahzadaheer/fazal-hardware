import { useNavigate } from 'react-router-dom';
import { Quotation } from '../../../shared/types';
import { Modal, Button } from '../../components/ui';

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
    <Modal
      open
      onClose={onClose}
      title={quotation.quotationNumber}
      size="lg"
      footer={
        quotation.status !== 'converted' ? (
          <Button type="button" variant="primary" onClick={handleConvert} className="w-full">
            Convert to Sale Invoice
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4 text-ink-muted">
          <div>
            <div className="text-xs">Customer</div>
            <div className="text-ink font-medium">{quotation.customerName ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs">Valid Until</div>
            <div className="text-ink font-medium">{quotation.validUntil ?? '—'}</div>
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
              {quotation.items.map((item, i) => (
                <tr key={i}>
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

        <div className="bg-surface-sunken border border-border rounded-md p-4">
          <div className="flex justify-between text-lg font-semibold text-ink">
            <span>Total</span>
            <span>{formatPKR(quotation.total)}</span>
          </div>
        </div>

        {quotation.status === 'converted' && (
          <div className="text-xs bg-success-soft text-success border border-success/20 rounded-md px-3 py-2 text-center">
            Already converted to invoice #{quotation.convertedToInvoiceId}.
          </div>
        )}
      </div>
    </Modal>
  );
}
