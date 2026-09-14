import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, ShoppingCart, Trash, X } from "@phosphor-icons/react";
import { useProducts, type Product } from "@/hooks/useCatalog";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { BRAND } from "@/data/content";
import { formatCents, whatsAppLink } from "@/lib/format";
import { effectivePriceCents, isOnSale } from "@/lib/product";
import { Reveal } from "@/components/Reveal";
import { Skeleton } from "@/components/Skeleton";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import "@/styles/pop.css";
import "@/styles/scrollbar.css";

const PRESS_FX = "active:scale-[0.94] transition-transform duration-150";

const CATEGORIES = ["Todos", "Cabelo", "Barba", "Pele"] as const;

function bumpElement(el: HTMLElement) {
  el.classList.remove("pop-bump");
  void el.offsetWidth;
  el.classList.add("pop-bump");
  el.addEventListener("animationend", () => el.classList.remove("pop-bump"), { once: true });
}

function getVisibleCartTarget(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>("[data-cart-target]");
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

function flyProductToCart(cardEl: HTMLElement) {
  const thumb = cardEl.querySelector<HTMLElement>("[data-product-thumb]");
  const target = getVisibleCartTarget();
  if (!thumb || !target) return;

  const fromRect = thumb.getBoundingClientRect();
  const toRect = target.getBoundingClientRect();
  const startCenterX = fromRect.left + fromRect.width / 2;
  const startCenterY = fromRect.top + fromRect.height / 2;
  const endCenterX = toRect.left + toRect.width / 2;
  const endCenterY = toRect.top + toRect.height / 2;
  const dx = endCenterX - startCenterX;
  const dy = endCenterY - startCenterY;
  const arcPeakY = Math.min(startCenterY, endCenterY) - 110;
  const midX = dx * 0.5;
  const midY = arcPeakY - startCenterY;

  const clone = thumb.cloneNode(true) as HTMLElement;
  clone.classList.add("fly-to-cart-card");
  clone.style.left = `${fromRect.left}px`;
  clone.style.top = `${fromRect.top}px`;
  clone.style.width = `${fromRect.width}px`;
  clone.style.height = `${fromRect.height}px`;
  document.body.appendChild(clone);

  const anim = clone.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1, offset: 0 },
      { transform: `translate(${midX}px, ${midY}px) scale(0.5) rotate(-6deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.1) rotate(8deg)`, opacity: 0.15, offset: 1 },
    ],
    { duration: 680, easing: "cubic-bezier(0.3, 0.7, 0.35, 1)" },
  );
  anim.onfinish = () => clone.remove();
}

export function Shop() {
  const { data: products, loading } = useProducts();
  const { cart, add, decrement, clear, isEmpty } = useCart();
  const { session, profile } = useAuth();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Todos");
  const [query, setQuery] = useState("");
  const [placing, setPlacing] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p] as const)), [products]);

  const filtered = products.filter(
    (p) => (category === "Todos" || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase()),
  );

  const cartRows = Object.entries(cart)
    .map(([id, qty]) => ({ product: byId.get(id), qty }))
    .filter((row): row is { product: Product; qty: number } => !!row.product);

  const totalCents = cartRows.reduce((sum, row) => sum + effectivePriceCents(row.product) * row.qty, 0);
  const itemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const prevCount = useRef(itemCount);
  useEffect(() => {
    if (itemCount > prevCount.current) {
      setBump(true);
      const t = window.setTimeout(() => setBump(false), 450);
      prevCount.current = itemCount;
      return () => window.clearTimeout(t);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

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
            unit_price_cents: effectivePriceCents(row.product),
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
        <Reveal className="mb-12">
          <span className="font-heading text-xs tracking-[0.36em] text-muted-2 uppercase">Shop</span>
          <h2 className="m-0 mt-3 font-heading text-[clamp(30px,4vw,52px)] font-semibold tracking-[0.04em] text-white uppercase">
            Produtos da casa
          </h2>
        </Reveal>

        <Reveal className="flex flex-wrap items-start gap-5" delayMs={120}>
          <div className="min-w-0 flex-1 basis-[460px]">
            <div className="mb-4.5 flex flex-col gap-3.5 rounded-lg border border-border bg-surface-alt px-4.5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
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
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produto"
                className="min-h-11 w-full rounded-lg border border-border bg-ink px-3.5 text-sm text-white outline-none focus:border-silver"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface-alt p-4.5">
                    <Skeleton className="h-[170px] rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                    <div className="mt-auto flex items-center justify-between border-t border-border pt-3.5">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-9 w-24 rounded-lg" />
                    </div>
                  </div>
                ))}
              {filtered.map((p) => {
                const out = p.stock === 0;
                const sale = isOnSale(p);
                const current = effectivePriceCents(p);
                return (
                  <div
                    key={p.id}
                    data-product-card
                    className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface-alt p-4.5 transition-transform duration-300 hover:-translate-y-1 hover:border-silver"
                  >
                    <div
                      data-product-thumb
                      className="relative flex h-[170px] items-center justify-center overflow-hidden rounded-lg border border-border bg-ink"
                    >
                      {p.image_path ? (
                        <img src={p.image_path} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden className="font-display text-[76px] leading-none text-white opacity-16">
                          D
                        </span>
                      )}
                      {sale && (
                        <span className="bg-silver-gradient absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 font-heading text-[10px] font-semibold tracking-[0.14em] text-ink uppercase">
                          -{p.sale_percent}%
                        </span>
                      )}
                    </div>
                    <span className="font-heading text-base font-medium tracking-[0.08em] text-white uppercase text-balance-safe">
                      {p.name}
                    </span>
                    <span className="text-[13px] text-muted">{p.category}</span>
                    <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-border pt-3.5">
                      <span className="flex items-baseline gap-2">
                        <span className="font-heading text-xl font-semibold text-white">{formatCents(current)}</span>
                        {sale && (
                          <span className="text-[13px] text-faint line-through">{formatCents(p.price_cents)}</span>
                        )}
                      </span>
                      <button
                        disabled={out}
                        onClick={(e) => {
                          add(p.id);
                          bumpElement(e.currentTarget);
                          const card = e.currentTarget.closest<HTMLElement>("[data-product-card]");
                          if (card) requestAnimationFrame(() => flyProductToCart(card));
                        }}
                        className={`min-h-[42px] rounded-lg border px-4 font-heading text-[11px] font-semibold tracking-[0.16em] uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:active:scale-100 ${PRESS_FX}`}
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
            <div data-cart-target className="hidden md:block">
              <CartPanel
                cartRows={cartRows}
                totalCents={totalCents}
                isEmpty={isEmpty}
                placing={placing}
                onIncrement={add}
                onDecrement={decrement}
                onClear={() => setConfirmingClear(true)}
                onCheckout={handleCheckout}
              />
            </div>

            <div className="rounded-lg border border-border bg-surface-alt p-6">
              <span className="font-heading text-xs tracking-[0.24em] text-white uppercase">Retirada</span>
              <p className="mt-3.5 text-sm leading-relaxed text-muted">
                Compra reservada e retirada na barbearia, na {BRAND.addressLine}.
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {itemCount > 0 && (
        <button
          data-cart-target
          onClick={() => setMobileCartOpen(true)}
          aria-label={`Ver carrinho, ${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
          className={`bg-silver-gradient fixed bottom-24 left-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full shadow-[0_14px_34px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-90 md:hidden ${bump ? "pop-bump" : ""}`}
        >
          <ShoppingCart size={24} weight="bold" color="#0A0A0A" />
          <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-ink bg-ink px-1 font-heading text-[11px] font-semibold text-white tabular-nums">
            {itemCount}
          </span>
        </button>
      )}

      {mobileCartOpen && (
        <div
          className="fixed inset-0 z-[110] md:hidden"
          style={{ background: "rgba(5,5,5,0.85)", backdropFilter: "blur(6px)" }}
          onClick={() => setMobileCartOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-[dc-up_320ms_ease_both] fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-6 py-4">
              <span className="font-heading text-sm tracking-[0.2em] text-white uppercase">Seu carrinho</span>
              <button
                onClick={() => setMobileCartOpen(false)}
                aria-label="Fechar"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="p-6 pt-4">
              <CartPanel
                cartRows={cartRows}
                totalCents={totalCents}
                isEmpty={isEmpty}
                placing={placing}
                onIncrement={add}
                onDecrement={decrement}
                onClear={() => setConfirmingClear(true)}
                onCheckout={() => {
                  handleCheckout();
                  setMobileCartOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {confirmingClear && (
        <ConfirmModal
          title="Esvaziar carrinho"
          message="Todos os itens serão removidos do carrinho. Deseja continuar?"
          confirmLabel="Esvaziar"
          onConfirm={() => {
            clear();
            setConfirmingClear(false);
          }}
          onClose={() => setConfirmingClear(false)}
        />
      )}
    </section>
  );
}

function CartPanel({
  cartRows,
  totalCents,
  isEmpty,
  placing,
  onIncrement,
  onDecrement,
  onClear,
  onCheckout,
}: {
  cartRows: { product: Product; qty: number }[];
  totalCents: number;
  isEmpty: boolean;
  placing: boolean;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-alt p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="font-heading text-xs tracking-[0.24em] text-white uppercase">Carrinho</span>
        {!isEmpty && (
          <button
            onClick={onClear}
            className={`flex items-center gap-1.5 text-[11px] font-medium text-muted-2 transition-colors hover:text-white ${PRESS_FX}`}
          >
            <Trash size={14} weight="bold" />
            Esvaziar
          </button>
        )}
      </div>
      <div className="scroll-thin mt-2 flex max-h-[260px] flex-col overflow-y-auto">
        {cartRows.map((row) => (
          <div key={row.product.id} className="flex items-center gap-2.5 border-t border-border py-3 first:border-t-0">
            <span className="min-w-0 flex-1 text-sm text-white">{row.product.name}</span>
            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                onClick={() => onDecrement(row.product.id)}
                aria-label="Diminuir quantidade"
                className={`flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white ${PRESS_FX}`}
              >
                <Minus size={12} weight="bold" />
              </button>
              <span className="w-5 text-center text-[13px] text-white tabular-nums">{row.qty}</span>
              <button
                onClick={() => onIncrement(row.product.id)}
                aria-label="Aumentar quantidade"
                className={`flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white ${PRESS_FX}`}
              >
                <Plus size={12} weight="bold" />
              </button>
            </div>
            <span className="font-heading text-[15px] text-white">
              {formatCents(effectivePriceCents(row.product) * row.qty)}
            </span>
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
        onClick={onCheckout}
        className={`bg-silver-gradient mt-4 flex min-h-[50px] w-full items-center justify-center rounded-lg font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-50 disabled:active:scale-100 ${PRESS_FX}`}
      >
        Fechar pelo WhatsApp
      </button>
    </div>
  );
}
