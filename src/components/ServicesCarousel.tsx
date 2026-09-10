import { useRef } from "react";
import { useServices } from "@/hooks/useCatalog";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { formatCents, formatDuration } from "@/lib/format";
import { Reveal } from "@/components/Reveal";
import { Skeleton } from "@/components/Skeleton";
import "@/styles/scroll-rails.css";
import "@/styles/gallery-card.css";

export function ServicesCarousel() {
  const { data: services, loading } = useServices();
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollByAmount = useAutoScroll(trackRef, 0.45);

  function scrollByCards(dir: 1 | -1) {
    scrollByAmount(296 * 2 * dir);
  }

  return (
    <section id="servicos" className="relative overflow-hidden bg-surface py-28">
      <img
        src="/img/monogram.jpg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-[12%] -left-[10%] w-[min(52vw,620px)] opacity-5"
        style={{ filter: "contrast(3.2)", mixBlendMode: "screen" }}
      />
      <div className="relative mx-auto max-w-[1240px] px-6">
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="font-heading text-xs tracking-[0.36em] text-muted-2 uppercase">Serviços</span>
            <h2 className="m-0 mt-3 font-heading text-[clamp(30px,4vw,52px)] font-semibold tracking-[0.04em] text-white uppercase">
              Serviços e preços
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
        <div aria-hidden className="scroll-rail-fade-left" style={{ background: "linear-gradient(90deg,#141414 0%,rgba(20,20,20,0.85) 45%,rgba(20,20,20,0) 100%)" }} />
        <div aria-hidden className="scroll-rail-fade-right" style={{ background: "linear-gradient(270deg,#141414 0%,rgba(20,20,20,0.85) 45%,rgba(20,20,20,0) 100%)" }} />
        <div ref={trackRef} className="scroll-rail relative flex gap-4 overflow-x-auto px-6 pt-4 pb-6 sm:pt-10 sm:pb-10">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="relative flex min-h-[180px] flex-none basis-[280px] flex-col gap-3 rounded-lg border border-border bg-surface-alt p-6"
              >
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <div className="mt-auto flex items-end justify-between border-t border-border pt-4.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          {services.map((s) => (
            <div
              key={s.id}
              className="service-card relative flex min-h-[180px] flex-none basis-[280px] flex-col gap-3 overflow-hidden rounded-lg border border-border bg-surface-alt p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-silver hover:shadow-[0_26px_60px_rgba(0,0,0,0.6)]"
            >
              <span aria-hidden className="pointer-events-none absolute -right-3.5 -bottom-6.5 font-display text-[110px] leading-none text-white opacity-5">
                D
              </span>
              <h3 className="relative m-0 font-heading text-[19px] font-medium tracking-[0.08em] text-white uppercase text-balance-safe">
                {s.name}
              </h3>
              <p className="service-bio relative m-0 font-serif text-[15px] leading-relaxed text-silver-dim">
                {s.description}
              </p>
              <div className="relative mt-auto flex items-end justify-between gap-2.5 border-t border-border pt-4.5">
                <span className="text-[13px] tracking-[0.08em] text-muted">{formatDuration(s.duration_minutes)}</span>
                <span className="flex flex-col items-end">
                  <span className="text-[11px] tracking-[0.14em] text-muted-2 uppercase">a partir de</span>
                  <span className="font-heading text-[22px] leading-tight font-semibold text-white">
                    {formatCents(s.price_cents)}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
