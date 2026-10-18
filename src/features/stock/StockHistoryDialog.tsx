import { useQuery } from '@tanstack/react-query';
import { ProductWithNames, StockMovement } from '../../../shared/types';
import { Modal } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

interface Props {
  product: ProductWithNames;
  onClose: () => void;
}

export default function StockHistoryDialog({ product, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['stock-history', product.id],
    queryFn: async () => {
      const res = await window.api.stock.history(product.id);
      if (!res.ok) throw new Error(res.error.message);
      return res.data as StockMovement[];
    },
  });

  return (
    <Modal open onClose={onClose} title={`Stock History — ${product.name}`} size="md">
      {isLoading ? (
        <TableSkeleton cols={2} />
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-ink-muted px-2 py-4 text-center">No movements recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border -mx-2">
          {(data ?? []).map((m) => (
            <li key={m.id} className="py-2.5 px-2 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-ink capitalize">{m.type.replace('_', ' ')}</div>
                <div className="text-xs text-ink-muted">
                  {new Date(m.createdDate).toLocaleString()}
                  {m.notes ? ` — ${m.notes}` : ''}
                </div>
              </div>
              <span className={m.quantity >= 0 ? 'text-success font-medium' : 'text-danger font-medium'}>
                {m.quantity >= 0 ? '+' : ''}
                {m.quantity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
