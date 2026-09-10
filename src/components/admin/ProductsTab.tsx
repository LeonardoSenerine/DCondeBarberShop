import { useState } from "react";
import { useAdminProducts, adjustProductStock, deleteProduct } from "@/hooks/useAdmin";
import type { Product } from "@/hooks/useCatalog";
import { formatCents, formatDateBR } from "@/lib/format";
import { effectivePriceCents, isOnSale } from "@/lib/product";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import { Skeleton } from "@/components/Skeleton";

export function ProductsTab() {
  const { products, loading, reload } = useAdminProducts();
  const [editing, setEditing] = useState<{ product: Product | null } | null>(null);

  async function handleAdjust(id: string, delta: number) {
    await adjustProductStock(id, delta);
    reload();
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Remover ${p.name}?`)) return;
    await deleteProduct(p.id);
    reload();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase">
          Produtos e estoque
        </h2>
        <button
          onClick={() => setEditing({ product: null })}
          className="bg-silver-gradient flex min-h-10 cursor-pointer items-center rounded-lg px-5 font-heading text-xs font-semibold tracking-[0.16em] text-ink uppercase transition-[filter] hover:brightness-110"
        >
          + Adicionar produto
        </button>
      </div>

      {loading &&
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 border-t border-border py-4 first:border-t-0">
            <Skeleton className="h-11 w-11 rounded-lg" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-16" />
            </span>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}

      {products.map((p) => {
        const status = p.stock === 0 ? "Esgotado" : p.stock <= 5 ? "Baixo" : "Em estoque";
        const lowStock = p.stock <= 5;
        const sale = isOnSale(p);
        const current = effectivePriceCents(p);
        return (
          <div key={p.id} className="flex flex-wrap items-center gap-3.5 border-t border-border py-4 first:border-t-0">
            <span className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-surface-alt">
              {p.image_path ? (
                <img src={p.image_path} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-lg text-silver">D</span>
              )}
            </span>

            <span className="min-w-0 flex-1 basis-[180px]">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] text-white">{p.name}</span>
                {sale && (
                  <span className="rounded-full border border-silver px-2 py-0.5 text-[10px] tracking-[0.14em] text-white uppercase">
                    -{p.sale_percent}%{p.sale_until ? ` até ${formatDateBR(p.sale_until).slice(0, 5)}` : ""}
                  </span>
                )}
              </span>
              <span className="block text-[12px] text-muted-2">{p.category}</span>
            </span>

            <span
              className="rounded-full border px-2.5 py-1 text-[11px] tracking-[0.14em] uppercase"
              style={{ color: lowStock ? "#FFFFFF" : "#A3A3A3", borderColor: lowStock ? "#E0E0E0" : "#2A2A2A" }}
            >
              {status}
            </span>

            <span className="flex items-center gap-2">
              <button
                onClick={() => handleAdjust(p.id, -1)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-lg text-white transition-colors hover:border-silver"
              >
                −
              </button>
              <span className="w-9 text-center font-heading text-lg text-white tabular-nums">{p.stock}</span>
              <button
                onClick={() => handleAdjust(p.id, 1)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-lg text-white transition-colors hover:border-silver"
              >
                +
              </button>
            </span>

            <span className="w-28 text-right font-heading text-white tabular-nums">
              {sale ? (
                <>
                  <span className="block text-[15px]">{formatCents(current)}</span>
                  <span className="block text-[12px] text-faint line-through">{formatCents(p.price_cents)}</span>
                </>
              ) : (
                <span className="text-[15px]">{formatCents(p.price_cents)}</span>
              )}
            </span>

            <span className="flex gap-2">
              <button
                onClick={() => setEditing({ product: p })}
                className="min-h-9 cursor-pointer rounded-lg border border-border px-3 font-heading text-[11px] tracking-[0.14em] text-white uppercase transition-colors hover:border-silver"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(p)}
                className="min-h-9 cursor-pointer rounded-lg border border-border px-3 font-heading text-[11px] tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
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
    </div>
  );
}
