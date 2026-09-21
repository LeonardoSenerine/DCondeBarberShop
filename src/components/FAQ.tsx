import { BRAND, FAQ_ITEMS } from "@/data/content";
import { whatsAppLink } from "@/lib/format";
import { Reveal } from "@/components/Reveal";

export function FAQ() {
  return (
    <section id="faq" className="border-t border-border bg-surface px-6 py-28">
      <div className="mx-auto max-w-[860px]">
        <Reveal className="mb-12 text-center">
          <span className="font-heading text-sm tracking-[0.3em] text-muted-2 uppercase">Dúvidas</span>
          <h2 className="m-0 mt-3 font-heading text-[clamp(30px,4vw,52px)] font-semibold tracking-[0.04em] text-white uppercase">
            Perguntas frequentes
          </h2>
        </Reveal>

        <Reveal className="flex flex-col gap-3" delayMs={120}>
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-border bg-ink/60 transition-colors open:border-border-strong open:bg-ink"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-heading text-[17px] font-medium tracking-[0.06em] text-white uppercase marker:hidden [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border-strong text-lg leading-none text-muted transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="m-0 px-6 pb-6 font-serif text-[17px] leading-relaxed text-silver-dim">{item.a}</p>
            </details>
          ))}
        </Reveal>

        <Reveal className="mt-12 flex flex-col items-center gap-4 text-center" delayMs={200}>
          <p className="m-0 font-serif text-lg text-silver-dim">Pronto para marcar? Leva menos de um minuto.</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <a
              href="#agendar"
              className="bg-silver-gradient flex h-13 items-center justify-center rounded-lg px-8 font-heading text-sm font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110"
            >
              Agendar horário
            </a>
            <a
              href={whatsAppLink(BRAND.whatsapp, `Olá, tenho uma dúvida sobre a ${BRAND.name}`)}
              target="_blank"
              rel="noopener"
              className="flex h-13 items-center justify-center rounded-lg border border-border-strong px-8 font-heading text-sm tracking-[0.2em] text-white uppercase transition-colors hover:border-silver"
            >
              Tirar dúvida no WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
