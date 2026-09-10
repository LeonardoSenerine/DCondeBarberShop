import { HERO } from "@/data/content";

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center overflow-hidden bg-ink"
    >
      <div aria-hidden className="absolute inset-y-0 right-0 w-full overflow-hidden md:w-[58%]">
        <img
          src="/img/hero-barba.jpg"
          alt=""
          className="h-full w-full animate-dc-zoom object-cover"
          style={{ objectPosition: "center 30%", filter: "contrast(1.08) brightness(0.86)" }}
        />
        <span
          className="absolute inset-0 md:hidden"
          style={{
            background:
              "linear-gradient(180deg,rgba(10,10,10,0.72) 0%,rgba(10,10,10,0.86) 60%,#0A0A0A 100%)",
          }}
        />
        <span
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(90deg,#0A0A0A 0%,rgba(10,10,10,0.92) 22%,rgba(10,10,10,0.35) 58%,rgba(10,10,10,0.25) 100%)",
          }}
        />
      </div>

      <img
        src="/img/monogram.jpg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-[10%] -left-[8%] w-[min(48vw,560px)] opacity-5"
        style={{ filter: "contrast(3.2)", mixBlendMode: "screen" }}
      />

      <div className="relative z-[2] mx-auto w-full max-w-[1240px] px-6 pt-[150px] pb-[120px]">
        <div className="max-w-full md:max-w-[46%]">
          <div className="mb-6 flex items-center [animation:dc-up_700ms_ease_both]">
            <span className="font-heading text-xs tracking-[0.42em] text-silver uppercase">
              {HERO.eyebrow}
            </span>
          </div>

          <h1
            className="mb-5 font-heading text-[clamp(42px,6vw,88px)] leading-[0.94] font-semibold tracking-[0.01em] text-white uppercase text-balance-safe [animation:dc-up_700ms_120ms_ease_both]"
          >
            {HERO.titleLines[0]}
            <br />
            {HERO.titleLines[1]}
          </h1>

          <p className="mb-5 font-display text-[clamp(24px,3vw,38px)] leading-[1.15] tracking-[0.02em] text-silver [animation:dc-up_700ms_180ms_ease_both]">
            {HERO.tagline}
          </p>

          <p className="mb-10 max-w-[44ch] font-serif text-[19px] leading-relaxed text-silver-dim [animation:dc-up_700ms_240ms_ease_both]">
            {HERO.lead}
          </p>

          <div className="mb-9 flex flex-wrap gap-3.5 [animation:dc-up_700ms_360ms_ease_both]">
            <a
              href="#agendar"
              className="bg-silver-gradient flex h-14 items-center rounded-lg px-8 font-heading text-sm font-semibold tracking-[0.22em] text-ink uppercase shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition-[filter] hover:brightness-110"
            >
              Agendar agora
            </a>
            <a
              href="#servicos"
              className="flex h-14 items-center rounded-lg border border-white px-8 font-heading text-sm font-medium tracking-[0.22em] text-white uppercase transition-colors hover:bg-white/10"
            >
              Ver serviços
            </a>
          </div>

          <div className="flex flex-wrap gap-7 border-t border-border pt-6 [animation:dc-up_700ms_460ms_ease_both]">
            {HERO.stats.map((stat) => (
              <span key={stat.label} className="flex flex-col gap-1">
                <span className="font-heading text-[26px] leading-none font-semibold text-white">
                  {stat.value}
                </span>
                <span className="text-[11px] tracking-[0.2em] text-muted-2 uppercase">
                  {stat.label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
