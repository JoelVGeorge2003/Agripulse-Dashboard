import { useMemo, useState } from "react";
import { DatabaseZap, Edit3, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { Commodity, CommodityInput } from "@/types";
import { CommodityForm } from "@/components/CommodityForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { adminApi } from "@/services/adminApi";
import { commodityApi } from "@/services/commodityApi";

export function ManageDataPage() {
  const result = useApi(() => commodityApi.list({ pageSize: 100 }), []);
  const [adminKey, setAdminKey] = useState(() => window.localStorage.getItem("agripulse-admin-key") ?? "");
  const [editing, setEditing] = useState<Commodity | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Commodity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function saveAdminKey(value: string): void {
    setAdminKey(value);
    if (value) window.localStorage.setItem("agripulse-admin-key", value);
    else window.localStorage.removeItem("agripulse-admin-key");
  }

  async function saveCommodity(input: CommodityInput): Promise<void> {
    setIsSaving(true);
    setActionError(null);
    try {
      if (editing) await commodityApi.update(editing.slug, input);
      else await commodityApi.create(input);
      setFormOpen(false);
      setEditing(null);
      setMessage(editing ? "Commodity updated." : "Commodity created.");
      await result.reload();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Could not save commodity.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCommodity(): Promise<void> {
    if (!deleting) return;
    setActionError(null);
    try {
      await commodityApi.remove(deleting.slug);
      setMessage(`${deleting.name} deleted.`);
      setDeleting(null);
      await result.reload();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Could not delete commodity.");
    }
  }

  async function syncUsda(): Promise<void> {
    setIsSyncing(true);
    setActionError(null);
    setMessage(null);
    try {
      const sync = await adminApi.syncUsda();
      setMessage(`${sync.message} Prices: ${sync.pricesUpserted}; production records: ${sync.productionRecordsUpserted}.`);
      await result.reload();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "USDA synchronization failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  const columns = useMemo<DataTableColumn<Commodity>[]>(() => [
    {
      key: "name",
      header: "Commodity",
      render: (item) => <div className="commodity-cell"><span className="commodity-swatch" style={{ background: item.color }} /><div><strong>{item.name}</strong><small>{item.slug}</small></div></div>
    },
    { key: "symbol", header: "Symbol", render: (item) => item.symbol },
    { key: "category", header: "Category", render: (item) => <span className="category-badge">{item.category.toLowerCase()}</span> },
    { key: "unit", header: "Unit", render: (item) => item.defaultUnit },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => (
        <div className="table-actions">
          <button className="icon-button" onClick={() => { setEditing(item); setFormOpen(true); }} aria-label={`Edit ${item.name}`}><Edit3 size={15} /></button>
          <button className="icon-button danger" onClick={() => setDeleting(item)} aria-label={`Delete ${item.name}`}><Trash2 size={15} /></button>
        </div>
      )
    }
  ], []);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Data administration</p>
          <h2>Manage commodities and source synchronization</h2>
          <p>CRUD requests follow the route → controller → service → repository → PostgreSQL flow.</p>
        </div>
        <span className="heading-icon"><DatabaseZap size={22} /></span>
      </section>

      <section className="panel admin-key-panel">
        <div>
          <KeyRound size={18} />
          <div><strong>Admin API key</strong><p>Required only when ADMIN_API_KEY is configured on the backend.</p></div>
        </div>
        <input type="password" value={adminKey} onChange={(event) => saveAdminKey(event.target.value)} placeholder="Optional local admin key" autoComplete="off" />
      </section>

      {(message || actionError) && (
        <div className={actionError ? "notice notice-error" : "notice notice-success"}>
          {actionError ?? message}
        </div>
      )}

      <section className="panel">
        <div className="toolbar toolbar-between">
          <div>
            <h3>Commodity records</h3>
            <p className="muted-copy">Create, edit, or remove catalog records. Related price and production rows cascade on deletion.</p>
          </div>
          <div className="toolbar-actions">
            <button className="button button-secondary" onClick={() => void syncUsda()} disabled={isSyncing}>
              <RefreshCw size={15} className={isSyncing ? "spin" : ""} /> {isSyncing ? "Syncing…" : "Sync USDA"}
            </button>
            <button className="button button-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus size={15} /> Add commodity
            </button>
          </div>
        </div>

        {result.isLoading ? (
          <LoadingSpinner label="Loading records" />
        ) : result.error ? (
          <ErrorMessage message={result.error} onRetry={result.reload} />
        ) : (
          <DataTable items={result.data?.items ?? []} columns={columns} getRowKey={(item) => item.id} />
        )}
      </section>

      {formOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => { setFormOpen(false); setEditing(null); }}>
          <div className="dialog-card dialog-card-wide" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <h2>{editing ? `Edit ${editing.name}` : "Create commodity"}</h2>
            <CommodityForm
              commodity={editing}
              onSubmit={saveCommodity}
              onCancel={() => { setFormOpen(false); setEditing(null); }}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message="This also removes related price and production records. This action cannot be undone."
          onConfirm={deleteCommodity}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
