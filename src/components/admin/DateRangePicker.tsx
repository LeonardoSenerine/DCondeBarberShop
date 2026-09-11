import { useEffect, useRef, useState } from "react";
import { CalendarBlank, X } from "@phosphor-icons/react";
import { MONTH_LABELS, WEEKDAY_SHORT, dateKey, formatDateBR } from "@/lib/format";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  /** Overrides the trigger's default fixed width (e.g. "w-full" to fill a form field). */
  className?: string;
  placeholder?: string;
  /** Trigger fill: "surface-alt" (default, for use on a plain bg-surface background) or "ink" (for nesting inside an already bg-surface-alt panel). */
  variant?: "surface-alt" | "ink";
}

const PRESETS: { label: string; days: number }[] = [
  { label: "Hoje", days: 0 },
  { label: "7 dias", days: 6 },
  { label: "30 dias", days: 29 },
];

export function DateRangePicker({
  from,
  to,
  onChange,
  className,
  placeholder = "Período",
  variant = "surface-alt",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const base = from ? new Date(`${from}T00:00:00`) : today;
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function jumpMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  function pickDay(d: number) {
    const key = dateKey(new Date(viewYear, viewMonth, d));
    if (!from || (from && to)) {
      onChange({ from: key, to: "" });
    } else if (key < from) {
      onChange({ from: key, to: from });
    } else {
      onChange({ from, to: key });
    }
  }

  function applyPreset(days: number) {
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    onChange({ from: dateKey(start), to: dateKey(end) });
    setViewYear(end.getFullYear());
    setViewMonth(end.getMonth());
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const rangeStart = from && to ? from : from && hover && hover > from ? from : to ? to : from;
  const rangeEnd = from && to ? to : from && hover && hover > from ? hover : from;

  const label = from && to ? `${formatDateBR(from)} — ${formatDateBR(to)}` : from ? `${formatDateBR(from)} — …` : placeholder;

  return (
    <div ref={rootRef} className={`relative ${className ?? "w-[280px]"}`} style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div
        className={`flex min-h-11 items-center gap-2 rounded-lg border border-border pr-2.5 pl-4 text-sm transition-colors ${variant === "ink" ? "bg-ink" : "bg-surface-alt"}`}
        style={{ borderColor: open ? "var(--color-silver)" : undefined }}
      >
        <button onClick={() => setOpen((v) => !v)} className="flex flex-1 cursor-pointer items-center gap-2.5 py-3 text-left">
          <CalendarBlank size={22} className="flex-shrink-0 text-muted" />
          <span className={from ? "text-white" : "text-muted"}>{label}</span>
        </button>
        {from && (
          <button
            onClick={() => onChange({ from: "", to: "" })}
            aria-label="Limpar período"
            className="flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-30 w-full rounded-lg border border-border bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days)}
                className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-[12px] tracking-[0.06em] text-muted uppercase transition-colors hover:border-silver hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mb-3.5 flex items-center justify-between gap-2">
            <button
              onClick={() => jumpMonth(-1)}
              aria-label="Mês anterior"
              className="flex h-[30px] w-[30px] flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-alt text-sm text-white transition hover:brightness-125"
            >
              ‹
            </button>
            <span className="flex items-baseline gap-2">
              <span className="text-[15px] font-medium tracking-[0.16em] text-white uppercase">
                {MONTH_LABELS[viewMonth]}
              </span>
              <span className="text-[13px] text-muted-2">{viewYear}</span>
            </span>
            <button
              onClick={() => jumpMonth(1)}
              aria-label="Próximo mês"
              className="flex h-[30px] w-[30px] flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-alt text-sm text-white transition hover:brightness-125"
            >
              ›
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1.5">
            {WEEKDAY_SHORT.map((w, i) => (
              <span key={i} className="text-center text-[12px] tracking-[0.08em] text-muted-2">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <span key={`blank-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const key = dateKey(new Date(viewYear, viewMonth, d));
              const isStart = key === from;
              const isEnd = key === to;
              const inRange = !!rangeStart && !!rangeEnd && key > rangeStart && key < rangeEnd;
              const isToday = key === dateKey(today);
              return (
                <button
                  key={d}
                  onClick={() => pickDay(d)}
                  onMouseEnter={() => setHover(key)}
                  onMouseLeave={() => setHover(null)}
                  className="flex aspect-square min-h-[34px] cursor-pointer items-center justify-center rounded-md text-[14px] transition hover:brightness-125"
                  style={{
                    background: isStart || isEnd ? "#E0E0E0" : inRange ? "rgba(255,255,255,0.1)" : "transparent",
                    color: isStart || isEnd ? "#0A0A0A" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: isToday && !isStart && !isEnd ? "var(--color-silver)" : "transparent",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
