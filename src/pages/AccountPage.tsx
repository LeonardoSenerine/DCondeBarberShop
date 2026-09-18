import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  useMyBookings,
  useMyOrders,
  useCreateBooking,
  markDeclineSeen,
  type BookingWithDetails,
} from "@/hooks/useBooking";
import { useMyReviews, submitReview, dismissReviewPrompt } from "@/hooks/useReviews";
import { BookingWizard, type BookingDraft } from "@/components/BookingWizard";
import { CancelBookingModal } from "@/components/CancelBookingModal";
import { BookingStatusBadge, OrderStatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";
import { Toast } from "@/components/admin/Toast";
import {
  dateKey,
  formatCents,
  formatDateBR,
  formatPhoneBR,
  formatTimeShort,
  friendlyBookingError,
  MONTH_LABELS,
  WEEKDAY_LABELS,
} from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { ScrollFadeX } from "@/components/ScrollFadeX";
import { useFormErrors, fieldClass } from "@/hooks/useFormErrors";
import { isViewingSiteAsAdmin } from "@/lib/adminSiteView";

const HISTORY_COLS = "88px minmax(0,1fr) 120px 150px 100px";
const ORDER_COLS = "88px minmax(0,1fr) 170px 100px";

export function AccountPage() {
  const { session, profile, loading, isAdmin, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { bookings, loading: bookingsLoading, reload } = useMyBookings(session?.user.id ?? null);
  const { orders: myOrders, loading: ordersLoading } = useMyOrders(session?.user.id ?? null);
  const { reviewsByBooking, reload: reloadReviews } = useMyReviews(session?.user.id ?? null);
  const { createBooking } = useCreateBooking();
  const [name, setName] = useState(profile?.full_name ?? (import.meta.env.DEV ? "Rafael Prado" : ""));
  const [phone, setPhone] = useState(profile?.phone ?? (import.meta.env.DEV ? "(18) 99863-4127" : ""));
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const { message: profileError, fail: failProfile, clear: clearProfileError, clearField: clearProfileField, fieldProps: profileFieldProps } = useFormErrors();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submittingReviewId, setSubmittingReviewId] = useState<string | null>(null);
  const [dismissingReviewId, setDismissingReviewId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [dismissingDecline, setDismissingDecline] = useState(false);

  if (loading) return null;
  // Barbers/admins have no personal customer bookings — send them to their
  // own panel instead of an empty "Meus agendamentos". Except while they're
  // browsing the site via "Ver site" (e.g. booking an appointment for
  // themselves) — same flag SitePage uses, so landing here right after
  // that booking shows the confirmation instead of bouncing back.
  if (isAdmin && !isViewingSiteAsAdmin()) return <Navigate to="/admin" replace />;
  // DEV-only: let the page open on `npm run dev` without a real login so it
  // can be previewed with mock bookings. Never active in a production build.
  if (!import.meta.env.DEV && !session) return <Navigate to="/" replace />;

  const todayKey = dateKey(new Date());
  const upcoming = bookings
    .filter((b) => (b.status === "confirmed" || b.status === "pending") && b.scheduled_date >= todayKey)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
  const history = bookings.filter((b) => b !== upcoming && b.status !== "cancelled");
  const upcomingPending = upcoming?.status === "pending";
  const historyLoading = bookingsLoading || ordersLoading;
  const servicesTotalCents = history.reduce((sum, h) => sum + h.price_cents, 0);
  const completedOrders = myOrders.filter((o) => o.status === "completed");
  const productsTotalCents = completedOrders.reduce((sum, o) => sum + o.totalCents, 0);
  const grandTotalCents = servicesTotalCents + productsTotalCents;
  // Every completed booking still missing a review, unless the customer
  // already dismissed the prompt for it — newest first.
  const pendingReviews = bookings
    .filter((b) => b.status === "completed" && !b.review_dismissed_at && !reviewsByBooking[b.id])
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
  // Most recent booking the barber turned down that the customer hasn't acknowledged yet.
  const declinedNotice = bookings
    .filter((b) => b.status === "cancelled" && b.decline_reason && !b.decline_seen_at)
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))[0];

  async function handleDismissDecline() {
    if (!declinedNotice) return;
    setDismissingDecline(true);
    const { error } = await markDeclineSeen(declinedNotice.id);
    setDismissingDecline(false);
    if (error) {
      setActionError(`Não foi possível fechar o aviso: ${error}`);
      return;
    }
    reload();
  }

  function reviewDraft(bookingId: string) {
    return reviewDrafts[bookingId] ?? { rating: 0, comment: "" };
  }

  function setReviewDraftRating(bookingId: string, rating: number) {
    setReviewDrafts((d) => ({ ...d, [bookingId]: { ...reviewDraft(bookingId), rating } }));
  }

  function setReviewDraftComment(bookingId: string, comment: string) {
    setReviewDrafts((d) => ({ ...d, [bookingId]: { ...reviewDraft(bookingId), comment } }));
  }

  async function handleSubmitReview(booking: BookingWithDetails) {
    if (!session?.user) return;
    const draft = reviewDraft(booking.id);
    if (draft.rating === 0) return;
    setSubmittingReviewId(booking.id);
    setReviewError(null);
    const { error } = await submitReview({
      bookingId: booking.id,
      customerId: session.user.id,
      customerName: profile?.full_name || name,
      barberId: booking.barber_id,
      serviceId: booking.service_id,
      rating: draft.rating,
      comment: draft.comment.trim() || null,
    });
    setSubmittingReviewId(null);
    if (error) {
      setReviewError("Não foi possível enviar sua avaliação. Tente novamente.");
      return;
    }
    setReviewDrafts((d) => {
      const { [booking.id]: _discard, ...rest } = d;
      return rest;
    });
    reloadReviews();
  }

  async function handleDismissReview(booking: BookingWithDetails) {
    setDismissingReviewId(booking.id);
    const { error } = await dismissReviewPrompt(booking.id);
    setDismissingReviewId(null);
    if (error) {
      setReviewError(`Não foi possível dispensar o convite: ${error}`);
      return;
    }
    reload();
  }

  async function handleSaveProfile() {
    if (!name.trim()) return failProfile("Digite seu nome.", ["name"]);
    if (phone.replace(/\D/g, "").length < 10) return failProfile("Digite um celular válido com DDD.", ["phone"]);
    clearProfileError();
    setSavingProfile(true);
    await updateProfile({ full_name: name.trim(), phone: phone.trim() });
    setSavingProfile(false);
    setEditingProfile(false);
  }

  function handleCancelEditProfile() {
    setName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    clearProfileError();
    setEditingProfile(false);
  }

  async function handleNewBooking(draft: BookingDraft) {
    if (!session?.user) {
      setBookingOpen(false);
      return;
    }
    const { error } = await createBooking({
      customer_id: session.user.id,
      barber_id: draft.barberId,
      service_id: draft.serviceId,
      scheduled_date: draft.dateIso,
      scheduled_time: draft.time,
      status: "pending",
      price_cents: draft.priceCents,
      duration_minutes: draft.durationMinutes,
      customer_name: profile?.full_name || name,
      customer_phone: profile?.phone || phone,
      customer_email: profile?.email ?? session.user.email ?? null,
    });
    if (error) {
      setActionError(`Não foi possível confirmar seu agendamento: ${friendlyBookingError(error)}`);
      return;
    }
    setBookingOpen(false);
    reload();
  }

  return (
    <div className="min-h-screen bg-ink pb-16">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <img src="/img/monogram.jpg" alt="" className="h-10 w-11 object-contain" style={{ filter: "brightness(1.25) contrast(3.4)", mixBlendMode: "screen" }} />
            <span className="font-heading text-[15px] tracking-[0.2em] text-white uppercase">Meus agendamentos</span>
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
              Meus agendamentos
            </h1>
          </div>
          <button
            onClick={() => setBookingOpen(true)}
            className="bg-silver-gradient flex min-h-12 cursor-pointer items-center rounded-lg px-6.5 font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110"
          >
            Agendar horário
          </button>
        </div>

        {declinedNotice && (
          <div className="mb-5 rounded-2xl border p-7 md:p-10" style={{ borderColor: "#e5484d" }}>
            <span className="font-heading text-xs tracking-[0.24em] uppercase" style={{ color: "#e5484d" }}>
              Agendamento recusado
            </span>
            <p className="m-0 mt-2 text-[15px] text-white">
              {declinedNotice.services?.name} com {declinedNotice.barbers?.name} · {formatDateBR(declinedNotice.scheduled_date)} às{" "}
              {formatTimeShort(declinedNotice.scheduled_time)}
            </p>
            <p className="m-0 mt-3 rounded-lg border border-border bg-surface-alt p-3.5 text-[15px] text-muted">
              <span className="font-semibold text-white">Motivo: </span>
              {declinedNotice.decline_reason}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                onClick={() => setBookingOpen(true)}
                className="bg-silver-gradient flex min-h-12 cursor-pointer items-center rounded-lg px-6.5 font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase"
              >
                Agendar outro horário
              </button>
              <button
                onClick={handleDismissDecline}
                disabled={dismissingDecline}
                className="flex min-h-12 cursor-pointer items-center rounded-lg border border-border px-6.5 font-heading text-xs tracking-[0.2em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Entendi
              </button>
            </div>
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-silver bg-surface p-7 md:p-10">
          <div className="mb-6 flex items-center justify-between gap-3">
            <span className="font-heading text-sm font-medium tracking-[0.2em] text-silver uppercase">Próximo agendamento</span>
            {upcoming && <BookingStatusBadge status={upcoming.status} />}
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
                <div className="font-heading text-[clamp(24px,3.2vw,38px)] leading-tight font-medium tracking-[0.04em] text-white uppercase">
                  {upcoming.services?.name}
                </div>
                <div className="mt-4 flex w-full items-stretch overflow-hidden rounded-xl border border-border bg-surface-alt">
                  <div className="flex flex-1 flex-col items-center justify-center px-5 py-4 text-center">
                    <span className="font-heading text-xs tracking-[0.16em] text-muted-2 uppercase">
                      {MONTH_LABELS[new Date(`${upcoming.scheduled_date}T00:00:00`).getMonth()].slice(0, 3)}
                    </span>
                    <span className="font-heading text-[38px] leading-none text-white tabular-nums">
                      {upcoming.scheduled_date.slice(8, 10)}
                    </span>
                    <span className="mt-1 text-[13px] text-muted-2 capitalize">
                      {WEEKDAY_LABELS[new Date(`${upcoming.scheduled_date}T00:00:00`).getDay()].slice(0, 3)}
                    </span>
                  </div>
                  <div className="w-px flex-shrink-0 bg-border" aria-hidden />
                  <div className="flex flex-1 flex-col items-center justify-center px-5 py-4 text-center">
                    <span className="font-heading text-xs tracking-[0.16em] text-muted-2 uppercase">Horário</span>
                    <span className="font-heading text-[38px] leading-none text-white tabular-nums">
                      {formatTimeShort(upcoming.scheduled_time)}
                    </span>
                  </div>
                </div>
                {upcomingPending && (
                  <p className="mt-3 text-[13px]" style={{ color: "#E0B341" }}>
                    Aguardando o barbeiro aceitar a solicitação.
                  </p>
                )}
                <div className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 md:hidden">
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
                <div className="mt-4 hidden w-full items-stretch overflow-hidden rounded-xl border border-border bg-surface-alt md:flex">
                  <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-5 py-4 text-center">
                    <span className="font-heading text-xs tracking-[0.16em] text-muted-2 uppercase">Barbeiro</span>
                    <span className="max-w-full truncate font-heading text-2xl leading-tight text-white">
                      {upcoming.barbers?.name ?? "—"}
                    </span>
                  </div>
                  <div className="w-px flex-shrink-0 bg-border" aria-hidden />
                  <div className="flex flex-1 flex-col items-center justify-center gap-1 px-5 py-4 text-center">
                    <span className="font-heading text-xs tracking-[0.16em] text-muted-2 uppercase">Valor</span>
                    <span className="font-heading text-2xl leading-tight text-white">
                      {formatCents(upcoming.price_cents)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2.5 md:w-[190px] md:flex-col">
                <button
                  onClick={() =>
                    navigate("/", { state: { rebook: { barberId: upcoming.barber_id, serviceId: upcoming.service_id } } })
                  }
                  className="bg-silver-gradient flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase"
                >
                  Remarcar
                </button>
                <button
                  onClick={() => setCancelling(true)}
                  className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-xs tracking-[0.2em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
                >
                  {upcomingPending ? "Cancelar solicitação" : "Cancelar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="m-0 text-[17px] leading-relaxed text-silver-dim">Você não tem nenhum agendamento ativo.</p>
              <button
                onClick={() => setBookingOpen(true)}
                className="bg-silver-gradient flex min-h-12 cursor-pointer items-center rounded-lg px-6.5 font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase"
              >
                Agendar horário
              </button>
            </div>
          )}
        </div>

        {pendingReviews.length > 0 && (
          <div className="mb-5 rounded-2xl border border-silver bg-surface p-7 md:p-10">
            <div className="mb-6 flex items-center gap-3">
              <span className="font-heading text-xs tracking-[0.24em] text-muted-2 uppercase">Agendamentos a avaliar</span>
              <span
                className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 font-heading text-xs font-semibold tabular-nums"
                style={{ background: "rgba(224,179,65,0.16)", color: "#E0B341" }}
              >
                {pendingReviews.length}
              </span>
            </div>

            {reviewError && (
              <span className="mb-5 block rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
                {reviewError}
              </span>
            )}

            <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-6">
              {pendingReviews.map((b) => {
                const draft = reviewDraft(b.id);
                const busy = submittingReviewId === b.id || dismissingReviewId === b.id;
                return (
                  <div key={b.id} className="rounded-xl border border-border bg-surface-alt p-5 md:p-7">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-heading text-lg text-white md:text-xl">{b.services?.name}</span>
                      <span className="font-heading text-lg text-white md:text-xl">{formatCents(b.price_cents)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted md:text-sm">
                      <span>{b.barbers?.name}</span>
                      <span aria-hidden>·</span>
                      <span>{formatDateBR(b.scheduled_date)}</span>
                      <span aria-hidden>·</span>
                      <span>{formatTimeShort(b.scheduled_time)}</span>
                    </div>

                    <div className="mt-4.5">
                      <span className="mb-2 block text-[13px] text-muted">
                        Nota{draft.rating > 0 ? ` (${draft.rating}/5)` : ""}
                      </span>
                      <StarRating value={draft.rating} onChange={(v) => setReviewDraftRating(b.id, v)} size={28} />
                    </div>
                    <label className="mt-3.5 flex flex-col gap-2">
                      <span className="text-[13px] text-muted">Comentário (opcional)</span>
                      <textarea
                        value={draft.comment}
                        onChange={(e) => setReviewDraftComment(b.id, e.target.value)}
                        rows={3}
                        placeholder="Conte como foi seu atendimento…"
                        className="resize-none rounded-lg border border-border bg-surface px-3.5 py-3 text-[15px] text-white outline-none focus:border-silver"
                      />
                    </label>
                    <div className="mt-4 flex gap-2.5">
                      <button
                        onClick={() => handleDismissReview(b)}
                        disabled={busy}
                        className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-xs tracking-[0.16em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Agora não
                      </button>
                      <button
                        onClick={() => handleSubmitReview(b)}
                        disabled={draft.rating === 0 || busy}
                        className="bg-silver-gradient flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg font-heading text-xs font-semibold tracking-[0.16em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submittingReviewId === b.id ? "Enviando…" : "Enviar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-5 rounded-lg border border-border bg-surface p-7 md:p-8">
          <span className="font-heading text-base font-medium tracking-[0.18em] text-silver uppercase">Histórico</span>

          <div className="mt-4.5 grid gap-3.5 sm:grid-cols-3">
            <HistoryStat label="Atendimentos" value={String(history.length)} />
            <HistoryStat label="Pedidos concluídos" value={String(completedOrders.length)} />
            <HistoryStat label="Total gasto" value={formatCents(grandTotalCents)} />
          </div>

          <div className="mt-7">
            <span className="font-heading text-sm font-medium tracking-[0.16em] text-white uppercase">Serviços</span>
            <div className="mt-3 flex flex-col">
              {historyLoading && <Skeleton count={3} className="my-2 h-6 w-full" />}
              {!historyLoading && history.length === 0 && (
                <p className="py-3 text-[15px] text-muted">Nenhum atendimento anterior.</p>
              )}
              {history.length > 0 && (
                <>
                  <div className="hidden md:block">
                    <ScrollFadeX minWidth="680px">
                      <div
                        className="grid items-center gap-4 border-t border-border py-3.5 font-heading text-[13px] whitespace-nowrap tracking-[0.14em] text-muted-2 uppercase"
                        style={{ gridTemplateColumns: HISTORY_COLS }}
                      >
                        <span>Data</span>
                        <span>Tipo de corte</span>
                        <span>Barbeiro</span>
                        <span>Status</span>
                        <span className="text-right">Total</span>
                      </div>
                      {history.map((h) => (
                        <div
                          key={h.id}
                          className="grid items-center gap-4 border-t border-border py-4"
                          style={{ gridTemplateColumns: HISTORY_COLS }}
                        >
                          <span className="text-[15px] text-muted">{formatDateBR(h.scheduled_date)}</span>
                          <span className="min-w-0 truncate text-[17px] font-medium text-white">{h.services?.name}</span>
                          <span className="truncate text-[15px] text-muted">{h.barbers?.name}</span>
                          <span>
                            <BookingStatusBadge status={h.status} />
                          </span>
                          <span className="text-right font-heading text-[17px] text-white">
                            {formatCents(h.price_cents)}
                          </span>
                        </div>
                      ))}
                    </ScrollFadeX>
                  </div>
                  <div className="flex flex-col md:hidden">
                    {history.map((h) => (
                      <div key={h.id} className="flex flex-col gap-2.5 border-t border-border py-4 first:border-t-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[15px] text-muted">{formatDateBR(h.scheduled_date)}</span>
                          <BookingStatusBadge status={h.status} />
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-xs tracking-[0.1em] text-muted-2 uppercase">Serviço</span>
                            <span className="block truncate text-[17px] font-medium text-white">{h.services?.name}</span>
                            <span className="mt-2 block text-xs tracking-[0.1em] text-muted-2 uppercase">Barbeiro</span>
                            <span className="block truncate text-[15px] text-muted">{h.barbers?.name}</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-xs tracking-[0.1em] text-muted-2 uppercase">Total</span>
                            <span className="block font-heading text-[17px] text-white">
                              {formatCents(h.price_cents)}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-7">
            <span className="font-heading text-sm font-medium tracking-[0.16em] text-white uppercase">Pedidos</span>
            <div className="mt-3 flex flex-col">
              {historyLoading && <Skeleton count={2} className="my-2 h-6 w-full" />}
              {!historyLoading && myOrders.length === 0 && (
                <p className="py-3 text-[15px] text-muted">Nenhum pedido feito na loja ainda.</p>
              )}
              {myOrders.length > 0 && (
                <>
                  <div className="hidden md:block">
                    <ScrollFadeX minWidth="620px">
                      <div
                        className="grid items-center gap-4 border-t border-border py-3.5 font-heading text-[13px] whitespace-nowrap tracking-[0.14em] text-muted-2 uppercase"
                        style={{ gridTemplateColumns: ORDER_COLS }}
                      >
                        <span>Data</span>
                        <span>Itens</span>
                        <span>Status</span>
                        <span className="text-right">Total</span>
                      </div>
                      {myOrders.map((o) => (
                        <div
                          key={o.id}
                          className="grid items-center gap-4 border-t border-border py-4"
                          style={{ gridTemplateColumns: ORDER_COLS }}
                        >
                          <span className="text-[15px] text-muted">{formatDateBR(dateKey(new Date(o.createdAt)))}</span>
                          <span className="min-w-0 truncate text-[17px] font-medium text-white">
                            {o.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")}
                          </span>
                          <span>
                            <OrderStatusBadge status={o.status} />
                          </span>
                          <span className="text-right font-heading text-[17px] text-white">
                            {formatCents(o.totalCents)}
                          </span>
                        </div>
                      ))}
                    </ScrollFadeX>
                  </div>
                  <div className="flex flex-col md:hidden">
                    {myOrders.map((o) => (
                      <div key={o.id} className="flex flex-col gap-2.5 border-t border-border py-4 first:border-t-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[15px] text-muted">{formatDateBR(dateKey(new Date(o.createdAt)))}</span>
                          <OrderStatusBadge status={o.status} />
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-xs tracking-[0.1em] text-muted-2 uppercase">Itens</span>
                            <span className="block truncate text-[17px] font-medium text-white">
                              {o.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-xs tracking-[0.1em] text-muted-2 uppercase">Total</span>
                            <span className="block font-heading text-[17px] text-white">
                              {formatCents(o.totalCents)}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-7 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="font-heading text-base font-medium tracking-[0.18em] text-silver uppercase">Meus dados</span>
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
                  <span className="text-[13px] text-muted">Nome *</span>
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearProfileField("name");
                    }}
                    required
                    className={`min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver ${fieldClass(profileFieldProps("name"))}`}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-muted">Celular *</span>
                  <input
                    value={phone}
                    onChange={(e) => {
                      setPhone(formatPhoneBR(e.target.value));
                      clearProfileField("phone");
                    }}
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                    maxLength={16}
                    required
                    className={`min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver ${fieldClass(profileFieldProps("phone"))}`}
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
              {profileError && (
                <span className="mt-3.5 block rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
                  {profileError}
                </span>
              )}
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
                  <span className="text-sm text-muted">{row.k}</span>
                  <span className="text-[17px] font-medium text-white">{row.v}</span>
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

      {cancelling && upcoming && (
        <CancelBookingModal
          booking={upcoming}
          onClose={() => setCancelling(false)}
          onCancelled={() => {
            setCancelling(false);
            reload();
          }}
        />
      )}

      {actionError && (
        <Toast message={actionError} onDismiss={() => setActionError(null)} duration={6000} variant="error" />
      )}
    </div>
  );
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-alt px-5 py-4">
      <span className="block text-xs tracking-[0.12em] text-muted uppercase">{label}</span>
      <span className="mt-1 block font-heading text-2xl leading-none text-white">{value}</span>
    </div>
  );
}
