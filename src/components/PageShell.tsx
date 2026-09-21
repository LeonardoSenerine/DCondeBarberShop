import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BRAND } from "@/data/content";
import { MobileBottomBar } from "@/components/FloatingActions";

/**
 * Minimal frame for the pages that live outside the home page (termos,
 * privacidade, 404): a top bar that always leads back to the site, the page
 * content, a slim footer and the same fixed mobile CTA the home page has.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-6 py-3.5">
          <Link to="/" className="flex h-11 flex-shrink-0 items-center" aria-label={`${BRAND.name} — voltar ao site`}>
            <img
              src="/img/monogram.jpg"
              alt=""
              className="h-11 w-[52px] object-contain"
              style={{ filter: "brightness(1.25) contrast(3.4)", mixBlendMode: "screen" }}
            />
          </Link>
          <Link
            to="/"
            className="flex h-11 items-center rounded-lg border border-border-strong px-5 font-heading text-[13px] tracking-[0.18em] text-white uppercase transition-colors hover:border-silver"
          >
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border px-6 pt-7 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-7">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4">
          <span className="text-[13px] text-faint">© 2026 {BRAND.name}. Todos os direitos reservados.</span>
          <nav aria-label="Páginas legais" className="flex gap-6 text-[13px]">
            <Link to="/termos" className="text-muted transition-colors hover:text-white">
              Termos de uso
            </Link>
            <Link to="/privacidade" className="text-muted transition-colors hover:text-white">
              Privacidade
            </Link>
          </nav>
        </div>
      </footer>

      <MobileBottomBar standalone />
    </div>
  );
}
