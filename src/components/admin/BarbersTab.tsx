import { useState } from "react";
import { useBarbers, useBarberHours, type Barber } from "@/hooks/useCatalog";
import { toggleBarberHour, deleteBarber } from "@/hooks/useAdmin";
import { WEEKDAY_LABELS } from "@/lib/format";
import { BarberFormModal } from "@/components/admin/BarberFormModal";
import { Skeleton } from "@/components/Skeleton";

const DEFAULT_WEEKDAY_SLOTS = ["09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30", "18:00", "19:00"];
const DEFAULT_SATURDAY_SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30"];

type Editing = { barber: Barber | null } | null;

export function BarbersTab() {
  const { data: barbers, loading: barbersLoading, reload: reloadBarbers } = useBarbers();
  const { data: hours, loading: hoursLoading, error, reload: reloadHours } = useBarberHours();
  const [editing, setEditing] = useState<Editing>(null);

  async function handleToggle(hourId: number) {
    const row = hours.find((h) => h.id === hourId);
    if (!row) return;
    const defaults = row.weekday === 6 ? DEFAULT_SATURDAY_SLOTS : DEFAULT_WEEKDAY_SLOTS;
    await toggleBarberHour(row, defaults);
    reloadHours();
  }

  async function handleDelete(b: Barber) {
    if (!confirm(`Remover ${b.name}? Os horários dele também serão apagados.`)) return;
    await deleteBarber(b.id);
    reloadBarbers();
    reloadHours();
  }

  function reloadAll() {
    reloadBarbers();
    reloadHours();
  }

  const busy = barbersLoading || hoursLoading;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="m-0 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase">Barbeiros</h2>
        <button
          onClick={() => setEditing({ barber: null })}
          className="bg-silver-gradient flex min-h-10 cursor-pointer items-center rounded-lg px-5 font-heading text-xs font-semibold tracking-[0.16em] text-ink uppercase transition-[filter] hover:brightness-110"
        >
          + Adicionar barbeiro
        </button>
      </div>

      {busy && (
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-7">
              <div className="flex items-center gap-3.5">
                <Skeleton className="h-12 w-12 rounded-full" />
                <span className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </span>
              </div>
              <div className="mt-5 flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {!busy &&
          barbers.map((b) => {
          const barberHours = hours.filter((h) => h.barber_id === b.id).sort((a, c) => a.weekday - c.weekday);
          return (
            <div key={b.id} className="rounded-lg border border-border bg-surface p-7">
              <div className="flex items-center gap-3.5">
                <span className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-border bg-surface-alt">
                  {b.photo_path ? (
                    <img src={b.photo_path} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-2xl text-silver">
                      {b.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-xl tracking-[0.08em] text-white uppercase">{b.name}</span>
                  <span className="block text-[13px] text-muted">{b.role_title}</span>
                </span>
                <span className="flex gap-2">
                  <button
                    onClick={() => setEditing({ barber: b })}
                    className="min-h-9 cursor-pointer rounded-lg border border-border px-3 font-heading text-[11px] tracking-[0.14em] text-white uppercase transition-colors hover:border-silver"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(b)}
                    className="min-h-9 cursor-pointer rounded-lg border border-border px-3 font-heading text-[11px] tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
                  >
                    Remover
                  </button>
                </span>
              </div>
              {(b.email || b.phone) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                  {b.email && <span>{b.email}</span>}
                  {b.phone && <span>{b.phone}</span>}
                </div>
              )}
              <div className="mt-5 flex flex-col">
                {barberHours.map((h) => (
                  <div key={h.id} className="flex items-center justify-between gap-3 border-t border-border py-3">
                    <span className="text-[15px] text-white">{WEEKDAY_LABELS[h.weekday]}</span>
                    <button
                      onClick={() => handleToggle(h.id)}
                      className="min-h-9.5 cursor-pointer rounded-full border px-3.5 font-heading text-xs tracking-[0.12em]"
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
      </div>
      {error && <p className="mt-4 text-muted">{error}</p>}

      {editing && (
        <BarberFormModal
          barber={editing.barber}
          hours={editing.barber ? hours.filter((h) => h.barber_id === editing.barber!.id) : []}
          onClose={() => setEditing(null)}
          onSaved={reloadAll}
        />
      )}
    </div>
  );
}
