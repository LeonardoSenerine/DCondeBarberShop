import { useRef, useState, type ReactNode } from "react";
import { useAdminGallery, removeGalleryPhoto, uploadGalleryPhoto } from "@/hooks/useAdmin";
import { useBarbers, useServices } from "@/hooks/useCatalog";
import { Skeleton } from "@/components/Skeleton";

export function GalleryTab() {
  const { photos, loading, reload } = useAdminGallery();
  const { data: barbers } = useBarbers();
  const { data: services } = useServices();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [barberId, setBarberId] = useState("");
  const [serviceLabel, setServiceLabel] = useState("");
  const [description, setDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPending(null);
    setPreviewUrl("");
    setBarberId("");
    setServiceLabel("");
    setDescription("");
    setError(null);
  }

  function pickFile(file: File) {
    setPending(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleRemove(id: string) {
    await removeGalleryPhoto(id);
    reload();
  }

  async function handleConfirm() {
    if (!pending) return;
    setUploading(true);
    setError(null);
    const { error: err } = await uploadGalleryPhoto(pending, photos.length + 1, {
      barberId: barberId || null,
      serviceLabel: serviceLabel || null,
      clientLabel: description.trim() || null,
    });
    setUploading(false);
    if (err) return setError(err);
    resetForm();
    reload();
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-7">
      <h2 className="m-0 mb-5 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase">
        Fotos da galeria
      </h2>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {loading && photos.length === 0 && <Skeleton count={8} className="h-[150px] rounded-lg" />}
        {photos.map((p) => (
          <div key={p.id} className="relative h-[150px] overflow-hidden rounded-lg border border-border">
            <img src={p.image_path} loading="lazy" alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => handleRemove(p.id)}
              className="absolute top-2 right-2 min-h-8.5 cursor-pointer rounded-lg border border-border px-3 font-heading text-[11px] tracking-[0.14em] text-white uppercase transition-colors hover:border-silver"
              style={{ background: "rgba(10,10,10,0.86)" }}
            >
              Remover
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-[150px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-alt font-heading text-xs tracking-[0.16em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
        >
          <span className="text-2xl leading-none">+</span>
          Adicionar foto
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {pending && (
        <div
          className="fixed inset-0 z-[120] overflow-y-auto"
          style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
        >
          <div className="flex min-h-full items-center justify-center p-6">
          <div className="relative w-full max-w-[520px] rounded-lg border border-border bg-surface p-7 shadow-[0_40px_90px_rgba(0,0,0,0.8)]">
            <button
              onClick={resetForm}
              aria-label="Fechar"
              className="absolute top-3.5 right-3.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
            >
              ×
            </button>
            <h3 className="m-0 mb-4 font-heading text-xl font-semibold tracking-[0.06em] text-white uppercase">
              Detalhes da foto
            </h3>
            <img
              src={previewUrl}
              alt=""
              className="mb-5 max-h-[52vh] w-full rounded-lg border border-border bg-ink object-contain"
            />
            <div className="flex flex-col gap-3.5">
              <Field label="Barbeiro">
                <Select value={barberId} onChange={setBarberId}>
                  <option value="">Não informar</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tipo de serviço">
                <Select value={serviceLabel} onChange={setServiceLabel}>
                  <option value="">Não informar</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Descrição (opcional)">
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: cliente, detalhe do corte…"
                  className="min-h-12 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver"
                />
              </Field>
              {error && (
                <span className="rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
                  {error}
                </span>
              )}
              <div className="mt-1 flex gap-2.5">
                <button
                  onClick={handleConfirm}
                  disabled={uploading}
                  className="bg-silver-gradient flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg font-heading text-xs font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
                >
                  {uploading ? "Enviando…" : "Adicionar"}
                </button>
                <button
                  onClick={resetForm}
                  disabled={uploading}
                  className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-xs tracking-[0.2em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] text-muted">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <span className="relative block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface-alt px-3.5 pr-10 text-[15px] text-white outline-none transition-colors focus:border-silver"
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[11px] text-muted"
      >
        ▼
      </span>
    </span>
  );
}
