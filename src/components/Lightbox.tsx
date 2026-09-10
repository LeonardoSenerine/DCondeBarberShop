interface LightboxProps {
  src: string;
  label: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function Lightbox({ src, label, onClose, onPrev, onNext }: LightboxProps) {
  const hasNav = !!(onPrev && onNext);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4.5 p-8"
      style={{ background: "rgba(5,5,5,0.94)", cursor: "zoom-out" }}
    >
      <img
        src={src}
        alt="D'Conde Barbearia"
        loading="lazy"
        className="max-h-[76vh] max-w-[min(1100px,92vw)] rounded-lg border border-border object-contain"
      />
      {hasNav && (
        <div className="flex items-center gap-4.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onPrev}
            aria-label="Anterior"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-white transition-colors hover:border-silver"
          >
            ‹
          </button>
          <span className="font-heading text-[13px] tracking-[0.24em] text-white uppercase">{label}</span>
          <button
            onClick={onNext}
            aria-label="Próxima"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-white transition-colors hover:border-silver"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
