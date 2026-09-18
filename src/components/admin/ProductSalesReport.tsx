import { useProductSales } from "@/hooks/useAdmin";
import type { Product } from "@/hooks/useCatalog";
import { formatCents } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";

const TOP_N = 5;
const LOW_STOCK_THRESHOLD = 5;

export function ProductSalesReport({ products }: { products: Product[] }) {
  const { sales, loading } = useProductSales();

  const topSellers = sales.slice(0, TOP_N);
  const maxQty = Math.max(1, ...topSellers.map((s) => s.qty));

  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);

  return (
    <div className="dc-admin-enter rounded-lg border border-border bg-surface p-5 sm:p-7">
      <div className="mb-5 sm:mb-6">
        <h2 className="m-0 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase sm:text-3xl">
          Relatório de vendas
        </h2>
        <span className="text-[15px] text-muted sm:text-base">Baseado em pedidos já concluídos.</span>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full" count={3} />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <span className="font-heading text-[15px] font-medium tracking-[0.16em] text-muted-2 uppercase">
              Mais vendidos
            </span>
            {topSellers.length === 0 ? (
              <p className="mt-4 text-muted">Nenhuma venda registrada ainda.</p>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                {topSellers.map((s) => (
                  <div key={s.productId}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="truncate text-base text-white">{s.name}</span>
                      <span className="flex-shrink-0 text-base text-muted">
                        <span className="font-semibold tabular-nums" style={{ color: "#7FC98F" }}>{s.qty}</span> un ·{" "}
                        <span className="font-semibold tabular-nums" style={{ color: "#7FC98F" }}>{formatCents(s.revenueCents)}</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(s.qty / maxQty) * 100}%`, background: "var(--color-silver)", opacity: 0.7 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <span className="font-heading text-[15px] font-medium tracking-[0.16em] text-muted-2 uppercase">
                Em falta ({outOfStock.length})
              </span>
              {outOfStock.length === 0 ? (
                <p className="mt-3 text-muted">Nenhum produto em falta.</p>
              ) : (
                <div className="mt-3 flex flex-col">
                  {outOfStock.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-t-0">
                      <span className="truncate text-base text-white">{p.name}</span>
                      <span
                        className="flex-shrink-0 rounded-full border px-2.5 py-1 text-[13px] tracking-[0.08em] uppercase"
                        style={{ color: "#FFFFFF", borderColor: "#E0E0E0" }}
                      >
                        Esgotado
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="font-heading text-[15px] font-medium tracking-[0.16em] text-muted-2 uppercase">
                Estoque baixo ({lowStock.length})
              </span>
              {lowStock.length === 0 ? (
                <p className="mt-3 text-muted">Nenhum produto com estoque baixo.</p>
              ) : (
                <div className="mt-3 flex flex-col">
                  {lowStock.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-t-0">
                      <span className="truncate text-base text-white">{p.name}</span>
                      <span className="flex-shrink-0 text-sm text-muted">
                        <span className="text-white tabular-nums">{p.stock}</span> un restante{p.stock === 1 ? "" : "s"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
