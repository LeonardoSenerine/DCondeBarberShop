import { useState } from "react";
import { saveProduct, uploadProductPhoto, type ProductInput } from "@/hooks/useAdmin";
import type { Product } from "@/hooks/useCatalog";
import { formatCents } from "@/lib/format";
import { effectivePriceCents } from "@/lib/product";

const CATEGORIES: Product["category"][] = ["Cabelo", "Barba", "Pele"];

interface ProductFormModalProps {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({ product, onClose, onSaved }: ProductFormModalProps) {
  const isNew = !product;
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState<Product["category"]>(product?.category ?? "Cabelo");
  const [price, setPrice] = useState(product ? (product.price_cents / 100).toFixed(2) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [imagePath, setImagePath] = useState(product?.image_path ?? "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [onSale, setOnSale] = useState((product?.sale_percent ?? 0) > 0);
  const [salePercent, setSalePercent] = useState(product?.sale_percent ? String(product.sale_percent) : "10");
  const [saleUntil, setSaleUntil] = useState(product?.sale_until ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceCents = Math.round((Number(price.replace(",", ".")) || 0) * 100);
  const pct = onSale ? Math.min(100, Math.max(0, Number(salePercent) || 0)) : 0;
  const currentCents = effectivePriceCents({ price_cents: priceCents, sale_percent: pct, sale_until: saleUntil || null });

  async function handlePhoto(file: File) {
    setUploadingPhoto(true);
    setError(null);
    const { url, error: err } = await uploadProductPhoto(file);
    setUploadingPhoto(false);
    if (err) return setError(err);
    if (url) setImagePath(url);
  }

  async function handleSave() {
    if (!name.trim()) return setError("Digite o nome.");
    if (priceCents <= 0) return setError("Digite um preço válido.");
    if (onSale && pct <= 0) return setError("Informe o percentual da promoção.");

    setSaving(true);
    setError(null);
    const input: ProductInput = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      price_cents: priceCents,
      stock: Math.max(0, Math.round(Number(stock) || 0)),
      image_path: imagePath || null,
      sale_percent: pct,
      sale_until: onSale && saleUntil ? saleUntil : null,
    };
    const { error: err } = await saveProduct(input, product?.id);
    setSaving(false);
    if (err) return setError(err);
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
    >
      <div className="flex min-h-full items-center justify-center p-6">
      <div className="relative w-full max-w-[520px] rounded-2xl border border-border bg-surface p-8 shadow-[0_40px_90px_rgba(0,0,0,0.8)]">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
        >
          ×
        </button>
        <h3 className="m-0 mb-6 font-heading text-xl font-semibold tracking-[0.06em] text-white uppercase">
          {isNew ? "Novo produto" : `Editar ${product?.name}`}
        </h3>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-surface-alt">
              {imagePath ? (
                <img src={imagePath} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-3xl text-silver">D</span>
              )}
            </span>
            <label className="cursor-pointer rounded-lg border border-border px-4 py-2.5 font-heading text-[13px] tracking-[0.14em] text-white uppercase transition-colors hover:border-silver">
              {uploadingPhoto ? "Enviando…" : "Enviar foto"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhoto(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do produto"
              className="min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver"
            />
          </Field>

          <Field label="Descrição">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Para que serve, como usar…"
              className="resize-y rounded-lg border border-border bg-surface-alt px-3.5 py-2.5 text-[15px] text-white outline-none focus:border-silver"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Categoria">
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Product["category"])}
                  className="min-h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface-alt px-3.5 pr-9 text-[15px] text-white outline-none focus:border-silver"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted">
                  ▼
                </span>
              </div>
            </Field>
            <Field label="Quantidade">
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver"
              />
            </Field>
          </div>

          <Field label="Preço (R$)">
            <input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
              className="min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver"
            />
          </Field>

          <button
            onClick={() => setOnSale((v) => !v)}
            className="flex min-h-12 cursor-pointer items-center justify-between rounded-lg border px-3.5 font-heading text-[13px] tracking-[0.12em] uppercase transition-colors"
            style={{
              borderColor: onSale ? "var(--color-silver)" : "#2A2A2A",
              background: onSale ? "rgba(255,255,255,0.06)" : "transparent",
              color: onSale ? "#FFFFFF" : "#9E9E9E",
            }}
          >
            Em promoção
            <span
              className="flex h-6 w-11 items-center rounded-full border border-border px-0.5 transition-colors"
              style={{ background: onSale ? "var(--color-silver)" : "transparent" }}
            >
              <span
                className="h-4 w-4 rounded-full transition-transform"
                style={{
                  background: onSale ? "#0A0A0A" : "#9E9E9E",
                  transform: onSale ? "translateX(20px)" : "translateX(0)",
                }}
              />
            </span>
          </button>

          {onSale && (
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-alt p-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Desconto (%)">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={salePercent}
                    onChange={(e) => setSalePercent(e.target.value)}
                    className="min-h-12 rounded-lg border border-border bg-ink px-3.5 text-[15px] text-white outline-none focus:border-silver"
                  />
                </Field>
                <Field label="Até quando">
                  <input
                    type="date"
                    value={saleUntil}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setSaleUntil(e.target.value)}
                    className="min-h-12 rounded-lg border border-border bg-ink px-3.5 text-[15px] text-white outline-none focus:border-silver"
                  />
                </Field>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-[13px] text-muted">Valor atual</span>
                <span className="font-heading text-[20px] text-white tabular-nums">
                  {formatCents(currentCents)}
                  {priceCents > currentCents && (
                    <span className="ml-2 text-[14px] text-faint line-through">{formatCents(priceCents)}</span>
                  )}
                </span>
              </div>
            </div>
          )}

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
