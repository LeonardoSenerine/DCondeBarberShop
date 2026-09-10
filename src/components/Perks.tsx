import { PERKS } from "@/data/content";
import { Reveal } from "@/components/Reveal";

export function Perks() {
  return (
    <section className="relative overflow-hidden bg-ink px-6 py-26">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/img/salao-01.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 45%",
          filter: "brightness(0.3)",
          opacity: 0.55,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg,#0A0A0A 0%,rgba(10,10,10,0.55) 45%,#0A0A0A 100%)" }}
      />
      <div className="relative mx-auto max-w-[1240px]">
        <Reveal className="mb-14 text-center">
          <h2 className="m-0 font-heading text-[clamp(28px,3.6vw,46px)] font-semibold tracking-[0.04em] text-white uppercase">
            Como a gente trabalha
          </h2>
        </Reveal>
        <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" delayMs={120}>
          {PERKS.map((p) => (
            <div
              key={p.title}
              className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface/80 p-9 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-silver hover:bg-surface-alt/90"
            >
              <h3 className="m-0 font-heading text-xl font-medium tracking-[0.1em] text-white uppercase text-balance-safe">
                {p.title}
              </h3>
              <p className="m-0 font-serif text-[17px] leading-relaxed text-silver-dim">{p.line}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
