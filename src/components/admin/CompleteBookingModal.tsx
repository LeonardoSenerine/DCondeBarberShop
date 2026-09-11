import { useMemo, useState } from "react";
import { completeBooking, useAdminProducts } from "@/hooks/useAdmin";
import type { BookingWithDetails } from "@/hooks/useBooking";
import { formatCents } from "@/lib/format";
import type { PaymentMethod } from "@/types/database";
import { useFormErrors, fieldClass } from "@/hooks/useFormErrors";
import "@/styles/shake.css";
import "@/styles/scrollbar.css";

const METHODS: PaymentMethod[] = ["Pix", "Crédito", "Débito", "Dinheiro"];

interface CompleteBookingModalProps {
  booking: BookingWithDetails;
  onClose: () => void;
  onCompleted: () => void;
}

export function CompleteBookingModal({ booking, onClose, onCompleted }: CompleteBookingModalProps) {
  const { products } = useAdminProducts();
  const [method, setMethod] = useState<PaymentMethod>("Pix");
  const [value, setValue] = useState((booking.price_cents / 100).toFixed(2));
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const { message: error, fail, clear, clearField, fieldProps } = useFormErrors();

  const available = useMemo(() => products.filter((p) => p.active), [products]);

  const selectedProducts = available
    .filter((p) => (qtyByProduct[p.id] ?? 0) > 0)
    .map((p) => ({ productId: p.id, name: p.name, qty: qtyByProduct[p.id], unitCents: p.price_cents }));

  const serviceCents = Math.round((Number(value.replace(",", ".")) || 0) * 100);
  const productsCents = selectedProducts.reduce((s, p) => s + p.unitCents * p.qty, 0);
  const totalCents = serviceCents + productsCents;

  function setQty(id: string, qty: number, stock: number) {
    setQtyByProduct((m) => ({ ...m, [id]: Math.max(0, Math.min(stock, qty)) }));
  }

  async function handleConfirm() {
    if (serviceCents <= 0) return fail("Digite um valor válido para o serviço.", ["value"]);

    setSaving(true);
    clear();
    const { error: err } = await completeBooking({
      bookingId: booking.id,
      serviceName: booking.services?.name ?? "Serviço",
      serviceCents,
      paymentMethod: method,
      customerId: booking.customer_id,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      products: selectedProducts,
    });
    setSaving(false);
    if (err) return fail(err);
    onCompleted();
  }

  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[520px] rounded-2xl border border-border bg-surface p-8 shadow-[0_40px_90px_rgba(0,0,0,0.8)]"
        >
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
          >
            ×
          </button>

          <h3 className="m-0 mb-1 font-heading text-xl font-semibold tracking-[0.06em] text-white uppercase">
            Concluir agendamento
          </h3>
          <p className="m-0 mb-6 text-[14px] text-muted">
            {booking.customer_name} · {booking.services?.name}
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <span className="mb-2 block text-[13px] text-muted">Forma de pagamento</span>
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

            <label className="flex flex-col gap-2">
              <span className="text-[13px] text-muted">Valor do serviço (R$)</span>
              <input
                inputMode="decimal"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  clearField("value");
                }}
                className={`min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver ${fieldClass(fieldProps("value"))}`}
              />
            </label>

            <div>
              <span className="mb-2 block text-[13px] text-muted">Produtos levados (opcional)</span>
              <div className="scroll-thin max-h-[240px] overflow-y-auto rounded-lg border border-border bg-surface-alt">
                {available.length === 0 && (
                  <p className="m-0 p-3.5 text-[13px] text-muted">Nenhum produto cadastrado.</p>
                )}
                {available.map((p) => {
                  const qty = qtyByProduct[p.id] ?? 0;
                  const soldOut = p.stock <= 0;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 border-t border-border px-3.5 py-3 first:border-t-0"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] text-white">{p.name}</span>
                        <span className="block text-[12px] text-muted-2">
                          {formatCents(p.price_cents)} · {soldOut ? "esgotado" : `${p.stock} em estoque`}
                        </span>
                      </span>
                      <span className="flex flex-shrink-0 items-center gap-2">
                        <button
                          onClick={() => setQty(p.id, qty - 1, p.stock)}
                          disabled={qty === 0}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-white transition-colors hover:border-silver disabled:cursor-default disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-heading text-[15px] text-white tabular-nums">{qty}</span>
                        <button
                          onClick={() => setQty(p.id, qty + 1, p.stock)}
                          disabled={soldOut || qty >= p.stock}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-white transition-colors hover:border-silver disabled:cursor-default disabled:opacity-30"
                        >
                          +
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-baseline justify-between border-t border-border pt-3.5">
              <span className="text-[13px] text-muted">Total</span>
              <span className="font-heading text-[22px] text-white">{formatCents(totalCents)}</span>
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
              {saving ? "Concluindo…" : "Concluir agendamento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
