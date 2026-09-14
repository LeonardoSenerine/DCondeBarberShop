import { useState } from "react";
import { useAgendaForDate, useAgendaTotals, setBookingStatus } from "@/hooks/useAdmin";
import type { BookingWithDetails } from "@/hooks/useBooking";
import { dateKey, formatCents, formatDateBR, formatTimeShort, WEEKDAY_LABELS } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { CompleteBookingModal } from "@/components/admin/CompleteBookingModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { Toast } from "@/components/admin/Toast";
import { BookingStatusBadge } from "@/components/StatusBadge";

/** "Hoje" / "Amanhã" for the next couple of days, otherwise dd/mm. */
function shortDateLabel(iso: string): string {
  const today = dateKey(new Date());
  const tomorrow = dateKey(new Date(Date.now() + 86400000));
  if (iso === today) return "Hoje";
  if (iso === tomorrow) return "Amanhã";
  return formatDateBR(iso).slice(0, 5);
}

export function AgendaTab() {
  const [date] = useState(() => new Date());
  const { agenda, loading, reload } = useAgendaForDate(date);
  const { pending, confirmed, loading: totalsLoading, reload: reloadTotals } = useAgendaTotals();
  const [acting, setActing] = useState<string | null>(null);
  const [completing, setCompleting] = useState<BookingWithDetails | null>(null);
  const [cancelling, setCancelling] = useState<BookingWithDetails | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function reloadAll() {
    reload();
    reloadTotals();
  }

  async function decide(id: string, status: "confirmed" | "cancelled") {
    setActing(id);
    await setBookingStatus(id, status);
    setActing(null);
    reloadAll();
  }

  async function handleConfirmCancel() {
    if (!cancelling) return;
    setActing(cancelling.id);
    await setBookingStatus(cancelling.id, "cancelled");
    setActing(null);
    setCancelling(null);
    setToast("Agendamento cancelado.");
    reloadAll();
  }

  const dateLabel = `${WEEKDAY_LABELS[date.getDay()]}, ${String(date.getDate()).padStart(2, "0")} de ${date.toLocaleDateString("pt-BR", { month: "long" })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-surface p-7">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="m-0 font-heading text-3xl font-semibold tracking-[0.06em] text-white uppercase">
            Agenda do dia
          </h2>
          <span className="text-base text-muted">
            {dateLabel} · {agenda.length} atendimentos
          </span>
        </div>
        {loading && agenda.length === 0 && <RowSkeletons count={5} />}
        {!loading && agenda.length === 0 && <p className="text-muted">Nenhum agendamento para hoje.</p>}
        {agenda.map((a) => (
          <AgendaRow
            key={a.id}
            booking={a}
            acting={acting === a.id}
            onAccept={a.status === "pending" ? () => decide(a.id, "confirmed") : undefined}
            onDecline={a.status === "pending" ? () => decide(a.id, "cancelled") : undefined}
            onComplete={a.status === "confirmed" ? () => setCompleting(a) : undefined}
            onCancel={a.status === "confirmed" ? () => setCancelling(a) : undefined}
          />
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-7">
        <div className="mb-6">
          <h2 className="m-0 font-heading text-3xl font-semibold tracking-[0.06em] text-white uppercase">
            Agendamentos totais
          </h2>
          <span className="text-base text-muted">Tudo que ainda precisa de ação, em qualquer data</span>
        </div>

        <div className="mb-8">
          <div className="mb-3.5 flex items-center gap-3">
            <span className="font-heading text-lg font-semibold tracking-[0.1em] text-white uppercase">A aceitar</span>
            <span
              className="flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-heading text-sm font-semibold tabular-nums"
              style={{ background: "rgba(224,179,65,0.16)", color: "#E0B341" }}
            >
              {pending.length}
            </span>
          </div>
          {totalsLoading && pending.length === 0 && <RowSkeletons count={2} />}
          {!totalsLoading && pending.length === 0 && (
            <p className="text-muted">Nenhum agendamento pendente de aceite.</p>
          )}
          {pending.map((a) => (
            <AgendaRow
              key={a.id}
              booking={a}
              showDate
              acting={acting === a.id}
              onAccept={() => decide(a.id, "confirmed")}
              onDecline={() => decide(a.id, "cancelled")}
            />
          ))}
        </div>

        <div>
          <div className="mb-3.5 flex items-center gap-3">
            <span className="font-heading text-lg font-semibold tracking-[0.1em] text-white uppercase">A concluir</span>
            <span
              className="flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-heading text-sm font-semibold tabular-nums"
              style={{ background: "rgba(255,255,255,0.1)", color: "#E0E0E0" }}
            >
              {confirmed.length}
            </span>
          </div>
          {totalsLoading && confirmed.length === 0 && <RowSkeletons count={2} />}
          {!totalsLoading && confirmed.length === 0 && (
            <p className="text-muted">Nenhum agendamento confirmado aguardando conclusão.</p>
          )}
          {confirmed.map((a) => (
            <AgendaRow
              key={a.id}
              booking={a}
              showDate
              acting={acting === a.id}
              onComplete={() => setCompleting(a)}
              onCancel={() => setCancelling(a)}
            />
          ))}
        </div>
      </div>

      {completing && (
        <CompleteBookingModal
          booking={completing}
          onClose={() => setCompleting(null)}
          onCompleted={() => {
            setCompleting(null);
            setToast("Agendamento concluído com sucesso.");
            reloadAll();
          }}
        />
      )}

      {cancelling && (
        <ConfirmModal
          title="Cancelar agendamento?"
          message={`Tem certeza que deseja cancelar o horário de ${cancelling.customer_name}${cancelling.services?.name ? ` (${cancelling.services.name})` : ""} às ${formatTimeShort(cancelling.scheduled_time)}?`}
          confirmLabel="Cancelar agendamento"
          cancelLabel="Voltar"
          busy={acting === cancelling.id}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelling(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function RowSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-border px-3 py-5 first:border-t-0">
          <Skeleton className="h-7 w-16" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-32" />
          </span>
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="ml-auto h-6 w-20" />
        </div>
      ))}
    </>
  );
}

interface AgendaRowProps {
  booking: BookingWithDetails;
  showDate?: boolean;
  acting: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

function AgendaRow({ booking: a, showDate, acting, onAccept, onDecline, onComplete, onCancel }: AgendaRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-border px-3 py-5 first:border-t-0">
      <span className="w-20 flex-shrink-0">
        {showDate && (
          <span className="block font-heading text-[11px] tracking-[0.12em] text-muted-2 uppercase">
            {shortDateLabel(a.scheduled_date)}
          </span>
        )}
        <span className="font-heading text-xl text-white">{formatTimeShort(a.scheduled_time)}</span>
      </span>
      <span className="min-w-0 flex-1 basis-[200px]">
        <span className="block text-lg text-white">{a.customer_name}</span>
        <span className="block text-base text-muted">{a.services?.name}</span>
      </span>
      <span className="w-28 text-base text-muted">{a.barbers?.name}</span>
      <BookingStatusBadge status={a.status} />
      {onAccept && onDecline && (
        <span className="flex gap-2.5">
          <button
            onClick={onAccept}
            disabled={acting}
            className="bg-silver-gradient flex min-h-11 cursor-pointer items-center rounded-lg px-4.5 font-heading text-sm font-semibold tracking-[0.14em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
          >
            Aceitar
          </button>
          <button
            onClick={onDecline}
            disabled={acting}
            className="flex min-h-11 cursor-pointer items-center rounded-lg border border-border px-4.5 font-heading text-sm tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:opacity-60"
          >
            Recusar
          </button>
        </span>
      )}
      {onComplete && onCancel && (
        <span className="flex gap-3.5">
          <button
            onClick={onComplete}
            className="bg-silver-gradient flex min-h-11 cursor-pointer items-center rounded-lg px-4.5 font-heading text-sm font-semibold tracking-[0.14em] text-ink uppercase transition-[filter] hover:brightness-110"
          >
            Concluir
          </button>
          <button
            onClick={onCancel}
            className="flex min-h-11 cursor-pointer items-center rounded-lg border border-border px-4.5 font-heading text-sm tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
          >
            Cancelar
          </button>
        </span>
      )}
      <span className="ml-auto font-heading text-xl text-white">{formatCents(a.price_cents)}</span>
    </div>
  );
}
