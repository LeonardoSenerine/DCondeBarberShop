import { ABOUT } from "@/data/content";

export function About() {
  return (
    <section id="sobre" className="relative overflow-hidden bg-surface px-6 py-28">
      <div className="mx-auto grid max-w-[1240px] items-center gap-10 md:grid-cols-2 md:gap-20">
        <div className="animate-[dc-up_700ms_ease_both]">
          <span className="font-heading text-xs tracking-[0.36em] text-muted-2 uppercase">Sobre</span>
          <h2 className="m-0 mt-3 mb-7 font-heading text-[clamp(30px,4vw,52px)] font-semibold tracking-[0.04em] text-white uppercase">
            Desde {ABOUT.stats[0].value}
          </h2>

          <blockquote className="m-0 mb-7 border-l border-silver pl-5.5">
            <p className="m-0 font-serif text-lg leading-relaxed text-white sm:text-[22px] text-balance-safe">{ABOUT.quote}</p>
          </blockquote>

          {ABOUT.paragraphs.map((p) => (
            <p key={p} className="m-0 mb-4.5 max-w-[56ch] font-serif text-lg leading-relaxed text-mist">
              {p}
            </p>
          ))}

          <div className="grid grid-cols-2 gap-5 border-t border-border pt-7 sm:grid-cols-2">
            {ABOUT.stats.map((s) => (
              <div key={s.label}>
                <div className="font-heading text-4xl leading-none font-semibold text-white">{s.value}</div>
                <div className="mt-1.5 text-xs tracking-[0.16em] text-muted-2 uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <a
              href="#agendar"
              className="bg-silver-gradient flex h-13 items-center rounded-lg px-7 font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110"
            >
              Agendar horário
            </a>
            <a
              href="https://www.instagram.com/dcondebarbearia/"
              target="_blank"
              rel="noopener"
              className="flex h-13 items-center rounded-lg border border-border px-7 font-heading text-xs tracking-[0.2em] text-white uppercase transition-colors hover:border-silver"
            >
              Ver o Instagram
            </a>
          </div>
        </div>

        <div className="relative animate-[dc-up_700ms_120ms_ease_both]">
          <img
            src={ABOUT.founder.photo}
            alt={`${ABOUT.founder.name}, fundador da D'Conde Barbearia`}
            className="aspect-[3/4] w-full rounded-lg border border-border object-cover"
            style={{ objectPosition: "center 28%", filter: "contrast(1.04)" }}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-b-lg p-5.5"
            style={{ background: "linear-gradient(to top,rgba(10,10,10,0.92),rgba(10,10,10,0))" }}
          >
            <span className="block font-heading text-lg tracking-[0.12em] text-white uppercase">
              {ABOUT.founder.name}
            </span>
            <span className="mt-1 block text-[13px] tracking-[0.18em] text-muted uppercase">
              {ABOUT.founder.role}
            </span>
          </div>
          <span
            aria-hidden
            className="animate-dc-float pointer-events-none absolute -right-[6%] -bottom-[5%] flex h-[150px] w-[150px] items-center justify-center overflow-hidden rounded-xl border border-border-strong bg-ink shadow-[0_22px_50px_rgba(0,0,0,0.7)]"
          >
            <img src="/img/monogram.jpg" alt="" className="h-full w-full object-cover" style={{ objectPosition: "center 46%" }} />
          </span>
        </div>
      </div>

      <div className="mx-auto mt-20 grid max-w-[1240px] gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 [animation:dc-up_700ms_200ms_ease_both]">
        {ABOUT.facts.map((f) => (
          <div key={f.k} className="flex flex-col gap-2 bg-ink px-6 py-7">
            <span className="font-heading text-[11px] tracking-[0.24em] text-muted-2 uppercase">{f.k}</span>
            <span className="text-[15px] leading-relaxed text-white">{f.v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
