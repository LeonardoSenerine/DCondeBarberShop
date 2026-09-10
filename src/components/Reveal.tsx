import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in ms before the transition starts once the element enters view. */
  delayMs?: number;
}

/**
 * Fades + slides a section in while it's in the viewport, and back out
 * once it scrolls off-screen — replays every time it re-enters, in
 * either scroll direction.
 */
export function Reveal({ children, className, delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`dc-reveal${visible ? " dc-reveal-visible" : ""}${className ? ` ${className}` : ""}`}
      style={delayMs ? { transitionDelay: visible ? `${delayMs}ms` : "0ms" } : undefined}
    >
      {children}
    </div>
  );
}
