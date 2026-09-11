import { CaretDoubleLeft, CaretDoubleRight, CaretLeft, CaretRight } from "@phosphor-icons/react";

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

/** Page numbers around `page`, with the first/last page and "…" gaps. */
function pageList(page: number, pageCount: number): (number | "gap")[] {
  const list: (number | "gap")[] = [];
  const add = (p: number) => list.push(p);

  add(1);
  if (page > 3) add("gap");
  for (let p = Math.max(2, page - 1); p <= Math.min(pageCount - 1, page + 1); p++) add(p);
  if (page < pageCount - 2) add("gap");
  if (pageCount > 1) add(pageCount);

  return list;
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  const items = pageList(page, pageCount);

  return (
    <div className="flex items-center gap-1.5">
      <NavButton onClick={() => onChange(1)} disabled={page === 1} aria-label="Primeira página">
        <CaretDoubleLeft size={14} weight="bold" />
      </NavButton>
      <NavButton onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Página anterior">
        <CaretLeft size={14} weight="bold" />
      </NavButton>

      {items.map((it, i) =>
        it === "gap" ? (
          <span key={`gap-${i}`} className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-sm text-muted">
            …
          </span>
        ) : (
          <button
            key={it}
            onClick={() => onChange(it)}
            aria-current={it === page ? "page" : undefined}
            className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border text-[13px] font-medium transition-colors"
            style={
              it === page
                ? { background: "var(--color-silver)", borderColor: "var(--color-silver)", color: "#0A0A0A" }
                : { borderColor: "#2A2A2A", color: "#9E9E9E" }
            }
          >
            {it}
          </button>
        ),
      )}

      <NavButton onClick={() => onChange(page + 1)} disabled={page === pageCount} aria-label="Próxima página">
        <CaretRight size={14} weight="bold" />
      </NavButton>
      <NavButton onClick={() => onChange(pageCount)} disabled={page === pageCount} aria-label="Última página">
        <CaretDoubleRight size={14} weight="bold" />
      </NavButton>
    </div>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  "aria-label": string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-white transition-colors hover:border-silver disabled:cursor-default disabled:opacity-30 disabled:hover:border-border"
    >
      {children}
    </button>
  );
}
