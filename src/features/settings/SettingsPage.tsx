import { useState, FormEvent, ComponentType } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Bookmark, Trash2 } from 'lucide-react';

type Tab = 'categories' | 'brands' | 'company';

const TABS: [Tab, string][] = [
  ['categories', 'Categories'],
  ['brands', 'Brands'],
  ['company', 'Company Info'],
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('categories');

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-[#111827] mb-6">Settings</h1>

      <div className="flex gap-1 mb-6 border-b border-[#E5E7EB]">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-[#1F6B3B] text-[#1F6B3B]'
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'categories' && <CategoriesTab />}
      {tab === 'brands' && <BrandsTab />}
      {tab === 'company' && <CompanyInfoTab />}
    </div>
  );
}

interface NameListItem {
  id: number;
  name: string;
}

function NameListTab({
  icon: Icon,
  iconColor,
  placeholder,
  queryKey,
  list,
  create,
  del,
}: {
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  placeholder: string;
  queryKey: string;
  list: () => Promise<any>;
  create: (payload: unknown) => Promise<any>;
  del: (id: number) => Promise<any>;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const { data, isLoading } = useQuery<NameListItem[]>({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await list();
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      const res = await create(payload);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await del(id);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim() });
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !name.trim()}
          className="px-4 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D] disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {isLoading && <p className="text-sm text-[#6B7280]">Loading…</p>}

      <ul className="divide-y divide-[#E5E7EB] bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        {(data ?? []).map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-2.5 group">
            <span className="flex items-center gap-2 text-sm text-[#111827]">
              <Icon className={`w-4 h-4 ${iconColor}`} />
              {item.name}
            </span>
            <button
              onClick={() => deleteMutation.mutate(item.id)}
              className="opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-rose-600 transition-opacity"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {data && data.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-[#6B7280]">None yet.</li>
        )}
      </ul>
    </div>
  );
}

function CategoriesTab() {
  return (
    <NameListTab
      icon={Tag}
      iconColor="text-blue-600"
      placeholder="New category name"
      queryKey="categories"
      list={window.api.categories.list}
      create={window.api.categories.create}
      del={window.api.categories.delete}
    />
  );
}

function BrandsTab() {
  return (
    <NameListTab
      icon={Bookmark}
      iconColor="text-purple-600"
      placeholder="New brand name"
      queryKey="brands"
      list={window.api.brands.list}
      create={window.api.brands.create}
      del={window.api.brands.delete}
    />
  );
}

interface CompanyForm {
  companyName: string;
  address: string;
  phone: string;
  email: string;
}

function CompanyInfoTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CompanyForm | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await window.api.settings.get();
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  });

  const current: CompanyForm | null =
    form ??
    (data
      ? {
          companyName: data.companyName,
          address: data.address ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
        }
      : null);

  const updateMutation = useMutation({
    mutationFn: async (payload: CompanyForm) => {
      const res = await window.api.settings.update({
        companyName: payload.companyName,
        address: payload.address || null,
        phone: payload.phone || null,
        email: payload.email || null,
      });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  if (isLoading || !current) {
    return <p className="text-sm text-[#6B7280]">Loading…</p>;
  }

  const field = (key: keyof CompanyForm, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-[#111827] mb-1">{label}</label>
      <input
        type={type}
        value={current[key]}
        onChange={(e) => setForm({ ...current, [key]: e.target.value })}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
      />
    </div>
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(current);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4 max-w-md">
      {field('companyName', 'Company Name')}
      {field('address', 'Address')}
      {field('phone', 'Phone')}
      {field('email', 'Email', 'email')}
      <button
        type="submit"
        disabled={updateMutation.isPending}
        className="px-4 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D] disabled:opacity-60"
      >
        {updateMutation.isPending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
