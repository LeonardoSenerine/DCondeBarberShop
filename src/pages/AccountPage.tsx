import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useMyBookings, useCreateBooking, cancelBooking } from "@/hooks/useBooking";
import { BookingWizard, type BookingDraft } from "@/components/BookingWizard";
import { formatCents, formatDateBR, formatTimeShort, MONTH_LABELS, WEEKDAY_LABELS } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";

export function AccountPage() {
  const { session, profile, loading, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { bookings, loading: bookingsLoading, reload } = useMyBookings(session?.user.id ?? null);
  const { createBooking } = useCreateBooking();
  const [name, setName] = useState(profile?.full_name ?? (import.meta.env.DEV ? "Rafael Prado" : ""));
  const [phone, setPhone] = useState(profile?.phone ?? (import.meta.env.DEV ? "(18) 99863-4127" : ""));
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  if (loading) return null;
  // DEV-only: let the page open on `npm run dev` without a real login so it
  // can be previewed with mock bookings. Never active in a production build.
  if (!import.meta.env.DEV && !session) return <Navigate to="/" replace />;

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = bookings
    .filter((b) => (b.status === "confirmed" || b.status === "pending") && b.scheduled_date >= todayKey)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
  const history = bookings.filter((b) => b !== upcoming && b.status !== "cancelled");
  const upcomingPending = upcoming?.status === "pending";

  async function handleCancel() {
    if (!upcoming) return;
    await cancelBooking(upcoming.id);
    reload();
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    await updateProfile({ full_name: name.trim(), phone: phone.trim() });
    setSavingProfile(false);
    setEditingProfile(false);
  }

  function handleCancelEditProfile() {
    setName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setEditingProfile(false);
  }

  async function handleNewBooking(draft: BookingDraft) {
    if (session?.user) {
      await createBooking({
        customer_id: session.user.id,
        barber_id: draft.barberId,
        service_id: draft.serviceId,
        scheduled_date: draft.dateIso,
        scheduled_time: draft.time,
        status: "pending",
        price_cents: draft.priceCents,
        customer_name: profile?.full_name || name,
        customer_phone: profile?.phone || phone,
      });
      reload();
    }
    setBookingOpen(false);
  }

  return (
    <div className="min-h-screen bg-ink pb-16">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <img src="/img/monogram.jpg" alt="" className="h-10 w-11 object-contain" style={{ filter: "brightness(1.25) contrast(3.4)", mixBlendMode: "screen" }} />
            <span className="font-heading text-[13px] tracking-[0.22em] text-white uppercase">Meus agendamentos</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex min-h-11 items-center rounded-lg border border-border px-4.5 font-heading text-xs tracking-[0.18em] text-white uppercase transition-colors hover:border-silver">
              Ver site
            </Link>
            <button
              onClick={() => signOut().then(() => navigate("/"))}
              className="flex min-h-11 items-center rounded-lg border border-border px-4.5 font-heading text-xs tracking-[0.18em] text-muted uppercase transition-colors hover:text-white"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1080px] px-6 pt-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-heading text-xs tracking-[0.36em] text-muted-2 uppercase">
              Olá, {profile?.full_name || (import.meta.env.DEV ? "Rafael Prado" : "cliente")}
            </span>
            <h1 className="m-0 mt-3 font-heading text-[clamp(28px,4vw,44px)] font-semibold tracking-[0.04em] text-white uppercase">
              Seus agendamentos
            </h1>
          </div>
          <button
            onClick={() => setBookingOpen(true)}
            className="bg-silver-gradient flex min-h-12 cursor-pointer items-center rounded-lg px-6.5 font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110"
          >
            Agendar horário
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-silver bg-surface p-7 md:p-10">
          <div className="mb-6 flex items-center justify-between gap-3">
            <span className="font-heading text-xs tracking-[0.24em] text-muted-2 uppercase">Próximo agendamento</span>
            {upcoming &&
              (upcomingPending ? (
                <span
                  className="rounded-full border px-2.5 py-1 text-[11px] tracking-[0.14em] uppercase"
                  style={{ color: "#E0B341", borderColor: "#E0B341" }}
                >
                  Em análise
                </span>
              ) : (
                <span className="bg-silver-gradient rounded-full px-2.5 py-1 text-[11px] tracking-[0.14em] text-ink uppercase">
                  Confirmado
                </span>
              ))}
          </div>
          {bookingsLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-4 w-full" count={4} />
              <Skeleton className="mt-3 h-12 w-full" />
            </div>
          ) : upcoming ? (
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-surface-alt px-5 py-2.5 text-center">
                    <span className="font-heading text-[10px] tracking-[0.16em] text-muted-2 uppercase">
                      {MONTH_LABELS[new Date(`${upcoming.scheduled_date}T00:00:00`).getMonth()].slice(0, 3)}
                    </span>
                    <span className="font-heading text-[32px] leading-none text-white tabular-nums">
                      {upcoming.scheduled_date.slice(8, 10)}
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted-2 capitalize">
                      {WEEKDAY_LABELS[new Date(`${upcoming.scheduled_date}T00:00:00`).getDay()].slice(0, 3)}
                    </span>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-surface-alt px-5 py-2.5 text-center">
                    <span className="font-heading text-[10px] tracking-[0.16em] text-muted-2 uppercase">Horário</span>
                    <span className="font-heading text-[32px] leading-none text-white tabular-nums">
                      {formatTimeShort(upcoming.scheduled_time)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-heading text-[clamp(24px,3.2vw,38px)] leading-tight font-medium tracking-[0.04em] text-white uppercase">
                      {upcoming.services?.name}
                    </div>
                  </div>
                </div>
                {upcomingPending && (
                  <p className="mt-3 text-[13px]" style={{ color: "#E0B341" }}>
                    Aguardando o barbeiro aceitar a solicitação.
                  </p>
                )}
                <div className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {[
                    { k: "Barbeiro", v: upcoming.barbers?.name ?? "—" },
                    { k: "Valor", v: formatCents(upcoming.price_cents) },
                  ].map((row) => (
                    <div key={row.k} className="flex items-baseline justify-between gap-3 border-t border-border pt-2.5">
                      <span className="text-[13px] text-muted">{row.k}</span>
                      <span className="font-heading text-sm tracking-[0.06em] text-white">{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2.5 md:w-[190px] md:flex-col">
                <button
                  onClick={() => setBookingOpen(true)}
                  className="bg-silver-gradient flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase"
                >
                  Remarcar
                </button>
                <button
                  onClick={handleCancel}
                  className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-xs tracking-[0.2em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
                >
                  {upcomingPending ? "Cancelar solicitação" : "Cancelar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="m-0 text-[15px] text-muted">Você não tem nenhum agendamento ativo.</p>
              <button
                onClick={() => setBookingOpen(true)}
                className="bg-silver-gradient flex min-h-12 cursor-pointer items-center rounded-lg px-6.5 font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase"
              >
                Agendar horário
              </button>
            </div>
          )}
        </div>

        <div className="mb-5 rounded-lg border border-border bg-surface p-7">
          <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">Histórico de atendimentos</span>
          <div className="mt-4.5 flex flex-col">
            {bookingsLoading && <Skeleton count={3} className="my-2 h-6 w-full" />}
            {!bookingsLoading && history.length === 0 && (
              <p className="py-3 text-[15px] text-muted">Nenhum atendimento anterior.</p>
            )}
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-3 border-t border-border py-3.5">
                <span className="w-24 font-heading text-sm text-white">{formatDateBR(h.scheduled_date)}</span>
                <span className="min-w-0 flex-1 basis-[200px] text-[15px] text-white">{h.services?.name}</span>
                <span className="w-22 text-sm text-muted">{h.barbers?.name}</span>
                <span className="ml-auto font-heading text-[15px] text-white">{formatCents(h.price_cents)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-7">
          <div className="flex items-center justify-between gap-3">
            <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">Meus dados</span>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="flex min-h-9 cursor-pointer items-center rounded-lg border border-border px-3.5 font-heading text-[11px] tracking-[0.14em] text-white uppercase transition-colors hover:border-silver"
              >
                Editar
              </button>
            )}
          </div>

          {editingProfile ? (
            <>
              <div className="mt-4.5 grid gap-3.5 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-muted">Nome</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-muted">Celular</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(18) 99730-7852"
                    className="min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver"
                  />
                </label>
                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-[13px] text-muted">E-mail (login)</span>
                  <input
                    value={profile?.email ?? (import.meta.env.DEV ? "rafael.prado@email.com" : "")}
                    disabled
                    className="min-h-12 cursor-not-allowed rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-muted"
                  />
                </label>
              </div>
              <div className="mt-5 flex gap-2.5">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-silver-gradient flex min-h-12 cursor-pointer items-center rounded-lg px-6.5 font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? "Salvando…" : "Salvar"}
                </button>
                <button
                  onClick={handleCancelEditProfile}
                  disabled={savingProfile}
                  className="flex min-h-12 cursor-pointer items-center rounded-lg border border-border px-6.5 font-heading text-xs tracking-[0.2em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div className="mt-4.5 grid gap-3.5 sm:grid-cols-2">
              {[
                { k: "Nome", v: name || "—" },
                { k: "Celular", v: phone || "—" },
                { k: "E-mail (login)", v: profile?.email ?? (import.meta.env.DEV ? "rafael.prado@email.com" : "—") },
              ].map((row) => (
                <div key={row.k} className="flex flex-col gap-2">
                  <span className="text-[13px] text-muted">{row.k}</span>
                  <span className="text-[15px] text-white">{row.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {bookingOpen && (
        <div
          className="fixed inset-0 z-[120] overflow-y-auto"
          style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
          onClick={() => setBookingOpen(false)}
        >
          <div className="flex min-h-full items-start justify-center px-4 py-10 sm:px-6">
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[1240px]">
              <button
                onClick={() => setBookingOpen(false)}
                aria-label="Fechar"
                className="absolute -top-3 -right-3 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-muted shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-colors hover:border-silver hover:text-white"
              >
                ×
              </button>
              <div className="overflow-hidden rounded-2xl border border-border shadow-[0_40px_90px_rgba(0,0,0,0.8)]">
                <BookingWizard onConfirm={handleNewBooking} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
