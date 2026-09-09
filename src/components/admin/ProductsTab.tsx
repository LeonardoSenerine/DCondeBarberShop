import { useAdminProducts, adjustProductStock } from "@/hooks/useAdmin";
import { formatCents } from "@/lib/format";

export function ProductsTab() {
  const { products, loading, reload } = useAdminProducts();

  async function handleAdjust(id: string, delta: number) {
    await adjustProductStock(id, delta);
    reload();
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-7">
      <h2 className="m-0 mb-5 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase">
        Produtos e estoque
      </h2>
      {loading && <p className="text-muted">Carregando…</p>}
      {products.map((p) => {
        const status = p.stock === 0 ? "Esgotado" : p.stock <= 5 ? "Baixo" : "Em estoque";
        const highlight = p.stock <= 5;
        return (
          <div key={p.id} className="flex flex-wrap items-center gap-3.5 border-t border-border py-3.5">
            <span className="min-w-0 flex-1 basis-[200px] text-[15px] text-white">{p.name}</span>
            <span
              className="rounded-full border px-2.5 py-1 text-[11px] tracking-[0.14em] uppercase"
              style={{ color: highlight ? "#FFFFFF" : "#A3A3A3", borderColor: highlight ? "#E0E0E0" : "#2A2A2A" }}
            >
              {status}
            </span>
            <span className="flex items-center gap-2">
              <button
                onClick={() => handleAdjust(p.id, -1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-lg text-white transition-colors hover:border-silver"
              >
                −
              </button>
              <span className="w-9.5 text-center font-heading text-lg text-white">{p.stock}</span>
              <button
                onClick={() => handleAdjust(p.id, 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-lg text-white transition-colors hover:border-silver"
              >
                +
              </button>
            </span>
            <span className="w-24 text-right font-heading text-base text-white">{formatCents(p.price_cents)}</span>
          </div>
        );
      })}
    </div>
  );
}
