import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatTimeShort } from "@/lib/format";
import type { BarberHours } from "@/hooks/useCatalog";
import type { Database } from "@/types/database";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];

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

/** Already-taken (barber, date) -> times for a whole visible month, so the calendar can grey out full days. */
export function useMonthBookings(barberId: string | null, year: number, month: number) {
  const [byDate, setByDate] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barberId) {
      setByDate({});
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    supabase
      .from("bookings")
      .select("scheduled_date, scheduled_time")
      .eq("barber_id", barberId)
      .neq("status", "cancelled")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .then(({ data }) => {
        if (!active) return;
        const map: Record<string, string[]> = {};
        (data ?? []).forEach((row) => {
          const key = row.scheduled_date;
          const time = formatTimeShort(row.scheduled_time);
          map[key] = map[key] ? [...map[key], time] : [time];
        });
        setByDate(map);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [barberId, year, month]);

  return { bookedByDate: byDate, loading };
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

export function useMyBookings(customerId: string | null) {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!customerId) {
      setBookings([]);
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
        setBookings((data ?? []) as unknown as BookingWithDetails[]);
        setLoading(false);
      });
  }, [customerId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { bookings, loading, reload };
}

export async function cancelBooking(id: string) {
  const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
  return { error: error?.message ?? null };
}
