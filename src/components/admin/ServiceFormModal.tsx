import { useState } from "react";
import { addService } from "@/hooks/useAdmin";
import { useFormErrors, fieldClass } from "@/hooks/useFormErrors";
import "@/styles/shake.css";

interface ServiceFormModalProps {
  sortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

export function ServiceFormModal({ sortOrder, onClose, onSaved }: ServiceFormModalProps) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const { message: error, fail, clear, clearField, fieldProps } = useFormErrors();

  async function handleSave() {
    if (!name.trim()) return fail("Digite o nome.", ["name"]);
    const durationMinutes = Math.round(Number(duration) || 0);
    if (durationMinutes <= 0) return fail("Digite uma duração válida.", ["duration"]);
    const priceCents = Math.round((Number(price.replace(",", ".")) || 0) * 100);
    if (priceCents <= 0) return fail("Digite um preço válido.", ["price"]);

    setSaving(true);
    clear();
    const { error: err } = await addService({
      id: `svc-${Date.now()}`,
      name: name.trim(),
      description: "",
      duration_minutes: durationMinutes,
      price_cents: priceCents,
      sort_order: sortOrder,
      active: true,
    });
    setSaving(false);
    if (err) return fail(err);
    onSaved();
    onClose();
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
          className="relative w-full max-w-[440px] rounded-2xl border border-border bg-surface p-8 shadow-[0_40px_90px_rgba(0,0,0,0.8)]"
        >
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
          >
            ×
          </button>
          <h3 className="m-0 mb-6 font-heading text-xl font-semibold tracking-[0.06em] text-white uppercase">
            Novo serviço
          </h3>

          <div className="flex flex-col gap-4">
            <Field label="Nome">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearField("name");
                }}
                placeholder="Ex: Corte + barba"
                className={`min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver ${fieldClass(fieldProps("name"))}`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Duração (min)">
                <input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => {
                    setDuration(e.target.value);
                    clearField("duration");
                  }}
                  className={`min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver ${fieldClass(fieldProps("duration"))}`}
                />
              </Field>
              <Field label="Preço (R$)">
                <input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    clearField("price");
                  }}
                  placeholder="0,00"
                  className={`min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver ${fieldClass(fieldProps("price"))}`}
                />
              </Field>
            </div>

            {error && (
              <span className="rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
                {error}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-silver-gradient mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-lg font-heading text-[13px] font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] text-muted">{label}</span>
      {children}
    </label>
  );
}
