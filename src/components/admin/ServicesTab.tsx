import { useEffect, useState } from "react";
import { useAdminServices, updateService, removeService } from "@/hooks/useAdmin";
import type { Service } from "@/hooks/useCatalog";
import { formatCents, formatDuration } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { ScrollFadeX } from "@/components/ScrollFadeX";
import { ServiceFormModal } from "@/components/admin/ServiceFormModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";

const ROW_COLS = "minmax(0,1fr) 120px 130px 220px";

export function ServicesTab() {
  const { services, loading, reload } = useAdminServices();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSaveRow(id: string, patch: { name: string; duration_minutes: number; price_cents: number }) {
    setSavingId(id);
    await updateService(id, patch);
    setSavingId(null);
    setEditingId(null);
    reload();
  }

  async function handleConfirmDelete() {
    if (!removing) return;
    setDeleting(true);
    await removeService(removing.id);
    setDeleting(false);
    setRemoving(null);
    reload();
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 font-heading text-3xl font-semibold tracking-[0.06em] text-white uppercase">
            Serviços e preços
          </h2>
          <span className="text-base text-muted">As alterações aparecem no site na hora.</span>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="bg-silver-gradient flex min-h-12 cursor-pointer items-center rounded-lg px-6 font-heading text-sm font-semibold tracking-[0.16em] text-ink uppercase transition-[filter] hover:brightness-110"
        >
          + Adicionar serviço
        </button>
      </div>

      {loading &&
        services.length === 0 &&
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-border py-4">
            <Skeleton className="h-12 flex-1 rounded-lg" />
            <Skeleton className="h-12 w-28 rounded-lg" />
            <Skeleton className="h-12 w-32 rounded-lg" />
            <Skeleton className="h-11 w-24 rounded-lg" />
          </div>
        ))}

      {services.length > 0 && (
        <ScrollFadeX minWidth="620px">
          <div
            className="grid items-center gap-3 border-t border-border py-3 font-heading text-sm tracking-[0.1em] text-muted-2 uppercase"
            style={{ gridTemplateColumns: ROW_COLS }}
          >
            <span>Nome</span>
            <span>Duração</span>
            <span>Preço</span>
            <span className="text-right">Ações</span>
          </div>

          {services.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              editing={editingId === s.id}
              saving={savingId === s.id}
              onEdit={() => setEditingId(s.id)}
              onCancel={() => setEditingId(null)}
              onSave={(patch) => handleSaveRow(s.id, patch)}
              onRemove={() => setRemoving(s)}
            />
          ))}
        </ScrollFadeX>
      )}

      {adding && (
        <ServiceFormModal sortOrder={services.length + 1} onClose={() => setAdding(false)} onSaved={reload} />
      )}

      {removing && (
        <ConfirmModal
          title="Remover serviço?"
          message={`Tem certeza que deseja remover "${removing.name}"? Essa ação não pode ser desfeita.`}
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}

interface ServiceRowProps {
  service: Service;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: { name: string; duration_minutes: number; price_cents: number }) => void;
  onRemove: () => void;
}

function ServiceRow({ service, editing, saving, onEdit, onCancel, onSave, onRemove }: ServiceRowProps) {
  const [name, setName] = useState(service.name);
  const [duration, setDuration] = useState(String(service.duration_minutes));
  const [price, setPrice] = useState((service.price_cents / 100).toFixed(2));

  useEffect(() => {
    if (editing) {
      setName(service.name);
      setDuration(String(service.duration_minutes));
      setPrice((service.price_cents / 100).toFixed(2));
    }
  }, [editing, service]);

  function handleSaveClick() {
    onSave({
      name: name.trim() || service.name,
      duration_minutes: Math.round(Number(duration)) || service.duration_minutes,
      price_cents: Math.round((Number(price.replace(",", ".")) || 0) * 100),
    });
  }

  if (editing) {
    return (
      <div className="grid items-center gap-3 border-t border-border py-4" style={{ gridTemplateColumns: ROW_COLS }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="min-h-12 min-w-0 rounded-lg border border-border bg-surface-alt px-4 text-lg text-white outline-none focus:border-silver"
        />
        <input
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="min-h-12 rounded-lg border border-border bg-surface-alt px-4 text-base text-white outline-none focus:border-silver"
        />
        <input
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="min-h-12 rounded-lg border border-border bg-surface-alt px-4 font-heading text-lg text-white outline-none focus:border-silver"
        />
        <span className="flex justify-end gap-2.5">
          <button
            onClick={handleSaveClick}
            disabled={saving}
            className="bg-silver-gradient flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-4.5 font-heading text-sm font-semibold tracking-[0.14em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="min-h-11 cursor-pointer rounded-lg border border-border px-4 font-heading text-sm tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:opacity-60"
          >
            Cancelar
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="grid items-center gap-3 border-t border-border py-4" style={{ gridTemplateColumns: ROW_COLS }}>
      <span className="min-w-0 text-lg text-white">{service.name}</span>
      <span className="text-base text-muted">{formatDuration(service.duration_minutes)}</span>
      <span className="font-heading text-lg text-white">{formatCents(service.price_cents)}</span>
      <span className="flex justify-end gap-2.5">
        <button
          onClick={onEdit}
          className="min-h-11 cursor-pointer rounded-lg border border-border px-4 font-heading text-sm tracking-[0.14em] text-white uppercase transition-colors hover:border-silver"
        >
          Editar
        </button>
        <button
          onClick={onRemove}
          className="min-h-11 cursor-pointer rounded-lg border border-border px-4 font-heading text-sm tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
        >
          Remover
        </button>
      </span>
    </div>
  );
}
