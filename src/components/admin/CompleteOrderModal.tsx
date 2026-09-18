import { useState } from "react";
import { completeOrder, type AdminOrder } from "@/hooks/useAdmin";
import { useAuth } from "@/context/AuthContext";
import { formatCents } from "@/lib/format";
import type { PaymentMethod } from "@/types/database";
import { useFormErrors } from "@/hooks/useFormErrors";
import { useModalTransition } from "@/hooks/useModalTransition";
import "@/styles/shake.css";

const METHODS: PaymentMethod[] = ["Pix", "Crédito", "Débito", "Dinheiro"];

interface CompleteOrderModalProps {
  order: AdminOrder;
  onClose: () => void;
  onCompleted: () => void;
}

export function CompleteOrderModal({ order, onClose, onCompleted }: CompleteOrderModalProps) {
  const { isClosing, requestClose } = useModalTransition(onClose);
  const { barberId } = useAuth();
  const [method, setMethod] = useState<PaymentMethod>("Pix");
  const [saving, setSaving] = useState(false);
  const { message: error, fail, clear } = useFormErrors();

  async function handleConfirm() {
    setSaving(true);
    clear();
    const { error: err } = await completeOrder({
      orderId: order.id,
      items: order.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
      totalCents: order.totalCents,
      description: order.items.map((it) => `${it.quantity}x ${it.name}`).join(", "),
      paymentMethod: method,
      barberId,
    });
    setSaving(false);
    if (err) return fail(err);
    onCompleted();
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
          className="dc-modal-panel relative w-full max-w-[480px] rounded-2xl border border-border bg-surface p-8 shadow-[0_40px_90px_rgba(0,0,0,0.8)]"
        >
          <button
            onClick={requestClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
          >
            ×
          </button>

          <h3 className="m-0 mb-1 font-heading text-xl font-semibold tracking-[0.06em] text-white uppercase">
            Concluir pedido
          </h3>
          <p className="m-0 mb-6 text-[15px] leading-relaxed text-muted">
            {order.customerName ?? "Cliente"} · retirada no balcão
          </p>

          <div className="flex flex-col gap-4">
            <div className="scroll-thin max-h-[200px] overflow-y-auto rounded-lg border border-border bg-surface-alt">
              {order.items.map((it) => (
                <div key={it.productId} className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-3 first:border-t-0">
                  <span className="text-[14px] text-white">
                    {it.quantity}x {it.name}
                  </span>
                  <span className="text-[13px] text-muted-2 tabular-nums">{formatCents(it.unitCents * it.quantity)}</span>
                </div>
              ))}
            </div>

            <div>
              <span className="mb-2 block text-sm text-muted">Forma de pagamento</span>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((m) => {
                  const on = m === method;
                  return (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className="min-h-10 cursor-pointer rounded-full border px-4 font-heading text-[12px] tracking-[0.1em] uppercase transition-colors"
                      style={{
                        background: on ? "var(--color-silver)" : "transparent",
                        borderColor: on ? "var(--color-silver)" : "#2A2A2A",
                        color: on ? "#0A0A0A" : "#9E9E9E",
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-baseline justify-between border-t border-border pt-3.5">
              <span className="text-sm text-muted">Total</span>
              <span className="font-heading text-[22px] text-white">{formatCents(order.totalCents)}</span>
            </div>

            {error && (
              <span className="rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
                {error}
              </span>
            )}

            <button
              onClick={handleConfirm}
              disabled={saving}
              className="bg-silver-gradient mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-lg font-heading text-[13px] font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Concluindo…" : "Confirmar retirada"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
