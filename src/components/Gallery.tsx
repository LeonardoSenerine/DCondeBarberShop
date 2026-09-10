import { useMemo, useRef } from "react";
import { useGallery } from "@/hooks/useCatalog";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { BRAND } from "@/data/content";
import { Reveal } from "@/components/Reveal";
import "@/styles/scroll-rails.css";
import "@/styles/gallery-card.css";

interface GalleryProps {
  onOpenLightbox: (src: string) => void;
}

export function Gallery({ onOpenLightbox }: GalleryProps) {
  const { data: photos, loading } = useGallery();
  const railRef = useRef<HTMLDivElement>(null);
  const scrollByAmount = useAutoScroll(railRef, 0.4, photos.length > 2);

  // Rendered twice back-to-back so the auto-scroll can loop seamlessly.
  const loopedPhotos = useMemo(
    () =>
      photos.length > 2
        ? [...photos, ...photos.map((p) => ({ ...p, id: `${p.id}-dup` }))]
        : photos,
    [photos],
  );

  function scrollByCard(dir: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first
      ? first.getBoundingClientRect().width + 16
      : el.clientWidth * 0.8;
    scrollByAmount(step * dir);
  }

  return (
    <section id="galeria" className="relative overflow-hidden bg-ink py-28">
      <div className="relative mx-auto max-w-[1240px] px-6">
        <Reveal className="mb-12">
          <span className="font-heading text-xs tracking-[0.36em] text-muted-2 uppercase">
            Galeria
          </span>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h2 className="m-0 mt-3 font-heading text-[clamp(30px,4vw,52px)] font-semibold tracking-[0.04em] text-white uppercase text-balance-safe">
              O que fazemos no dia a dia
            </h2>
            <div className="hidden flex-shrink-0 gap-2.5 sm:flex">
              <button
                onClick={() => scrollByCard(-1)}
                aria-label="Anterior"
                className="flex h-11.5 w-11.5 items-center justify-center rounded-full border border-border text-white transition-colors hover:border-silver hover:bg-white/7"
              >
                ‹
              </button>
              <button
                onClick={() => scrollByCard(1)}
                aria-label="Próximo"
                className="flex h-11.5 w-11.5 items-center justify-center rounded-full border border-border text-white transition-colors hover:border-silver hover:bg-white/7"
              >
                ›
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="scroll-rail-fade-left"
          style={{
            background:
              "linear-gradient(90deg,#0A0A0A 0%,rgba(10,10,10,0.85) 40%,rgba(10,10,10,0) 100%)",
          }}
        />
        <div
          aria-hidden
          className="scroll-rail-fade-right"
          style={{
            background:
              "linear-gradient(270deg,#0A0A0A 0%,rgba(10,10,10,0.85) 40%,rgba(10,10,10,0) 100%)",
          }}
        />
        <div
          ref={railRef}
          className="scroll-rail flex gap-4 overflow-x-auto px-6 py-4 sm:py-10 [animation:dc-up_700ms_ease_both]"
        >
          {loading && <p className="py-10 text-muted">Carregando galeria…</p>}
          {loopedPhotos.map((g) => (
            <button
              key={g.id}
              onClick={() => onOpenLightbox(g.image_path)}
              className="cut-card relative h-[360px] w-[84%] flex-none overflow-hidden rounded-lg border border-border bg-surface p-0 md:h-[440px] md:w-[calc((100%-32px)/3)]"
            >
              <img
                src={g.image_path}
                loading="lazy"
                alt="Corte feito na D'Conde Barbearia"
                className="h-full w-full object-cover"
              />
              <span
                className="cut-card-info absolute inset-x-0 bottom-0 flex flex-col items-start gap-1.5 p-5 text-left"
                style={{
                  background:
                    "linear-gradient(to top,rgba(10,10,10,0.94) 20%,rgba(10,10,10,0))",
                }}
              >
                <span className="font-heading text-[15px] tracking-[0.12em] text-white uppercase">
                  {g.service_label ?? "D'Conde"}
                </span>
                <span className="text-[13px] text-silver">
                  {g.client_label}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-[1240px] px-6">
        <a
          href={BRAND.instagram}
          target="_blank"
          rel="noopener"
          className="mt-8 flex flex-wrap items-center justify-between gap-3.5 rounded-lg border border-border bg-surface px-6 py-5.5 transition-colors hover:border-silver hover:bg-surface-alt"
        >
          <span className="font-heading text-xl font-medium tracking-[0.1em] text-white uppercase">
            Ver mais cortes
          </span>
          <span className="text-sm text-muted">{BRAND.instagramHandle}</span>
        </a>
      </div>
    </section>
  );
}
