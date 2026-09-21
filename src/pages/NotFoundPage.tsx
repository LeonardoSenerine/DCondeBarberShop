import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { usePageMeta } from "@/hooks/usePageMeta";
import { BRAND } from "@/data/content";
import { whatsAppLink } from "@/lib/format";

export function NotFoundPage() {
  usePageMeta(
    "Página não encontrada | D'Conde Barbearia",
    "A página que você procura não existe ou mudou de endereço. Volte ao site da D'Conde Barbearia e agende seu horário.",
    { noindex: true },
  );

  return (
    <PageShell>
      <section className="flex min-h-[70vh] items-center px-6 py-20">
        <div className="mx-auto flex max-w-[640px] flex-col items-center text-center">
          <span className="font-display text-[clamp(96px,22vw,180px)] leading-none text-white/10 select-none">404</span>
          <h1 className="m-0 -mt-4 font-heading text-[clamp(28px,4vw,44px)] font-semibold tracking-[0.04em] text-white uppercase">
            Essa página não existe
          </h1>
          <p className="m-0 mt-4 font-serif text-lg leading-relaxed text-silver-dim">
            O endereço pode ter mudado ou foi digitado errado. Volte para o site e agende seu horário — a cadeira está
            te esperando.
          </p>
          <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              to="/"
              className="bg-silver-gradient flex h-13 items-center justify-center rounded-lg px-8 font-heading text-sm font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110"
            >
              Voltar ao site
            </Link>
            <a
              href={whatsAppLink(BRAND.whatsapp, `Olá, quero agendar um horário na ${BRAND.name}`)}
              target="_blank"
              rel="noopener"
              className="flex h-13 items-center justify-center rounded-lg border border-border-strong px-8 font-heading text-sm tracking-[0.2em] text-white uppercase transition-colors hover:border-silver"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
