import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useMyBookings, cancelBooking } from "@/hooks/useBooking";
import { formatCents, formatDateBR, formatTimeShort } from "@/lib/format";

export function AccountPage() {
  const { session, profile, loading, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { bookings, loading: bookingsLoading, reload } = useMyBookings(session?.user.id ?? null);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" && b.scheduled_date >= todayKey)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
  const history = bookings.filter((b) => b !== upcoming && b.status !== "cancelled");

  async function handleCancel() {
    if (!upcoming) return;
    await cancelBooking(upcoming.id);
    reload();
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    await updateProfile({ full_name: name.trim(), phone: phone.trim() });
    setSavingProfile(false);
  }

  return (
    <div className="min-h-screen bg-ink pb-16">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <img src="/img/monogram.jpg" alt="" className="h-10 w-11 object-contain" style={{ filter: "brightness(1.25) contrast(3.4)", mixBlendMode: "screen" }} />
            <span className="font-heading text-[13px] tracking-[0.22em] text-white uppercase">Minha conta</span>
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
        <span className="font-heading text-xs tracking-[0.36em] text-muted-2 uppercase">
          Olá, {profile?.full_name || "cliente"}
        </span>
        <h1 className="m-0 mt-3 mb-10 font-heading text-[clamp(28px,4vw,44px)] font-semibold tracking-[0.04em] text-white uppercase">
          Seus agendamentos
        </h1>

        <div className="mb-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">Próximo agendamento</span>
              {upcoming && (
                <span className="bg-silver-gradient rounded-full px-2.5 py-1 text-[11px] tracking-[0.14em] text-ink uppercase">
                  Confirmado
                </span>
              )}
            </div>
            {bookingsLoading ? (
              <p className="text-muted">Carregando…</p>
            ) : upcoming ? (
              <>
                <div className="font-heading text-2xl leading-tight font-medium tracking-[0.04em] text-white uppercase">
                  {upcoming.services?.name}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {[
                    { k: "Barbeiro", v: upcoming.barbers?.name ?? "—" },
                    { k: "Data", v: formatDateBR(upcoming.scheduled_date) },
                    { k: "Horário", v: formatTimeShort(upcoming.scheduled_time) },
                    { k: "Valor", v: formatCents(upcoming.price_cents) },
                  ].map((row) => (
                    <div key={row.k} className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                      <span className="text-[13px] text-muted">{row.k}</span>
                      <span className="font-heading text-sm tracking-[0.06em] text-white">{row.v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Link
                    to="/#agendar"
                    className="bg-silver-gradient flex min-h-12 flex-1 basis-[140px] items-center justify-center rounded-lg font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase"
                  >
                    Remarcar
                  </Link>
                  <button
                    onClick={handleCancel}
                    className="flex min-h-12 flex-1 basis-[140px] items-center justify-center rounded-lg border border-border font-heading text-xs tracking-[0.2em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[15px] text-muted">Nenhum agendamento ativo.</p>
            )}
          </div>

          <div className="flex flex-col rounded-lg border border-border bg-surface p-7">
            <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">Marcar novo horário</span>
            <p className="mt-3.5 text-[15px] text-muted">
              Escolha o profissional, o serviço e o melhor horário livre para você.
            </p>
            <Link
              to="/#agendar"
              className="mt-auto flex min-h-13 items-center justify-center rounded-lg border border-silver font-heading text-xs font-semibold tracking-[0.2em] text-white uppercase transition-colors hover:bg-white/8"
            >
              Agendar horário
            </Link>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-border bg-surface p-7">
          <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">Histórico de atendimentos</span>
          <div className="mt-4.5 flex flex-col">
            {history.length === 0 && <p className="py-3 text-[15px] text-muted">Nenhum atendimento anterior.</p>}
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
          <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">Meus dados</span>
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
                value={profile?.email ?? ""}
                disabled
                className="min-h-12 cursor-not-allowed rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-muted"
              />
            </label>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-silver-gradient mt-5 flex min-h-12 items-center rounded-lg px-6.5 font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase disabled:opacity-60"
          >
            {savingProfile ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
