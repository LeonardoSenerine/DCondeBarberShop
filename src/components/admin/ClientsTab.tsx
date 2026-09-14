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
        <h2 className="m-0 font-heading text-3xl font-semibold tracking-[0.06em] text-white uppercase">Clientes</h2>
        <div className="flex flex-wrap items-center gap-5">
          <DateRangePicker from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome"
            className="min-h-12 min-w-[240px] rounded-lg border border-border bg-surface-alt px-4 text-base text-white outline-none focus:border-silver"
          />
        </div>
      </div>
      {!loading && clients.length === 0 && <p className="text-muted">Nenhum cliente encontrado.</p>}
      {(loading && clients.length === 0) || clients.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {clients.length > 0 && (
              <div className="grid grid-cols-[72px_2fr_1fr_1.2fr_1fr] items-center gap-4 border-t border-border px-4 py-4 font-heading text-base tracking-[0.1em] text-muted-2 uppercase">
                <span />
                <span>Cliente</span>
                <span>Visitas</span>
                <span>Última visita</span>
                <span className="text-right">Total gasto</span>
              </div>
            )}
            {loading &&
              clients.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[72px_2fr_1fr_1.2fr_1fr] items-center gap-4 border-t border-border px-4 py-6"
                >
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <span className="flex min-w-0 flex-col gap-2">
                    <Skeleton className="h-6 w-44" />
                    <Skeleton className="h-4 w-32" />
                  </span>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="ml-auto h-7 w-24" />
                </div>
              ))}
            {pageClients.map((c) => (
              <button
                key={c.customerId}
                onClick={() => setSelected(c)}
                className="grid w-full cursor-pointer grid-cols-[72px_2fr_1fr_1.2fr_1fr] items-center gap-4 border-t border-border px-4 py-6 text-left transition-colors hover:border-t-transparent hover:bg-surface-alt"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-alt font-heading text-xl text-silver">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xl text-white">{c.name}</span>
                  <span className="block truncate text-base text-muted">{c.phone}</span>
                </span>
                <span className="text-base text-muted">{c.visits} visitas</span>
                <span className="text-base text-muted">Última: {formatDateBR(c.lastVisit)}</span>
                <span className="text-right font-heading text-2xl text-white">{formatCents(c.totalCents)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {clients.length > 0 && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-5">
          <span className="text-base text-muted">
            {clients.length} cliente{clients.length === 1 ? "" : "s"} · página {currentPage} de {pageCount}
          </span>
          <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
        </div>
      )}
      {selected && <ClientDetailModal client={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
