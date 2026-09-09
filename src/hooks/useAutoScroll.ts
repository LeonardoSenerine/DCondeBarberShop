import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Continuously auto-scrolls a horizontally-scrolling element at `speed`
 * px/frame, pausing while the pointer is over it or touching it. When
 * `loop` is true the element is expected to render its content twice back
 * to back (so we can wrap from the halfway point to 0 for a seamless
 * loop); otherwise it scrolls to the end and stops there.
 *
 * Resyncs to the element's real `scrollLeft` whenever it drifts from what
 * we last wrote (a manual scroll, drag, or a prev/next button click) so
 * user interaction always wins instead of being fought by the animation.
 */
export function useAutoScroll(ref: RefObject<HTMLElement | null>, speed: number, loop = false) {
  useEffect(() => {
    let raf = 0;
    let pos = 0;
    let paused = false;
    let max = 0;
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
      max = loop ? el.scrollWidth / 2 : Math.max(0, el.scrollWidth - el.clientWidth);
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const el = ref.current;
      if (!el) return;

      if (bound !== el) {
        if (detach) detach();
        bound = el;
        pos = el.scrollLeft;
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
      if (max <= 0) return;

      // A manual scroll/click moved the element more than our own step
      // would — treat that as the new baseline instead of overriding it.
      if (Math.abs(el.scrollLeft - pos) > speed + 1) {
        pos = el.scrollLeft;
      }

      if (paused) return;

      pos += speed;
      if (pos >= max) pos = loop ? pos - max : max;
      el.scrollLeft = pos;
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      if (detach) detach();
    };
  }, [ref, speed, loop]);
}
