import { useState } from "react";
import { useClients } from "@/hooks/useAdmin";
import { formatCents, formatDateBR } from "@/lib/format";

export function ClientsTab() {
  const [query, setQuery] = useState("");
  const { clients, loading } = useClients(query);

  return (
    <div className="rounded-lg border border-border bg-surface p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase">Clientes</h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome"
          className="min-h-11 min-w-[220px] rounded-lg border border-border bg-surface-alt px-3.5 text-sm text-white outline-none focus:border-silver"
        />
      </div>
      {loading && <p className="text-muted">Carregando…</p>}
      {!loading && clients.length === 0 && <p className="text-muted">Nenhum cliente encontrado.</p>}
      {clients.map((c) => (
        <div key={c.customerId} className="flex flex-wrap items-center gap-3.5 border-t border-border py-3.5">
          <span className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-alt font-heading text-sm text-silver">
            {c.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 basis-[160px]">
            <span className="block text-[15px] text-white">{c.name}</span>
            <span className="block text-[13px] text-muted">{c.phone}</span>
          </span>
          <span className="w-24 text-[13px] text-muted">{c.visits} visitas</span>
          <span className="w-32 text-[13px] text-muted">Última: {formatDateBR(c.lastVisit)}</span>
          <span className="ml-auto font-heading text-base text-white">{formatCents(c.totalCents)}</span>
        </div>
      ))}
    </div>
  );
}
