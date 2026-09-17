import { useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { useModalTransition } from "@/hooks/useModalTransition";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  /** Keeps the confirm button disabled for this many seconds, counting down on
   *  its label — for actions destructive enough that a reflexive click is a
   *  real risk (e.g. deleting a barber wipes their whole schedule). */
  confirmDelaySeconds?: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Remover",
  cancelLabel = "Cancelar",
  busy = false,
  confirmDelaySeconds = 0,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(confirmDelaySeconds);
  const { isClosing, requestClose } = useModalTransition(onClose);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [secondsLeft]);

  const waiting = secondsLeft > 0;

  return (
    <div
      className="dc-modal-overlay fixed inset-0 z-[130] overflow-y-auto"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
      data-closing={isClosing}
      onClick={requestClose}
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="dc-modal-panel relative w-full max-w-[400px] rounded-2xl border border-border bg-surface p-7 shadow-[0_40px_90px_rgba(0,0,0,0.8)]"
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full border"
            style={{ borderColor: "#e5484d", color: "#e5484d" }}
          >
            <WarningCircle size={28} weight="bold" />
          </span>
          <h3 className="m-0 mt-4 font-heading text-xl font-semibold tracking-[0.05em] text-white uppercase">
            {title}
          </h3>
          <p className="m-0 mt-2 text-base text-muted">{message}</p>

          <div className="mt-6 flex gap-2.5">
            <button
              onClick={requestClose}
              disabled={busy}
              className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-sm tracking-[0.16em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={busy || waiting}
              className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border font-heading text-sm font-semibold tracking-[0.16em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: "#e5484d", background: "#e5484d", color: "#FFFFFF" }}
            >
              {busy ? "Removendo…" : waiting ? `Aguarde (${secondsLeft})` : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
