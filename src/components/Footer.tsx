import { Link } from "react-router-dom";
import { BRAND } from "@/data/content";
import { whatsAppLink } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";

interface FooterProps {
  onOpenAuth: () => void;
}

export function Footer({ onOpenAuth }: FooterProps) {
  const { session, isAdmin } = useAuth();

  return (
    <footer className="relative overflow-hidden border-t border-border bg-ink px-6 pt-18 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-7">
      <img
        src="/img/monogram.jpg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-[10%] right-[2%] w-[min(34vw,320px)] opacity-6"
        style={{ filter: "contrast(3.2)", mixBlendMode: "screen" }}
      />
      <div className="relative mx-auto max-w-[1240px]">
        <div className="grid gap-11 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="flex min-w-0 flex-col gap-5.5">
            <a href="#inicio" className="block w-full max-w-[300px]">
              <img
                src="/img/logo-full.jpg"
                alt={BRAND.name}
                className="block aspect-[100/38] w-full object-cover"
                style={{ objectPosition: "center 47%", filter: "brightness(1.25) contrast(3.4)", mixBlendMode: "screen" }}
              />
            </a>
            <p className="m-0 max-w-[32ch] font-serif text-[17px] leading-relaxed text-muted">
              Estilo, precisão e atitude desde {BRAND.since}.
            </p>
            <div className="flex flex-col gap-2 border-t border-border pt-1">
              <span className="pt-3.5 text-sm leading-relaxed text-muted">
                {BRAND.addressLine}
                <br />
                {BRAND.addressCity}
              </span>
              <span className="text-sm text-muted">Seg a sex 09h—20h · Sáb 08h—18h</span>
            </div>
          </div>

          <FooterColumn
            title="Navegação"
            links={[
              { href: "#inicio", label: "Início" },
              { href: "#agendar", label: "Agendamento" },
              { href: "#galeria", label: "Galeria" },
              { href: "#sobre", label: "Sobre" },
            ]}
          />

          <FooterColumn
            title="Serviços"
            links={[
              { href: "#servicos", label: "Corte" },
              { href: "#servicos", label: "Barba terapia" },
              { href: "#servicos", label: "Corte + barba terapia" },
              { href: "#servicos", label: "Platinado" },
            ]}
          />

          <div>
            <h4 className="m-0 mb-4 font-heading text-xs font-medium tracking-[0.24em] text-white uppercase">
              Contato
            </h4>
            <div className="flex flex-col gap-2.5">
              <a
                href={whatsAppLink(BRAND.whatsapp, `Olá, quero agendar um horário na ${BRAND.name}`)}
                target="_blank"
                rel="noopener"
                className="text-[15px] text-muted transition-colors hover:text-white"
              >
                WhatsApp
              </a>
              <a href={BRAND.instagram} target="_blank" rel="noopener" className="text-[15px] text-muted transition-colors hover:text-white">
                Instagram
              </a>
              {session ? (
                <Link to="/conta" className="text-left text-[15px] text-muted transition-colors hover:text-white">
                  Minha conta
                </Link>
              ) : (
                <button onClick={onOpenAuth} className="text-left text-[15px] text-muted transition-colors hover:text-white">
                  Minha conta
                </button>
              )}
              {isAdmin && (
                <Link to="/admin" className="text-left text-[15px] text-muted transition-colors hover:text-white">
                  Painel da barbearia
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5.5">
          <span className="text-[13px] text-faint">© 2026 {BRAND.name}. Todos os direitos reservados.</span>
          <span className="flex items-center gap-3.5">
            <span aria-hidden className="h-px w-11.5" style={{ background: "linear-gradient(90deg,rgba(42,42,42,0),#3A3A3A)" }} />
            <span className="font-heading text-[11px] tracking-[0.36em] text-muted-2 uppercase">
              Est. {BRAND.since} · {BRAND.city} SP
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="m-0 mb-4 font-heading text-xs font-medium tracking-[0.24em] text-white uppercase">{title}</h4>
      <div className="flex flex-col gap-2.5">
        {links.map((l) => (
          <a key={l.label} href={l.href} className="text-[15px] text-muted transition-colors hover:text-white">
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
