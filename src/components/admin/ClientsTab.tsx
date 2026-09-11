import { useEffect, useMemo, useState } from "react";
import { useClients, type ClientSummary } from "@/hooks/useAdmin";
import { formatCents, formatDateBR } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { ClientDetailModal } from "@/components/admin/ClientDetailModal";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { Pagination } from "@/components/admin/Pagination";

const PAGE_SIZE = 8;

export function ClientsTab() {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { clients, loading } = useClients({ query, from, to });
  const [selected, setSelected] = useState<ClientSummary | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [query, from, to]);

  const pageCount = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageClients = useMemo(
    () => clients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [clients, currentPage],
  );

  return (
    <div className="rounded-lg border border-border bg-surface p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase">Clientes</h2>
        <div className="flex flex-wrap items-center gap-5">
          <DateRangePicker from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome"
            className="min-h-11 min-w-[220px] rounded-lg border border-border bg-surface-alt px-3.5 text-sm text-white outline-none focus:border-silver"
          />
        </div>
      </div>
      {loading &&
        clients.length === 0 &&
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 border-t border-border px-3 py-3.5">
            <Skeleton className="h-9.5 w-9.5 rounded-full" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
            </span>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="ml-auto h-5 w-16" />
          </div>
        ))}
      {!loading && clients.length === 0 && <p className="text-muted">Nenhum cliente encontrado.</p>}
      {clients.length > 0 && (
        <div className="flex flex-wrap items-center gap-3.5 border-t border-border px-3 py-2.5 font-heading text-[11px] tracking-[0.1em] text-muted-2 uppercase">
          <span className="h-9.5 w-9.5 flex-shrink-0" />
          <span className="min-w-0 flex-1 basis-[160px]">Cliente</span>
          <span className="w-24">Visitas</span>
          <span className="w-32">Última visita</span>
          <span className="ml-auto">Total gasto</span>
        </div>
      )}
      {pageClients.map((c) => (
        <button
          key={c.customerId}
          onClick={() => setSelected(c)}
          className="flex w-full cursor-pointer flex-wrap items-center gap-3.5 rounded-lg border-t border-border px-3 py-3.5 text-left transition-colors hover:border-t-transparent hover:bg-surface-alt"
        >
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
        </button>
      ))}
      {clients.length > 0 && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-5">
          <span className="text-[13px] text-muted">
            {clients.length} cliente{clients.length === 1 ? "" : "s"} · página {currentPage} de {pageCount}
          </span>
          <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
        </div>
      )}
      {selected && <ClientDetailModal client={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
