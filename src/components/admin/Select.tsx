import { useEffect, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

export function Select({ value, onChange, options, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-surface-alt px-3.5 text-left text-[15px] text-white transition-colors hover:border-silver"
        style={{ borderColor: open ? "var(--color-silver)" : undefined }}
      >
        <span>{current?.label ?? "Selecionar"}</span>
        <CaretDown size={16} weight="bold" className="flex-shrink-0 text-muted transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-30 w-full overflow-hidden rounded-lg border border-border bg-surface p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 text-left text-sm transition-colors hover:bg-white/8"
                style={{ color: active ? "#FFFFFF" : "#9E9E9E" }}
              >
                {o.label}
                {active && <Check size={16} weight="bold" className="flex-shrink-0 text-silver" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
