import { BRAND, CONTACT_HOURS } from "@/data/content";
import { whatsAppLink } from "@/lib/format";
import { Reveal } from "@/components/Reveal";

const CONTACTS = [
  {
    k: "Endereço",
    v: `${BRAND.addressLine}, ${BRAND.addressCity}`,
    href: BRAND.mapsQuery,
  },
  {
    k: "WhatsApp",
    v: "(18) 99730-7852",
    href: whatsAppLink(BRAND.whatsapp, `Olá, quero agendar um horário na ${BRAND.name}`),
  },
  { k: "Instagram", v: BRAND.instagramHandle, href: BRAND.instagram },
  { k: "Pagamento", v: "Pix, débito, crédito e dinheiro", href: "#agendar" },
];

export function Contact() {
  return (
    <section id="contato" className="bg-ink px-6 py-28">
      <div className="mx-auto max-w-[1240px]">
        <Reveal className="mb-14">
          <h2 className="m-0 font-heading text-[clamp(30px,4vw,52px)] font-semibold tracking-[0.04em] text-white uppercase">
            Onde estamos
          </h2>
        </Reveal>
        <Reveal className="grid gap-5 md:grid-cols-2">
          <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-border bg-surface">
            <iframe
              title="Mapa D'Conde Barbearia"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-46.8520%2C-23.0180%2C-46.8250%2C-22.9950&layer=mapnik&marker=-23.0065%2C-46.8385"
              className="h-full min-h-[420px] w-full border-0"
              style={{ filter: "invert(1) grayscale(1) contrast(0.9) brightness(0.92)" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div
              className="absolute right-4 bottom-4 left-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4.5 backdrop-blur-md"
              style={{ background: "rgba(10,10,10,0.9)" }}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">{BRAND.name}</span>
                <span className="text-sm text-white">
                  {BRAND.addressLine} · {BRAND.city}/SP
                </span>
              </span>
              <a
                href={BRAND.mapsDirections}
                target="_blank"
                rel="noopener"
                className="bg-silver-gradient flex h-11 items-center rounded-lg px-5 font-heading text-xs font-semibold tracking-[0.2em] whitespace-nowrap text-ink uppercase transition-[filter] hover:brightness-110"
              >
                Como chegar
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-4.5 rounded-lg border border-border bg-surface-alt p-6.5">
              {CONTACTS.map((c) => (
                <div key={c.k} className="flex flex-col gap-1">
                  <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">{c.k}</span>
                  <a
                    href={c.href}
                    target={c.href.startsWith("#") ? undefined : "_blank"}
                    rel="noopener"
                    className="text-base leading-relaxed text-white transition-colors hover:text-silver"
                  >
                    {c.v}
                  </a>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-surface-alt p-6.5">
              <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">Horário</span>
              <div className="mt-3.5 flex flex-col">
                {CONTACT_HOURS.map((h) => (
                  <div key={h.day} className="flex items-center justify-between gap-3 border-t border-border py-2.5">
                    <span className="text-[15px] text-white">{h.day}</span>
                    <span className="text-[15px] text-muted">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
