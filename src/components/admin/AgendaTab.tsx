import { useState } from "react";
import { useAgendaForDate, useAgendaTotals, setBookingStatus } from "@/hooks/useAdmin";
import type { BookingWithDetails } from "@/hooks/useBooking";
import { dateKey, formatCents, formatDateBR, formatTimeShort, toWhatsAppPhone, whatsAppLink, WEEKDAY_LABELS } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { ScrollFadeX } from "@/components/ScrollFadeX";
import { CompleteBookingModal } from "@/components/admin/CompleteBookingModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { Toast } from "@/components/admin/Toast";
import { BookingStatusBadge } from "@/components/StatusBadge";

const AGENDA_COLS = "92px minmax(0,1fr) 130px 180px 290px 110px";

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

  async function handleAccept(booking: BookingWithDetails) {
    setActing(booking.id);
    await setBookingStatus(booking.id, "confirmed");
    setActing(null);
    reloadAll();

    if (!booking.customer_phone) return;
    const message = `Olá, ${booking.customer_name}! Seu agendamento (${booking.services?.name ?? "atendimento"}) no dia ${formatDateBR(booking.scheduled_date)} às ${formatTimeShort(booking.scheduled_time)} foi confirmado. Te esperamos na D'Conde Barbearia!`;
    window.open(whatsAppLink(toWhatsAppPhone(booking.customer_phone), message), "_blank", "noopener");
  }

  function handleRemind(booking: BookingWithDetails) {
    if (!booking.customer_phone) return;
    const message = `Olá, ${booking.customer_name}! Passando pra lembrar do seu horário hoje às ${formatTimeShort(booking.scheduled_time)} na D'Conde Barbearia (${booking.services?.name ?? "atendimento"}). Te esperamos!`;
    window.open(whatsAppLink(toWhatsAppPhone(booking.customer_phone), message), "_blank", "noopener");
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
        <AgendaList
          items={agenda}
          loading={loading}
          skeletonCount={5}
          acting={acting}
          emptyMessage="Nenhum agendamento para hoje."
          getHandlers={(a) => ({
            onAccept: a.status === "pending" ? () => handleAccept(a) : undefined,
            onDecline: a.status === "pending" ? () => decide(a.id, "cancelled") : undefined,
            onComplete: a.status === "confirmed" ? () => setCompleting(a) : undefined,
            onCancel: a.status === "confirmed" ? () => setCancelling(a) : undefined,
            onRemind: a.status === "confirmed" ? () => handleRemind(a) : undefined,
          })}
        />
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
          <AgendaList
            items={pending}
            loading={totalsLoading}
            skeletonCount={2}
            showDate
            acting={acting}
            emptyMessage="Nenhum agendamento pendente de aceite."
            getHandlers={(a) => ({
              onAccept: () => handleAccept(a),
              onDecline: () => decide(a.id, "cancelled"),
            })}
          />
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
          <AgendaList
            items={confirmed}
            loading={totalsLoading}
            skeletonCount={2}
            showDate
            acting={acting}
            emptyMessage="Nenhum agendamento confirmado aguardando conclusão."
            getHandlers={(a) => ({
              onComplete: () => setCompleting(a),
              onCancel: () => setCancelling(a),
              onRemind: () => handleRemind(a),
            })}
          />
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

interface AgendaActionHandlers {
  onAccept?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onRemind?: () => void;
}

interface AgendaListProps extends Pick<AgendaRowProps, "showDate"> {
  items: BookingWithDetails[];
  loading: boolean;
  skeletonCount: number;
  acting: string | null;
  emptyMessage: string;
  getHandlers: (booking: BookingWithDetails) => AgendaActionHandlers;
}

/** Table on desktop (columns need horizontal room), stacked cards on mobile. */
function AgendaList({ items, loading, skeletonCount, showDate, emptyMessage, getHandlers, acting }: AgendaListProps) {
  if (!loading && items.length === 0) {
    return <p className="text-muted">{emptyMessage}</p>;
  }
  return (
    <>
      <div className="hidden md:block">
        <ScrollFadeX minWidth="1100px">
          {items.length > 0 && <AgendaHeader />}
          {loading && items.length === 0 && <RowSkeletons count={skeletonCount} />}
          {items.map((a) => (
            <AgendaRow key={a.id} booking={a} showDate={showDate} acting={acting === a.id} {...getHandlers(a)} />
          ))}
        </ScrollFadeX>
      </div>
      <div className="flex flex-col md:hidden">
        {loading && items.length === 0 && <CardSkeletons count={skeletonCount} />}
        {items.map((a) => (
          <AgendaCard key={a.id} booking={a} showDate={showDate} acting={acting === a.id} {...getHandlers(a)} />
        ))}
      </div>
    </>
  );
}

function AgendaHeader() {
  return (
    <div
      className="grid items-center gap-6 border-t border-border px-3 py-3 font-heading text-sm tracking-widest text-muted-2 uppercase"
      style={{ gridTemplateColumns: AGENDA_COLS }}
    >
      <span>Quando</span>
      <span>Cliente</span>
      <span>Barbeiro</span>
      <span>Status</span>
      <span>Ações</span>
      <span className="text-right">Valor</span>
    </div>
  );
}

function RowSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="grid items-center gap-6 border-t border-border px-3 py-5"
          style={{ gridTemplateColumns: AGENDA_COLS }}
        >
          <Skeleton className="h-7 w-16" />
          <span className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-28" />
          </span>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="ml-auto h-6 w-20" />
        </div>
      ))}
    </>
  );
}

function CardSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 border-t border-border px-1 py-5 first:border-t-0">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 flex-col gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-28" />
            </span>
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
    </>
  );
}

interface AgendaRowProps extends AgendaActionHandlers {
  booking: BookingWithDetails;
  showDate?: boolean;
  acting: boolean;
}

function AgendaRow({ booking: a, showDate, acting, onAccept, onDecline, onComplete, onCancel, onRemind }: AgendaRowProps) {
  return (
    <div
      className="grid items-center gap-6 border-t border-border px-3 py-5 first:border-t-0"
      style={{ gridTemplateColumns: AGENDA_COLS }}
    >
      <span>
        {showDate && (
          <span className="block font-heading text-[11px] tracking-[0.12em] text-muted-2 uppercase">
            {shortDateLabel(a.scheduled_date)}
          </span>
        )}
        <span className="font-heading text-xl text-white">{formatTimeShort(a.scheduled_time)}</span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-lg text-white">{a.customer_name}</span>
        <span className="block truncate text-base text-muted">{a.services?.name}</span>
      </span>
      <span className="truncate text-base text-muted">{a.barbers?.name}</span>
      <span>
        <BookingStatusBadge status={a.status} />
      </span>
      <span className="flex gap-2.5">
        <AgendaActions
          onAccept={onAccept}
          onDecline={onDecline}
          onComplete={onComplete}
          onCancel={onCancel}
          onRemind={onRemind}
          acting={acting}
        />
      </span>
      <span className="text-right font-heading text-xl text-white">{formatCents(a.price_cents)}</span>
    </div>
  );
}

function AgendaCard({ booking: a, showDate, acting, onAccept, onDecline, onComplete, onCancel, onRemind }: AgendaRowProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-1 py-5 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <span>
          {showDate && (
            <span className="block font-heading text-[11px] tracking-[0.12em] text-muted-2 uppercase">
              {shortDateLabel(a.scheduled_date)}
            </span>
          )}
          <span className="font-heading text-xl text-white">{formatTimeShort(a.scheduled_time)}</span>
        </span>
        <BookingStatusBadge status={a.status} />
      </div>
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-lg text-white">{a.customer_name}</span>
          <span className="block truncate text-base text-muted">{a.services?.name}</span>
          {a.barbers?.name && <span className="block truncate text-sm text-muted-2">{a.barbers.name}</span>}
        </span>
        <span className="shrink-0 font-heading text-xl text-white">{formatCents(a.price_cents)}</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <AgendaActions
          onAccept={onAccept}
          onDecline={onDecline}
          onComplete={onComplete}
          onCancel={onCancel}
          onRemind={onRemind}
          acting={acting}
          fullWidth
        />
      </div>
    </div>
  );
}

function AgendaActions({
  onAccept,
  onDecline,
  onComplete,
  onCancel,
  onRemind,
  acting,
  fullWidth,
}: AgendaActionHandlers & { acting: boolean; fullWidth?: boolean }) {
  const grow = fullWidth ? "flex-1" : "";
  return (
    <>
      {onAccept && onDecline && (
        <>
          <button
            onClick={onAccept}
            disabled={acting}
            className={`bg-silver-gradient flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-4.5 font-heading text-sm font-semibold tracking-[0.14em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-60 ${grow}`}
          >
            Aceitar
          </button>
          <button
            onClick={onDecline}
            disabled={acting}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-border px-4.5 font-heading text-sm tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:opacity-60 ${grow}`}
          >
            Recusar
          </button>
        </>
      )}
      {onComplete && onCancel && (
        <>
          {onRemind && (
            <button
              onClick={onRemind}
              aria-label="Enviar lembrete no WhatsApp"
              title="Enviar lembrete no WhatsApp"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.35-.53.05-1.03.24-3.47-.72-2.94-1.16-4.79-4.2-4.94-4.4-.14-.19-1.16-1.55-1.16-2.96 0-1.4.73-2.09 1-2.38.24-.29.53-.36.72-.36.19 0 .39 0 .55.01.19.01.44-.07.68.53.24.58.82 2 .89 2.14.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.14.14-.29.29-.12.58.17.29.75 1.23 1.6 2 1.11.98 2.03 1.3 2.32 1.45.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.39-.24.65-.14.26.09 1.65.78 1.94.92.29.14.48.22.55.34.07.12.07.7-.17 1.38z" />
              </svg>
            </button>
          )}
          <button
            onClick={onComplete}
            className={`bg-silver-gradient flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-4.5 font-heading text-sm font-semibold tracking-[0.14em] text-ink uppercase transition-[filter] hover:brightness-110 ${grow}`}
          >
            Concluir
          </button>
          <button
            onClick={onCancel}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-border px-4.5 font-heading text-sm tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white ${grow}`}
          >
            Cancelar
          </button>
        </>
      )}
    </>
  );
}
