import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { List, X } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useBarbers } from "@/hooks/useCatalog";
import { supabase } from "@/lib/supabaseClient";
import { WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/format";
import { AgendaTab } from "@/components/admin/AgendaTab";
import { FinanceTab } from "@/components/admin/FinanceTab";
import { ClientsTab } from "@/components/admin/ClientsTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { ServicesTab } from "@/components/admin/ServicesTab";
import { GalleryTab } from "@/components/admin/GalleryTab";
import { BarbersTab } from "@/components/admin/BarbersTab";
import { ReviewsTab } from "@/components/admin/ReviewsTab";
import { NewBookingAlert } from "@/components/admin/NewBookingAlert";

interface IncomingBooking {
  customer_name: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
}

const TABS = [
  { id: "agenda", name: "Agendamentos", icon: iconCalendar },
  { id: "fin", name: "Financeiro", icon: iconChart },
  { id: "clientes", name: "Clientes", icon: iconUsers },
  { id: "produtos", name: "Produtos", icon: iconBox },
  { id: "pedidos", name: "Pedidos", icon: iconBag },
  { id: "servicos", name: "Serviços", icon: iconTag },
  { id: "galeria", name: "Galeria", icon: iconImage },
  { id: "barbeiros", name: "Barbeiros", icon: iconScissors },
  { id: "avaliacoes", name: "Avaliações", icon: iconStar },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminPage() {
  const { session, profile, loading, isAdmin, isOwner, signOut } = useAuth();
  const { data: barbers } = useBarbers();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("agenda");
  const [incoming, setIncoming] = useState<IncomingBooking | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  // Live alert when a new booking request comes in — RLS scopes what each
  // session receives, so staff only ever hears about their own barber's.
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("admin-new-bookings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          const row = payload.new as IncomingBooking;
          if (row.status === "pending") setIncoming(row);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  useEffect(() => {
    if (!incoming) return;
    const t = window.setTimeout(() => setIncoming(null), 10000);
    return () => window.clearTimeout(t);
  }, [incoming]);

  if (loading) return null;
  // DEV-only: let the panel open on `npm run dev` without an admin login so
  // the layout can be previewed. Never active in a production build.
  if (!import.meta.env.DEV && (!session || !isAdmin))
    return <Navigate to="/" replace />;

  const active = TABS.find((t) => t.id === tab)!;
  const now = new Date();
  const dateLabel = `${WEEKDAY_LABELS[now.getDay()]}, ${now.getDate()} de ${MONTH_LABELS[now.getMonth()].toLowerCase()} de ${now.getFullYear()}`;

  const myBarber = barbers.find((b) => b.id === profile?.barber_id);
  const roleLabel = isOwner ? "Dono" : "Barbeiro";

  return (
    <div className="bg-ink text-white lg:flex lg:h-screen lg:overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4 lg:hidden">
        <div className="flex items-center gap-3">
          <img
            src="/img/monogram.jpg"
            alt="D'Conde Barbearia"
            className="h-10 w-11 object-contain"
            style={{
              filter: "brightness(1.25) contrast(3.4)",
              mixBlendMode: "screen",
            }}
          />
          <span className="font-heading text-base tracking-[0.2em] text-white uppercase">
            Painel
          </span>
        </div>
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Abrir menu"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-border text-white transition-colors hover:border-silver"
        >
          <List size={22} />
        </button>
      </div>

      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border bg-surface transition-transform duration-300 lg:static lg:z-auto lg:h-screen lg:w-[264px] lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5">
          <div className="flex items-center gap-3">
            <img
              src="/img/monogram.jpg"
              alt="D'Conde Barbearia"
              className="h-10 w-11 object-contain"
              style={{
                filter: "brightness(1.25) contrast(3.4)",
                mixBlendMode: "screen",
              }}
            />
            <span className="font-heading text-base tracking-[0.2em] text-white uppercase">
              Painel
            </span>
          </div>
          <button
            onClick={() => setNavOpen(false)}
            aria-label="Fechar menu"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 overflow-y-auto p-3 lg:flex-1">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setNavOpen(false);
                }}
                className="flex min-h-[54px] flex-shrink-0 cursor-pointer items-center gap-3.5 rounded-lg px-4 font-heading text-base tracking-[0.12em] whitespace-nowrap uppercase transition-colors"
                style={{
                  background: on ? "var(--color-silver)" : "transparent",
                  color: on ? "#0A0A0A" : "#9E9E9E",
                }}
              >
                <span className="grid h-6 w-6 place-items-center" aria-hidden>
                  {t.icon()}
                </span>
                {t.name}
              </button>
            );
          })}
        </nav>

        {profile && (
          <div className="flex items-center gap-3 border-t border-border p-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-alt font-heading text-base text-silver">
              {myBarber?.photo_path ? (
                <img
                  src={myBarber.photo_path}
                  alt={myBarber.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                (profile.full_name || profile.email || "?")
                  .charAt(0)
                  .toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-heading text-base text-white">
                {profile.full_name || profile.email}
              </span>
              <span className="block text-[13px] tracking-[0.1em] text-muted-2 uppercase">
                {roleLabel}
              </span>
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5 border-t border-border p-3">
          <Link
            to="/"
            state={{ fromAdmin: true }}
            onClick={() => setNavOpen(false)}
            className="flex min-h-[54px] cursor-pointer items-center gap-3.5 rounded-lg px-4 font-heading text-base tracking-[0.12em] text-muted uppercase transition-colors hover:bg-white/5 hover:text-white"
          >
            <span className="grid h-6 w-6 place-items-center" aria-hidden>
              {iconExternal()}
            </span>
            Ver site
          </Link>
          <button
            onClick={() => {
              setNavOpen(false);
              signOut().then(() => navigate("/"));
            }}
            className="flex min-h-[54px] cursor-pointer items-center gap-3.5 rounded-lg px-4 font-heading text-base tracking-[0.12em] text-muted uppercase transition-colors hover:bg-white/5 hover:text-white"
          >
            <span className="grid h-6 w-6 place-items-center" aria-hidden>
              {iconLogout()}
            </span>
            Sair
          </button>
        </div>

        {/* Keeps the panel's own background filling the screen below "Sair"
            on mobile, instead of ending mid-screen and exposing the dimmed
            backdrop there — desktop already reaches the bottom via nav's
            lg:flex-1 above, so this collapses to nothing there. */}
        <div className="flex-1 lg:hidden" aria-hidden />
      </aside>

      <main className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-border bg-ink/95 px-6 py-6 backdrop-blur lg:px-10">
          <h1 className="m-0 font-heading text-[38px] font-semibold tracking-[0.05em] text-white uppercase">
            {active.name}
          </h1>
          <p className="mt-1.5 text-lg text-muted first-letter:uppercase">
            {dateLabel}
          </p>
        </header>
        <div className={`mx-auto px-6 py-9 pb-24 lg:px-10 ${tab === "agenda" || tab === "fin" ? "max-w-375" : "max-w-295"}`}>

          {tab === "agenda" && <AgendaTab />}
          {tab === "fin" && <FinanceTab />}
          {tab === "clientes" && <ClientsTab />}
          {tab === "produtos" && <ProductsTab />}
          {tab === "pedidos" && <OrdersTab />}
          {tab === "servicos" && <ServicesTab />}
          {tab === "galeria" && <GalleryTab />}
          {tab === "barbeiros" && <BarbersTab />}
          {tab === "avaliacoes" && <ReviewsTab />}
        </div>
      </main>

      {incoming && (
        <NewBookingAlert
          customerName={incoming.customer_name}
          date={incoming.scheduled_date}
          time={incoming.scheduled_time}
          onView={() => {
            setTab("agenda");
            setIncoming(null);
          }}
          onDismiss={() => setIncoming(null)}
        />
      )}
    </div>
  );
}

// --- icons (16px, inherit currentColor) ---
function svg(children: ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      className="h-full w-full"
    >
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
function iconBag() {
  return svg(
    <>
      <path d="M6 8h12l1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
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
function iconStar() {
  return svg(
    <>
      <path d="M12 3.5l2.6 5.35 5.9.75-4.3 4.1 1.1 5.85L12 16.9l-5.3 2.65 1.1-5.85-4.3-4.1 5.9-.75L12 3.5Z" />
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
