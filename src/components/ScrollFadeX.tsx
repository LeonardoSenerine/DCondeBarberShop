import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollFadeXProps {
  /** Minimum width of the scrollable content, e.g. "900px". */
  minWidth: string;
  /** Extra classes for the scrolling element itself, e.g. a vertical max-height + overflow-y-auto. */
  scrollClassName?: string;
  children: ReactNode;
}

/**
 * Wraps a horizontally-scrollable table/grid with a chevron badge hint, so
 * it's obvious there's more to see off-screen — a bare `overflow-x-auto`
 * gives no visual cue on mobile, where there's no visible scrollbar to
 * notice. A dark-on-dark edge fade was tried first but was invisible on this
 * app's near-black theme; an opaque circular badge reads against any
 * background instead of relying on contrast with it.
 */
export function ScrollFadeX({ minWidth, scrollClassName, children }: ScrollFadeXProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 1);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      <div ref={ref} className={`scroll-smooth overflow-x-auto [-webkit-overflow-scrolling:touch] ${scrollClassName ?? ""}`}>
        <div style={{ minWidth }}>{children}</div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute top-12 left-1.5 transition-opacity duration-200"
        style={{ opacity: atStart ? 0 : 1 }}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-white"
          style={{ background: "rgba(10,10,10,0.85)", boxShadow: "0 4px 14px rgba(0,0,0,0.5)" }}
        >
          ‹
        </span>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute top-12 right-1.5 transition-opacity duration-200"
        style={{ opacity: atEnd ? 0 : 1 }}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-white"
          style={{ background: "rgba(10,10,10,0.85)", boxShadow: "0 4px 14px rgba(0,0,0,0.5)" }}
        >
          ›
        </span>
      </div>
    </div>
  );
}
