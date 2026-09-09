import { useMemo, useState } from "react";
import { useProducts, type Product } from "@/hooks/useCatalog";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { BRAND } from "@/data/content";
import { formatCents, whatsAppLink } from "@/lib/format";

const CATEGORIES = ["Todos", "Cabelo", "Barba", "Pele"] as const;

export function Shop() {
  const { data: products, loading } = useProducts();
  const { cart, add, remove, clear, isEmpty } = useCart();
  const { session, profile } = useAuth();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Todos");
  const [query, setQuery] = useState("");
  const [placing, setPlacing] = useState(false);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p] as const)), [products]);

  const filtered = products.filter(
    (p) => (category === "Todos" || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase()),
  );

  const cartRows = Object.entries(cart)
    .map(([id, qty]) => ({ product: byId.get(id), qty }))
    .filter((row): row is { product: Product; qty: number } => !!row.product);

  const totalCents = cartRows.reduce((sum, row) => sum + row.product.price_cents * row.qty, 0);

  async function handleCheckout() {
    const items = cartRows
      .map((row) => `${row.qty}x ${row.product.name}`)
      .join(", ");
    const message = `Olá! Quero reservar: ${items || "produtos da D'Conde"}`;

    if (session?.user) {
      setPlacing(true);
      const { data: order } = await supabase
        .from("orders")
        .insert({
          customer_id: session.user.id,
          customer_name: profile?.full_name ?? "",
          customer_phone: profile?.phone ?? "",
          status: "pending",
          total_cents: totalCents,
        })
        .select()
        .single();
      if (order) {
        await supabase.from("order_items").insert(
          cartRows.map((row) => ({
            order_id: order.id,
            product_id: row.product.id,
            quantity: row.qty,
            unit_price_cents: row.product.price_cents,
          })),
        );
      }
      setPlacing(false);
    }

    window.open(whatsAppLink(BRAND.whatsapp, message), "_blank", "noopener");
    clear();
  }

  return (
    <section id="shop" className="border-t border-border bg-surface px-6 py-28">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-12 [animation:dc-up_700ms_ease_both]">
          <span className="font-heading text-xs tracking-[0.36em] text-muted-2 uppercase">Shop</span>
          <h2 className="m-0 mt-3 font-heading text-[clamp(30px,4vw,52px)] font-semibold tracking-[0.04em] text-white uppercase">
            Produtos da casa
          </h2>
        </div>

        <div className="flex flex-wrap items-start gap-5 [animation:dc-up_700ms_120ms_ease_both]">
          <div className="min-w-0 flex-1 basis-[460px]">
            <div className="mb-4.5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-4.5 py-3.5">
              <span className="font-heading text-xs tracking-[0.2em] text-muted uppercase">
                {products.length} produtos
              </span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const on = category === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className="min-h-9.5 rounded-full border px-3.5 font-heading text-[11px] tracking-[0.16em] uppercase transition-colors"
                      style={{
                        background: on ? "rgba(255,255,255,0.08)" : "transparent",
                        borderColor: on ? "#E0E0E0" : "#2A2A2A",
                        color: on ? "#FFFFFF" : "#A3A3A3",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {loading && <p className="text-muted">Carregando produtos…</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => {
                const out = p.stock === 0;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface-alt p-4.5 transition-transform duration-300 hover:-translate-y-1 hover:border-silver"
                  >
                    <div className="flex h-[170px] items-center justify-center rounded-lg border border-border bg-ink">
                      <span aria-hidden className="font-display text-[76px] leading-none text-white opacity-16">
                        D
                      </span>
                    </div>
                    <span className="font-heading text-base font-medium tracking-[0.08em] text-white uppercase text-balance-safe">
                      {p.name}
                    </span>
                    <span className="text-[13px] text-muted">{p.category}</span>
                    <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-border pt-3.5">
                      <span className="font-heading text-xl font-semibold text-white">{formatCents(p.price_cents)}</span>
                      <button
                        disabled={out}
                        onClick={() => add(p.id)}
                        className="min-h-[42px] rounded-lg border px-4 font-heading text-[11px] font-semibold tracking-[0.16em] uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed"
                        style={{
                          background: out ? "transparent" : "linear-gradient(135deg,#FFFFFF 0%,#9E9E9E 52%,#E0E0E0 100%)",
                          borderColor: out ? "#2A2A2A" : "#FFFFFF",
                          color: out ? "#9E9E9E" : "#0A0A0A",
                        }}
                      >
                        {out ? "Esgotado" : "Adicionar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 basis-[280px] flex-col gap-4 md:max-w-[340px]">
            <div className="rounded-lg border border-border bg-surface-alt p-6">
              <span className="font-heading text-xs tracking-[0.24em] text-white uppercase">Carrinho</span>
              <div className="mt-4 flex flex-col">
                {cartRows.map((row) => (
                  <div key={row.product.id} className="flex items-center gap-2.5 border-t border-border py-3">
                    <span className="min-w-0 flex-1 text-sm text-white">{row.product.name}</span>
                    <span className="text-[13px] text-muted">{row.qty}×</span>
                    <span className="font-heading text-[15px] text-white">
                      {formatCents(row.product.price_cents * row.qty)}
                    </span>
                    <button
                      onClick={() => remove(row.product.id)}
                      aria-label="Remover"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {isEmpty && (
                <div className="flex flex-col items-center gap-1.5 pt-4.5 pb-1">
                  <span aria-hidden className="font-display text-[52px] leading-none text-white opacity-18">
                    D
                  </span>
                  <span className="text-[13px] text-muted-2">Carrinho vazio</span>
                </div>
              )}
              <div className="mt-4.5 flex items-baseline justify-between border-t border-border pt-4">
                <span className="font-heading text-xs tracking-[0.2em] text-muted uppercase">Total</span>
                <span className="font-heading text-2xl font-semibold text-white">{formatCents(totalCents)}</span>
              </div>
              <button
                disabled={isEmpty || placing}
                onClick={handleCheckout}
                className="bg-silver-gradient mt-4 flex min-h-[50px] w-full items-center justify-center rounded-lg font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-50"
              >
                Fechar pelo WhatsApp
              </button>
            </div>

            <div className="rounded-lg border border-border bg-surface-alt p-6">
              <span className="font-heading text-xs tracking-[0.24em] text-white uppercase">Buscar</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome do produto"
                className="mt-3.5 min-h-[46px] w-full rounded-lg border border-border bg-ink px-3.5 text-sm text-white outline-none focus:border-silver"
              />
            </div>

            <div className="rounded-lg border border-border bg-surface-alt p-6">
              <span className="font-heading text-xs tracking-[0.24em] text-white uppercase">Retirada</span>
              <p className="mt-3.5 text-sm leading-relaxed text-muted">
                Compra reservada e retirada na barbearia, na {BRAND.addressLine}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
