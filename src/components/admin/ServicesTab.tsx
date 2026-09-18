import { useMemo, useState } from "react";
import { useAdminServices, removeService } from "@/hooks/useAdmin";
import type { Service } from "@/hooks/useCatalog";
import { formatCents, formatDuration } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { ServiceFormModal } from "@/components/admin/ServiceFormModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { Toast } from "@/components/admin/Toast";
import { Pagination } from "@/components/admin/Pagination";

type Editing = { service: Service | null } | null;

const PAGE_SIZE = 8;

export function ServicesTab() {
  const { services, loading, reload } = useAdminServices();
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(services.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageServices = useMemo(
    () => services.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [services, currentPage],
  );

  async function handleConfirmDelete() {
    if (!removing) return;
    setDeleting(true);
    const { error } = await removeService(removing.id);
    setDeleting(false);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    setToast({ message: "Serviço removido.", variant: "success" });
    setRemoving(null);
    reload();
  }

  return (
    <div className="dc-admin-enter rounded-lg border border-border bg-surface p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div>
          <h2 className="m-0 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase sm:text-3xl">
            Serviços e preços
          </h2>
          <span className="text-[15px] text-muted sm:text-base">As alterações aparecem no site na hora.</span>
        </div>
        <button
          onClick={() => setEditing({ service: null })}
          className="bg-silver-gradient flex min-h-12 cursor-pointer items-center rounded-lg px-6 font-heading text-sm font-semibold tracking-[0.16em] text-ink uppercase transition-[filter] hover:brightness-110"
        >
          + Adicionar serviço
        </button>
      </div>

      {loading &&
        services.length === 0 &&
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-border py-4">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        ))}

      {pageServices.map((s, index) => (
        <div
          key={s.id}
          className="dc-admin-enter-item flex flex-col gap-2.5 border-t border-border py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          style={{ animationDelay: `${index * 45}ms` }}
        >
          <div className="min-w-0">
            <span className="block text-base text-white sm:text-lg">{s.name}</span>
            <span className="block text-[15px] text-muted">{formatDuration(s.duration_minutes)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-5">
            <span className="font-heading text-base text-white sm:text-lg">{formatCents(s.price_cents)}</span>
            <span className="flex gap-2">
              <button
                onClick={() => setEditing({ service: s })}
                className="min-h-10 cursor-pointer rounded-lg border border-border px-3.5 font-heading text-xs tracking-[0.12em] text-white uppercase transition-colors hover:border-silver sm:min-h-11 sm:px-4 sm:text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => setRemoving(s)}
                className="min-h-10 cursor-pointer rounded-lg border border-border px-3.5 font-heading text-xs tracking-[0.12em] text-muted uppercase transition-colors hover:border-silver hover:text-white sm:min-h-11 sm:px-4 sm:text-sm"
              >
                Remover
              </button>
            </span>
          </div>
        </div>
      ))}

      {services.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[15px] text-muted sm:text-base">
            {services.length} serviço{services.length === 1 ? "" : "s"} · página {currentPage} de {pageCount}
          </span>
          <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
        </div>
      )}

      {editing && (
        <ServiceFormModal
          service={editing.service}
          sortOrder={services.length + 1}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setToast({ message: editing.service ? "Serviço atualizado." : "Serviço adicionado.", variant: "success" });
            reload();
          }}
        />
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

      {toast && <Toast message={toast.message} onDismiss={() => setToast(null)} variant={toast.variant} />}
    </div>
  );
}
