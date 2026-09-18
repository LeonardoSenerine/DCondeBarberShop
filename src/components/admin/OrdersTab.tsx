import { useEffect, useMemo, useState } from "react";
import { useAdminOrders, acceptOrder, markOrderReady, cancelOrder, type AdminOrder } from "@/hooks/useAdmin";
import type { OrderStatus } from "@/types/database";
import { formatCents } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { Select } from "@/components/admin/Select";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { CompleteOrderModal } from "@/components/admin/CompleteOrderModal";
import { Toast } from "@/components/admin/Toast";
import { Pagination } from "@/components/admin/Pagination";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { value: "active", label: "Em andamento" },
  { value: "pending", label: "Aguardando análise" },
  { value: "confirmed", label: "Aceitos" },
  { value: "ready", label: "Prontos p/ retirada" },
  { value: "completed", label: "Concluídos" },
  { value: "cancelled", label: "Cancelados" },
  { value: "all", label: "Todos" },
];

const STATUS_BADGE: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  pending: { label: "Aguardando análise", bg: "rgba(224,179,65,0.14)", color: "#E0B341" },
  confirmed: { label: "Aceito", bg: "rgba(120,170,255,0.14)", color: "#8FB4FF" },
  ready: { label: "Pronto p/ retirada", bg: "rgba(196,150,255,0.14)", color: "#C6A6FF" },
  completed: { label: "Concluído", bg: "rgba(120,200,140,0.14)", color: "#7FC98F" },
  cancelled: { label: "Cancelado", bg: "rgba(255,255,255,0.06)", color: "#9E9E9E" },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS_BADGE[status];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[13px] font-medium tracking-[0.07em] uppercase"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export function OrdersTab() {
  const { orders, loading, reload } = useAdminOrders();
  const [statusFilter, setStatusFilter] = useState("active");
  const [page, setPage] = useState(1);
  const [completing, setCompleting] = useState<AdminOrder | null>(null);
  const [cancelling, setCancelling] = useState<AdminOrder | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;

  const visibleOrders = orders.filter((o) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return o.status === "pending" || o.status === "confirmed" || o.status === "ready";
    return o.status === statusFilter;
  });

  useEffect(() => setPage(1), [statusFilter]);

  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageOrders = useMemo(
    () => visibleOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [visibleOrders, currentPage],
  );

  async function handleAccept(order: AdminOrder) {
    setActing(order.id);
    const { error } = await acceptOrder(order.id);
    setActing(null);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    setToast({ message: "Pedido aceito.", variant: "success" });
    reload();
  }

  async function handleMarkReady(order: AdminOrder) {
    setActing(order.id);
    const { error } = await markOrderReady(order.id);
    setActing(null);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    setToast({ message: "Pedido marcado como pronto.", variant: "success" });
    reload();
  }

  async function handleConfirmCancel() {
    if (!cancelling) return;
    setActing(cancelling.id);
    const { error } = await cancelOrder(cancelling.id);
    setActing(null);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    setCancelling(null);
    setToast({ message: "Pedido cancelado.", variant: "success" });
    reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="dc-admin-enter rounded-lg border border-border bg-surface p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="m-0 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase sm:text-3xl">
            Pedidos da loja
          </h2>
          <span className="text-base text-muted">
            {pendingCount} aguardando análise · {confirmedCount} aceito{confirmedCount === 1 ? "" : "s"} · {readyCount} pronto{readyCount === 1 ? "" : "s"} p/ retirada
          </span>
        </div>

        {orders.length > 0 && (
          <div className="mb-5">
            <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} className="sm:w-64" />
          </div>
        )}

        {loading && orders.length === 0 && (
          <div className="flex flex-col">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 border-t border-border px-1 py-5 first:border-t-0">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" count={2} />
              </div>
            ))}
          </div>
        )}

        {!loading && orders.length === 0 && (
          <p className="text-muted">Nenhum pedido feito pela loja do site ainda.</p>
        )}
        {!loading && orders.length > 0 && visibleOrders.length === 0 && (
          <p className="text-muted">Nenhum pedido com esse filtro.</p>
        )}

        <div className="flex flex-col">
          {pageOrders.map((o, index) => {
            const d = new Date(o.createdAt);
            const dateLabel = d.toLocaleDateString("pt-BR");
            const timeLabel = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            const busy = acting === o.id;
            return (
              <div
                key={o.id}
                className="dc-admin-enter-item flex flex-col gap-3 border-t border-border px-1 py-5 first:border-t-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-heading text-lg text-white">{o.customerName || "Cliente"}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <span className="mt-1 block text-[15px] text-muted">
                    {o.customerPhone} · {dateLabel} às {timeLabel}
                  </span>
                  <p className="m-0 mt-2.5 max-w-[60ch] text-[16px] leading-relaxed text-white">
                    {o.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-2.5 sm:items-end">
                  <span className="font-heading text-lg text-white tabular-nums">{formatCents(o.totalCents)}</span>
                  {(o.status === "pending" || o.status === "confirmed" || o.status === "ready") && (
                    <span className="flex gap-2">
                      {o.status === "pending" && (
                        <button
                          onClick={() => handleAccept(o)}
                          disabled={busy}
                          className="bg-silver-gradient flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-4.5 font-heading text-sm font-semibold tracking-[0.14em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Aceitar
                        </button>
                      )}
                      {o.status === "confirmed" && (
                        <button
                          onClick={() => handleMarkReady(o)}
                          disabled={busy}
                          className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-border px-4.5 font-heading text-sm tracking-[0.14em] text-white uppercase transition-colors hover:border-silver disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Marcar pronto
                        </button>
                      )}
                      {o.status === "ready" && (
                        <button
                          onClick={() => setCompleting(o)}
                          disabled={busy}
                          className="bg-silver-gradient flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-4.5 font-heading text-sm font-semibold tracking-[0.14em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Concluir pedido
                        </button>
                      )}
                      <button
                        onClick={() => setCancelling(o)}
                        disabled={busy}
                        className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-border px-4.5 font-heading text-sm tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {visibleOrders.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[15px] text-muted sm:text-base">
              {visibleOrders.length} pedido{visibleOrders.length === 1 ? "" : "s"} · página {currentPage} de {pageCount}
            </span>
            <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
          </div>
        )}
      </div>

      {completing && (
        <CompleteOrderModal
          order={completing}
          onClose={() => setCompleting(null)}
          onCompleted={() => {
            setCompleting(null);
            setToast({ message: "Pedido concluído.", variant: "success" });
            reload();
          }}
        />
      )}

      {cancelling && (
        <ConfirmModal
          title="Cancelar pedido?"
          message={`Tem certeza que deseja cancelar o pedido de "${cancelling.customerName ?? "cliente"}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Cancelar pedido"
          cancelLabel="Voltar"
          busy={acting === cancelling.id}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelling(null)}
        />
      )}

      {toast && <Toast message={toast.message} onDismiss={() => setToast(null)} variant={toast.variant} />}
    </div>
  );
}
