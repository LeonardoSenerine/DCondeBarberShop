import { useState } from "react";
import { useAgendaForDate, setBookingStatus } from "@/hooks/useAdmin";
import { formatCents, formatTimeShort, WEEKDAY_LABELS } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";

export function AgendaTab() {
  const [date] = useState(() => new Date());
  const { agenda, loading, reload } = useAgendaForDate(date);
  const [acting, setActing] = useState<string | null>(null);

  async function decide(id: string, status: "confirmed" | "cancelled") {
    setActing(id);
    await setBookingStatus(id, status);
    setActing(null);
    reload();
  }

  const dateLabel = `${WEEKDAY_LABELS[date.getDay()]}, ${String(date.getDate()).padStart(2, "0")} de ${date.toLocaleDateString("pt-BR", { month: "long" })}`;

  return (
    <div className="rounded-lg border border-border bg-surface p-7">
      <div className="mb-5.5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase">
          Agenda do dia
        </h2>
        <span className="text-sm text-muted">
          {dateLabel} · {agenda.length} atendimentos
        </span>
      </div>
      {loading &&
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 border-t border-border py-3.5">
            <Skeleton className="h-6 w-14" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </span>
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="ml-auto h-5 w-16" />
          </div>
        ))}
      {!loading && agenda.length === 0 && <p className="text-muted">Nenhum agendamento para hoje.</p>}
      {agenda.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-3.5 border-t border-border py-3.5">
          <span className="w-16 font-heading text-lg text-white">{formatTimeShort(a.scheduled_time)}</span>
          <span className="min-w-0 flex-1 basis-[180px]">
            <span className="block text-[15px] text-white">{a.customer_name}</span>
            <span className="block text-[13px] text-muted">{a.services?.name}</span>
          </span>
          <span className="w-20 text-sm text-muted">{a.barbers?.name}</span>
          <span
            className="rounded-full border px-2.5 py-1 text-[11px] tracking-[0.14em] uppercase"
            style={{
              color: a.status === "confirmed" ? "#FFFFFF" : a.status === "pending" ? "#E0B341" : "#A3A3A3",
              borderColor: a.status === "confirmed" ? "#E0E0E0" : a.status === "pending" ? "#E0B341" : "#2A2A2A",
            }}
          >
            {statusLabel(a.status)}
          </span>
          {a.status === "pending" && (
            <span className="flex gap-2">
              <button
                onClick={() => decide(a.id, "confirmed")}
                disabled={acting === a.id}
                className="bg-silver-gradient flex min-h-9 cursor-pointer items-center rounded-lg px-3.5 font-heading text-[11px] font-semibold tracking-[0.14em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
              >
                Aceitar
              </button>
              <button
                onClick={() => decide(a.id, "cancelled")}
                disabled={acting === a.id}
                className="flex min-h-9 cursor-pointer items-center rounded-lg border border-border px-3.5 font-heading text-[11px] tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:opacity-60"
              >
                Recusar
              </button>
            </span>
          )}
          <span className="ml-auto font-heading text-base text-white">{formatCents(a.price_cents)}</span>
        </div>
      ))}
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Em análise";
    case "confirmed":
      return "Confirmado";
    case "completed":
      return "Concluído";
    case "cancelled":
      return "Cancelado";
    case "no_show":
      return "Faltou";
    default:
      return status;
  }
}
