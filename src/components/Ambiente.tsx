import { AMBIENTE } from "@/data/content";

interface AmbienteProps {
  onOpenLightbox: (src: string) => void;
}

export function Ambiente({ onOpenLightbox }: AmbienteProps) {
  return (
    <section id="ambiente" className="bg-ink px-6 pt-28">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-12 [animation:dc-up_700ms_ease_both]">
          <h2 className="m-0 font-heading text-[clamp(30px,4vw,52px)] font-semibold tracking-[0.04em] text-white uppercase">
            {AMBIENTE.title}
          </h2>
        </div>
        <div className="flex flex-wrap items-stretch gap-5 [animation:dc-up_700ms_ease_both]">
          <button
            onClick={() => onOpenLightbox(AMBIENTE.cover)}
            className="group relative min-h-[480px] flex-1 basis-[420px] overflow-hidden rounded-lg border border-border bg-surface p-0 text-left transition-colors hover:border-silver"
          >
            <img
              src={AMBIENTE.cover}
              alt="Ambiente da D'Conde Barbearia"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-105"
              style={{ objectPosition: "center 58%", filter: "contrast(1.04) brightness(0.94)" }}
            />
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top,rgba(10,10,10,0.85) 0%,rgba(10,10,10,0.12) 45%,rgba(10,10,10,0.3) 100%)",
              }}
            />
            <span className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3.5 p-6 text-left">
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="font-heading text-lg tracking-[0.16em] text-white uppercase">Salão</span>
                <span className="text-[13px] tracking-[0.16em] text-muted uppercase">
                  Avenida Campo Sales 303 · Itatiba
                </span>
              </span>
            </span>
          </button>
          <div className="flex flex-1 basis-[320px] flex-col gap-4.5 rounded-lg border border-border bg-surface p-8.5 md:max-w-[460px]">
            <h3 className="m-0 font-heading text-[26px] leading-tight font-semibold tracking-[0.06em] text-white uppercase">
              {AMBIENTE.headline}
            </h3>
            <p className="m-0 font-serif text-lg leading-relaxed text-silver-dim">{AMBIENTE.body}</p>
            <div className="mt-auto flex flex-col">
              {AMBIENTE.features.map((f) => (
                <div key={f} className="flex items-center gap-3 border-t border-border py-3.5">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-silver" />
                  <span className="text-[15px] text-white">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
