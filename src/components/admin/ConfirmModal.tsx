import { WarningCircle } from "@phosphor-icons/react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Remover",
  cancelLabel = "Cancelar",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[130] overflow-y-auto"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[400px] rounded-2xl border border-border bg-surface p-7 shadow-[0_40px_90px_rgba(0,0,0,0.8)]"
        >
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full border"
            style={{ borderColor: "#e5484d", color: "#e5484d" }}
          >
            <WarningCircle size={26} weight="bold" />
          </span>
          <h3 className="m-0 mt-4 font-heading text-lg font-semibold tracking-[0.05em] text-white uppercase">
            {title}
          </h3>
          <p className="m-0 mt-2 text-[14px] text-muted">{message}</p>

          <div className="mt-6 flex gap-2.5">
            <button
              onClick={onClose}
              disabled={busy}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-xs tracking-[0.16em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border font-heading text-xs font-semibold tracking-[0.16em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: "#e5484d", background: "#e5484d", color: "#FFFFFF" }}
            >
              {busy ? "Removendo…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
