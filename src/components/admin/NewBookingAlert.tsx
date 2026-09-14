import { BellRinging } from "@phosphor-icons/react";
import { formatDateBR, formatTimeShort } from "@/lib/format";

interface NewBookingAlertProps {
  customerName: string;
  date: string;
  time: string;
  onView: () => void;
  onDismiss: () => void;
}

/** A more attention-grabbing alert than the plain Toast — for events staff should act on, like a fresh booking request. */
export function NewBookingAlert({ customerName, date, time, onView, onDismiss }: NewBookingAlertProps) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[140] flex w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 items-start gap-3.5 rounded-lg border p-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-[dc-up_400ms_ease_both]"
      style={{ borderColor: "#E0B341", background: "var(--color-surface)" }}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: "rgba(224,179,65,0.14)", color: "#E0B341" }}
      >
        <BellRinging size={20} weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block font-heading text-[13px] tracking-[0.08em] text-white uppercase">Novo agendamento</span>
        <span className="mt-0.5 block text-[13px] text-muted">
          {customerName} · {formatDateBR(date)} às {formatTimeShort(time)}
        </span>
        <div className="mt-2.5 flex gap-2">
          <button
            onClick={onView}
            className="flex min-h-8 cursor-pointer items-center rounded-lg px-3 font-heading text-[11px] font-semibold tracking-[0.1em] uppercase"
            style={{ background: "#E0B341", color: "#0A0A0A" }}
          >
            Ver agenda
          </button>
          <button
            onClick={onDismiss}
            className="flex min-h-8 cursor-pointer items-center rounded-lg border border-border px-3 font-heading text-[11px] tracking-[0.1em] text-muted uppercase transition-colors hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
