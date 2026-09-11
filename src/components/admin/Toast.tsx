import { useEffect } from "react";
import { CheckCircle } from "@phosphor-icons/react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, onDismiss, duration = 3200 }: ToastProps) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[140] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-[dc-up_400ms_ease_both]"
    >
      <CheckCircle size={22} weight="fill" className="flex-shrink-0 text-silver" />
      <span className="text-[14px] text-white">{message}</span>
    </div>
  );
}
