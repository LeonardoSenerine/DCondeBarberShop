import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { dateKey } from "@/lib/format";
import type { BookingWithDetails } from "@/hooks/useBooking";
import type { Database } from "@/types/database";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type Service = Database["public"]["Tables"]["services"]["Row"];
type GalleryPhoto = Database["public"]["Tables"]["gallery_photos"]["Row"];
type BarberHours = Database["public"]["Tables"]["barber_hours"]["Row"];

export function useAgendaForDate(date: Date) {
  const [agenda, setAgenda] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const key = dateKey(date);

  const reload = useCallback(() => {
    setLoading(true);
    supabase
      .from("bookings")
      .select("*, barbers(name), services(name, duration_minutes)")
      .eq("scheduled_date", key)
      .order("scheduled_time")
      .then(({ data }) => {
        setAgenda((data ?? []) as unknown as BookingWithDetails[]);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => reload(), [reload]);

  return { agenda, loading, reload };
}

export interface ClientSummary {
  customerId: string;
  name: string;
  phone: string;
  visits: number;
  lastVisit: string;
  totalCents: number;
}

export function useClients(query: string) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("bookings")
      .select("customer_id, customer_name, customer_phone, scheduled_date, price_cents")
      .neq("status", "cancelled")
      .then(({ data }) => {
        if (!active) return;
        const byCustomer = new Map<string, ClientSummary>();
        (data ?? []).forEach((row) => {
          const id = row.customer_id ?? row.customer_phone;
          const existing = byCustomer.get(id);
          if (!existing) {
            byCustomer.set(id, {
              customerId: id,
              name: row.customer_name,
              phone: row.customer_phone,
              visits: 1,
              lastVisit: row.scheduled_date,
              totalCents: row.price_cents,
            });
          } else {
            existing.visits += 1;
            existing.totalCents += row.price_cents;
            if (row.scheduled_date > existing.lastVisit) existing.lastVisit = row.scheduled_date;
          }
        });
        setClients(Array.from(byCustomer.values()).sort((a, b) => b.totalCents - a.totalCents));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const q = query.trim().toLowerCase();
  return { clients: q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients, loading };
}

export function useFinance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    supabase
      .from("transactions")
      .select("*")
      .gte("occurred_on", from)
      .order("occurred_on", { ascending: false })
      .then(({ data }) => {
        setTransactions(data ?? []);
        setLoading(false);
      });
  }, []);

  const todayKey = dateKey(new Date());
  const monthRevenue = transactions.reduce((sum, t) => sum + t.amount_cents, 0);
  const todayRevenue = transactions.filter((t) => t.occurred_on === todayKey).reduce((s, t) => s + t.amount_cents, 0);
  const productRevenue = transactions.filter((t) => t.order_id).reduce((s, t) => s + t.amount_cents, 0);
  const serviceCount = transactions.filter((t) => t.booking_id).length;
  const avgTicket = serviceCount > 0
    ? Math.round(transactions.filter((t) => t.booking_id).reduce((s, t) => s + t.amount_cents, 0) / serviceCount)
    : 0;

  return { transactions, loading, monthRevenue, todayRevenue, productRevenue, avgTicket, serviceCount };
}

export async function adjustProductStock(id: string, delta: number) {
  const { data: product } = await supabase.from("products").select("stock").eq("id", id).single();
  if (!product) return { error: "Produto não encontrado." };
  const stock = Math.max(0, product.stock + delta);
  const { error } = await supabase.from("products").update({ stock }).eq("id", id);
  return { error: error?.message ?? null };
}

export function useAdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    supabase
      .from("products")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => reload(), [reload]);

  return { products, loading, reload };
}

export function useAdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    supabase
      .from("services")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        setServices(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => reload(), [reload]);

  return { services, loading, reload };
}

export async function updateService(id: string, patch: Partial<Service>) {
  const { error } = await supabase.from("services").update(patch).eq("id", id);
  return { error: error?.message ?? null };
}

export async function removeService(id: string) {
  const { error } = await supabase.from("services").update({ active: false }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function addService(service: Service) {
  const { error } = await supabase.from("services").insert(service);
  return { error: error?.message ?? null };
}

export function useAdminGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    supabase
      .from("gallery_photos")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        setPhotos(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => reload(), [reload]);

  return { photos, loading, reload };
}

export async function removeGalleryPhoto(id: string) {
  const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function uploadGalleryPhoto(file: File, sortOrder: number) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("gallery").upload(path, file);
  if (uploadError) return { error: uploadError.message };

  const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
  const { error } = await supabase.from("gallery_photos").insert({
    image_path: pub.publicUrl,
    kind: "autoral",
    service_label: null,
    client_label: null,
    barber_id: null,
    taken_on: new Date().toISOString().slice(0, 10),
    sort_order: sortOrder,
  });
  return { error: error?.message ?? null };
}

export async function toggleBarberHour(hours: BarberHours, defaultSlots: string[]) {
  const { error } = await supabase
    .from("barber_hours")
    .update({
      is_open: !hours.is_open,
      label: hours.is_open ? "Fechado" : "09:00 — 20:00",
      slots: hours.is_open ? [] : defaultSlots,
    })
    .eq("id", hours.id);
  return { error: error?.message ?? null };
}
