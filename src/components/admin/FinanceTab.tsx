import { useEffect, useMemo, useRef, useState } from "react";
import { useFinance, type FinancePeriod } from "@/hooks/useAdmin";
import { useBarbers } from "@/hooks/useCatalog";
import { useAuth } from "@/context/AuthContext";
import { formatCents, MONTH_LABELS, dateKey } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { Pagination } from "@/components/admin/Pagination";

const PERIODS: { id: FinancePeriod; label: string }[] = [
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "custom", label: "Personalizado" },
];

const WEEKDAY_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function shortMoney(cents: number) {
  const v = cents / 100;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return String(Math.round(v));
}

function AnimatedMoney({ cents }: { cents: number }) {
  const [displayed, setDisplayed] = useState(0);
  const lastValue = useRef(0);

  useEffect(() => {
    const from = lastValue.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      lastValue.current = cents;
      setDisplayed(cents);
      return;
    }

    const duration = 700;
    const startedAt = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (cents - from) * eased);
      lastValue.current = value;
      setDisplayed(value);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [cents]);

  return <>{formatCents(displayed)}</>;
}

/** One row of a ranked bar list (Formas de pagamento, mais vendidos…) — the leader (rank 0) is highlighted in green. */
function RankBar({ label, meta, pct, highlight }: { label: string; meta: React.ReactNode; pct: number; highlight: boolean }) {
  const barColor = highlight ? "#7FC98F" : "var(--color-silver)";
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 sm:mb-2.5">
        <span className="min-w-0 truncate text-base sm:text-lg" style={{ color: highlight ? "#7FC98F" : "#FFFFFF" }}>
          {label}
        </span>
        <span className="flex-shrink-0 text-sm text-muted sm:text-base">{meta}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-alt sm:h-3">
        <div
          className="dc-finance-progress h-full rounded-full"
          style={{ width: `${Math.round(pct * 100)}%`, background: barColor, opacity: highlight ? 0.9 : 0.7 }}
        />
      </div>
    </div>
  );
}

export function FinanceTab() {
  const [period, setPeriod] = useState<FinancePeriod>("30d");
  const today = useMemo(() => dateKey(new Date()), []);
  const monthStart = useMemo(() => {
    const d = new Date();
    return dateKey(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);
  const [customFrom, setCustomFrom] = useState(monthStart);
  const [customTo, setCustomTo] = useState(today);
  const [hover, setHover] = useState<number | null>(null);
  const [barberId, setBarberId] = useState("all");
  const [ledgerPage, setLedgerPage] = useState(1);
  const LEDGER_PAGE_SIZE = 10;
  const { data: barbers } = useBarbers();
  const { isOwner, barberId: myBarberId } = useAuth();

  const custom =
    period === "custom" ? { from: customFrom, to: customTo } : undefined;
  const {
    loading,
    isSample,
    range,
    revenue,
    revenueChangePct,
    productRevenue,
    avgTicket,
    serviceCount,
    chart,
    byMethod,
    byService,
    byProduct,
    transactions,
  } = useFinance(period, custom, barberId);

  useEffect(() => setLedgerPage(1), [period, customFrom, customTo, barberId]);
  const ledgerPageCount = Math.max(1, Math.ceil(transactions.length / LEDGER_PAGE_SIZE));
  const ledgerCurrentPage = Math.min(ledgerPage, ledgerPageCount);
  const pageTransactions = transactions.slice(
    (ledgerCurrentPage - 1) * LEDGER_PAGE_SIZE,
    ledgerCurrentPage * LEDGER_PAGE_SIZE,
  );

  // Staff only ever gets their own barber's rows back (RLS enforces this
  // server-side) — the filter dropdown would be misleading, so it's owner-only.
  const barberName = isOwner
    ? barberId === "all"
      ? "Toda a barbearia"
      : (barbers.find((b) => b.id === barberId)?.name ?? "Barbeiro")
    : (barbers.find((b) => b.id === myBarberId)?.name ?? "Você");

  const now = new Date();
  const monthLabel = `${MONTH_LABELS[now.getMonth()]} de ${now.getFullYear()}`;
  const n = chart.length;
  const maxBar = Math.max(1, ...chart.map((b) => b.value));
  const peak = chart.reduce<{
    key: string;
    label: string;
    value: number;
  } | null>(
    (best, b) => (b.value > 0 && (!best || b.value > best.value) ? b : best),
    null,
  );

  const H = 220;
  const padT = 16;
  const xPct = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const yPct = (v: number) =>
    ((padT + (1 - v / maxBar) * (H - padT)) / H) * 100;
  const linePath = chart
    .map((b, i) => `${i === 0 ? "M" : "L"} ${xPct(i)} ${yPct(b.value)}`)
    .join(" ");
  const areaPath =
    n > 0 ? `${linePath} L ${xPct(n - 1)} 100 L ${xPct(0)} 100 Z` : "";
  const gridLines = [25, 50, 75];
  // Thins out x-axis labels so they don't collide — fewer fit on mobile
  // than on desktop. Indices are spread evenly from 0 to n-1 (always
  // including both ends) rather than every Kth one, so the last pick can't
  // land awkwardly close to the final label. Each visible label still sits
  // at its exact xPct(i), so it always lines up with the point above it.
  function evenIndices(total: number, want: number): Set<number> {
    if (total <= want)
      return new Set(Array.from({ length: total }, (_, i) => i));
    const picked = new Set<number>();
    for (let k = 0; k < want; k++)
      picked.add(Math.round((k * (total - 1)) / (want - 1)));
    return picked;
  }
  const mobileLabels = evenIndices(n, 5);
  const desktopLabels = evenIndices(n, 10);

  const stats = [
    {
      label: "Ticket médio",
      cents: avgTicket,
      note: `${serviceCount} atendimentos`,
    },
    {
      label: "Serviços",
      cents: revenue - productRevenue,
      note: `${serviceCount} no período`,
    },
    {
      label: "Produtos",
      cents: productRevenue,
      note: "Vendas no balcão",
    },
    {
      label: "Lançamentos",
      value: String(transactions.length),
      note: range.label,
    },
  ];

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(pct * (n - 1)));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg text-muted">
          {monthLabel} · {range.label} ·{" "}
          <span className="text-white">{barberName}</span>
          {isSample && (
            <span className="ml-2 text-faint">· dados de exemplo</span>
          )}
        </p>
        {isOwner && (
          <div className="relative">
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className="min-h-12 cursor-pointer appearance-none rounded-full border border-border bg-surface-alt py-0 pr-9 pl-4.5 font-heading text-sm tracking-[0.1em] text-white uppercase outline-none focus:border-silver"
            >
              <option value="all">Toda a barbearia</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-muted">
              ▼
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {PERIODS.map((p) => {
          const on = period === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                setPeriod(p.id);
                setHover(null);
              }}
              className="min-h-12 cursor-pointer rounded-full border px-5 font-heading text-sm tracking-[0.12em] uppercase transition-colors"
              style={{
                background: on ? "var(--color-silver)" : "transparent",
                borderColor: on ? "var(--color-silver)" : "#2A2A2A",
                color: on ? "#0A0A0A" : "#9E9E9E",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-surface p-4">
          <label className="flex w-full flex-col gap-1.5 sm:w-auto">
            <span className="text-sm tracking-widest text-muted-2 uppercase">
              Período
            </span>
            <DateRangePicker
              from={customFrom}
              to={customTo}
              onChange={(r) => {
                setCustomFrom(r.from);
                setCustomTo(r.to);
              }}
              className="w-full sm:w-[300px]"
            />
          </label>
        </div>
      )}

      {loading && (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="rounded-2xl border border-border bg-surface p-8">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="mt-5 h-11 w-48" />
              <Skeleton className="mt-5 h-4 w-40" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-surface p-6"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-7 w-28" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-8">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-6 h-[220px] w-full rounded-lg" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-surface p-8"
              >
                <Skeleton className="h-4 w-40" />
                <div className="mt-6 flex flex-col gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-9 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && (
        <>
          {/* hero + stat grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="dc-finance-card flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-heading text-[20px] font-medium tracking-[0.16em] text-muted-2 uppercase">
                  Receita no período
                </span>
                {revenueChangePct != null && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 font-heading text-[13px] font-semibold tabular-nums"
                    style={{
                      background: revenueChangePct >= 0 ? "rgba(127,201,143,0.16)" : "rgba(229,72,77,0.16)",
                      color: revenueChangePct >= 0 ? "#7FC98F" : "#E5484D",
                    }}
                  >
                    {revenueChangePct >= 0 ? "▲" : "▼"} {Math.abs(Math.round(revenueChangePct * 100))}%
                  </span>
                )}
              </div>
              <div className="dc-finance-value mt-4 font-heading text-[42px] leading-none font-semibold text-white tabular-nums sm:text-[58px]">
                <AnimatedMoney cents={revenue} />
              </div>
              <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
                {transactions.length} lançamentos · {serviceCount} atendimentos
                {peak && (
                  <>
                    <br />
                    Pico dia {peak.label}:{" "}
                    <span className="font-semibold tabular-nums" style={{ color: "#7FC98F" }}>
                      {formatCents(peak.value)}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {stats.map((s) => (
                  <div
                    key={s.label}
                  className="dc-finance-card rounded-2xl border border-border bg-surface p-4 sm:p-7"
                  style={{ animationDelay: `${100 + stats.indexOf(s) * 70}ms` }}
                >
                  <span className="font-heading text-[13px] font-medium tracking-[0.14em] text-muted-2 uppercase sm:text-[15px]">
                    {s.label}
                  </span>
                  <div className="dc-finance-value mt-2 font-heading text-[22px] leading-tight font-semibold text-white tabular-nums sm:mt-2.5 sm:text-[32px]">
                    {"cents" in s ? <AnimatedMoney cents={s.cents ?? 0} /> : s.value}
                  </div>
                  <div className="mt-1 text-xs text-muted sm:mt-1.5 sm:text-sm">
                    {s.note}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* area chart */}
          <div className="dc-finance-card rounded-2xl border border-border bg-surface p-5 sm:p-8" style={{ animationDelay: "160ms" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-heading text-[20px] font-medium tracking-[0.16em] text-muted-2 uppercase">
                Faturamento
              </span>
              <span className="text-lg text-muted">
                Total:{" "}
                <span className="text-white tabular-nums">
                  {formatCents(revenue)}
                </span>
              </span>
            </div>

            {loading ? (
              <p className="mt-6 text-muted">Carregando…</p>
            ) : revenue === 0 ? (
              <p className="mt-6 text-muted">Sem lançamentos neste período.</p>
            ) : (
              <>
                <div className="mt-6 flex gap-2">
                  <div
                    className="flex w-16 flex-shrink-0 flex-col justify-between py-1 text-right text-sm text-faint tabular-nums"
                    style={{ height: H }}
                  >
                    {[1, 0.5, 0].map((t) => (
                      <span key={t}>R$ {shortMoney(maxBar * t)}</span>
                    ))}
                  </div>

                  <div
                    className="relative min-w-0 flex-1 select-none"
                    style={{ height: H }}
                    onMouseMove={onMove}
                    onMouseLeave={() => setHover(null)}
                  >
                    <svg
                      key={`${period}-${customFrom}-${customTo}-${barberId}-${revenue}`}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="h-full w-full overflow-visible"
                    >
                      <defs>
                        <linearGradient
                          id="finFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--color-silver)"
                            stopOpacity="0.24"
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--color-silver)"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      {gridLines.map((g) => (
                        <line
                          key={g}
                          x1="0"
                          x2="100"
                          y1={g}
                          y2={g}
                          stroke="var(--color-border)"
                          strokeOpacity="0.6"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                      <path className="dc-finance-area" d={areaPath} fill="url(#finFill)" />
                      <path
                        className="dc-finance-line"
                        d={linePath}
                        fill="none"
                        stroke="var(--color-silver)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        pathLength="1"
                      />
                      {hover != null && chart[hover] && (
                        <line
                          x1={xPct(hover)}
                          x2={xPct(hover)}
                          y1="0"
                          y2="100"
                          stroke="var(--color-silver)"
                          strokeOpacity="0.55"
                          strokeDasharray="3 3"
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                    </svg>

                    {/* A single point has no line segment to draw (an SVG path needs two
                  points to stroke anything), so it'd otherwise render as an empty
                  chart — show a static dot for it instead of relying on hover. */}
                    {n === 1 && chart[0] && hover == null && (
                      <span
                        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white"
                        style={{
                          left: `${xPct(0)}%`,
                          top: `${yPct(chart[0].value)}%`,
                        }}
                      />
                    )}

                    {hover != null && chart[hover] && (
                      <>
                        <span
                          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white"
                          style={{
                            left: `${xPct(hover)}%`,
                            top: `${yPct(chart[hover].value)}%`,
                          }}
                        />
                        <div
                          className="pointer-events-none absolute z-10 flex -translate-y-full flex-col rounded-lg border border-border-strong bg-surface-alt px-3 py-2 whitespace-nowrap shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
                          style={{
                            left: `${Math.min(88, Math.max(12, xPct(hover)))}%`,
                            top: `${yPct(chart[hover].value)}%`,
                            transform: `translate(-${Math.min(88, Math.max(12, xPct(hover)))}%, calc(-100% - 12px))`,
                          }}
                        >
                          <span className="font-heading text-sm tracking-[0.14em] text-muted-2 uppercase">
                            {`Dia ${chart[hover].label}`}
                          </span>
                          <span className="font-heading text-xl text-white tabular-nums">
                            {formatCents(chart[hover].value)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 flex gap-2">
                  <span className="w-16 flex-shrink-0" aria-hidden />
                  <div
                    className="relative min-w-0 flex-1 text-sm text-muted-2 tabular-nums"
                    style={{ height: 18 }}
                  >
                    {chart.map((b, i) => {
                      const edge =
                        i === 0 ? "start" : i === n - 1 ? "end" : "middle";
                      const showMobile = mobileLabels.has(i);
                      const showDesktop = desktopLabels.has(i);
                      return (
                        <span
                          key={b.key}
                          className={`absolute top-0 max-w-16 truncate ${showMobile ? "block" : "hidden"} ${showDesktop ? "sm:block" : "sm:hidden"}`}
                          style={{
                            left: `${xPct(i)}%`,
                            transform:
                              edge === "start"
                                ? "none"
                                : edge === "end"
                                  ? "translateX(-100%)"
                                  : "translateX(-50%)",
                            textAlign:
                              edge === "start"
                                ? "left"
                                : edge === "end"
                                  ? "right"
                                  : "center",
                          }}
                        >
                          {b.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* payment + top services + top products, side by side */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            <div className="dc-finance-card flex flex-col rounded-2xl border border-border bg-surface p-5 sm:p-8" style={{ animationDelay: "230ms" }}>
              <span className="font-heading text-[20px] font-medium tracking-[0.16em] text-muted-2 uppercase">
                Formas de pagamento
              </span>
              <div className="mt-5 flex flex-1 flex-col justify-center gap-4 sm:mt-6 sm:gap-6">
                {byMethod.map((m, i) => (
                  <RankBar
                    key={m.method}
                    label={m.method}
                    pct={m.pct}
                    highlight={i === 0 && m.value > 0}
                    meta={
                      <>
                        <span className="tabular-nums">{Math.round(m.pct * 100)}%</span> ·{" "}
                        <span className="text-white tabular-nums">{formatCents(m.value)}</span>
                      </>
                    }
                  />
                ))}
              </div>
            </div>

            <div className="dc-finance-card flex flex-col rounded-2xl border border-border bg-surface p-5 sm:p-8" style={{ animationDelay: "260ms" }}>
              <span className="font-heading text-[20px] font-medium tracking-[0.16em] text-muted-2 uppercase">
                Serviços mais vendidos
              </span>
              {byService.length === 0 ? (
                <p className="mt-5 text-muted">Nenhum serviço concluído no período.</p>
              ) : (
                <div className="mt-5 flex flex-1 flex-col justify-center gap-4 sm:mt-6 sm:gap-6">
                  {byService.slice(0, 6).map((s, i) => (
                    <RankBar
                      key={s.name}
                      label={s.name}
                      pct={s.pct}
                      highlight={i === 0}
                      meta={
                        <>
                          <span className="tabular-nums">{s.count}x</span> ·{" "}
                          <span className="text-white tabular-nums">{formatCents(s.value)}</span>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="dc-finance-card flex flex-col rounded-2xl border border-border bg-surface p-5 sm:p-8" style={{ animationDelay: "290ms" }}>
              <span className="font-heading text-[20px] font-medium tracking-[0.16em] text-muted-2 uppercase">
                Produtos mais vendidos
              </span>
              {byProduct.length === 0 ? (
                <p className="mt-5 text-muted">Nenhum produto vendido no período.</p>
              ) : (
                <div className="mt-5 flex flex-1 flex-col justify-center gap-4 sm:mt-6 sm:gap-6">
                  {byProduct.slice(0, 6).map((p, i) => (
                    <RankBar
                      key={p.name}
                      label={p.name}
                      pct={p.pct}
                      highlight={i === 0}
                      meta={
                        <>
                          <span className="tabular-nums">{p.count}x</span> ·{" "}
                          <span className="text-white tabular-nums">{formatCents(p.value)}</span>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ledger, full width, paginated */}
          <div className="dc-finance-card rounded-2xl border border-border bg-surface p-5 sm:p-8" style={{ animationDelay: "320ms" }}>
            <span className="font-heading text-[20px] font-medium tracking-[0.16em] text-muted-2 uppercase">
              Últimos lançamentos
            </span>
            <div className="mt-4 flex flex-col">
              {pageTransactions.map((t) => {
                const wd = new Date(`${t.occurred_on}T00:00:00`).getDay();
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 border-t border-border py-3 first:border-t-0 sm:gap-4 sm:py-4.5"
                  >
                    <span className="w-[64px] flex-shrink-0 text-sm text-muted sm:w-[84px] sm:text-base">
                      <span className="tabular-nums">
                        {t.occurred_on.slice(8, 10)}/
                        {t.occurred_on.slice(5, 7)}
                      </span>
                      <span className="ml-1 text-faint">
                        {WEEKDAY_PT[wd]}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base text-white sm:text-lg">
                        {t.description}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {t.customer_name ?? "Balcão"}
                        {barberId === "all" && t.barber_id && (
                          <span className="text-faint">
                            {" · "}
                            {barbers.find((b) => b.id === t.barber_id)
                              ?.name ?? t.barber_id}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="hidden flex-shrink-0 rounded-full border border-border px-3 py-1.5 text-sm tracking-widest text-muted uppercase sm:inline">
                      {t.payment_method}
                    </span>
                    <span className="w-24 flex-shrink-0 text-right font-heading text-base text-white tabular-nums sm:w-32 sm:text-lg">
                      {formatCents(t.amount_cents)}
                    </span>
                  </div>
                );
              })}
              {transactions.length === 0 && (
                <p className="mt-3 text-muted">
                  Nenhum lançamento no período.
                </p>
              )}
            </div>

            {transactions.length > 0 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[15px] text-muted sm:text-base">
                  {transactions.length} lançamento{transactions.length === 1 ? "" : "s"} · página {ledgerCurrentPage} de {ledgerPageCount}
                </span>
                <Pagination page={ledgerCurrentPage} pageCount={ledgerPageCount} onChange={setLedgerPage} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
