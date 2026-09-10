import type { BookingDraft } from "@/components/BookingWizard";

const KEY = "dc-pending-booking";

export interface StoredPendingBooking {
  draft: BookingDraft;
  name: string;
  phone: string;
}

/** Persists a booking draft across the magic-link email round trip. */
export function savePendingBooking(data: StoredPendingBooking) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** Reads the stored draft without clearing it. */
export function peekPendingBooking(): StoredPendingBooking | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPendingBooking;
  } catch {
    return null;
  }
}

/** Clears the stored draft — call once the booking has actually been created. */
export function clearPendingBooking() {
  localStorage.removeItem(KEY);
}
