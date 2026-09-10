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

/** Reads and clears the stored draft in one step, so a race between tabs can't double-book. */
export function takePendingBooking(): StoredPendingBooking | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  localStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as StoredPendingBooking;
  } catch {
    return null;
  }
}
