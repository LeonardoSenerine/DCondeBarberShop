interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  className?: string;
}

const STAR_PATH =
  "M12 2.5l2.9 6.02 6.6.82-4.83 4.6 1.24 6.56L12 17.7l-5.91 2.8 1.24-6.56-4.83-4.6 6.6-.82L12 2.5z";

/** Read-only when `onChange` is omitted. */
export function StarRating({ value, onChange, size = 20, className }: StarRatingProps) {
  const readOnly = !onChange;
  return (
    <div
      className={`flex items-center gap-1${className ? ` ${className}` : ""}`}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `${value} de 5 estrelas` : "Avaliação em estrelas"}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            role={readOnly ? undefined : "radio"}
            aria-checked={readOnly ? undefined : n === value}
            aria-label={readOnly ? undefined : `${n} estrela${n > 1 ? "s" : ""}`}
            tabIndex={readOnly ? -1 : 0}
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={readOnly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}
            style={{ width: size, height: size, color: filled ? "#E0B341" : "#3A3A3A" }}
          >
            <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
              <path d={STAR_PATH} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
