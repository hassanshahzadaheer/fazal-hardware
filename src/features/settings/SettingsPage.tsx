import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Bookmark, Trash2, DatabaseBackup, FolderOpen, LucideIcon } from 'lucide-react';
import { notify } from '../../components/shared/NotificationProvider';
import { Button, Input, Field, EmptyState, TableSkeleton, confirmDialog } from '../../components/ui';

type Tab = 'categories' | 'brands' | 'company' | 'backup';

const TABS: [Tab, string][] = [
  ['categories', 'Categories'],
  ['brands', 'Brands'],
  ['company', 'Company Info'],
  ['backup', 'Backup & Restore'],
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('categories');

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink tracking-tight">Settings</h1>
        <p className="text-[13px] text-ink-muted mt-0.5">Catalog taxonomy, company details, and backups.</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'categories' && <CategoriesTab />}
      {tab === 'brands' && <BrandsTab />}
      {tab === 'company' && <CompanyInfoTab />}
      {tab === 'backup' && <BackupTab />}
    </div>
  );
}

interface NameListItem {
  id: number;
  name: string;
}

function NameListTab({
  icon: Icon,
  placeholder,
  queryKey,
  list,
  create,
  del,
}: {
  icon: LucideIcon;
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

  const handleDelete = async (item: NameListItem) => {
    const confirmed = await confirmDialog({
      title: 'Delete this entry?',
      description: `"${item.name}" will be permanently removed.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) deleteMutation.mutate(item.id);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="submit" variant="primary" loading={createMutation.isPending} disabled={!name.trim()}>
          Add
        </Button>
      </form>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={3} cols={1} />
        ) : data && data.length === 0 ? (
          <EmptyState icon={Icon} title="None yet" description="Add your first entry above." />
        ) : (
          <ul className="divide-y divide-border">
            {(data ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between px-4 py-2.5 group">
                <span className="flex items-center gap-2 text-sm text-ink">
                  <Icon className="w-4 h-4 text-accent" />
                  {item.name}
                </span>
                <button
                  onClick={() => handleDelete(item)}
                  aria-label={`Delete ${item.name}`}
                  className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger hover:bg-danger-soft rounded-md p-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CategoriesTab() {
  return (
    <NameListTab
      icon={Tag}
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
    return <TableSkeleton rows={4} cols={1} />;
  }

  const field = (key: keyof CompanyForm, label: string, type = 'text') => (
    <Field label={label}>
      <Input type={type} value={current[key]} onChange={(e) => setForm({ ...current, [key]: e.target.value })} />
    </Field>
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(current);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-md p-5 space-y-4 max-w-md">
      {field('companyName', 'Company Name')}
      {field('address', 'Address')}
      {field('phone', 'Phone')}
      {field('email', 'Email', 'email')}
      <Button type="submit" variant="primary" loading={updateMutation.isPending}>
        Save
      </Button>
    </form>
  );
}

function BackupTab() {
  const [working, setWorking] = useState<'backup' | 'restore' | null>(null);

  const handleBackup = async () => {
    setWorking('backup');
    const res = await window.api.backup.now();
    setWorking(null);
    if (!res.ok) {
      if (res.error.code !== 'CANCELLED') notify(res.error.message, 'error');
      return;
    }
    notify(`Backup saved to ${res.data}`, 'success');
  };

  const handleRestore = async () => {
    const confirmed = await confirmDialog({
      title: 'Restore from backup?',
      description: 'Restoring will replace all current data with the backup file. This cannot be undone.',
      confirmLabel: 'Restore',
      tone: 'danger',
    });
    if (!confirmed) return;
    setWorking('restore');
    const res = await window.api.backup.restore();
    setWorking(null);
    if (!res.ok) {
      if (res.error.code !== 'CANCELLED') notify(res.error.message, 'error');
      return;
    }
    notify('Database restored. Reloading…', 'success');
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <div className="bg-surface border border-border rounded-md p-5 max-w-md space-y-4">
      <div className="flex items-center gap-2 text-ink font-semibold">
        <DatabaseBackup className="w-5 h-5 text-accent" />
        Backup & Restore
      </div>
      <p className="text-sm text-ink-muted">
        Export the entire database to a file you choose, or restore from a previously saved backup.
      </p>
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={handleBackup} loading={working === 'backup'} disabled={working !== null}>
          <FolderOpen className="w-4 h-4" />
          Backup Now
        </Button>
        <Button
          variant="secondary"
          className="flex-1 text-danger hover:bg-danger-soft"
          onClick={handleRestore}
          loading={working === 'restore'}
          disabled={working !== null}
        >
          Restore from Backup
        </Button>
      </div>
    </div>
  );
}
