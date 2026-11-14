import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Tag, Bookmark, Trash2, DatabaseBackup, FolderOpen, Building2, Sparkles, RefreshCw, KeyRound, LucideIcon } from 'lucide-react';
import { notify } from '../../components/shared/NotificationProvider';
import { Button, Input, Field, EmptyState, TableSkeleton, Tooltip, confirmDialog, PageHeader } from '../../components/ui';
import UpdatesTab from './UpdatesTab';
import AiScannerTab from './AiScannerTab';
import LicenseTab from './LicenseTab';
import { useGateStore } from '../../stores/licenseStore';

type Tab = 'categories' | 'brands' | 'company' | 'ai' | 'updates' | 'license' | 'backup';

const TABS: [Tab, string, LucideIcon][] = [
  ['categories', 'Categories', Tag],
  ['brands', 'Brands', Bookmark],
  ['company', 'Company Info', Building2],
  ['ai', 'AI Scanner', Sparkles],
  ['updates', 'Updates', RefreshCw],
  ['license', 'Licence', KeyRound],
  ['backup', 'Backup & Restore', DatabaseBackup],
];

export default function SettingsPage() {
  const initial = (useLocation().state as { tab?: Tab } | null)?.tab;
  const [tab, setTab] = useState<Tab>(initial ?? 'categories');

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader title="Settings" subtitle="Catalog, company details, AI scanner, updates, licence and backups." />

      <div className="bg-surface border border-border rounded-md overflow-hidden grid grid-cols-[200px_1fr] min-h-[480px]">
        <nav className="border-r border-border p-3 space-y-0.5 bg-surface-sunken/40">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-left transition-colors ${
                tab === key ? 'bg-accent-soft text-accent font-medium' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-6">
          {tab === 'categories' && <CategoriesTab />}
          {tab === 'brands' && <BrandsTab />}
          {tab === 'company' && <CompanyInfoTab />}
          {tab === 'ai' && <AiScannerTab />}
          {tab === 'updates' && <UpdatesTab />}
          {tab === 'license' && <LicenseTab />}
          {tab === 'backup' && <BackupTab />}
        </div>
      </div>
    </div>
  );
}

interface NameListItem {
  id: number;
  name: string;
}

function NameListTab({
  title,
  description,
  icon: Icon,
  placeholder,
  queryKey,
  list,
  create,
  del,
}: {
  title: string;
  description: string;
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
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="text-[13px] text-ink-muted mt-0.5">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-5 max-w-md">
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

      {isLoading ? (
        <TableSkeleton rows={3} cols={3} />
      ) : data && data.length === 0 ? (
        <EmptyState icon={Icon} title="None yet" description="Add your first entry above." />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {(data ?? []).map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border border-border bg-surface hover:border-border-strong transition-colors"
            >
              <span className="flex items-center gap-2 text-sm text-ink min-w-0">
                <span className="shrink-0 w-7 h-7 rounded-md bg-accent-soft text-accent flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="truncate">{item.name}</span>
              </span>
              <Tooltip content={`Delete "${item.name}"`}>
                <button
                  onClick={() => handleDelete(item)}
                  aria-label={`Delete ${item.name}`}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger hover:bg-danger-soft rounded-md p-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  return (
    <NameListTab
      title="Categories"
      description="Group products by category for filtering and reporting."
      icon={Tag}
      placeholder="e.g. Paints & Chemicals"
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
      title="Brands"
      description="Manage the brand names available when adding a product."
      icon={Bookmark}
      placeholder="e.g. Dadex"
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
      notify('Company info saved', 'success');
    },
  });

  if (isLoading || !current) {
    return <TableSkeleton rows={4} cols={2} />;
  }

  const PLACEHOLDERS: Record<keyof CompanyForm, string> = {
    companyName: 'e.g. Fazal Hardware Store',
    address: 'e.g. Shop 12, Main Bazaar Road, Lahore',
    phone: 'e.g. 0300-1234567',
    email: 'e.g. info@fazalhardware.pk',
  };

  const field = (key: keyof CompanyForm, label: string, type = 'text') => (
    <Field label={label}>
      <Input
        type={type}
        value={current[key]}
        onChange={(e) => setForm({ ...current, [key]: e.target.value })}
        placeholder={PLACEHOLDERS[key]}
      />
    </Field>
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(current);
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-ink">Company Info</h2>
        <p className="text-[13px] text-ink-muted mt-0.5">
          Shown on printed invoices, quotations, and purchase orders.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {field('companyName', 'Company Name')}
        <div className="grid grid-cols-2 gap-4">
          {field('phone', 'Phone')}
          {field('email', 'Email', 'email')}
        </div>
        {field('address', 'Address')}
        <Button type="submit" variant="primary" loading={updateMutation.isPending}>
          Save Changes
        </Button>
      </form>
    </div>
  );
}

function BackupTab() {
  const licensed = useGateStore((s) => s.license?.state === 'active');
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
    <div>
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-ink">Backup & Restore</h2>
        <p className="text-[13px] text-ink-muted mt-0.5">
          Export the entire database to a file you choose, or restore from a previously saved backup.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-xl">
        <div className="rounded-md border border-border p-5 flex flex-col gap-3">
          <div className="w-9 h-9 rounded-md bg-accent-soft text-accent flex items-center justify-center">
            <FolderOpen className="w-[18px] h-[18px]" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Backup Now</p>
            <p className="text-xs text-ink-muted mt-0.5">Save a full copy of your database to a file you choose.</p>
          </div>
          <Button variant="primary" onClick={handleBackup} loading={working === 'backup'} disabled={working !== null}>
            Choose Location…
          </Button>
        </div>
        <div className="rounded-md border border-border p-5 flex flex-col gap-3">
          <div className="w-9 h-9 rounded-md bg-danger-soft text-danger flex items-center justify-center">
            <DatabaseBackup className="w-[18px] h-[18px]" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Restore from Backup</p>
            <p className="text-xs text-ink-muted mt-0.5">Replace all current data with a previously saved backup file.</p>
          </div>
          <Button
            variant="secondary"
            className="text-danger hover:bg-danger-soft"
            onClick={handleRestore}
            loading={working === 'restore'}
            disabled={working !== null || !licensed}
            title={licensed ? undefined : 'Restore is unavailable while the licence is not active. Backup still works.'}
          >
            Choose Backup File…
          </Button>
        </div>
      </div>
    </div>
  );
}
