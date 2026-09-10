import { useMemo, useState } from "react";
import { useFinance, type FinancePeriod } from "@/hooks/useAdmin";
import { useBarbers } from "@/hooks/useCatalog";
import { formatCents, MONTH_LABELS, dateKey } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";

const PERIODS: { id: FinancePeriod; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "month", label: "Este mês" },
  { id: "30d", label: "30 dias" },
  { id: "prev_month", label: "Mês passado" },
  { id: "custom", label: "Personalizado" },
];

const WEEKDAY_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function shortMoney(cents: number) {
  const v = cents / 100;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return String(Math.round(v));
}

export function FinanceTab() {
  const [period, setPeriod] = useState<FinancePeriod>("month");
  const today = useMemo(() => dateKey(new Date()), []);
  const monthStart = useMemo(() => {
    const d = new Date();
    return dateKey(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);
  const [customFrom, setCustomFrom] = useState(monthStart);
  const [customTo, setCustomTo] = useState(today);
  const [hover, setHover] = useState<number | null>(null);
  const [barberId, setBarberId] = useState("all");
  const { data: barbers } = useBarbers();

  const custom = period === "custom" ? { from: customFrom, to: customTo } : undefined;
  const {
    loading,
    isSample,
    range,
    revenue,
    productRevenue,
    avgTicket,
    serviceCount,
    chart,
    chartUnit,
    byMethod,
    transactions,
  } = useFinance(period, custom, barberId);

  const barberName =
    barberId === "all" ? "Toda a barbearia" : (barbers.find((b) => b.id === barberId)?.name ?? "Barbeiro");

  const now = new Date();
  const monthLabel = `${MONTH_LABELS[now.getMonth()]} de ${now.getFullYear()}`;
  const n = chart.length;
  const maxBar = Math.max(1, ...chart.map((b) => b.value));
  const peak = chart.reduce<{ key: string; label: string; value: number } | null>(
    (best, b) => (b.value > 0 && (!best || b.value > best.value) ? b : best),
    null,
  );

  const H = 220;
  const padT = 16;
  const xPct = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const yPct = (v: number) => ((padT + (1 - v / maxBar) * (H - padT)) / H) * 100;
  const linePath = chart.map((b, i) => `${i === 0 ? "M" : "L"} ${xPct(i)} ${yPct(b.value)}`).join(" ");
  const areaPath = n > 0 ? `${linePath} L ${xPct(n - 1)} 100 L ${xPct(0)} 100 Z` : "";
  const gridLines = [25, 50, 75];

  const stats = [
    { label: "Ticket médio", value: formatCents(avgTicket), note: `${serviceCount} atendimentos` },
    { label: "Serviços", value: formatCents(revenue - productRevenue), note: `${serviceCount} no período` },
    { label: "Produtos", value: formatCents(productRevenue), note: "Vendas no balcão" },
    { label: "Lançamentos", value: String(transactions.length), note: range.label },
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
        <p className="text-[15px] text-muted">
          {monthLabel} · {range.label} · <span className="text-white">{barberName}</span>
          {isSample && <span className="ml-2 text-faint">· dados de exemplo</span>}
        </p>
        <div className="relative">
          <select
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
            className="min-h-11 cursor-pointer appearance-none rounded-full border border-border bg-surface-alt py-0 pr-9 pl-4 font-heading text-[13px] tracking-[0.1em] text-white uppercase outline-none focus:border-silver"
          >
            <option value="all">Toda a barbearia</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[10px] text-muted">▼</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => {
            const on = period === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setPeriod(p.id);
                  setHover(null);
                }}
                className="min-h-11 cursor-pointer rounded-full border px-4 font-heading text-[13px] tracking-[0.12em] uppercase transition-colors"
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
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] tracking-widest text-muted-2 uppercase">De</span>
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="min-h-11 rounded-lg border border-border bg-surface-alt px-3 text-[15px] text-white outline-none focus:border-silver"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] tracking-widest text-muted-2 uppercase">Até</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={today}
              onChange={(e) => setCustomTo(e.target.value)}
              className="min-h-11 rounded-lg border border-border bg-surface-alt px-3 text-[15px] text-white outline-none focus:border-silver"
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
                <div key={i} className="rounded-2xl border border-border bg-surface p-6">
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
              <div key={i} className="rounded-2xl border border-border bg-surface p-8">
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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-8">
          <span className="font-heading text-[13px] tracking-[0.2em] text-muted-2 uppercase">Receita no período</span>
          <div className="mt-4 font-heading text-[46px] leading-none font-semibold text-white tabular-nums">
            {formatCents(revenue)}
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            {transactions.length} lançamentos · {serviceCount} atendimentos
            {peak && (
              <>
                <br />
                Pico {chartUnit === "hora" ? peak.label : `dia ${peak.label}`}:{" "}
                <span className="text-white tabular-nums">{formatCents(peak.value)}</span>
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-surface p-6">
              <span className="font-heading text-[12px] tracking-[0.18em] text-muted-2 uppercase">{s.label}</span>
              <div className="mt-2.5 font-heading text-[26px] leading-tight font-semibold text-white tabular-nums">
                {s.value}
              </div>
              <div className="mt-1.5 text-[13px] text-muted">{s.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* area chart */}
      <div className="rounded-2xl border border-border bg-surface p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-heading text-[13px] tracking-[0.2em] text-muted-2 uppercase">
            Faturamento por {chartUnit}
          </span>
          <span className="text-[15px] text-muted">
            Total <span className="text-white tabular-nums">{formatCents(revenue)}</span>
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
              className="flex w-14 flex-shrink-0 flex-col justify-between py-1 text-right text-[12px] text-faint tabular-nums"
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
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                <defs>
                  <linearGradient id="finFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-silver)" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="var(--color-silver)" stopOpacity="0" />
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
                <path d={areaPath} fill="url(#finFill)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--color-silver)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
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

              {hover != null && chart[hover] && (
                <>
                  <span
                    className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white"
                    style={{ left: `${xPct(hover)}%`, top: `${yPct(chart[hover].value)}%` }}
                  />
                  <div
                    className="pointer-events-none absolute z-10 flex -translate-y-full flex-col rounded-lg border border-border-strong bg-surface-alt px-3 py-2 whitespace-nowrap shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
                    style={{
                      left: `${Math.min(88, Math.max(12, xPct(hover)))}%`,
                      top: `${yPct(chart[hover].value)}%`,
                      transform: `translate(-${Math.min(88, Math.max(12, xPct(hover)))}%, calc(-100% - 12px))`,
                    }}
                  >
                    <span className="font-heading text-[12px] tracking-[0.14em] text-muted-2 uppercase">
                      {chartUnit === "hora" ? chart[hover].label : `Dia ${chart[hover].label}`}
                    </span>
                    <span className="font-heading text-[19px] text-white tabular-nums">
                      {formatCents(chart[hover].value)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex gap-2">
            <span className="w-14 flex-shrink-0" aria-hidden />
            <div className="flex flex-1 text-center text-[12px] text-muted-2 tabular-nums">
              {chart.map((b, i) => (
                <span key={b.key} className="flex-1 truncate">
                  {n > 16 && i % 3 !== 0 ? "" : b.label}
                </span>
              ))}
            </div>
          </div>
          </>
        )}
      </div>

      {/* payment + ledger */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.6fr)]">
        <div className="rounded-2xl border border-border bg-surface p-8">
          <span className="font-heading text-[13px] tracking-[0.2em] text-muted-2 uppercase">Formas de pagamento</span>
          <div className="mt-6 flex flex-col gap-5">
            {byMethod.map((m) => (
              <div key={m.method}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="text-[16px] text-white">{m.method}</span>
                  <span className="text-[14px] text-muted">
                    <span className="tabular-nums">{Math.round(m.pct * 100)}%</span> ·{" "}
                    <span className="text-white tabular-nums">{formatCents(m.value)}</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round(m.pct * 100)}%`, background: "var(--color-silver)", opacity: 0.7 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8">
          <span className="font-heading text-[13px] tracking-[0.2em] text-muted-2 uppercase">Últimos lançamentos</span>
          <div className="mt-4 flex max-h-[420px] flex-col overflow-y-auto pr-1">
            {transactions.map((t) => {
              const wd = new Date(`${t.occurred_on}T00:00:00`).getDay();
              return (
                <div key={t.id} className="flex items-center gap-3.5 border-t border-border py-3.5 first:border-t-0">
                  <span className="w-[76px] flex-shrink-0 text-[14px] text-muted">
                    <span className="tabular-nums">
                      {t.occurred_on.slice(8, 10)}/{t.occurred_on.slice(5, 7)}
                    </span>
                    <span className="ml-1 text-faint">{WEEKDAY_PT[wd]}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-white">{t.description}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {t.customer_name ?? "Balcão"}
                      {barberId === "all" && t.barber_id && (
                        <span className="text-faint">
                          {" · "}
                          {barbers.find((b) => b.id === t.barber_id)?.name ?? t.barber_id}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="hidden flex-shrink-0 rounded-full border border-border px-2.5 py-1 text-[12px] tracking-widest text-muted uppercase sm:inline">
                    {t.payment_method}
                  </span>
                  <span className="w-28 flex-shrink-0 text-right font-heading text-[16px] text-white tabular-nums">
                    {formatCents(t.amount_cents)}
                  </span>
                </div>
              );
            })}
            {transactions.length === 0 && <p className="mt-3 text-muted">Nenhum lançamento no período.</p>}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
