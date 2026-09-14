import { useState } from "react";
import { useAdminProducts, adjustProductStock, deleteProduct } from "@/hooks/useAdmin";
import type { Product } from "@/hooks/useCatalog";
import { formatCents, formatDateBR } from "@/lib/format";
import { effectivePriceCents, isOnSale } from "@/lib/product";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { Skeleton } from "@/components/Skeleton";

export function ProductsTab() {
  const { products, loading, reload } = useAdminProducts();
  const [editing, setEditing] = useState<{ product: Product | null } | null>(null);
  const [removing, setRemoving] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleAdjust(id: string, delta: number) {
    await adjustProductStock(id, delta);
    reload();
  }

  async function handleConfirmDelete() {
    if (!removing) return;
    setDeleting(true);
    await deleteProduct(removing.id);
    setDeleting(false);
    setRemoving(null);
    reload();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-heading text-3xl font-semibold tracking-[0.06em] text-white uppercase">
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
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-11 w-32 rounded-lg" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}

      {products.map((p) => {
        const status = p.stock === 0 ? "Esgotado" : p.stock <= 5 ? "Baixo" : "Em estoque";
        const lowStock = p.stock <= 5;
        const sale = isOnSale(p);
        const current = effectivePriceCents(p);
        return (
          <div key={p.id} className="flex flex-wrap items-center gap-4 border-t border-border py-5 first:border-t-0">
            <span className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-surface-alt">
              {p.image_path ? (
                <img src={p.image_path} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-xl text-silver">D</span>
              )}
            </span>

            <span className="min-w-0 flex-1 basis-[200px]">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-lg text-white">{p.name}</span>
                {sale && (
                  <span className="rounded-full border border-silver px-2.5 py-0.5 text-xs tracking-[0.14em] text-white uppercase">
                    -{p.sale_percent}%{p.sale_until ? ` até ${formatDateBR(p.sale_until).slice(0, 5)}` : ""}
                  </span>
                )}
              </span>
              <span className="block text-sm text-muted-2">{p.category}</span>
            </span>

            <span
              className="rounded-full border px-3 py-1.5 text-sm tracking-[0.14em] uppercase"
              style={{ color: lowStock ? "#FFFFFF" : "#A3A3A3", borderColor: lowStock ? "#E0E0E0" : "#2A2A2A" }}
            >
              {status}
            </span>

            <span className="flex items-center gap-2.5">
              <button
                onClick={() => handleAdjust(p.id, -1)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-border text-xl text-white transition-colors hover:border-silver"
              >
                −
              </button>
              <span className="w-10 text-center font-heading text-xl text-white tabular-nums">{p.stock}</span>
              <button
                onClick={() => handleAdjust(p.id, 1)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-border text-xl text-white transition-colors hover:border-silver"
              >
                +
              </button>
            </span>

            <span className="w-32 text-right font-heading text-white tabular-nums">
              {sale ? (
                <>
                  <span className="block text-lg">{formatCents(current)}</span>
                  <span className="block text-sm text-faint line-through">{formatCents(p.price_cents)}</span>
                </>
              ) : (
                <span className="text-lg">{formatCents(p.price_cents)}</span>
              )}
            </span>

            <span className="flex gap-2.5">
              <button
                onClick={() => setEditing({ product: p })}
                className="min-h-11 cursor-pointer rounded-lg border border-border px-4 font-heading text-sm tracking-[0.14em] text-white uppercase transition-colors hover:border-silver"
              >
                Editar
              </button>
              <button
                onClick={() => setRemoving(p)}
                className="min-h-11 cursor-pointer rounded-lg border border-border px-4 font-heading text-sm tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
              >
                Remover
              </button>
            </span>
          </div>
        );
      })}

      {editing && (
        <ProductFormModal
          product={editing.product}
          onClose={() => setEditing(null)}
          onSaved={reload}
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
    </div>
  );
}
