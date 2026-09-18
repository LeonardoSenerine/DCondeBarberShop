import { useState } from "react";
import { cancelMyOrder } from "@/hooks/useBooking";
import type { MyOrder } from "@/hooks/useBooking";
import { formatCents } from "@/lib/format";
import { useFormErrors, fieldClass } from "@/hooks/useFormErrors";
import { useModalTransition } from "@/hooks/useModalTransition";

interface CancelOrderModalProps {
  order: MyOrder;
  onClose: () => void;
  onCancelled: () => void;
}

export function CancelOrderModal({ order, onClose, onCancelled }: CancelOrderModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { message: error, fail, clear, clearField, fieldProps } = useFormErrors();
  const { isClosing, requestClose } = useModalTransition(onClose);

  async function handleConfirm() {
    if (!reason.trim()) return fail("Digite o motivo do cancelamento.", ["reason"]);
    setBusy(true);
    clear();
    const { error: err } = await cancelMyOrder(order.id, reason);
    setBusy(false);
    if (err) return fail(err);
    onCancelled();
  }

  return (
    <div
      className="dc-modal-overlay fixed inset-0 z-[130] overflow-y-auto"
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
            Cancelar pedido?
          </h3>
          <p className="m-0 mb-6 text-[14px] text-muted">
            {order.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")} · {formatCents(order.totalCents)}
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] text-muted">Motivo do cancelamento</span>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                clearField("reason");
              }}
              rows={3}
              placeholder="Explique ao barbeiro o motivo do cancelamento…"
              className={`resize-none rounded-lg border border-border bg-surface-alt px-3.5 py-3 text-[15px] text-white outline-none focus:border-silver ${fieldClass(fieldProps("reason"))}`}
            />
            <span className="text-xs text-muted-2">O barbeiro recebe esse motivo.</span>
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
              {busy ? "Cancelando…" : "Cancelar pedido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
