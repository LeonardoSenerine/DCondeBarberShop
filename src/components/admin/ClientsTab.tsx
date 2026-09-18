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
    <>
      <div className="dc-admin-enter rounded-lg border border-border bg-surface p-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="m-0 font-heading text-3xl font-semibold tracking-[0.06em] text-white uppercase">Clientes</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
            <DateRangePicker
              from={from}
              to={to}
              onChange={(r) => { setFrom(r.from); setTo(r.to); }}
              className="w-full sm:w-[300px]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome"
              className="min-h-12 w-full rounded-lg border border-border bg-surface-alt px-4 text-base text-white outline-none focus:border-silver sm:w-[240px]"
            />
          </div>
        </div>
        {!loading && clients.length === 0 && <p className="text-muted">Nenhum cliente encontrado.</p>}

        {loading &&
          clients.length === 0 &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 border-t border-border py-4 sm:gap-4 sm:py-6">
              <Skeleton className="h-12 w-12 flex-shrink-0 rounded-full sm:h-14 sm:w-14" />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-32" />
              </span>
              <Skeleton className="h-7 w-20 flex-shrink-0" />
            </div>
          ))}

        {pageClients.map((c, index) => (
          <button
            key={c.customerId}
            onClick={() => setSelected(c)}
            className="dc-admin-enter-item flex w-full cursor-pointer flex-col gap-2.5 border-t border-border py-4 text-left transition-colors hover:border-t-transparent hover:bg-surface-alt sm:flex-row sm:items-center sm:gap-5 sm:py-6"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <div className="flex min-w-0 items-center gap-3.5 sm:flex-1 sm:gap-4">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-alt font-heading text-lg text-silver sm:h-14 sm:w-14 sm:text-xl">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg text-white sm:text-xl">{c.name}</span>
                <span className="block truncate text-[15px] text-muted sm:text-base">{c.phone}</span>
              </span>
              <span className="flex-shrink-0 text-right font-heading text-lg text-white sm:hidden">
                {formatCents(c.totalCents)}
              </span>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-x-5 gap-y-1 text-[15px] text-muted sm:whitespace-nowrap sm:text-base">
              <span>{c.visits} visitas</span>
              <span>Última: {formatDateBR(c.lastVisit)}</span>
            </div>
            <span className="hidden flex-shrink-0 text-right font-heading text-lg text-white sm:block sm:text-2xl">
              {formatCents(c.totalCents)}
            </span>
          </button>
        ))}
        {clients.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[15px] text-muted sm:text-base">
              {clients.length} cliente{clients.length === 1 ? "" : "s"} · página {currentPage} de {pageCount}
            </span>
            <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
          </div>
        )}
      </div>

      {selected && <ClientDetailModal client={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
