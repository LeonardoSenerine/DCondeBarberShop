import { useCallback, useRef, useState } from "react";

/**
 * Shared submit-validation state for forms: one general error message plus
 * which fields caused it, so those fields can get a red border and a shake.
 */
export function useFormErrors() {
  const [message, setMessage] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [shakeFields, setShakeFields] = useState<Set<string>>(new Set());
  const shakeTimeout = useRef<number | undefined>(undefined);

  /** Report a validation/save failure, marking `fields` (if any) as invalid and shaking them. */
  const fail = useCallback((msg: string, fields: string[] = []) => {
    setMessage(msg);
    setInvalidFields(new Set(fields));
    setShakeFields(new Set(fields));
    window.clearTimeout(shakeTimeout.current);
    shakeTimeout.current = window.setTimeout(() => setShakeFields(new Set()), 500);
  }, []);

  const clear = useCallback(() => {
    setMessage(null);
    setInvalidFields(new Set());
  }, []);

  /** Call from a field's onChange so its red border lifts as soon as the user edits it. */
  const clearField = useCallback((name: string) => {
    setInvalidFields((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  const fieldProps = useCallback(
    (name: string) => ({
      invalid: invalidFields.has(name),
      shaking: shakeFields.has(name),
    }),
    [invalidFields, shakeFields],
  );

  return { message, fail, clear, clearField, fieldProps };
}

/** Extra classes to append to a field's className: red border while invalid, a shake right after a failed submit. */
export function fieldClass(state: { invalid: boolean; shaking: boolean }): string {
  return [state.invalid && "field-invalid", state.shaking && "field-shake"].filter(Boolean).join(" ");
}
