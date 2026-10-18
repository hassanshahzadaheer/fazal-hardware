import { useState } from 'react';
import { SaleInvoice } from '../../../shared/types';
import { Modal, Field, Input, Textarea, Button, Banner } from '../../components/ui';

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
    <Modal
      open
      onClose={onClose}
      title={`Return — ${invoice.invoiceNumber}`}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" loading={submitting} onClick={handleSubmit}>
            Process Return
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Banner tone="warning">
          Returning items will restock the quantity returned, mark this invoice as returned, and reduce the
          linked customer's outstanding balance by the return value.
        </Banner>
        {error && (
          <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-left text-ink-muted text-[12px] uppercase tracking-wide border-b border-border">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Sold Qty</th>
                <th className="px-3 py-2 font-medium w-28">Return Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.items.map((item) => (
                <tr key={item.productId}>
                  <td className="px-3 py-2 text-ink">{item.productName}</td>
                  <td className="px-3 py-2 text-ink-muted">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={quantities[item.productId] ?? ''}
                      onChange={(e) => setQty(item.productId, e.target.value)}
                      className="w-20"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Wrong size delivered, customer changed mind"
          />
        </Field>
      </div>
    </Modal>
  );
}
