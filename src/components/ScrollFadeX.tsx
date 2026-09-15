import type { ReactNode } from "react";

interface ScrollFadeXProps {
  /** Minimum width of the scrollable content, e.g. "900px". */
  minWidth: string;
  /** Extra classes for the scrolling element itself, e.g. a vertical max-height + overflow-y-auto. */
  scrollClassName?: string;
  children: ReactNode;
}

/** Wraps a table/grid too wide for mobile in a horizontally-scrollable container. */
export function ScrollFadeX({ minWidth, scrollClassName, children }: ScrollFadeXProps) {
  return (
    <div className={`overflow-x-auto [-webkit-overflow-scrolling:touch] ${scrollClassName ?? ""}`}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}
