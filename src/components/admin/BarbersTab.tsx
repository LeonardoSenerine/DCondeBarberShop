import { useBarbers, useBarberHours } from "@/hooks/useCatalog";
import { toggleBarberHour } from "@/hooks/useAdmin";
import { WEEKDAY_LABELS } from "@/lib/format";

const DEFAULT_WEEKDAY_SLOTS = ["09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30", "18:00", "19:00"];
const DEFAULT_SATURDAY_SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30"];

export function BarbersTab() {
  const { data: barbers, loading: barbersLoading } = useBarbers();
  const { data: hours, loading: hoursLoading, error, reload } = useBarberHours();

  async function handleToggle(hourId: number) {
    const row = hours.find((h) => h.id === hourId);
    if (!row) return;
    const defaults = row.weekday === 6 ? DEFAULT_SATURDAY_SLOTS : DEFAULT_WEEKDAY_SLOTS;
    await toggleBarberHour(row, defaults);
    reload();
  }

  if (barbersLoading || hoursLoading) return <p className="text-muted">Carregando…</p>;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {barbers.map((b) => {
        const barberHours = hours
          .filter((h) => h.barber_id === b.id)
          .sort((a, c) => a.weekday - c.weekday);
        return (
          <div key={b.id} className="rounded-lg border border-border bg-surface p-7">
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-alt font-display text-2xl text-silver">
                {b.name.charAt(0)}
              </span>
              <span>
                <span className="block font-heading text-xl tracking-[0.08em] text-white uppercase">{b.name}</span>
                <span className="block text-[13px] text-muted">{b.role_title}</span>
              </span>
            </div>
            <div className="mt-5 flex flex-col">
              {barberHours.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 border-t border-border py-3">
                  <span className="text-[15px] text-white">{WEEKDAY_LABELS[h.weekday]}</span>
                  <button
                    onClick={() => handleToggle(h.id)}
                    className="min-h-9.5 rounded-full border px-3.5 font-heading text-xs tracking-[0.12em]"
                    style={{
                      background: h.is_open ? "rgba(255,255,255,0.07)" : "transparent",
                      borderColor: h.is_open ? "#E0E0E0" : "#2A2A2A",
                      color: h.is_open ? "#FFFFFF" : "#9E9E9E",
                    }}
                  >
                    {h.label || "Fechado"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {error && <p className="text-muted">{error}</p>}
    </div>
  );
}
