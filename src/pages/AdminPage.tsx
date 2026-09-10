import { useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/format";
import { AgendaTab } from "@/components/admin/AgendaTab";
import { FinanceTab } from "@/components/admin/FinanceTab";
import { ClientsTab } from "@/components/admin/ClientsTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { ServicesTab } from "@/components/admin/ServicesTab";
import { GalleryTab } from "@/components/admin/GalleryTab";
import { BarbersTab } from "@/components/admin/BarbersTab";

const TABS = [
  { id: "agenda", name: "Agenda do dia", icon: iconCalendar },
  { id: "fin", name: "Financeiro", icon: iconChart },
  { id: "clientes", name: "Clientes", icon: iconUsers },
  { id: "produtos", name: "Produtos", icon: iconBox },
  { id: "servicos", name: "Serviços", icon: iconTag },
  { id: "galeria", name: "Galeria", icon: iconImage },
  { id: "barbeiros", name: "Barbeiros", icon: iconScissors },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminPage() {
  const { session, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("agenda");

  if (loading) return null;
  // DEV-only: let the panel open on `npm run dev` without an admin login so
  // the layout can be previewed. Never active in a production build.
  if (!import.meta.env.DEV && (!session || !isAdmin)) return <Navigate to="/" replace />;

  const active = TABS.find((t) => t.id === tab)!;
  const now = new Date();
  const dateLabel = `${WEEKDAY_LABELS[now.getDay()]}, ${now.getDate()} de ${MONTH_LABELS[now.getMonth()].toLowerCase()} de ${now.getFullYear()}`;

  return (
    <div className="bg-ink text-white lg:flex lg:h-screen lg:overflow-hidden">
      <aside className="flex shrink-0 flex-col border-b border-border bg-surface lg:h-screen lg:w-[264px] lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <img
            src="/img/monogram.jpg"
            alt=""
            className="h-10 w-11 object-contain"
            style={{ filter: "brightness(1.25) contrast(3.4)", mixBlendMode: "screen" }}
          />
          <span className="font-heading text-[15px] tracking-[0.2em] text-white uppercase">Painel</span>
        </div>

        <nav className="flex gap-1.5 overflow-x-auto p-3 lg:flex-1 lg:flex-col lg:overflow-visible">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex min-h-[52px] flex-shrink-0 cursor-pointer items-center gap-3.5 rounded-lg px-4 font-heading text-[15px] tracking-[0.12em] whitespace-nowrap uppercase transition-colors"
                style={{
                  background: on ? "var(--color-silver)" : "transparent",
                  color: on ? "#0A0A0A" : "#9E9E9E",
                }}
              >
                <span className="grid h-[22px] w-[22px] place-items-center" aria-hidden>
                  {t.icon()}
                </span>
                {t.name}
              </button>
            );
          })}
        </nav>

        <div className="flex gap-1.5 border-t border-border p-3 lg:flex-col">
          <Link
            to="/"
            className="flex min-h-[50px] flex-1 cursor-pointer items-center gap-3.5 rounded-lg px-4 font-heading text-[14px] tracking-[0.12em] text-muted uppercase transition-colors hover:bg-white/5 hover:text-white"
          >
            <span className="grid h-[22px] w-[22px] place-items-center" aria-hidden>
              {iconExternal()}
            </span>
            Ver site
          </Link>
          <button
            onClick={() => signOut().then(() => navigate("/"))}
            className="flex min-h-[50px] flex-1 cursor-pointer items-center gap-3.5 rounded-lg px-4 font-heading text-[14px] tracking-[0.12em] text-muted uppercase transition-colors hover:bg-white/5 hover:text-white"
          >
            <span className="grid h-[22px] w-[22px] place-items-center" aria-hidden>
              {iconLogout()}
            </span>
            Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-border bg-ink/95 px-6 py-6 backdrop-blur lg:px-10">
          <h1 className="m-0 font-heading text-[28px] font-semibold tracking-[0.05em] text-white uppercase">
            {active.name}
          </h1>
          <p className="mt-1.5 text-[15px] text-muted first-letter:uppercase">{dateLabel}</p>
        </header>
        <div className="mx-auto max-w-[1180px] px-6 py-9 pb-24 lg:px-10">
          {tab === "agenda" && <AgendaTab />}
          {tab === "fin" && <FinanceTab />}
          {tab === "clientes" && <ClientsTab />}
          {tab === "produtos" && <ProductsTab />}
          {tab === "servicos" && <ServicesTab />}
          {tab === "galeria" && <GalleryTab />}
          {tab === "barbeiros" && <BarbersTab />}
        </div>
      </main>
    </div>
  );
}

// --- icons (16px, inherit currentColor) ---
function svg(children: ReactNode) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-full w-full">
      {children}
    </svg>
  );
}
function iconCalendar() {
  return svg(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>,
  );
}
function iconChart() {
  return svg(
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>,
  );
}
function iconUsers() {
  return svg(
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5M17 8a3 3 0 0 1 0 6M15 20c0-3 1-4 4-4s2 1 4 4" />
    </>,
  );
}
function iconBox() {
  return svg(
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>,
  );
}
function iconTag() {
  return svg(
    <>
      <path d="M4 4h8l8 8-8 8-8-8V4Z" />
      <circle cx="8.5" cy="8.5" r="1.4" />
    </>,
  );
}
function iconImage() {
  return svg(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m4 19 5-5 3 3 4-4 4 4" />
    </>,
  );
}
function iconScissors() {
  return svg(
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8 8l12 10M8 16 20 6" />
    </>,
  );
}
function iconExternal() {
  return svg(
    <>
      <path d="M14 4h6v6M20 4l-9 9M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>,
  );
}
function iconLogout() {
  return svg(
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </>,
  );
}
