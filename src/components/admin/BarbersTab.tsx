import { useState } from "react";
import { useBarbers, useBarberHours, useBarberTimeOff, type Barber } from "@/hooks/useCatalog";
import {
  toggleBarberHour,
  deleteBarber,
  useStaffProfiles,
  unlinkBarberAccount,
  addBarberTimeOff,
  removeBarberTimeOff,
  type StaffProfile,
} from "@/hooks/useAdmin";
import { useAuth } from "@/context/AuthContext";
import { WEEKDAY_LABELS, formatDateBR, dateKey } from "@/lib/format";
import { BarberFormModal } from "@/components/admin/BarberFormModal";
import { StaffLinkModal } from "@/components/admin/StaffLinkModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { Toast } from "@/components/admin/Toast";
import { Skeleton } from "@/components/Skeleton";
import type { BarberTimeOff } from "@/hooks/useCatalog";

const DEFAULT_WEEKDAY_SLOTS = ["09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30", "18:00", "19:00"];
const DEFAULT_SATURDAY_SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30"];

type Editing = { barber: Barber | null } | null;

/** Folds consecutive days (e.g. a week of vacation, added as one range) into a single row to display. */
function groupTimeOff(rows: BarberTimeOff[]): { ids: string[]; from: string; to: string }[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const groups: { ids: string[]; from: string; to: string }[] = [];
  for (const row of sorted) {
    const last = groups[groups.length - 1];
    const nextExpected = last ? dateKey(new Date(new Date(`${last.to}T00:00:00`).getTime() + 86400000)) : null;
    if (last && row.date === nextExpected) {
      last.to = row.date;
      last.ids.push(row.id);
    } else {
      groups.push({ ids: [row.id], from: row.date, to: row.date });
    }
  }
  return groups;
}

export function BarbersTab() {
  const { isOwner } = useAuth();
  const { data: barbers, loading: barbersLoading, reload: reloadBarbers } = useBarbers();
  const { data: hours, loading: hoursLoading, error, reload: reloadHours } = useBarberHours();
  const { data: timeOff, reload: reloadTimeOff } = useBarberTimeOff();
  const { profiles: staffProfiles, reload: reloadStaff } = useStaffProfiles();
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<Barber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [linking, setLinking] = useState<{ barber: Barber; currentAccount: StaffProfile | null } | null>(null);
  const [unlinking, setUnlinking] = useState<StaffProfile | null>(null);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [addingTimeOffFor, setAddingTimeOffFor] = useState<string | null>(null);
  const [timeOffFrom, setTimeOffFrom] = useState("");
  const [timeOffTo, setTimeOffTo] = useState("");
  const [savingTimeOff, setSavingTimeOff] = useState(false);

  function linkedAccountFor(barberId: string) {
    return staffProfiles.find((p) => p.barber_id === barberId) ?? null;
  }

  async function handleConfirmUnlink() {
    if (!unlinking) return;
    setUnlinkBusy(true);
    const { error } = await unlinkBarberAccount(unlinking.id);
    setUnlinkBusy(false);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    setUnlinking(null);
    setToast({ message: "Acesso removido.", variant: "success" });
    reloadStaff();
  }

  async function handleToggle(hourId: number) {
    const row = hours.find((h) => h.id === hourId);
    if (!row) return;
    const defaults = row.weekday === 6 ? DEFAULT_SATURDAY_SLOTS : DEFAULT_WEEKDAY_SLOTS;
    await toggleBarberHour(row, defaults);
    reloadHours();
  }

  async function handleAddTimeOff(barberId: string) {
    if (!timeOffFrom) return;
    setSavingTimeOff(true);
    const { error } = await addBarberTimeOff(barberId, timeOffFrom, timeOffTo || timeOffFrom);
    setSavingTimeOff(false);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    setAddingTimeOffFor(null);
    setTimeOffFrom("");
    setTimeOffTo("");
    setToast({ message: "Fechamento marcado.", variant: "success" });
    reloadTimeOff();
  }

  async function handleRemoveTimeOff(ids: string[]) {
    const { error } = await removeBarberTimeOff(ids);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    reloadTimeOff();
  }

  async function handleConfirmDelete() {
    if (!removing) return;
    setDeleting(true);
    const { error } = await deleteBarber(removing.id);
    setDeleting(false);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    setToast({ message: "Barbeiro removido.", variant: "success" });
    setRemoving(null);
    reloadBarbers();
    reloadHours();
  }

  function reloadAll() {
    reloadBarbers();
    reloadHours();
    reloadStaff();
  }

  const busy = barbersLoading || hoursLoading;

  return (
    <>
      <div className="dc-admin-enter">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="m-0 font-heading text-3xl font-semibold tracking-[0.06em] text-white uppercase">Barbeiros</h2>
          {isOwner && (
            <button
              onClick={() => setEditing({ barber: null })}
              className="bg-silver-gradient flex min-h-12 cursor-pointer items-center rounded-lg px-6 font-heading text-sm font-semibold tracking-[0.16em] text-ink uppercase transition-[filter] hover:brightness-110"
            >
              + Adicionar barbeiro
            </button>
          )}
        </div>

        {busy && barbers.length === 0 && (
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
          {barbers.length > 0 &&
            barbers.map((b, index) => {
              const barberHours = hours.filter((h) => h.barber_id === b.id).sort((a, c) => a.weekday - c.weekday);
              return (
                <div key={b.id} className="dc-admin-enter-item rounded-lg border border-border bg-surface p-5 sm:p-8" style={{ animationDelay: `${index * 65}ms` }}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-border bg-surface-alt sm:h-16 sm:w-16">
                      {b.photo_path ? (
                        <img src={b.photo_path} alt={b.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-display text-xl text-silver sm:text-3xl">
                          {b.name.charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-heading text-lg tracking-[0.06em] text-white uppercase sm:text-2xl sm:tracking-[0.08em]">
                        {b.name}
                      </span>
                      <span className="block text-sm text-muted sm:text-base">{b.role_title}</span>
                    </span>
                  </div>
                  {(b.email || b.phone) && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted sm:mt-3.5 sm:text-base">
                      {b.email && <span>{b.email}</span>}
                      {b.phone && <span>{b.phone}</span>}
                    </div>
                  )}
                  <div className="mt-4 flex gap-2 sm:mt-5">
                    <button
                      onClick={() => setEditing({ barber: b })}
                      className="min-h-10 flex-1 cursor-pointer rounded-lg border border-border px-4 font-heading text-xs tracking-[0.12em] text-white uppercase transition-colors hover:border-silver sm:min-h-11 sm:flex-none sm:text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setRemoving(b)}
                      className="min-h-10 flex-1 cursor-pointer rounded-lg border border-border px-4 font-heading text-xs tracking-[0.12em] text-muted uppercase transition-colors hover:border-silver hover:text-white sm:min-h-11 sm:flex-none sm:text-sm"
                    >
                      Remover
                    </button>
                  </div>

                  {isOwner && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border bg-surface-alt px-4 py-3 sm:mt-5">
                      {linkedAccountFor(b.id) ? (
                        <>
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-white">
                              {linkedAccountFor(b.id)!.full_name || linkedAccountFor(b.id)!.email}
                            </span>
                            <span className="block text-[13px] text-muted">Acesso ao painel vinculado</span>
                          </span>
                          <span className="flex flex-shrink-0 gap-2">
                            <button
                              onClick={() => setLinking({ barber: b, currentAccount: linkedAccountFor(b.id) })}
                              className="min-h-9 cursor-pointer rounded-lg border border-border px-3.5 font-heading text-xs tracking-[0.1em] text-white uppercase transition-colors hover:border-silver"
                            >
                              Trocar conta
                            </button>
                            <button
                              onClick={() => setUnlinking(linkedAccountFor(b.id))}
                              className="min-h-9 cursor-pointer rounded-lg border border-border px-3.5 font-heading text-xs tracking-[0.1em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
                            >
                              Remover acesso
                            </button>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[15px] text-muted">Nenhuma conta vinculada</span>
                          <button
                            onClick={() => setLinking({ barber: b, currentAccount: null })}
                            className="min-h-9 cursor-pointer rounded-lg border border-border px-3.5 font-heading text-xs tracking-[0.1em] text-white uppercase transition-colors hover:border-silver"
                          >
                            Vincular conta
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-col sm:mt-6">
                    {barberHours.map((h) => (
                      <div key={h.id} className="flex items-center justify-between gap-2 border-t border-border py-3 sm:gap-3 sm:py-4">
                        <span className="text-sm text-white sm:text-lg">{WEEKDAY_LABELS[h.weekday]}</span>
                        <button
                          onClick={() => handleToggle(h.id)}
                          className="min-h-9 cursor-pointer rounded-full border px-3 font-heading text-xs tracking-[0.1em] whitespace-nowrap sm:min-h-11 sm:px-4 sm:text-sm sm:tracking-[0.12em]"
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

                  <div className="mt-5 border-t border-border pt-4 sm:mt-6 sm:pt-5">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <span className="font-heading text-xs tracking-[0.14em] text-muted-2 uppercase">Dias fechados</span>
                      <button
                        onClick={() => {
                          setAddingTimeOffFor(addingTimeOffFor === b.id ? null : b.id);
                          setTimeOffFrom("");
                          setTimeOffTo("");
                        }}
                        className="min-h-8 cursor-pointer rounded-lg border border-border px-3 font-heading text-[11px] tracking-[0.1em] text-white uppercase transition-colors hover:border-silver"
                      >
                        {addingTimeOffFor === b.id ? "Cancelar" : "+ Adicionar"}
                      </button>
                    </div>

                    {addingTimeOffFor === b.id && (
                      <div className="mb-3 flex flex-col gap-2 rounded-lg border border-border bg-surface-alt p-3 sm:flex-row sm:items-center">
                        <DateRangePicker
                          from={timeOffFrom}
                          to={timeOffTo}
                          onChange={(r) => {
                            setTimeOffFrom(r.from);
                            setTimeOffTo(r.to);
                          }}
                          variant="ink"
                          placeholder="Um dia ou um período"
                          className="w-full flex-1"
                        />
                        <button
                          onClick={() => handleAddTimeOff(b.id)}
                          disabled={!timeOffFrom || savingTimeOff}
                          className="bg-silver-gradient min-h-12 cursor-pointer rounded-lg px-4 font-heading text-[11px] font-semibold tracking-[0.14em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingTimeOff ? "Salvando…" : "Salvar"}
                        </button>
                      </div>
                    )}

                    {(() => {
                      const groups = groupTimeOff(timeOff.filter((t) => t.barber_id === b.id));
                      return groups.length === 0 ? (
                        <p className="m-0 text-[13px] text-muted">Nenhum fechamento marcado.</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {groups.map((g) => (
                            <div key={g.ids[0]} className="flex items-center justify-between gap-2 text-[13px]">
                              <span className="text-white">
                                {g.from === g.to ? formatDateBR(g.from) : `${formatDateBR(g.from)} – ${formatDateBR(g.to)}`}
                              </span>
                              <button
                                onClick={() => handleRemoveTimeOff(g.ids)}
                                className="cursor-pointer text-muted transition-colors hover:text-white"
                              >
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
        </div>
        {error && <p className="mt-4 text-muted">{error}</p>}
      </div>

      {editing && (
        <BarberFormModal
          barber={editing.barber}
          hours={editing.barber ? hours.filter((h) => h.barber_id === editing.barber!.id) : []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setToast({ message: editing.barber ? "Barbeiro atualizado." : "Barbeiro adicionado.", variant: "success" });
            reloadAll();
          }}
        />
      )}

      {removing && (
        <ConfirmModal
          title="Remover barbeiro?"
          message={`Tem certeza que deseja remover ${removing.name}? Os horários, fotos da galeria, avaliações e o histórico de agendamentos (concluídos, cancelados etc.) dele também serão apagados — essa ação não pode ser desfeita. Só é bloqueada se ele ainda tiver agendamentos pendentes ou confirmados.`}
          confirmDelaySeconds={5}
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setRemoving(null)}
        />
      )}

      {linking && (
        <StaffLinkModal
          barber={linking.barber}
          currentAccount={linking.currentAccount}
          onClose={() => setLinking(null)}
          onLinked={() => {
            setToast({ message: linking.currentAccount ? "Conta trocada." : "Conta vinculada.", variant: "success" });
            setLinking(null);
            reloadStaff();
          }}
        />
      )}

      {unlinking && (
        <ConfirmModal
          title="Remover acesso ao painel?"
          message={`Tem certeza que deseja remover o acesso de ${unlinking.full_name || unlinking.email}? A conta volta a ser um cliente comum.`}
          confirmLabel="Remover acesso"
          cancelLabel="Voltar"
          busy={unlinkBusy}
          onConfirm={handleConfirmUnlink}
          onClose={() => setUnlinking(null)}
        />
      )}

      {toast && <Toast message={toast.message} onDismiss={() => setToast(null)} variant={toast.variant} />}
    </>
  );
}
