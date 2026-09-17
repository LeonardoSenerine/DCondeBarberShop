import { useMemo, useState } from "react";
import {
  saveBarber,
  uploadBarberPhoto,
  searchProfileByEmail,
  linkBarberAccount,
  type WeekdayHours,
  type StaffProfile,
} from "@/hooks/useAdmin";
import type { Barber, BarberHours } from "@/hooks/useCatalog";
import { WEEKDAY_LABELS, formatTimeShort } from "@/lib/format";
import { useFormErrors, fieldClass } from "@/hooks/useFormErrors";
import { useModalTransition } from "@/hooks/useModalTransition";
import "@/styles/shake.css";

interface BarberFormModalProps {
  barber: Barber | null;
  hours: BarberHours[];
  onClose: () => void;
  onSaved: () => void;
}

// Hourly by default — a service over 60min needs every hour it spans to
// exist on the grid (see availableStartTimes in useBooking.ts), so any
// half-hour offset or gap here silently blocks long services from ever
// fitting anywhere on that day.
const DEFAULT_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BarberFormModal({ barber, hours, onClose, onSaved }: BarberFormModalProps) {
  const { isClosing, requestClose } = useModalTransition(onClose);
  const isNew = !barber;
  const [name, setName] = useState(barber?.name ?? "");
  const [id, setId] = useState(barber?.id ?? "");
  const [idTouched, setIdTouched] = useState(!isNew);
  const [roleTitle, setRoleTitle] = useState(barber?.role_title ?? "Barbeiro");
  const [instagram, setInstagram] = useState(barber?.instagram ?? "");
  const [email, setEmail] = useState(barber?.email ?? "");
  const [phone, setPhone] = useState(barber?.phone ?? "");
  // New barbers skip manual name/e-mail/telefone entirely — that contact
  // info always comes from the linked login account instead, found here by
  // e-mail. Editing an existing barber keeps the plain fields above, since
  // an older barber row might not have a linked account at all.
  const [linkEmail, setLinkEmail] = useState("");
  const [searchingLink, setSearchingLink] = useState(false);
  const [linkedProfile, setLinkedProfile] = useState<StaffProfile | null | undefined>(undefined);
  const [photoPath, setPhotoPath] = useState(barber?.photo_path ?? "");
  const [gallery, setGallery] = useState<string[]>(barber?.gallery_paths ?? []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [saving, setSaving] = useState(false);
  const { message: error, fail, clear, clearField, fieldProps } = useFormErrors();

  const initialWeek = useMemo<WeekdayHours[]>(() => {
    return Array.from({ length: 7 }).map((_, weekday) => {
      const row = hours.find((h) => h.weekday === weekday);
      if (row) {
        return {
          weekday,
          is_open: row.is_open,
          label: row.label,
          slots: row.slots.map(formatTimeShort),
        };
      }
      const open = weekday >= 1 && weekday <= 6;
      return {
        weekday,
        is_open: open,
        label: open ? "09:00 às 20:00" : "Fechado",
        slots: open ? DEFAULT_SLOTS : [],
      };
    });
  }, [hours]);

  const [week, setWeek] = useState<WeekdayHours[]>(initialWeek);

  function patchDay(weekday: number, patch: Partial<WeekdayHours>) {
    setWeek((w) => w.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  const displayName = isNew ? (linkedProfile?.full_name ?? "") : name;
  const effectiveId = isNew ? (idTouched ? id : slug(displayName)) : id;

  async function handlePhoto(file: File) {
    setUploadingPhoto(true);
    clear();
    const { url, error: err } = await uploadBarberPhoto(file);
    setUploadingPhoto(false);
    if (err) return fail(err);
    if (url) {
      setPhotoPath(url);
      clearField("photo");
    }
  }

  async function handleGalleryAdd(files: FileList) {
    setUploadingGallery(true);
    clear();
    for (const file of Array.from(files)) {
      const { url, error: err } = await uploadBarberPhoto(file);
      if (err) {
        fail(err);
        break;
      }
      if (url) setGallery((g) => [...g, url]);
    }
    setUploadingGallery(false);
  }

  async function handleSearchLink() {
    if (!linkEmail.trim()) return fail("Digite o e-mail da pessoa.", ["link"]);
    clear();
    setSearchingLink(true);
    setLinkedProfile(undefined);
    const { data, error: err } = await searchProfileByEmail(linkEmail.trim());
    setSearchingLink(false);
    if (err) return fail(err);
    setLinkedProfile(data);
    if (data) clearField("link");
  }

  async function handleSave() {
    if (isNew && !linkedProfile) return fail("Busque e encontre a conta da pessoa antes de salvar.", ["link"]);
    if (isNew && linkedProfile && !linkedProfile.full_name.trim()) {
      return fail("Essa conta ainda não tem nome cadastrado. Peça para a pessoa completar o cadastro antes de vincular.", ["link"]);
    }
    if (!isNew && !name.trim()) return fail("Digite o nome.", ["name"]);
    if (!effectiveId) return fail("Defina o identificador.", ["id"]);
    if (!photoPath) return fail("Envie uma foto.", ["photo"]);

    setSaving(true);
    clear();
    const { error: err } = await saveBarber(
      {
        id: effectiveId,
        name: isNew ? linkedProfile!.full_name.trim() : name.trim(),
        role_title: roleTitle.trim() || "Barbeiro",
        instagram: instagram.trim() || null,
        email: isNew ? linkedProfile!.email : email.trim() || null,
        phone: isNew ? linkedProfile!.phone : phone.trim() || null,
        photo_path: photoPath,
        gallery_paths: gallery,
      },
      week,
      isNew,
    );
    if (err) {
      setSaving(false);
      return fail(err);
    }

    if (isNew && linkedProfile) {
      const { error: linkErr } = await linkBarberAccount(linkedProfile.id, effectiveId);
      if (linkErr) {
        setSaving(false);
        return fail(`Barbeiro criado, mas não foi possível vincular a conta: ${linkErr}`);
      }
    }
    setSaving(false);
    onSaved();
    requestClose();
  }

  return (
    <div
      className="dc-modal-overlay fixed inset-0 z-[120] overflow-y-auto"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
      data-closing={isClosing}
    >
      <div className="flex min-h-full items-center justify-center p-6">
      <div className="dc-modal-panel relative w-full max-w-[560px] rounded-lg border border-border bg-surface p-7 shadow-[0_40px_90px_rgba(0,0,0,0.8)]">
        <button
          onClick={requestClose}
          aria-label="Fechar"
          className="absolute top-3.5 right-3.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
        >
          ×
        </button>
        <h3 className="m-0 mb-5 font-heading text-xl font-semibold tracking-[0.06em] text-white uppercase">
          {isNew ? "Novo barbeiro" : `Editar ${barber?.name}`}
        </h3>

        <div className="flex flex-col gap-3.5">
          <div className={`flex items-center gap-4 ${fieldProps("photo").shaking ? "field-shake" : ""}`}>
            <span
              className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-surface-alt ${fieldClass(fieldProps("photo"))}`}
            >
              {photoPath ? (
                <img src={photoPath} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-3xl text-silver">
                  {displayName.charAt(0) || "?"}
                </span>
              )}
            </span>
            <label className="cursor-pointer rounded-lg border border-border px-4 py-2.5 font-heading text-xs tracking-[0.16em] text-white uppercase transition-colors hover:border-silver">
              {uploadingPhoto ? "Enviando…" : "Enviar foto"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhoto(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {isNew ? (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-muted">E-mail de login</span>
              <div className="flex gap-2.5">
                <input
                  value={linkEmail}
                  onChange={(e) => {
                    setLinkEmail(e.target.value);
                    setLinkedProfile(undefined);
                    clearField("link");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchLink()}
                  placeholder="pessoa@email.com"
                  className={`min-h-12 flex-1 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver ${fieldClass(fieldProps("link"))}`}
                />
                <button
                  onClick={handleSearchLink}
                  disabled={searchingLink}
                  className="flex min-h-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border px-5 font-heading text-xs tracking-[0.14em] text-white uppercase transition-colors hover:border-silver disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {searchingLink ? "Buscando…" : "Buscar"}
                </button>
              </div>
              <span className="text-xs text-muted-2">
                A pessoa precisa já ter feito login no site pelo menos uma vez. Nome, e-mail e telefone vêm dessa conta.
              </span>

              {linkedProfile === null && (
                <p className="m-0 mt-1 text-[13px] text-muted">
                  Nenhuma conta encontrada com esse e-mail. Peça à pessoa para criar login no site primeiro.
                </p>
              )}

              {linkedProfile && (
                <div className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt p-3.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] text-white">{linkedProfile.full_name || "—"}</span>
                    <span className="block truncate text-[13px] text-muted">{linkedProfile.email}</span>
                  </span>
                  {linkedProfile.role !== "customer" && linkedProfile.barber_id && (
                    <span
                      className="flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] tracking-[0.08em] uppercase"
                      style={{ borderColor: "#E0B341", color: "#E0B341" }}
                    >
                      já vinculada
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <Field
                label="Nome"
                value={name}
                onChange={(v) => {
                  setName(v);
                  clearField("name");
                }}
                {...fieldProps("name")}
              />
              <Field label="E-mail" value={email} onChange={setEmail} placeholder="barbeiro@email.com" />
              <Field label="Telefone" value={phone} onChange={setPhone} placeholder="(18) 99730-7852" />
            </>
          )}
          {isNew && (
            <Field
              label="Identificador (slug)"
              value={effectiveId}
              onChange={(v) => {
                setId(v);
                setIdTouched(true);
                clearField("id");
              }}
              hint="Usado internamente. Sem espaços."
              {...fieldProps("id")}
            />
          )}
          <Field label="Cargo" value={roleTitle} onChange={setRoleTitle} />
          <Field label="Instagram" value={instagram} onChange={setInstagram} placeholder="@usuario" />

          <span className="mt-2 font-heading text-xs tracking-[0.2em] text-muted-2 uppercase">
            Fotos do carrossel
          </span>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {gallery.map((url, i) => (
              <div key={`${url}-${i}`} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setGallery((g) => g.filter((_, idx) => idx !== i))}
                  aria-label="Remover foto"
                  className="absolute top-1 right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-border text-white"
                  style={{ background: "rgba(10,10,10,0.86)" }}
                >
                  ×
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong bg-surface-alt text-center font-heading text-[10px] tracking-[0.12em] text-muted uppercase transition-colors hover:border-silver hover:text-white">
              <span className="text-xl leading-none">+</span>
              {uploadingGallery ? "Enviando…" : "Adicionar"}
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) handleGalleryAdd(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <span className="text-[11px] text-muted-2">
            Essas fotos aparecem no cartão do barbeiro no agendamento. Sem carrossel, usa a foto principal.
          </span>

          <span className="mt-2 font-heading text-xs tracking-[0.2em] text-muted-2 uppercase">Horários e dias</span>
          <div className="flex flex-col gap-2">
            {week.map((d) => (
              <div key={d.weekday} className="rounded-lg border border-border bg-surface-alt p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] text-white">{WEEKDAY_LABELS[d.weekday]}</span>
                  <button
                    onClick={() => patchDay(d.weekday, { is_open: !d.is_open })}
                    className="min-h-8 cursor-pointer rounded-full border px-3 font-heading text-[11px] tracking-[0.12em] uppercase"
                    style={{
                      background: d.is_open ? "rgba(255,255,255,0.07)" : "transparent",
                      borderColor: d.is_open ? "#E0E0E0" : "#2A2A2A",
                      color: d.is_open ? "#FFFFFF" : "#9E9E9E",
                    }}
                  >
                    {d.is_open ? "Aberto" : "Fechado"}
                  </button>
                </div>
                {d.is_open && (
                  <div className="mt-2.5 flex flex-col gap-2">
                    <input
                      value={d.label}
                      onChange={(e) => patchDay(d.weekday, { label: e.target.value })}
                      placeholder="09:00 às 20:00"
                      className="min-h-10 rounded-lg border border-border bg-ink px-3 text-[13px] text-white outline-none focus:border-silver"
                    />
                    <input
                      value={d.slots.join(", ")}
                      onChange={(e) =>
                        patchDay(d.weekday, {
                          slots: e.target.value
                            .split(/[,\s]+/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="09:00, 10:00, 11:00…"
                      className="min-h-10 rounded-lg border border-border bg-ink px-3 text-[13px] text-white outline-none focus:border-silver"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <span className="rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
              {error}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-silver-gradient mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-lg font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  invalid,
  shaking,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  invalid?: boolean;
  shaking?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver ${fieldClass({ invalid: !!invalid, shaking: !!shaking })}`}
      />
      {hint && <span className="text-[13px] text-muted-2">{hint}</span>}
    </label>
  );
}
