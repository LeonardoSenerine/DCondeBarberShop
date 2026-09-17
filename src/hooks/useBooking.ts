import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { dateKey, formatTimeShort } from "@/lib/format";
import type { BarberHours } from "@/hooks/useCatalog";
import type { Database } from "@/types/database";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];

// booked_slots isn't declared in the Database["public"]["Functions"] map (see
// the comment on that field in database.ts) — cast the RPC name so we can
// still chain filters, then annotate the response shape at the call site.
type BookedSlotRow = {
  barber_id: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
};

export interface BookingWithDetails extends BookingRow {
  barbers: { name: string } | null;
  services: { name: string; duration_minutes: number } | null;
}

/** Bookable start times for a barber on a given weekday, formatted "HH:MM". */
export function slotsForWeekday(hours: BarberHours[], barberId: string, weekday: number): string[] {
  const row = hours.find((h) => h.barber_id === barberId && h.weekday === weekday);
  if (!row || !row.is_open) return [];
  return row.slots.map(formatTimeShort);
}

export function isBarberOpenOnWeekday(hours: BarberHours[], barberId: string, weekday: number): boolean {
  return !!hours.find((h) => h.barber_id === barberId && h.weekday === weekday)?.is_open;
}

/** How many back-to-back hourly slots a service of this duration needs (at least 1). */
export function slotsNeededFor(durationMinutes: number): number {
  return Math.max(1, Math.ceil(durationMinutes / 60));
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Every hourly checkpoint a booking of `durationMinutes` runs through,
 * starting at `startHHMM` — used only to confirm the day's slot grid stays
 * open through the whole appointment (a long service can't start too close
 * to closing, or run across a gap in the schedule). Not used for detecting
 * conflicts with other bookings — see BookedRange/rangesOverlap for that,
 * since another booking's own start time isn't necessarily hour-aligned.
 */
export function slotTimesForBooking(startHHMM: string, durationMinutes: number): string[] {
  const startMinutes = timeToMinutes(startHHMM);
  return Array.from({ length: slotsNeededFor(durationMinutes) }, (_, i) => minutesToTime(startMinutes + i * 60));
}

export interface BookedRange {
  startHHMM: string;
  durationMinutes: number;
}

function rangesOverlap(aStartMin: number, aDuration: number, bStartMin: number, bDuration: number): boolean {
  return aStartMin < bStartMin + bDuration && bStartMin < aStartMin + aDuration;
}

/**
 * Which of `daySlots` a service of `durationMinutes` could start at: every
 * hourly checkpoint it would run through must be on the day's grid, and its
 * actual time span (not rounded to the hour) must not overlap any existing
 * booking's own actual span.
 */
export function availableStartTimes(daySlots: string[], booked: BookedRange[], durationMinutes: number): string[] {
  const onGrid = new Set(daySlots);
  return daySlots.filter((start) => {
    if (!slotTimesForBooking(start, durationMinutes).every((t) => onGrid.has(t))) return false;
    const startMinutes = timeToMinutes(start);
    return !booked.some((b) => rangesOverlap(startMinutes, durationMinutes, timeToMinutes(b.startHHMM), b.durationMinutes));
  });
}

/** Already-taken (barber, date) -> booked time ranges for a whole visible month, so the calendar can grey out full days. */
export function useMonthBookings(barberId: string | null, year: number, month: number) {
  const [byDate, setByDate] = useState<Record<string, BookedRange[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!barberId) {
      setByDate({});
      setError(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    (supabase.rpc("booked_slots") as any)
      .select("scheduled_date, scheduled_time, duration_minutes")
      .eq("barber_id", barberId)
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .then(
        ({
          data,
          error: rpcError,
        }: {
          data: Pick<BookedSlotRow, "scheduled_date" | "scheduled_time" | "duration_minutes">[] | null;
          error: { message: string } | null;
        }) => {
          if (!active) return;
          if (rpcError) {
            // Never fall back to "no bookings" here — that would silently show every
            // slot as free and allow double-booking. Surface the failure instead.
            console.error("booked_slots RPC failed", rpcError);
            setByDate({});
            setError(rpcError.message);
            setLoading(false);
            return;
          }
          const map: Record<string, BookedRange[]> = {};
          (data ?? []).forEach((row) => {
            const key = row.scheduled_date;
            const range: BookedRange = { startHHMM: formatTimeShort(row.scheduled_time), durationMinutes: row.duration_minutes };
            map[key] = map[key] ? [...map[key], range] : [range];
          });
          setByDate(map);
          setLoading(false);
        },
      );

    return () => {
      active = false;
    };
  }, [barberId, year, month]);

  return { bookedByDate: byDate, loading, error };
}

export function useCreateBooking() {
  const [submitting, setSubmitting] = useState(false);

  const createBooking = useCallback(async (booking: BookingInsert) => {
    setSubmitting(true);
    const { data, error } = await supabase.from("bookings").insert(booking).select().single();
    setSubmitting(false);
    return { data, error: error?.message ?? null };
  }, []);

  return { createBooking, submitting };
}

/** DEV-only mocked bookings for the "Meus agendamentos" page, so it can be previewed without a real login/data. */
function sampleMyBookings(): BookingWithDetails[] {
  const today = new Date();
  const inDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return dateKey(d);
  };

  return [
    {
      id: "sample-my-booking-upcoming",
      customer_id: null,
      barber_id: "daniel",
      service_id: "sample-service-upcoming",
      scheduled_date: inDays(3),
      scheduled_time: "10:00:00",
      status: "confirmed",
      price_cents: 9500,
      duration_minutes: 80,
      customer_name: "Rafael Prado",
      customer_phone: "(18) 99863-4127",
      customer_email: null,
      reminder_sent_at: null,
      review_dismissed_at: null,
      decline_reason: null,
      decline_seen_at: null,
      cancel_reason: null,
      created_at: new Date().toISOString(),
      barbers: { name: "Daniel" },
      services: { name: "Corte + barba terapia", duration_minutes: 80 },
    },
    {
      id: "sample-my-booking-1",
      customer_id: null,
      barber_id: "joao",
      service_id: "sample-service-1",
      scheduled_date: inDays(-14),
      scheduled_time: "15:30:00",
      status: "completed",
      price_cents: 4500,
      duration_minutes: 50,
      customer_name: "Rafael Prado",
      customer_phone: "(18) 99863-4127",
      customer_email: null,
      reminder_sent_at: null,
      review_dismissed_at: null,
      decline_reason: null,
      decline_seen_at: null,
      cancel_reason: null,
      created_at: new Date().toISOString(),
      barbers: { name: "João Lima" },
      services: { name: "Corte", duration_minutes: 50 },
    },
    {
      id: "sample-my-booking-2",
      customer_id: null,
      barber_id: "daniel",
      service_id: "sample-service-2",
      scheduled_date: inDays(-40),
      scheduled_time: "09:00:00",
      status: "completed",
      price_cents: 5000,
      duration_minutes: 40,
      customer_name: "Rafael Prado",
      customer_phone: "(18) 99863-4127",
      customer_email: null,
      reminder_sent_at: null,
      review_dismissed_at: null,
      decline_reason: null,
      decline_seen_at: null,
      cancel_reason: null,
      created_at: new Date().toISOString(),
      barbers: { name: "Daniel" },
      services: { name: "Barba terapia", duration_minutes: 40 },
    },
    {
      id: "sample-my-booking-declined",
      customer_id: null,
      barber_id: "joao",
      service_id: "sample-service-3",
      scheduled_date: inDays(1),
      scheduled_time: "11:00:00",
      status: "cancelled",
      price_cents: 4500,
      duration_minutes: 50,
      customer_name: "Rafael Prado",
      customer_phone: "(18) 99863-4127",
      customer_email: null,
      reminder_sent_at: null,
      review_dismissed_at: null,
      decline_reason: "Vou estar de folga nesse dia — remarca pra outro horário que eu te atendo com calma.",
      decline_seen_at: null,
      cancel_reason: null,
      created_at: new Date().toISOString(),
      barbers: { name: "João Lima" },
      services: { name: "Corte", duration_minutes: 50 },
    },
  ];
}

export function useMyBookings(customerId: string | null) {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!customerId) {
      setBookings(import.meta.env.DEV ? sampleMyBookings() : []);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("bookings")
      .select("*, barbers(name), services(name, duration_minutes)")
      .eq("customer_id", customerId)
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as BookingWithDetails[];
        setBookings(rows.length === 0 && import.meta.env.DEV ? sampleMyBookings() : rows);
        setLoading(false);
      });
  }, [customerId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { bookings, loading, reload };
}

/** Customer cancelling their own booking — reason is required so the barber sees why instead of a silent cancellation. */
export async function cancelBooking(id: string, reason: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancel_reason: reason.trim() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

/** Acknowledges the "seu agendamento foi recusado" notice, so it doesn't keep showing on the account page. */
export async function markDeclineSeen(id: string) {
  const { error } = await supabase.from("bookings").update({ decline_seen_at: new Date().toISOString() }).eq("id", id);
  return { error: error?.message ?? null };
}

export interface MyPurchase {
  id: string;
  date: string;
  product: string;
  qty: number;
  priceCents: number;
}

/** DEV-only mocked product purchases for the "Meus agendamentos" page. */
function sampleMyPurchases(): MyPurchase[] {
  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return dateKey(d);
  };

  return [
    { id: "sample-my-purchase-1", date: daysAgo(14), product: "Pomada modeladora efeito matte", qty: 1, priceCents: 4200 },
    { id: "sample-my-purchase-2", date: daysAgo(40), product: "Óleo para barba 30ml", qty: 2, priceCents: 8800 },
  ];
}

/** The logged-in customer's completed product purchases, for the account page's history. */
export function useMyPurchases(customerId: string | null) {
  const [purchases, setPurchases] = useState<MyPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) {
      setPurchases(import.meta.env.DEV ? sampleMyPurchases() : []);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("orders")
      .select("id, created_at, order_items(quantity, unit_price_cents, products(name))")
      .eq("customer_id", customerId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        const rawOrders = (data ?? []) as unknown as {
          id: string;
          created_at: string;
          order_items: { quantity: number; unit_price_cents: number; products: { name: string } | null }[] | null;
        }[];
        const items: MyPurchase[] = [];
        rawOrders.forEach((o) => {
          (o.order_items ?? []).forEach((it, i) => {
            items.push({
              id: `${o.id}-${i}`,
              date: dateKey(new Date(o.created_at)),
              product: it.products?.name ?? "Produto",
              qty: it.quantity,
              priceCents: it.unit_price_cents * it.quantity,
            });
          });
        });
        setPurchases(items.length === 0 && import.meta.env.DEV ? sampleMyPurchases() : items);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customerId]);

  return { purchases, loading };
}
