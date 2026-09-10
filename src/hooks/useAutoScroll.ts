import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Continuously auto-scrolls a horizontally-scrolling element at `speed`
 * px/frame, pausing while the pointer is over it or touching it. When
 * `loop` is true the element is expected to render its content twice back
 * to back (so we can wrap from the halfway point to 0 for a seamless
 * loop); otherwise it scrolls to the end and stops there.
 *
 * Resyncs to the element's real `scrollLeft` whenever it drifts from what
 * we last wrote (a manual drag) so user interaction always wins instead of
 * being fought by the animation.
 *
 * Returns a `scrollByAmount(delta)` helper that eases to `delta` px away
 * from the current position over the same requestAnimationFrame loop —
 * deliberately not the native `scrollBy({ behavior: "smooth" })`, whose
 * `scrollend` timing is unreliable enough (fires early in some browsers)
 * that handing control back to the auto-scroll loop from it would cancel
 * the animation mid-flight.
 */
export function useAutoScroll(ref: RefObject<HTMLElement | null>, speed: number, loop = false) {
  const posRef = useRef(0);
  const maxRef = useRef(0);
  const animRef = useRef<{ start: number; from: number; to: number; duration: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    let paused = false;
    let lastMeasure = 0;
    let bound: HTMLElement | null = null;
    let detach: (() => void) | null = null;

    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };

    const measure = (el: HTMLElement) => {
      maxRef.current = loop ? el.scrollWidth / 2 : Math.max(0, el.scrollWidth - el.clientWidth);
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const el = ref.current;
      if (!el) return;

      if (bound !== el) {
        if (detach) detach();
        bound = el;
        posRef.current = el.scrollLeft;
        el.addEventListener("pointerenter", pause);
        el.addEventListener("pointerleave", resume);
        el.addEventListener("touchstart", pause, { passive: true });
        el.addEventListener("touchend", resume);
        detach = () => {
          el.removeEventListener("pointerenter", pause);
          el.removeEventListener("pointerleave", resume);
          el.removeEventListener("touchstart", pause);
          el.removeEventListener("touchend", resume);
        };
        measure(el);
      }

      if (now - lastMeasure > 1000) {
        measure(el);
        lastMeasure = now;
      }
      if (maxRef.current <= 0) return;

      // A prev/next button click is easing the rail — drive that instead
      // of the passive drift, and always run it to completion regardless
      // of hover/touch pause since the user explicitly asked for it.
      const anim = animRef.current;
      if (anim) {
        const t = Math.min(1, (now - anim.start) / anim.duration);
        let pos = anim.from + (anim.to - anim.from) * easeOutCubic(t);
        pos = loop ? ((pos % maxRef.current) + maxRef.current) % maxRef.current : Math.max(0, Math.min(maxRef.current, pos));
        posRef.current = pos;
        el.scrollLeft = pos;
        if (t >= 1) animRef.current = null;
        return;
      }

      // A manual drag moved the element more than our own step would —
      // treat that as the new baseline instead of overriding it.
      if (Math.abs(el.scrollLeft - posRef.current) > speed + 1) {
        posRef.current = el.scrollLeft;
      }

      if (paused) return;

      posRef.current += speed;
      if (posRef.current >= maxRef.current) posRef.current = loop ? posRef.current - maxRef.current : maxRef.current;
      el.scrollLeft = posRef.current;
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      if (detach) detach();
    };
  }, [ref, speed, loop]);

  const scrollByAmount = useCallback(
    (delta: number) => {
      const el = ref.current;
      if (!el) return;
      const from = posRef.current;
      const to = loop ? from + delta : Math.max(0, Math.min(maxRef.current, from + delta));
      animRef.current = { start: performance.now(), from, to, duration: 500 };
    },
    [ref, loop],
  );

  return scrollByAmount;
}
