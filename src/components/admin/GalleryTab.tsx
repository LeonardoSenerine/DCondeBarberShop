import { useRef, useState } from "react";
import { useAdminGallery, removeGalleryPhoto, uploadGalleryPhoto } from "@/hooks/useAdmin";

export function GalleryTab() {
  const { photos, loading, reload } = useAdminGallery();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleRemove(id: string) {
    await removeGalleryPhoto(id);
    reload();
  }

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const { error: err } = await uploadGalleryPhoto(file, photos.length + 1);
    setUploading(false);
    if (err) setError(err);
    reload();
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-7">
      <h2 className="m-0 mb-5 font-heading text-2xl font-semibold tracking-[0.06em] text-white uppercase">
        Fotos da galeria
      </h2>
      {loading && <p className="text-muted">Carregando…</p>}
      {error && <p className="mb-3.5 text-[13px] text-white">{error}</p>}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p) => (
          <div key={p.id} className="relative h-[150px] overflow-hidden rounded-lg border border-border">
            <img src={p.image_path} loading="lazy" alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => handleRemove(p.id)}
              className="absolute top-2 right-2 min-h-8.5 rounded-lg border border-border px-3 font-heading text-[11px] tracking-[0.14em] text-white uppercase transition-colors hover:border-silver"
              style={{ background: "rgba(10,10,10,0.86)" }}
            >
              Remover
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-[150px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-alt font-heading text-xs tracking-[0.16em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:opacity-60"
        >
          <span className="text-2xl leading-none">+</span>
          {uploading ? "Enviando…" : "Adicionar foto"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
