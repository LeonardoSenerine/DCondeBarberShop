import { useFinance } from "@/hooks/useAdmin";
import { formatCents, formatDateBR } from "@/lib/format";

export function FinanceTab() {
  const { transactions, loading, monthRevenue, todayRevenue, productRevenue, avgTicket, serviceCount } = useFinance();

  const byDay = new Map<string, number>();
  transactions.forEach((t) => byDay.set(t.occurred_on, (byDay.get(t.occurred_on) ?? 0) + t.amount_cents));
  const days = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  const maxDay = Math.max(1, ...days.map(([, v]) => v));

  const kpis = [
    { label: "Faturamento do mês", value: formatCents(monthRevenue), note: `${transactions.length} lançamentos` },
    { label: "Ticket médio", value: formatCents(avgTicket), note: `${serviceCount} atendimentos` },
    { label: "Hoje", value: formatCents(todayRevenue), note: "Receita do dia" },
    { label: "Produtos vendidos", value: formatCents(productRevenue), note: "No mês" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-surface p-6">
            <span className="font-heading text-[11px] tracking-[0.2em] text-muted-2 uppercase">{k.label}</span>
            <div className="mt-2.5 font-heading text-3xl leading-tight font-semibold text-white">{k.value}</div>
            <div className="mt-1.5 text-[13px] text-muted">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-7">
        <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">Faturamento por dia · este mês</span>
        {loading ? (
          <p className="mt-4 text-muted">Carregando…</p>
        ) : days.length === 0 ? (
          <p className="mt-4 text-muted">Sem lançamentos neste mês ainda.</p>
        ) : (
          <div className="mt-6 flex h-[180px] items-end gap-2">
            {days.map(([day, value]) => (
              <div key={day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <div
                  className="bg-silver-gradient w-full rounded-t"
                  style={{ height: `${Math.round((value / maxDay) * 100)}%` }}
                />
                <span className="text-[10px] text-muted-2">{day.slice(8, 10)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-7">
        <span className="font-heading text-xs tracking-[0.22em] text-muted-2 uppercase">Últimos lançamentos</span>
        {transactions.slice(0, 8).map((t) => (
          <div key={t.id} className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-border pt-3.5">
            <span className="w-16 text-sm text-muted">{formatDateBR(t.occurred_on)}</span>
            <span className="min-w-0 flex-1 basis-[180px] text-[15px] text-white">{t.description}</span>
            <span className="w-22 text-[13px] text-muted">{t.payment_method}</span>
            <span className="ml-auto font-heading text-base text-white">{formatCents(t.amount_cents)}</span>
          </div>
        ))}
        {transactions.length === 0 && <p className="mt-4 text-muted">Nenhum lançamento neste mês.</p>}
      </div>
    </div>
  );
}
