import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageShell } from "@/components/PageShell";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalDocumentProps {
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
}

/** Shared layout for the long-form legal pages (termos de uso, privacidade). */
export function LegalDocument({ title, intro, updatedAt, sections }: LegalDocumentProps) {
  const { hash } = useLocation();

  // <Link to="/privacidade#cookies"> navigates but the router doesn't scroll
  // to the fragment on its own.
  useEffect(() => {
    if (!hash) {
      // "instant": opening a new page shouldn't animate through html's smooth scroll-behavior
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [hash]);

  return (
    <PageShell>
      <article className="px-6 py-14 md:py-20">
        <div className="mx-auto max-w-[820px]">
          <Breadcrumbs items={[{ label: "Início", to: "/" }, { label: title }]} />

          <h1 className="m-0 font-heading text-[clamp(30px,4vw,48px)] font-semibold tracking-[0.04em] text-white uppercase">
            {title}
          </h1>
          <p className="m-0 mt-3 text-sm text-faint">Última atualização: {updatedAt}</p>
          <p className="m-0 mt-6 font-serif text-lg leading-relaxed text-silver-dim">{intro}</p>

          <nav aria-label="Nesta página" className="mt-10 rounded-lg border border-border bg-surface p-6">
            <span className="font-heading text-sm tracking-[0.2em] text-muted-2 uppercase">Nesta página</span>
            <ol className="m-0 mt-3 grid list-none gap-x-8 gap-y-2 p-0 sm:grid-cols-2">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-sm text-muted transition-colors hover:text-white">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-12 flex flex-col gap-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-6">
                <h2 className="m-0 font-heading text-xl font-medium tracking-[0.08em] text-white uppercase">
                  {i + 1}. {s.title}
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-base leading-7 text-muted [&_a]:underline [&_a]:underline-offset-2 [&_li]:pl-1 [&_ul]:m-0 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6 [&_p]:m-0 [&_strong]:font-medium [&_strong]:text-silver">
                  {s.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
    </PageShell>
  );
}
