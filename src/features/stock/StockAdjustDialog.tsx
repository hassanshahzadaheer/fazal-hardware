import { useState, FormEvent } from 'react';
import { ProductWithNames } from '../../../shared/types';
import { notify } from '../../components/shared/NotificationProvider';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';

interface Props {
  product: ProductWithNames;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_OPTIONS = [
  { value: 'adjustment', label: 'Adjustment (+/-)' },
  { value: 'wastage', label: 'Wastage (subtract)' },
  { value: 'opening', label: 'Opening Balance (add)' },
] as const;

export default function StockAdjustDialog({ product, onClose, onSaved }: Props) {
  const [type, setType] = useState<'adjustment' | 'wastage' | 'opening'>('adjustment');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const qty = Number(quantity);
    if (!qty) {
      setError('Enter a non-zero quantity.');
      return;
    }
    setSubmitting(true);
    const res = await window.api.stock.adjust({
      productId: product.id,
      type,
      quantity: qty,
      notes: notes || null,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      notify(res.error.message, 'error');
      return;
    }
    notify('Stock adjusted', 'success');
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Adjust Stock — ${product.name}`}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="stock-adjust-form" variant="primary" loading={submitting}>
            Save Adjustment
          </Button>
        </>
      }
    >
      <form id="stock-adjust-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <p className="text-sm text-ink-muted">
          Current stock: <span className="font-medium text-ink">{product.stockOnHand} {product.baseUnit}</span>
        </p>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity" hint={type === 'adjustment' ? '(+ or -)' : undefined}>
          <Input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Reason for adjustment"
          />
        </Field>
      </form>
    </Modal>
  );
}
