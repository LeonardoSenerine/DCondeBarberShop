import { useState } from "react";
import { declineBooking } from "@/hooks/useAdmin";
import type { BookingWithDetails } from "@/hooks/useBooking";
import { formatDateBR, formatTimeShort, toWhatsAppPhone, whatsAppLink } from "@/lib/format";
import { useFormErrors, fieldClass } from "@/hooks/useFormErrors";
import { useModalTransition } from "@/hooks/useModalTransition";

interface DeclineBookingModalProps {
  booking: BookingWithDetails;
  onClose: () => void;
  onDeclined: () => void;
}

export function DeclineBookingModal({ booking, onClose, onDeclined }: DeclineBookingModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { message: error, fail, clear, clearField, fieldProps } = useFormErrors();
  const { isClosing, requestClose } = useModalTransition(onClose);

  async function handleConfirm() {
    if (!reason.trim()) return fail("Digite a mensagem para o cliente.", ["reason"]);
    setBusy(true);
    clear();
    const { error: err } = await declineBooking(booking.id, reason);
    setBusy(false);
    if (err) return fail(err);

    if (booking.customer_phone) {
      const message = `Olá, ${booking.customer_name}! Sobre seu agendamento (${booking.services?.name ?? "atendimento"}) no dia ${formatDateBR(booking.scheduled_date)} às ${formatTimeShort(booking.scheduled_time)}: ${reason.trim()}`;
      window.open(whatsAppLink(toWhatsAppPhone(booking.customer_phone), message), "_blank", "noopener");
    }
    onDeclined();
  }

  return (
    <div
      className="dc-modal-overlay fixed inset-0 z-[120] overflow-y-auto"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
      data-closing={isClosing}
      onClick={requestClose}
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="dc-modal-panel relative w-full max-w-[460px] rounded-2xl border border-border bg-surface p-7 shadow-[0_40px_90px_rgba(0,0,0,0.8)]"
        >
          <button
            onClick={requestClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
          >
            ×
          </button>

          <h3 className="m-0 mb-1 font-heading text-xl font-semibold tracking-[0.06em] text-white uppercase">
            Recusar agendamento?
          </h3>
          <p className="m-0 mb-6 text-[14px] text-muted">
            {booking.customer_name} · {booking.services?.name} · {formatDateBR(booking.scheduled_date)} às{" "}
            {formatTimeShort(booking.scheduled_time)}
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] text-muted">Mensagem para o cliente</span>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                clearField("reason");
              }}
              rows={3}
              placeholder="Explique ao cliente o motivo pelo qual não será possível atendê-lo…"
              className={`resize-none rounded-lg border border-border bg-surface-alt px-3.5 py-3 text-[15px] text-white outline-none focus:border-silver ${fieldClass(fieldProps("reason"))}`}
            />
            <span className="text-xs text-muted-2">
              Esta é exatamente a mensagem que o cliente recebe pelo WhatsApp e vê em sua conta.
            </span>
          </label>

          {error && (
            <span className="mt-4 block rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
              {error}
            </span>
          )}

          <div className="mt-6 flex gap-2.5">
            <button
              onClick={requestClose}
              disabled={busy}
              className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-sm tracking-[0.16em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border font-heading text-sm font-semibold tracking-[0.16em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: "#e5484d", background: "#e5484d", color: "#FFFFFF" }}
            >
              {busy ? "Recusando…" : "Recusar agendamento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
