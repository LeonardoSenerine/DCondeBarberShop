import { useRef } from "react";
import { usePublishedReviews } from "@/hooks/useReviews";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { StarRating } from "@/components/StarRating";
import { Reveal } from "@/components/Reveal";
import { Skeleton } from "@/components/Skeleton";
import "@/styles/scroll-rails.css";

/** Public carousel of admin-approved reviews — hidden entirely until at least one is published. */
export function Testimonials() {
  const { reviews, loading } = usePublishedReviews();
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollByAmount = useAutoScroll(trackRef, 0.35);

  function scrollByCards(dir: 1 | -1) {
    scrollByAmount(300 * 2 * dir);
  }

  if (!loading && reviews.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-surface py-28">
      <div className="relative mx-auto max-w-[1240px] px-6">
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="font-heading text-xs tracking-[0.36em] text-muted-2 uppercase">Avaliações</span>
            <h2 className="m-0 mt-3 font-heading text-[clamp(30px,4vw,52px)] font-semibold tracking-[0.04em] text-white uppercase">
              O que dizem nossos clientes
            </h2>
          </div>
          <div className="hidden gap-2.5 sm:flex">
            <button
              onClick={() => scrollByCards(-1)}
              aria-label="Anterior"
              className="flex h-13 w-13 items-center justify-center rounded-full border border-border text-white transition-colors hover:border-silver hover:bg-white/6"
            >
              ‹
            </button>
            <button
              onClick={() => scrollByCards(1)}
              aria-label="Próximo"
              className="flex h-13 w-13 items-center justify-center rounded-full border border-border text-white transition-colors hover:border-silver hover:bg-white/6"
            >
              ›
            </button>
          </div>
        </Reveal>
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="scroll-rail-fade-left"
          style={{ background: "linear-gradient(90deg,#141414 0%,rgba(20,20,20,0.85) 45%,rgba(20,20,20,0) 100%)" }}
        />
        <div
          aria-hidden
          className="scroll-rail-fade-right"
          style={{ background: "linear-gradient(270deg,#141414 0%,rgba(20,20,20,0.85) 45%,rgba(20,20,20,0) 100%)" }}
        />
        <div ref={trackRef} className="scroll-rail relative flex gap-4 overflow-x-auto px-6 pt-4 pb-6 sm:pt-10 sm:pb-10">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex min-h-[200px] flex-none basis-[300px] flex-col gap-3 rounded-lg border border-border bg-surface-alt p-6"
              >
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-full" count={3} />
              </div>
            ))}
          {reviews.map((r) => (
            <div
              key={r.id}
              className="flex min-h-[200px] flex-none basis-[300px] flex-col gap-3.5 rounded-lg border border-border bg-surface-alt p-6"
            >
              <StarRating value={r.rating} size={16} />
              {r.comment ? (
                <p className="m-0 flex-1 font-serif text-[15px] leading-relaxed text-silver-dim">“{r.comment}”</p>
              ) : (
                <div className="flex-1" />
              )}
              <div className="flex flex-col gap-0.5 border-t border-border pt-4">
                <span className="font-heading text-sm tracking-[0.08em] text-white uppercase">{r.customer_name}</span>
                <span className="text-[13px] text-muted">
                  {r.services?.name}
                  {r.barbers?.name ? ` · ${r.barbers.name}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
