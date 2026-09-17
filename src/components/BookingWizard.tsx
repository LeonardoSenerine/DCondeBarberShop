import { useMemo, useState } from "react";
import { useBarbers, useBarberHours, useServices } from "@/hooks/useCatalog";
import { availableStartTimes, slotsForWeekday, useMonthBookings } from "@/hooks/useBooking";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  formatCents,
  formatDuration,
} from "@/lib/format";
import { BarberPhoto } from "@/components/BarberPhoto";
import { Reveal } from "@/components/Reveal";
import { Skeleton } from "@/components/Skeleton";

export interface BookingDraft {
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: string;
  durationMinutes: number;
  dateIso: string;
  dateLabel: string;
  time: string;
  priceCents: number;
}

interface BookingWizardProps {
  onConfirm: (draft: BookingDraft) => void;
  /** Pre-fill barber/service (e.g. "Remarcar") and jump straight to the day/time step. */
  initialBarberId?: string;
  initialServiceId?: string;
  initialStep?: number;
}

const STEP_NAMES = ["Profissional", "Serviço", "Dia e horário", "Confirmar"];
const SILVER_GRADIENT =
  "linear-gradient(135deg,#FFFFFF 0%,#9E9E9E 52%,#E0E0E0 100%)";

export function BookingWizard({ onConfirm, initialBarberId, initialServiceId, initialStep }: BookingWizardProps) {
  const { data: barbers, loading: barbersLoading } = useBarbers();
  const { data: services, loading: servicesLoading } = useServices();
  const { data: hours } = useBarberHours();

  const [step, setStep] = useState(initialStep ?? 1);
  const [barberId, setBarberId] = useState<string | null>(initialBarberId ?? null);
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId ?? null);

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);
  const nowTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [day, setDay] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { bookedByDate, error: bookedSlotsError } = useMonthBookings(
    barberId,
    viewYear,
    viewMonth,
  );

  const barber = barbers.find((b) => b.id === barberId) ?? null;
  const service = services.find((s) => s.id === serviceId) ?? null;

  const selectedDate = day != null ? new Date(viewYear, viewMonth, day) : null;
  const isoDate = selectedDate
    ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;

  // Services over 60min need more than one back-to-back hourly slot (e.g.
  // "luzes" at 4h needs 4) — availableStartTimes only returns start times
  // where every slot the service would occupy is on the grid and free.
  const durationMinutes = service?.duration_minutes ?? 60;

  const freeTimes = (() => {
    if (!barberId || !selectedDate || bookedSlotsError) return [];
    const weekday = selectedDate.getDay();
    const slots = slotsForWeekday(hours, barberId, weekday);
    const booked = (isoDate && bookedByDate[isoDate]) || [];
    const isToday = selectedDate.getTime() === today.getTime();
    return availableStartTimes(slots, booked, durationMinutes).filter(
      (t) => !isToday || t > nowTimeStr,
    );
  })();

  const dayHasFreeSlot = (d: number): boolean => {
    if (!barberId || bookedSlotsError) return false;
    const date = new Date(viewYear, viewMonth, d);
    if (date < today) return false;
    const weekday = date.getDay();
    const slots = slotsForWeekday(hours, barberId, weekday);
    if (slots.length === 0) return false;
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const booked = bookedByDate[iso] || [];
    const isToday = date.getTime() === today.getTime();
    return availableStartTimes(slots, booked, durationMinutes).some(
      (t) => !isToday || t > nowTimeStr,
    );
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const isMinMonth =
    viewYear === today.getFullYear() && viewMonth <= today.getMonth();

  function jumpMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
    setDay(null);
    setTime(null);
  }

  const stepDone = [
    !!barber,
    !!service,
    !!(day && time),
    !!(barber && service && day && time),
  ];
  const canNext =
    step === 1
      ? !!barber
      : step === 2
        ? !!service
        : step === 3
          ? !!(day && time)
          : false;

  const dateLabel = selectedDate
    ? `${String(day).padStart(2, "0")}/${String(viewMonth + 1).padStart(2, "0")}/${viewYear}`
    : "—";
  const dateLong = selectedDate
    ? `${String(day).padStart(2, "0")} de ${MONTH_LABELS[viewMonth].toLowerCase()} · ${WEEKDAY_LABELS[selectedDate.getDay()].toLowerCase()}`
    : "Escolha um dia";

  function handleConfirm() {
    if (!barber || !service || !day || !time || !isoDate) return;
    onConfirm({
      barberId: barber.id,
      barberName: barber.name,
      serviceId: service.id,
      serviceName: service.name,
      serviceDuration: formatDuration(service.duration_minutes),
      durationMinutes: service.duration_minutes,
      dateIso: isoDate,
      dateLabel,
      time,
      priceCents: service.price_cents,
    });
  }

  return (
    <section
      id="agendar"
      className="relative bg-ink px-6 pt-[72px] pb-28"
      style={{ zIndex: 5 }}
    >
      <Reveal className="mx-auto max-w-[1240px] rounded-lg border border-border bg-surface p-6 shadow-[0_40px_90px_rgba(0,0,0,0.8)] md:p-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="m-0 font-heading text-[clamp(28px,3.4vw,42px)] font-semibold tracking-[0.04em] text-white uppercase">
            Reserve seu horário
          </h2>
          <p className="m-0 max-w-[38ch] text-[15px] text-muted">
            Monte o atendimento em quatro passos. A confirmação fica salva na
            sua conta.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-4 gap-1.5 border-b border-border pb-6 sm:flex sm:flex-wrap sm:gap-3">
          {STEP_NAMES.map((name, i) => {
            const n = i + 1;
            const active = step === n;
            const done = stepDone[i] && !active;
            const reachable = n <= step || stepDone[i];
            const value =
              [
                barber?.name,
                service?.name,
                day ? `${dateLabel}${time ? " · " + time : ""}` : "—",
                service ? formatCents(service.price_cents) : "—",
              ][i] ?? "";
            return (
              <button
                key={name}
                disabled={!reachable}
                onClick={() => reachable && setStep(n)}
                className="flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-center transition hover:brightness-125 disabled:cursor-not-allowed disabled:hover:brightness-100 sm:flex-1 sm:basis-[180px] sm:flex-row sm:items-center sm:gap-3 sm:px-2.5 sm:text-left"
                style={{
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-heading text-xs font-semibold sm:h-8.5 sm:w-8.5 sm:text-sm"
                  style={{
                    background: active || done ? SILVER_GRADIENT : "#1A1A1A",
                    borderColor: active
                      ? "#FFFFFF"
                      : done
                        ? "#E0E0E0"
                        : "#2A2A2A",
                    color: active || done ? "#0A0A0A" : "#9E9E9E",
                  }}
                >
                  {n}
                </span>
                <span className="flex min-w-0 flex-col items-center gap-0.5 sm:items-start">
                  <span
                    className="font-heading text-[10px] tracking-[0.1em] uppercase sm:text-[13px] sm:tracking-[0.16em]"
                    style={{ color: active || done ? "#FFFFFF" : "#9E9E9E" }}
                  >
                    {name}
                  </span>
                  <span className="hidden overflow-hidden text-ellipsis whitespace-nowrap text-xs text-faint sm:block">
                    {value}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {step === 1 && (
          <div className="max-w-full md:max-w-[820px]">
            <h3 className="mb-1.5 font-heading text-[13px] font-medium tracking-[0.24em] text-white uppercase">
              Escolha o profissional
            </h3>
            <p className="mb-4.5 text-sm text-muted-2">
              A agenda mostrada depois é a dele.
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              {barbersLoading && (
                <Skeleton
                  count={2}
                  className="aspect-[4/5] w-full rounded-[10px]"
                />
              )}
              {barbers.map((b) => {
                const on = barberId === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBarberId(b.id);
                      setDay(null);
                      setTime(null);
                    }}
                    className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-[10px] border text-left transition duration-300 hover:z-10 hover:scale-[1.04] hover:border-silver"
                    style={{
                      background: on ? "rgba(255,255,255,0.06)" : "#141414",
                      borderColor: on ? "#E0E0E0" : "#2A2A2A",
                    }}
                  >
                    <span className="relative block aspect-[4/5] w-full overflow-hidden bg-ink">
                      <BarberPhoto
                        photos={
                          b.gallery_paths.length
                            ? b.gallery_paths
                            : [b.photo_path]
                        }
                        alt=""
                        className="h-full w-full object-cover"
                        style={{ objectPosition: "center 22%" }}
                      />
                      <span
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to top,rgba(10,10,10,0.9) 0%,rgba(10,10,10,0.1) 55%,rgba(10,10,10,0) 100%)",
                        }}
                      />
                      <span
                        className="absolute top-3 right-3 flex h-[22px] w-[22px] items-center justify-center rounded-full border text-xs transition-colors"
                        style={
                          on
                            ? {
                                borderColor: "#fff",
                                background: "var(--color-silver)",
                                color: "#0A0A0A",
                              }
                            : {
                                borderColor: "rgba(255,255,255,0.55)",
                                background: "rgba(10,10,10,0.35)",
                                color: "transparent",
                              }
                        }
                      >
                        ✓
                      </span>
                      <span className="absolute right-4 bottom-3.5 left-4 flex flex-col gap-0.5">
                        <span className="font-heading text-lg tracking-[0.1em] text-white uppercase">
                          {b.name}
                        </span>
                        <span className="text-xs tracking-[0.18em] text-muted uppercase">
                          {b.role_title}
                        </span>
                      </span>
                    </span>
                    <span className="flex flex-col gap-2 px-4 pt-3.5 pb-4">
                      <span className="block truncate border-t border-border pt-2.5 text-[13px] text-silver transition-colors group-hover:text-white">
                        {b.instagram ?? "—"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="mb-1.5 font-heading text-[13px] font-medium tracking-[0.24em] text-white uppercase">
              Escolha o serviço
            </h3>
            <p className="mb-4.5 text-sm text-muted-2">
              Com {barber?.name ?? "—"}. É possível alterar antes de confirmar.
            </p>
            <div className="grid max-h-[420px] grid-cols-1 gap-2.5 overflow-y-auto pr-1.5 md:grid-cols-2">
              {servicesLoading && (
                <Skeleton count={6} className="h-[68px] w-full rounded-lg" />
              )}
              {services.map((s) => {
                const on = serviceId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      // A different service can need a different number of
                      // back-to-back slots, so a previously chosen day/time
                      // isn't necessarily still valid — make them re-pick it.
                      setServiceId((prev) => (prev === s.id ? null : s.id));
                      setDay(null);
                      setTime(null);
                    }}
                    className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition hover:brightness-125"
                    style={{
                      background: on ? "rgba(255,255,255,0.07)" : "#1A1A1A",
                      borderColor: on ? "#E0E0E0" : "#2A2A2A",
                    }}
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-heading text-sm tracking-[0.08em] text-white uppercase">
                        {s.name}
                      </span>
                      <span className="text-[13px] text-muted">
                        {formatDuration(s.duration_minutes)} · a partir de{" "}
                        {formatCents(s.price_cents)}
                      </span>
                    </span>
                    <span
                      className="h-[18px] w-[18px] flex-shrink-0 rounded-full border"
                      style={{
                        background: on ? "#E0E0E0" : "transparent",
                        borderColor: on ? "#FFFFFF" : "#3A3A3A",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="mb-1.5 font-heading text-[13px] font-medium tracking-[0.24em] text-white uppercase">
              Escolha o dia e o horário
            </h3>
            <p className="mb-4.5 text-sm text-muted-2">
              Agenda de {barber?.name ?? "—"}. Dias apagados não têm vaga.
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-alt p-3.5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => !isMinMonth && jumpMonth(-1)}
                    disabled={isMinMonth}
                    aria-label="Mês anterior"
                    className="flex h-[30px] w-[30px] flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-ink text-sm transition hover:brightness-125 disabled:cursor-not-allowed disabled:hover:brightness-100"
                    style={{ color: isMinMonth ? "#3A3A3A" : "#FFFFFF" }}
                  >
                    ‹
                  </button>
                  <span className="flex items-baseline gap-2">
                    <span className="font-heading text-[13px] tracking-[0.16em] text-white uppercase">
                      {MONTH_LABELS[viewMonth]}
                    </span>
                    <span className="text-xs text-muted-2">{viewYear}</span>
                  </span>
                  <button
                    onClick={() => jumpMonth(1)}
                    aria-label="Próximo mês"
                    className="flex h-[30px] w-[30px] flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-ink text-sm text-white transition hover:brightness-125"
                  >
                    ›
                  </button>
                </div>
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {WEEKDAY_SHORT.map((w, i) => (
                    <span
                      key={i}
                      className="text-center text-[10px] tracking-[0.08em] text-muted-2"
                    >
                      {w}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstWeekday }).map((_, i) => (
                    <span key={`blank-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1;
                    const date = new Date(viewYear, viewMonth, d);
                    const past = date < today;
                    const free = dayHasFreeSlot(d);
                    const off = past || !free;
                    const on = day === d;
                    return (
                      <button
                        key={d}
                        disabled={off}
                        onClick={() => {
                          setDay(d);
                          setTime(null);
                        }}
                        className="flex aspect-square min-h-[30px] cursor-pointer items-center justify-center rounded-md text-xs transition hover:brightness-125 disabled:cursor-not-allowed disabled:hover:brightness-100"
                        style={{
                          background: on
                            ? "#E0E0E0"
                            : off
                              ? "transparent"
                              : "#0A0A0A",
                          color: on ? "#0A0A0A" : off ? "#3A3A3A" : "#FFFFFF",
                          borderWidth: 1,
                          borderColor: on
                            ? "#FFFFFF"
                            : off
                              ? "#1F1F1F"
                              : "#2A2A2A",
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3.5 flex flex-col gap-1 border-t border-border pt-3">
                  <span className="text-[13px] text-silver">{dateLong}</span>
                  <span className="text-xs text-faint">
                    {barberId
                      ? `Dias em destaque têm horário livre com ${barber?.name ?? ""}.`
                      : "Escolha um barbeiro."}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-alt p-3.5">
                <span className="text-xs tracking-[0.18em] text-muted-2 uppercase">
                  Horários livres
                </span>
                <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {freeTimes.map((t) => {
                    const on = time === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setTime(t)}
                        className="flex min-h-14 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium tracking-[0.04em] transition hover:brightness-125"
                        style={{
                          background: on ? "#E0E0E0" : "#0A0A0A",
                          color: on ? "#0A0A0A" : "#FFFFFF",
                          borderColor: on ? "#FFFFFF" : "#2A2A2A",
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                {bookedSlotsError && (
                  <p className="mt-2.5 text-[13px] text-red-400">
                    Não foi possível carregar os horários. Tente novamente em
                    instantes.
                  </p>
                )}
                {!bookedSlotsError && day && freeTimes.length === 0 && (
                  <p className="mt-2.5 text-[13px] text-muted">
                    {barber?.name} não atende ou está sem vaga nessa data.
                    Selecione outro dia.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-full md:max-w-[840px]">
            <h3 className="mb-2 font-heading text-sm font-medium tracking-[0.24em] text-white uppercase">
              Confirme os dados
            </h3>
            <p className="mb-6 text-base text-muted-2">
              Após confirmar, aguarde o barbeiro aceitar — ele confirma pelo
              WhatsApp.
            </p>
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-alt p-6 sm:p-8 md:p-12">
              {[
                { k: "Serviço", v: service?.name ?? "Selecione" },
                { k: "Barbeiro", v: barber?.name ?? "Selecione" },
                { k: "Data", v: dateLabel },
                { k: "Horário", v: time ?? "—" },
                {
                  k: "Duração",
                  v: service ? formatDuration(service.duration_minutes) : "—",
                },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="shrink-0 text-sm text-muted sm:text-base">
                    {row.k}
                  </span>
                  <span className="text-right font-heading text-base tracking-[0.04em] text-white sm:text-xl sm:tracking-[0.06em]">
                    {row.v}
                  </span>
                </div>
              ))}
              <div className="my-1.5 h-px bg-border" />
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 font-heading text-sm tracking-[0.15em] text-white uppercase sm:text-base sm:tracking-[0.2em]">
                  A partir de
                </span>
                <span className="whitespace-nowrap font-heading text-3xl font-semibold text-white sm:text-5xl">
                  {service ? formatCents(service.price_cents) : "—"}
                </span>
              </div>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={!barber || !service || !day || !time}
                className="bg-silver-gradient mt-2 flex min-h-[72px] w-full cursor-pointer items-center justify-center rounded-lg font-heading text-base font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 pl-0.5 pr-0.5"
              >
                Confirmar agendamento
              </button>
              <span className="text-center text-sm text-muted-2">
                Você recebe a confirmação pelo WhatsApp assim que o barbeiro
                aceitar.
              </span>
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-nowrap items-center justify-between gap-1.5 border-t border-border pt-5.5 sm:gap-3.5">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex min-h-[44px] shrink-0 cursor-pointer items-center rounded-lg border border-border px-2.5 font-heading text-[10px] font-medium tracking-[0.1em] uppercase transition-colors hover:border-silver disabled:cursor-not-allowed sm:min-h-[50px] sm:gap-2.5 sm:px-6.5 sm:text-xs sm:tracking-[0.2em]"
            style={{ color: step === 1 ? "#3A3A3A" : "#FFFFFF" }}
          >
            ‹ Voltar
          </button>
          <span className="flex-1 truncate text-center text-[11px] text-muted-2 sm:text-[13px]">
            Passo {step} de 4
          </span>
          <button
            onClick={() => canNext && setStep((s) => Math.min(4, s + 1))}
            disabled={!canNext || step === 4}
            aria-hidden={step === 4}
            tabIndex={step === 4 ? -1 : undefined}
            className={`flex min-h-[44px] shrink-0 cursor-pointer items-center rounded-lg px-3.5 font-heading text-[10px] font-semibold tracking-[0.1em] uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed sm:min-h-[50px] sm:gap-2.5 sm:px-8 sm:text-xs sm:tracking-[0.2em] ${step === 4 ? "invisible" : ""}`}
            style={{
              background: canNext ? SILVER_GRADIENT : "#1F1F1F",
              color: canNext ? "#0A0A0A" : "#7A7A7A",
            }}
          >
            Continuar ›
          </button>
        </div>
      </Reveal>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[130] overflow-y-auto"
          style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
          onClick={() => setConfirmOpen(false)}
        >
          <div className="flex min-h-full items-center justify-center p-6">
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[420px] rounded-2xl border border-border bg-surface p-7 shadow-[0_40px_90px_rgba(0,0,0,0.8)]"
            >
              <span className="bg-silver-gradient flex h-14 w-14 items-center justify-center rounded-full">
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="#0A0A0A"
                  aria-hidden="true"
                >
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.35-.53.05-1.03.24-3.47-.72-2.94-1.16-4.79-4.2-4.94-4.4-.14-.19-1.16-1.55-1.16-2.96 0-1.4.73-2.09 1-2.38.24-.29.53-.36.72-.36.19 0 .39 0 .55.01.19.01.44-.07.68.53.24.58.82 2 .89 2.14.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.14.14-.29.29-.12.58.17.29.75 1.23 1.6 2 1.11.98 2.03 1.3 2.32 1.45.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.39-.24.65-.14.26.09 1.65.78 1.94.92.29.14.48.22.55.34.07.12.07.7-.17 1.38z" />
                </svg>
              </span>
              <h3 className="m-0 mt-4 font-heading text-xl font-semibold tracking-[0.05em] text-white uppercase">
                Confirmar agendamento?
              </h3>
              <p className="m-0 mt-2 text-base text-muted">
                {barber?.name} vai receber sua solicitação e confirma pelo
                WhatsApp assim que aceitar.
              </p>

              <div className="mt-5 flex flex-col gap-2.5 rounded-lg border border-border bg-surface-alt p-4">
                {[
                  { k: "Serviço", v: service?.name ?? "—" },
                  { k: "Barbeiro", v: barber?.name ?? "—" },
                  { k: "Data", v: `${dateLabel} · ${time ?? "—"}` },
                  {
                    k: "Total",
                    v: service ? formatCents(service.price_cents) : "—",
                  },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="text-sm text-muted-2">{row.k}</span>
                    <span className="font-heading text-sm tracking-[0.04em] text-white">
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-2.5">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-sm tracking-[0.16em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
                >
                  Revisar
                </button>
                <button
                  onClick={() => {
                    setConfirmOpen(false);
                    handleConfirm();
                  }}
                  className="bg-silver-gradient flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg font-heading text-sm font-semibold tracking-[0.16em] text-ink uppercase transition-[filter] hover:brightness-110"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
