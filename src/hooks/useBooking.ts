import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { dateKey, formatTimeShort } from "@/lib/format";
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
      customer_name: "Rafael Prado",
      customer_phone: "(18) 99863-4127",
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
      customer_name: "Rafael Prado",
      customer_phone: "(18) 99863-4127",
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
      customer_name: "Rafael Prado",
      customer_phone: "(18) 99863-4127",
      created_at: new Date().toISOString(),
      barbers: { name: "Daniel" },
      services: { name: "Barba terapia", duration_minutes: 40 },
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

export async function cancelBooking(id: string) {
  const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
  return { error: error?.message ?? null };
}
