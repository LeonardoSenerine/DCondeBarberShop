import { useClientHistory, type ClientSummary } from "@/hooks/useAdmin";
import { formatCents, formatDateBR } from "@/lib/format";
import "@/styles/scrollbar.css";

interface ClientDetailModalProps {
  client: ClientSummary;
  onClose: () => void;
}

const APPT_COLS = "88px minmax(0,1fr) 104px 100px 84px";
const PRODUCT_COLS = "88px minmax(0,1fr) 56px 84px";

export function ClientDetailModal({ client, onClose }: ClientDetailModalProps) {
  const { appointments, purchases, loading } = useClientHistory(client);

  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[88vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-border bg-surface p-9 shadow-[0_40px_90px_rgba(0,0,0,0.8)]"
        >
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
          >
            ×
          </button>

          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-alt font-heading text-xl text-silver">
              {client.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h3 className="m-0 font-heading text-xl font-semibold tracking-[0.06em] text-white uppercase">
                {client.name}
              </h3>
              <span className="block text-[13px] text-muted">{client.phone}</span>
            </div>
          </div>

          <div className="mb-7 grid grid-cols-3 gap-3.5">
            <Stat label="Visitas" value={String(client.visits)} />
            <Stat label="Última visita" value={formatDateBR(client.lastVisit)} />
            <Stat label="Total gasto" value={formatCents(client.totalCents)} />
          </div>

          <Section title="Agendamentos">
            {loading ? (
              <p className="m-0 py-3 text-[13px] text-muted">Carregando…</p>
            ) : appointments.length === 0 ? (
              <p className="m-0 py-3 text-[13px] text-muted">Nenhum agendamento.</p>
            ) : (
              <>
                <div className="scroll-thin max-h-[280px] overflow-y-auto">
                  <ColumnHeaders cols={APPT_COLS}>
                    <span>Data</span>
                    <span>Serviço</span>
                    <span>Barbeiro</span>
                    <span>Status</span>
                    <span className="text-right">Valor</span>
                  </ColumnHeaders>
                  {appointments.map((a) => (
                    <div
                      key={a.id}
                      className="grid items-center gap-3 border-t border-border py-3.5"
                      style={{ gridTemplateColumns: APPT_COLS }}
                    >
                      <span className="text-[13px] text-muted">{formatDateBR(a.date)}</span>
                      <span className="text-[15px] text-white">{a.service}</span>
                      <span className="text-[13px] text-muted">{a.barber}</span>
                      <span
                        className="w-fit rounded-full border border-border px-2.5 py-1 text-center text-[11px] tracking-[0.08em] uppercase"
                        style={{ color: a.status === "Confirmado" ? "#FFFFFF" : "#9E9E9E" }}
                      >
                        {a.status}
                      </span>
                      <span className="text-right font-heading text-[15px] text-white">{formatCents(a.priceCents)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>

          <Section title="Produtos comprados">
            {loading ? (
              <p className="m-0 py-3 text-[13px] text-muted">Carregando…</p>
            ) : purchases.length === 0 ? (
              <p className="m-0 py-3 text-[13px] text-muted">Nenhuma compra de produto.</p>
            ) : (
              <>
                <div className="scroll-thin max-h-[280px] overflow-y-auto">
                  <ColumnHeaders cols={PRODUCT_COLS}>
                    <span>Data</span>
                    <span>Produto</span>
                    <span>Qtd.</span>
                    <span className="text-right">Valor</span>
                  </ColumnHeaders>
                  {purchases.map((p) => (
                    <div
                      key={p.id}
                      className="grid items-center gap-3 border-t border-border py-3.5"
                      style={{ gridTemplateColumns: PRODUCT_COLS }}
                    >
                      <span className="text-[13px] text-muted">{formatDateBR(p.date)}</span>
                      <span className="text-[15px] text-white">{p.product}</span>
                      <span className="text-[13px] text-muted">x{p.qty}</span>
                      <span className="text-right font-heading text-[15px] text-white">{formatCents(p.priceCents)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-alt px-4 py-3">
      <span className="block text-[11px] tracking-[0.1em] text-muted uppercase">{label}</span>
      <span className="block font-heading text-[17px] text-white">{value}</span>
    </div>
  );
}

function ColumnHeaders({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <div
      className="sticky top-0 z-10 grid items-center gap-3 bg-surface-alt py-3 font-heading text-[11px] tracking-[0.1em] text-muted-2 uppercase"
      style={{ gridTemplateColumns: cols }}
    >
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <span className="mb-2 block font-heading text-xs tracking-[0.2em] text-muted-2 uppercase">{title}</span>
      <div className="rounded-lg border border-border bg-surface-alt px-5">{children}</div>
    </div>
  );
}
