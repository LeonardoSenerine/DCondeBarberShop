import { useCallback, useEffect, useRef, useState } from "react";

const CLOSE_DURATION = 190;

/** Keeps a modal mounted long enough for its exit animation to finish. */
export function useModalTransition(onClose: () => void) {
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const requestClose = useCallback(() => {
    if (isClosing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setIsClosing(true);
    timerRef.current = window.setTimeout(onClose, CLOSE_DURATION);
  }, [isClosing, onClose]);

  return { isClosing, requestClose };
}
