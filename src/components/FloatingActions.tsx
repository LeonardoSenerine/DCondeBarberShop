import { BRAND } from "@/data/content";
import { whatsAppLink } from "@/lib/format";

const waHref = whatsAppLink(BRAND.whatsapp, `Olá, quero agendar um horário na ${BRAND.name}`);

export function WhatsAppButton() {
  return (
    <a
      href={waHref}
      target="_blank"
      rel="noopener"
      aria-label="Falar no WhatsApp"
      className="bg-silver-gradient fixed right-5 bottom-24 z-[90] flex h-14 w-14 items-center justify-center rounded-full shadow-[0_14px_34px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:-translate-y-0.5 hover:brightness-110 md:bottom-5"
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="#0A0A0A" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.35-.53.05-1.03.24-3.47-.72-2.94-1.16-4.79-4.2-4.94-4.4-.14-.19-1.16-1.55-1.16-2.96 0-1.4.73-2.09 1-2.38.24-.29.53-.36.72-.36.19 0 .39 0 .55.01.19.01.44-.07.68.53.24.58.82 2 .89 2.14.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.14.14-.29.29-.12.58.17.29.75 1.23 1.6 2 1.11.98 2.03 1.3 2.32 1.45.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.39-.24.65-.14.26.09 1.65.78 1.94.92.29.14.48.22.55.34.07.12.07.7-.17 1.38z" />
      </svg>
    </a>
  );
}

export function MobileBottomBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[85] border-t border-border px-4 pt-3 backdrop-blur-lg md:hidden"
      style={{ background: "rgba(10,10,10,0.92)", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <a
        href="#agendar"
        className="bg-silver-gradient flex min-h-[52px] items-center justify-center rounded-lg font-heading text-sm font-semibold tracking-[0.22em] text-ink uppercase"
      >
        Agendar horário
      </a>
    </div>
  );
}
