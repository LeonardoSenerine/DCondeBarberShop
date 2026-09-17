import { useState } from "react";
import { useAdminProducts, adjustProductStock, deleteProduct } from "@/hooks/useAdmin";
import type { Product } from "@/hooks/useCatalog";
import { formatCents, formatDateBR } from "@/lib/format";
import { effectivePriceCents, isOnSale } from "@/lib/product";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { Toast } from "@/components/admin/Toast";
import { Skeleton } from "@/components/Skeleton";

export function ProductsTab() {
  const { products, loading, reload } = useAdminProducts();
  const [editing, setEditing] = useState<{ product: Product | null } | null>(null);
  const [removing, setRemoving] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  async function handleAdjust(id: string, delta: number) {
    const { error } = await adjustProductStock(id, delta);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    reload();
  }

  async function handleConfirmDelete() {
    if (!removing) return;
    setDeleting(true);
    const { error } = await deleteProduct(removing.id);
    setDeleting(false);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    setToast({ message: "Produto removido.", variant: "success" });
    setRemoving(null);
    reload();
  }

  return (
    <div className="dc-admin-enter rounded-2xl border border-border bg-surface p-5 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <h2 className="m-0 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase sm:text-3xl">
          Produtos e estoque
        </h2>
        <button
          onClick={() => setEditing({ product: null })}
          className="bg-silver-gradient flex min-h-12 cursor-pointer items-center rounded-lg px-6 font-heading text-sm font-semibold tracking-[0.16em] text-ink uppercase transition-[filter] hover:brightness-110"
        >
          + Adicionar produto
        </button>
      </div>

      {loading &&
        products.length === 0 &&
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border py-5 first:border-t-0">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-20" />
            </span>
          </div>
        ))}

      {products.map((p, index) => {
        const status = p.stock === 0 ? "Esgotado" : p.stock <= 5 ? "Baixo" : "Em estoque";
        const lowStock = p.stock <= 5;
        const sale = isOnSale(p);
        const current = effectivePriceCents(p);
        return (
          <div key={p.id} className="dc-admin-enter-item border-t border-border py-4 first:border-t-0 sm:py-5" style={{ animationDelay: `${index * 45}ms` }}>
            {/* image · name/category · price */}
            <div className="flex items-start gap-3.5">
              <span className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-surface-alt sm:h-14 sm:w-14">
                {p.image_path ? (
                  <img src={p.image_path} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-lg text-silver sm:text-xl">
                    D
                  </span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base text-white sm:text-lg">{p.name}</span>
                  {sale && (
                    <span className="rounded-full border border-silver px-2 py-0.5 text-[13px] tracking-[0.08em] text-white uppercase">
                      -{p.sale_percent}%{p.sale_until ? ` até ${formatDateBR(p.sale_until).slice(0, 5)}` : ""}
                    </span>
                  )}
                </div>
                <span className="block text-[15px] text-muted-2">{p.category}</span>
              </div>

              <div className="flex-shrink-0 text-right font-heading text-white tabular-nums">
                {sale ? (
                  <>
                    <span className="block text-base sm:text-lg">{formatCents(current)}</span>
                    <span className="block text-xs text-faint line-through sm:text-sm">{formatCents(p.price_cents)}</span>
                  </>
                ) : (
                  <span className="text-base sm:text-lg">{formatCents(p.price_cents)}</span>
                )}
              </div>
            </div>

            {/* status · stock stepper · actions */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="rounded-full border px-2.5 py-1 text-[13px] tracking-[0.08em] uppercase sm:px-3 sm:py-1.5 sm:text-sm"
                  style={{ color: lowStock ? "#FFFFFF" : "#A3A3A3", borderColor: lowStock ? "#E0E0E0" : "#2A2A2A" }}
                >
                  {status}
                </span>
                <span className="flex items-center gap-2">
                  <button
                    onClick={() => handleAdjust(p.id, -1)}
                    disabled={p.stock === 0}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-lg text-white transition-colors hover:border-silver disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11 sm:text-xl"
                  >
                    −
                  </button>
                  <span className="w-7 text-center font-heading text-base text-white tabular-nums sm:w-10 sm:text-xl">
                    {p.stock}
                  </span>
                  <button
                    onClick={() => handleAdjust(p.id, 1)}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-lg text-white transition-colors hover:border-silver sm:h-11 sm:w-11 sm:text-xl"
                  >
                    +
                  </button>
                </span>
              </div>

              <span className="flex gap-2">
                <button
                  onClick={() => setEditing({ product: p })}
                  className="min-h-9 cursor-pointer rounded-lg border border-border px-3.5 font-heading text-xs tracking-[0.12em] text-white uppercase transition-colors hover:border-silver sm:min-h-11 sm:px-4 sm:text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => setRemoving(p)}
                  className="min-h-9 cursor-pointer rounded-lg border border-border px-3.5 font-heading text-xs tracking-[0.12em] text-muted uppercase transition-colors hover:border-silver hover:text-white sm:min-h-11 sm:px-4 sm:text-sm"
                >
                  Remover
                </button>
              </span>
            </div>
          </div>
        );
      })}

      {editing && (
        <ProductFormModal
          product={editing.product}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setToast({ message: editing.product ? "Produto atualizado." : "Produto adicionado.", variant: "success" });
            reload();
          }}
        />
      )}

      {removing && (
        <ConfirmModal
          title="Remover produto?"
          message={`Tem certeza que deseja remover "${removing.name}"? Essa ação não pode ser desfeita.`}
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setRemoving(null)}
        />
      )}

      {toast && <Toast message={toast.message} onDismiss={() => setToast(null)} variant={toast.variant} />}
    </div>
  );
}
