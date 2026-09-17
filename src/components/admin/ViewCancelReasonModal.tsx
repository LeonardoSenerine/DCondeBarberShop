import type { BookingWithDetails } from "@/hooks/useBooking";
import { formatDateBR, formatTimeShort } from "@/lib/format";

interface ViewCancelReasonModalProps {
  booking: BookingWithDetails;
  onClose: () => void;
}

/** Read-only — shows why the customer cancelled their own booking (see cancel_reason in CancelBookingModal.tsx). */
export function ViewCancelReasonModal({ booking, onClose }: ViewCancelReasonModalProps) {
  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[460px] rounded-2xl border border-border bg-surface p-7 shadow-[0_40px_90px_rgba(0,0,0,0.8)]"
        >
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
          >
            ×
          </button>

          <h3 className="m-0 mb-1 font-heading text-xl font-semibold tracking-[0.06em] text-white uppercase">
            Cancelado pelo cliente
          </h3>
          <p className="m-0 mb-6 text-[14px] text-muted">
            {booking.customer_name} · {booking.services?.name} · {formatDateBR(booking.scheduled_date)} às{" "}
            {formatTimeShort(booking.scheduled_time)}
          </p>

          <div className="rounded-lg border border-border bg-surface-alt p-3.5 text-[15px] text-white">
            <span className="mb-1 block text-[13px] font-semibold text-muted-2 uppercase tracking-[0.08em]">Motivo</span>
            {booking.cancel_reason}
          </div>

          <button
            onClick={onClose}
            className="mt-6 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-sm tracking-[0.16em] text-white uppercase transition-colors hover:border-silver"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
