import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { ProductWithNames, StockMovement } from '../../../shared/types';

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827]">Stock History — {product.name}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {isLoading && <p className="text-sm text-[#6B7280] px-2">Loading…</p>}
          {!isLoading && (data ?? []).length === 0 && (
            <p className="text-sm text-[#6B7280] px-2 py-4 text-center">No movements recorded yet.</p>
          )}
          <ul className="divide-y divide-[#E5E7EB]">
            {(data ?? []).map((m) => (
              <li key={m.id} className="py-2.5 px-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-[#111827] capitalize">{m.type.replace('_', ' ')}</div>
                  <div className="text-xs text-[#6B7280]">
                    {new Date(m.createdDate).toLocaleString()}
                    {m.notes ? ` — ${m.notes}` : ''}
                  </div>
                </div>
                <span className={m.quantity >= 0 ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'}>
                  {m.quantity >= 0 ? '+' : ''}
                  {m.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
