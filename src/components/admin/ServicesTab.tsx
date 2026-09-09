import { useState } from "react";
import { useAdminServices, updateService, removeService, addService } from "@/hooks/useAdmin";
import { formatCents } from "@/lib/format";

export function ServicesTab() {
  const { services, loading, reload } = useAdminServices();
  const [saving, setSaving] = useState<string | null>(null);

  async function handleField(id: string, patch: { name?: string; duration_minutes?: number; price_cents?: number }) {
    setSaving(id);
    await updateService(id, patch);
    setSaving(null);
    reload();
  }

  async function handleRemove(id: string) {
    await removeService(id);
    reload();
  }

  async function handleAdd() {
    const id = `novo-${Date.now()}`;
    await addService({
      id,
      name: "Novo serviço",
      description: "",
      duration_minutes: 30,
      price_cents: 0,
      sort_order: services.length + 1,
      active: true,
    });
    reload();
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-7">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase">
          Serviços e preços
        </h2>
        <span className="text-[13px] text-muted">As alterações aparecem no site na hora.</span>
      </div>
      {loading && <p className="text-muted">Carregando…</p>}
      {services.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center gap-2.5 border-t border-border py-3">
          <input
            defaultValue={s.name}
            onBlur={(e) => e.target.value !== s.name && handleField(s.id, { name: e.target.value })}
            className="min-h-11 min-w-0 flex-1 basis-[240px] rounded-lg border border-border bg-surface-alt px-3 text-[15px] text-white outline-none focus:border-silver"
          />
          <input
            type="number"
            defaultValue={s.duration_minutes}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v !== s.duration_minutes) handleField(s.id, { duration_minutes: v });
            }}
            className="min-h-11 w-24 rounded-lg border border-border bg-surface-alt px-3 text-sm text-muted outline-none focus:border-silver"
          />
          <input
            type="number"
            step="0.01"
            defaultValue={(s.price_cents / 100).toFixed(2)}
            onBlur={(e) => {
              const cents = Math.round(Number(e.target.value) * 100);
              if (cents !== s.price_cents) handleField(s.id, { price_cents: cents });
            }}
            className="min-h-11 w-28 rounded-lg border border-border bg-surface-alt px-3 font-heading text-[15px] text-white outline-none focus:border-silver"
          />
          <span className="w-24 text-right text-[13px] text-muted">{formatCents(s.price_cents)}</span>
          <button
            onClick={() => handleRemove(s.id)}
            disabled={saving === s.id}
            className="min-h-11 rounded-lg border border-border px-3.5 font-heading text-[11px] tracking-[0.16em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
          >
            Remover
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="bg-silver-gradient mt-5 flex min-h-12 items-center rounded-lg px-6 font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase"
      >
        Adicionar serviço
      </button>
    </div>
  );
}
