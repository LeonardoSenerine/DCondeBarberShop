import { CheckCircle, Clock, Prohibit, XCircle, type Icon } from "@phosphor-icons/react";

interface StatusConfig {
  label: string;
  icon: Icon;
  filled?: boolean;
  color: string;
  border: string;
  bg?: string;
}

const CONFIG: Record<string, StatusConfig> = {
  pending: { label: "Em análise", icon: Clock, color: "#E0B341", border: "#E0B341" },
  confirmed: { label: "Confirmado", icon: CheckCircle, color: "#FFFFFF", border: "#E0E0E0" },
  completed: {
    label: "Concluído",
    icon: CheckCircle,
    filled: true,
    color: "#0A0A0A",
    border: "var(--color-silver)",
    bg: "var(--color-silver)",
  },
  cancelled: { label: "Cancelado", icon: XCircle, color: "#8A8A8A", border: "#2A2A2A" },
  no_show: { label: "Faltou", icon: Prohibit, color: "#E5484D", border: "#E5484D" },
};

/** A booking's status as a small colored pill with an icon — used everywhere a booking's status shows up. */
export function BookingStatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const cfg = CONFIG[status] ?? { label: status, icon: XCircle, color: "#8A8A8A", border: "#2A2A2A" };
  const Icon = cfg.icon;
  return (
    <span
      className={`flex w-fit flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.1em] uppercase ${className}`}
      style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
    >
      <Icon size={13} weight={cfg.filled ? "fill" : "bold"} />
      {cfg.label}
    </span>
  );
}
