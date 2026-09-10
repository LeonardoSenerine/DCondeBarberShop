import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { NAV_LINKS } from "@/data/content";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  onOpenAuth: () => void;
}

export function Header({ onOpenAuth }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { session, profile } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accountLabel = session ? "Meus agendamentos" : "Entrar";
  const accountHref = session ? "/conta" : null;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <header
      className="fixed inset-x-0 top-0 z-[80] border-b transition-all duration-300"
      style={{
        background: scrolled ? "rgba(10,10,10,0.82)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderColor: scrolled ? "var(--color-border)" : "transparent",
      }}
    >
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-6 py-3.5">
        <a href="#inicio" className="flex h-11 flex-shrink-0 items-center">
          <img
            src="/img/monogram.jpg"
            alt="D'Conde Barbearia"
            className="h-11 w-[52px] object-contain"
            style={{ filter: "brightness(1.25) contrast(3.4)", mixBlendMode: "screen" }}
          />
        </a>

        <nav className="flex items-center gap-8">
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-heading text-[13px] tracking-[0.18em] text-white uppercase transition-colors hover:text-muted-2"
              >
                {link.label}
              </a>
            ))}
            {accountHref ? (
              <Link
                to={accountHref}
                className="font-heading text-[13px] tracking-[0.18em] text-muted uppercase transition-colors hover:text-white"
              >
                {accountLabel}
              </Link>
            ) : (
              <button
                onClick={onOpenAuth}
                className="font-heading text-[13px] tracking-[0.18em] text-muted uppercase transition-colors hover:text-white"
              >
                {accountLabel}
              </button>
            )}
          </div>

          <a
            href="#agendar"
            className="bg-silver-gradient hidden h-11 items-center rounded-lg px-7 font-heading text-[13px] font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 md:flex"
          >
            Agendar
          </a>

          {session ? (
            <Link
              to="/conta"
              className="flex h-11 max-w-[40vw] items-center truncate rounded-lg border border-border px-4 font-heading text-[13px] tracking-[0.16em] text-white uppercase md:hidden"
            >
              {firstName ?? "Agendamentos"}
            </Link>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-silver-gradient flex h-11 items-center rounded-lg px-6 font-heading text-[13px] font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 md:hidden"
            >
              Entrar
            </button>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-lg border border-border md:hidden"
          >
            <span className="block h-px w-[18px] bg-white" />
            <span className="block h-px w-[18px] bg-white" />
            <span className="block h-px w-[18px] bg-white" />
          </button>
        </nav>
      </div>

      {menuOpen && (
        <div className="flex flex-col border-t border-border bg-ink px-6 pt-3 pb-5 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="border-b border-white/5 py-3.5 font-heading text-[15px] tracking-[0.18em] text-white uppercase"
            >
              {link.label}
            </a>
          ))}
          {accountHref ? (
            <Link
              to={accountHref}
              onClick={() => setMenuOpen(false)}
              className="py-3.5 text-left font-heading text-[15px] tracking-[0.18em] text-muted uppercase"
            >
              {accountLabel}
            </Link>
          ) : (
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenAuth();
              }}
              className="py-3.5 text-left font-heading text-[15px] tracking-[0.18em] text-muted uppercase"
            >
              {accountLabel}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
