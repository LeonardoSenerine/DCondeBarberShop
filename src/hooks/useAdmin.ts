import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { dateKey, formatTimeShort } from "@/lib/format";
import type { BookingWithDetails } from "@/hooks/useBooking";
import type { BookingStatus, Database } from "@/types/database";

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
        const rows = (data ?? []) as unknown as BookingWithDetails[];
        setAgenda(rows.length === 0 && import.meta.env.DEV ? sampleAgenda(key) : rows);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => reload(), [reload]);

  return { agenda, loading, reload };
}

/** Barber accepts ("confirmed") or turns down ("cancelled") a pending request. */
export async function setBookingStatus(id: string, status: "confirmed" | "cancelled") {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  return { error: error?.message ?? null };
}

export interface CompleteBookingProduct {
  productId: string;
  name: string;
  qty: number;
  unitCents: number;
}

export interface CompleteBookingInput {
  bookingId: string;
  serviceName: string;
  serviceCents: number;
  paymentMethod: Transaction["payment_method"];
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  products: CompleteBookingProduct[];
}

/**
 * Marks a booking as done, books its revenue (and any products the client
 * took) into the financial ledger, and takes the products out of stock.
 */
export async function completeBooking(input: CompleteBookingInput) {
  const { error: bookingErr } = await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", input.bookingId);
  if (bookingErr) return { error: bookingErr.message };

  const today = dateKey(new Date());
  const { error: serviceTxErr } = await supabase.from("transactions").insert({
    occurred_on: today,
    description: input.serviceName,
    payment_method: input.paymentMethod,
    amount_cents: input.serviceCents,
    booking_id: input.bookingId,
    order_id: null,
  });
  if (serviceTxErr) return { error: serviceTxErr.message };

  if (input.products.length > 0) {
    const totalCents = input.products.reduce((s, p) => s + p.unitCents * p.qty, 0);
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: input.customerId,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        status: "completed",
        total_cents: totalCents,
      })
      .select()
      .single();
    if (orderErr || !order) return { error: orderErr?.message ?? "Não foi possível registrar os produtos." };

    const { error: itemsErr } = await supabase.from("order_items").insert(
      input.products.map((p) => ({
        order_id: order.id,
        product_id: p.productId,
        quantity: p.qty,
        unit_price_cents: p.unitCents,
      })),
    );
    if (itemsErr) return { error: itemsErr.message };

    const { error: productTxErr } = await supabase.from("transactions").insert({
      occurred_on: today,
      description: input.products.map((p) => `${p.qty}x ${p.name}`).join(", "),
      payment_method: input.paymentMethod,
      amount_cents: totalCents,
      booking_id: null,
      order_id: order.id,
    });
    if (productTxErr) return { error: productTxErr.message };

    for (const p of input.products) {
      await adjustProductStock(p.productId, -p.qty);
    }
  }

  return { error: null };
}

export interface ClientSummary {
  customerId: string;
  name: string;
  phone: string;
  visits: number;
  lastVisit: string;
  totalCents: number;
}

export interface ClientFilters {
  query: string;
  from: string;
  to: string;
}

export function useClients({ query, from, to }: ClientFilters) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("bookings")
      .select("customer_id, customer_name, customer_phone, scheduled_date, price_cents")
      .not("status", "in", "(cancelled,pending)")
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
        const list = Array.from(byCustomer.values()).sort((a, b) => b.totalCents - a.totalCents);
        setClients(list.length === 0 && import.meta.env.DEV ? SAMPLE_CLIENT_ROWS : list);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = clients.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (from && c.lastVisit < from) return false;
    if (to && c.lastVisit > to) return false;
    return true;
  });
  return { clients: filtered, loading };
}

export type FinancePeriod = "today" | "7d" | "month" | "30d" | "prev_month" | "custom";

export interface FinanceRange {
  from: string;
  to: string;
  label: string;
}

function financeRange(period: FinancePeriod, custom?: { from: string; to: string }): FinanceRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);

  switch (period) {
    case "today":
      return { from: dateKey(today), to: dateKey(today), label: "Hoje" };
    case "7d":
      start.setDate(today.getDate() - 6);
      return { from: dateKey(start), to: dateKey(today), label: "Últimos 7 dias" };
    case "30d":
      start.setDate(today.getDate() - 29);
      return { from: dateKey(start), to: dateKey(today), label: "Últimos 30 dias" };
    case "prev_month": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: dateKey(first), to: dateKey(last), label: "Mês passado" };
    }
    case "custom": {
      if (custom?.from && custom?.to) {
        const a = custom.from <= custom.to ? custom.from : custom.to;
        const b = custom.from <= custom.to ? custom.to : custom.from;
        return { from: a, to: b, label: "Personalizado" };
      }
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: dateKey(first), to: dateKey(today), label: "Personalizado" };
    }
    case "month":
    default: {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: dateKey(first), to: dateKey(today), label: "Este mês" };
    }
  }
}

const OPEN_HOUR = 9;
const CLOSE_HOUR = 20;

// ---- DEV-only sample ledger, so the panel shows a populated finance view
// on `npm run dev` before there is real data / an admin session. ----
const SAMPLE_SERVICES: [string, number][] = [
  ["Corte", 4500],
  ["Corte + sobrancelha", 5000],
  ["Barba terapia", 5000],
  ["Corte + barba terapia", 9500],
  ["Corte infantil", 4500],
  ["Barba tradicional completa", 4500],
  ["Platinado", 20000],
  ["Luzes", 15000],
  ["Pezinho", 2500],
];
const SAMPLE_PRODUCTS: [string, number][] = [
  ["Pomada modeladora efeito matte", 4200],
  ["Óleo para barba 30ml", 4400],
  ["Cera capilar fixação forte", 5200],
  ["Balm pós-barba", 3500],
];
const SAMPLE_CLIENTS = [
  "Rafael Prado", "Gabriel Mota", "Théo Almeida", "André Nunes", "Kauê Silva", "Nina Rocha",
  "Enzo Barros", "Matheus Lima", "Vinícius Teixeira", "Bruno Camargo", "Davi Reis", "Miguel Antunes",
];
const SAMPLE_BARBERS: { id: string; name: string }[] = [
  { id: "daniel", name: "Daniel" },
  { id: "joao", name: "João Lima" },
];
const SAMPLE_METHODS: Transaction["payment_method"][] = ["Pix", "Crédito", "Débito", "Dinheiro"];

/** A transaction plus the barber / client it came from (via its booking). */
export type FinanceTx = Transaction & { barber_id: string | null; customer_name: string | null };

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleLedger(days = 45): FinanceTx[] {
  const rnd = mulberry32(20260910);
  const rows: FinanceTx[] = [];
  let id = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    if (date.getDay() === 0) continue; // fechado aos domingos
    const key = dateKey(date);
    const count = 3 + Math.floor(rnd() * 7);
    for (let i = 0; i < count; i++) {
      const [name, price] = SAMPLE_SERVICES[Math.floor(rnd() * SAMPLE_SERVICES.length)];
      const barber = SAMPLE_BARBERS[Math.floor(rnd() * SAMPLE_BARBERS.length)];
      const client = SAMPLE_CLIENTS[Math.floor(rnd() * SAMPLE_CLIENTS.length)];
      const hour = OPEN_HOUR + Math.floor(rnd() * (CLOSE_HOUR - OPEN_HOUR));
      const min = Math.floor(rnd() * 60);
      rows.push({
        id: id++,
        occurred_on: key,
        description: name,
        payment_method: SAMPLE_METHODS[Math.floor(rnd() * SAMPLE_METHODS.length)],
        amount_cents: price,
        booking_id: `sample-${id}`,
        order_id: null,
        created_at: `${key}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`,
        barber_id: barber.id,
        customer_name: client,
      });
    }
    if (rnd() < 0.45) {
      const [pname, pprice] = SAMPLE_PRODUCTS[Math.floor(rnd() * SAMPLE_PRODUCTS.length)];
      const hour = OPEN_HOUR + Math.floor(rnd() * (CLOSE_HOUR - OPEN_HOUR));
      rows.push({
        id: id++,
        occurred_on: key,
        description: pname,
        payment_method: SAMPLE_METHODS[Math.floor(rnd() * SAMPLE_METHODS.length)],
        amount_cents: pprice,
        booking_id: null,
        order_id: `sample-order-${id}`,
        created_at: `${key}T${String(hour).padStart(2, "0")}:30:00`,
        barber_id: null,
        customer_name: null,
      });
    }
  }
  return rows;
}

export const SAMPLE_CLIENT_ROWS: ClientSummary[] = SAMPLE_CLIENTS.map((name, i) => {
  const rnd = mulberry32(700 + i);
  const visits = 2 + Math.floor(rnd() * 12);
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(rnd() * 40));
  return {
    customerId: `sample-client-${i}`,
    name,
    phone: `(18) 9${String(90000000 + Math.floor(rnd() * 9999999)).slice(0, 8)}`,
    visits,
    lastVisit: dateKey(d),
    totalCents: visits * (3500 + Math.floor(rnd() * 6000)),
  };
}).sort((a, b) => b.totalCents - a.totalCents);

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return h;
}

/** DEV-only mocked agenda for a date, seeded by that date so it stays stable across reloads. */
function sampleAgenda(key: string): BookingWithDetails[] {
  const rnd = mulberry32(hashString(key));
  const count = 5 + Math.floor(rnd() * 5);
  const usedTimes = new Set<string>();
  const rows: BookingWithDetails[] = [];

  for (let i = 0; i < count; i++) {
    const [serviceName, priceCents] = SAMPLE_SERVICES[Math.floor(rnd() * SAMPLE_SERVICES.length)];
    const barber = SAMPLE_BARBERS[Math.floor(rnd() * SAMPLE_BARBERS.length)];
    const client = SAMPLE_CLIENTS[Math.floor(rnd() * SAMPLE_CLIENTS.length)];

    let time = "";
    do {
      const hour = OPEN_HOUR + Math.floor(rnd() * (CLOSE_HOUR - OPEN_HOUR));
      const min = Math.floor(rnd() * 2) * 30;
      time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
    } while (usedTimes.has(time));
    usedTimes.add(time);

    const statusRoll = rnd();
    const status: BookingStatus = statusRoll < 0.15 ? "pending" : statusRoll < 0.85 ? "confirmed" : "cancelled";

    rows.push({
      id: `sample-booking-${key}-${i}`,
      customer_id: null,
      barber_id: barber.id,
      service_id: `sample-service-${i}`,
      scheduled_date: key,
      scheduled_time: time,
      status,
      price_cents: priceCents,
      customer_name: client,
      customer_phone: `(18) 9${String(90000000 + Math.floor(rnd() * 9999999)).slice(0, 8)}`,
      created_at: new Date().toISOString(),
      barbers: { name: barber.name },
      services: { name: serviceName, duration_minutes: 30 },
    });
  }

  return rows.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
}

export interface ClientAppointment {
  id: string;
  date: string;
  time: string;
  service: string;
  barber: string;
  priceCents: number;
  status: "Concluído" | "Confirmado" | "Faltou";
}

export interface ClientPurchase {
  id: string;
  date: string;
  product: string;
  qty: number;
  priceCents: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bookingStatusLabel(status: string): ClientAppointment["status"] {
  if (status === "confirmed") return "Confirmado";
  if (status === "no_show") return "Faltou";
  return "Concluído";
}

/** DEV-only mocked appointment/purchase history, used only while the real query comes back empty. */
function sampleClientHistory(client: ClientSummary): { appointments: ClientAppointment[]; purchases: ClientPurchase[] } {
  const rnd = mulberry32(hashString(client.customerId));

  const appointments: ClientAppointment[] = Array.from({ length: Math.max(client.visits, 1) }, (_, i) => {
    const [service, priceCents] = SAMPLE_SERVICES[Math.floor(rnd() * SAMPLE_SERVICES.length)];
    const barber = SAMPLE_BARBERS[Math.floor(rnd() * SAMPLE_BARBERS.length)];
    const d = new Date();
    d.setDate(d.getDate() - (Math.floor(rnd() * 14) + i * 9));
    const hour = OPEN_HOUR + Math.floor(rnd() * (CLOSE_HOUR - OPEN_HOUR));
    const min = Math.floor(rnd() * 60);
    return {
      id: `${client.customerId}-appt-${i}`,
      date: dateKey(d),
      time: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
      service,
      barber: barber.name,
      priceCents,
      status: i === 0 ? "Confirmado" : "Concluído",
    } as ClientAppointment;
  }).sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));

  const purchaseCount = Math.floor(rnd() * 3);
  const purchases: ClientPurchase[] = Array.from({ length: purchaseCount }, (_, i) => {
    const [product, unitCents] = SAMPLE_PRODUCTS[Math.floor(rnd() * SAMPLE_PRODUCTS.length)];
    const qty = 1 + Math.floor(rnd() * 2);
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(rnd() * 90));
    return {
      id: `${client.customerId}-prod-${i}`,
      date: dateKey(d),
      product,
      qty,
      priceCents: unitCents * qty,
    };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));

  return { appointments, purchases };
}

/** A client's real appointment and product-purchase history, matched by account id or phone. */
export function useClientHistory(client: ClientSummary | null) {
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [purchases, setPurchases] = useState<ClientPurchase[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!client) {
      setAppointments([]);
      setPurchases([]);
      return;
    }
    let active = true;
    setLoading(true);

    const orFilter = UUID_RE.test(client.customerId)
      ? `customer_id.eq.${client.customerId},customer_phone.eq.${client.phone}`
      : `customer_phone.eq.${client.phone}`;

    const bookingsQuery = supabase
      .from("bookings")
      .select("id, scheduled_date, scheduled_time, status, price_cents, barbers(name), services(name)")
      .or(orFilter)
      .not("status", "in", "(cancelled,pending)")
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: false });

    const ordersQuery = supabase
      .from("orders")
      .select("id, created_at, order_items(quantity, unit_price_cents, products(name))")
      .or(orFilter)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    Promise.all([bookingsQuery, ordersQuery]).then(([bookingsRes, ordersRes]) => {
      if (!active) return;

      const rawBookings = (bookingsRes.data ?? []) as unknown as {
        id: string;
        scheduled_date: string;
        scheduled_time: string;
        status: string;
        price_cents: number;
        barbers: { name: string } | null;
        services: { name: string } | null;
      }[];
      const appts: ClientAppointment[] = rawBookings.map((b) => ({
        id: b.id,
        date: b.scheduled_date,
        time: formatTimeShort(b.scheduled_time),
        service: b.services?.name ?? "Serviço",
        barber: b.barbers?.name ?? "—",
        priceCents: b.price_cents,
        status: bookingStatusLabel(b.status),
      }));

      const rawOrders = (ordersRes.data ?? []) as unknown as {
        id: string;
        created_at: string;
        order_items: { quantity: number; unit_price_cents: number; products: { name: string } | null }[] | null;
      }[];
      const items: ClientPurchase[] = [];
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

      if (appts.length === 0 && items.length === 0 && import.meta.env.DEV) {
        const sample = sampleClientHistory(client);
        setAppointments(sample.appointments);
        setPurchases(sample.purchases);
      } else {
        setAppointments(appts);
        setPurchases(items.sort((a, b) => (a.date < b.date ? 1 : -1)));
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [client]);

  return { appointments, purchases, loading };
}

export interface FinanceMethodSlice {
  method: Transaction["payment_method"];
  value: number;
  pct: number;
}

export interface FinanceBar {
  key: string;
  label: string;
  value: number;
}

export function useFinance(
  period: FinancePeriod = "month",
  custom?: { from: string; to: string },
  barberId: string = "all",
) {
  const [allTx, setAllTx] = useState<FinanceTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSample, setIsSample] = useState(false);
  const range = financeRange(period, custom);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("transactions")
      .select("*, bookings(barber_id, customer_name)")
      .gte("occurred_on", range.from)
      .lte("occurred_on", range.to)
      .order("occurred_on", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        const raw = (data ?? []) as (Transaction & { bookings: { barber_id: string; customer_name: string } | null })[];
        const rows: FinanceTx[] = raw.map(({ bookings, ...t }) => ({
          ...t,
          barber_id: bookings?.barber_id ?? null,
          customer_name: bookings?.customer_name ?? null,
        }));
        if (rows.length === 0 && import.meta.env.DEV) {
          setAllTx(sampleLedger().filter((t) => t.occurred_on >= range.from && t.occurred_on <= range.to));
          setIsSample(true);
        } else {
          setAllTx(rows);
          setIsSample(false);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  const transactions = barberId === "all" ? allTx : allTx.filter((t) => t.barber_id === barberId);
  const revenue = transactions.reduce((s, t) => s + t.amount_cents, 0);
  const serviceRows = transactions.filter((t) => t.booking_id);
  const serviceCount = serviceRows.length;
  const serviceRevenue = serviceRows.reduce((s, t) => s + t.amount_cents, 0);
  const productRevenue = transactions.filter((t) => t.order_id).reduce((s, t) => s + t.amount_cents, 0);
  const avgTicket = serviceCount > 0 ? Math.round(serviceRevenue / serviceCount) : 0;

  // "Hoje" plots by hour of the day; every other range plots by day.
  const chartUnit: "hora" | "dia" = period === "today" ? "hora" : "dia";
  let chart: FinanceBar[];

  if (chartUnit === "hora") {
    const buckets = new Map<number, number>();
    for (let h = OPEN_HOUR; h <= CLOSE_HOUR; h++) buckets.set(h, 0);
    transactions.forEach((t) => {
      const h = new Date(t.created_at).getHours();
      if (buckets.has(h)) buckets.set(h, (buckets.get(h) ?? 0) + t.amount_cents);
    });
    chart = Array.from(buckets.entries()).map(([h, value]) => ({
      key: String(h),
      label: `${String(h).padStart(2, "0")}h`,
      value,
    }));
  } else {
    const byDayMap = new Map<string, number>();
    transactions.forEach((t) => byDayMap.set(t.occurred_on, (byDayMap.get(t.occurred_on) ?? 0) + t.amount_cents));
    chart = Array.from(byDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ key: date, label: date.slice(8, 10), value }));
  }

  const byMethod: FinanceMethodSlice[] = SAMPLE_METHODS.map((method) => {
    const value = transactions.filter((t) => t.payment_method === method).reduce((s, t) => s + t.amount_cents, 0);
    return { method, value, pct: revenue > 0 ? value / revenue : 0 };
  }).sort((a, b) => b.value - a.value);

  return {
    transactions,
    loading,
    isSample,
    range,
    revenue,
    productRevenue,
    avgTicket,
    serviceCount,
    chart,
    chartUnit,
    byMethod,
  };
}

export async function adjustProductStock(id: string, delta: number) {
  const { data: product } = await supabase.from("products").select("stock").eq("id", id).single();
  if (!product) return { error: "Produto não encontrado." };
  const stock = Math.max(0, product.stock + delta);
  const { error } = await supabase.from("products").update({ stock }).eq("id", id);
  return { error: error?.message ?? null };
}

export interface ProductInput {
  name: string;
  description: string | null;
  category: Product["category"];
  price_cents: number;
  stock: number;
  image_path: string | null;
  sale_percent: number;
  sale_from: string | null;
  sale_until: string | null;
}

export async function uploadProductPhoto(file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `products/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("gallery").upload(path, file);
  if (error) return { url: null, error: error.message };
  const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
  return { url: pub.publicUrl, error: null };
}

export async function saveProduct(input: ProductInput, id?: string) {
  const { error } = id
    ? await supabase.from("products").update(input).eq("id", id)
    : await supabase.from("products").insert({ ...input, active: true });
  return { error: error?.message ?? null };
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
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

export interface GalleryPhotoMeta {
  barberId: string | null;
  serviceLabel: string | null;
  clientLabel: string | null;
}

export async function uploadGalleryPhoto(file: File, sortOrder: number, meta: GalleryPhotoMeta) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("gallery").upload(path, file);
  if (uploadError) return { error: uploadError.message };

  const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
  const { error } = await supabase.from("gallery_photos").insert({
    image_path: pub.publicUrl,
    kind: "autoral",
    service_label: meta.serviceLabel,
    client_label: meta.clientLabel,
    barber_id: meta.barberId,
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
      label: hours.is_open ? "Fechado" : "09:00 às 20:00",
      slots: hours.is_open ? [] : defaultSlots,
    })
    .eq("id", hours.id);
  return { error: error?.message ?? null };
}

// ---------------------------------------------------------------------------
// barber management
// ---------------------------------------------------------------------------

export interface BarberInput {
  id: string;
  name: string;
  role_title: string;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  photo_path: string;
  gallery_paths: string[];
}

export interface WeekdayHours {
  weekday: number;
  is_open: boolean;
  label: string;
  slots: string[];
}

export async function uploadBarberPhoto(file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `barbers/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("gallery").upload(path, file);
  if (error) return { url: null, error: error.message };
  const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
  return { url: pub.publicUrl, error: null };
}

export async function saveBarber(input: BarberInput, hours: WeekdayHours[], isNew: boolean) {
  if (isNew) {
    const { error } = await supabase.from("barbers").insert({ ...input, sort_order: 99 });
    if (error) return { error: error.message };
  } else {
    const { id, ...patch } = input;
    const { error } = await supabase.from("barbers").update(patch).eq("id", id);
    if (error) return { error: error.message };
  }

  for (const h of hours) {
    const { error } = await supabase
      .from("barber_hours")
      .upsert(
        { barber_id: input.id, weekday: h.weekday, is_open: h.is_open, label: h.label, slots: h.slots },
        { onConflict: "barber_id,weekday" },
      );
    if (error) return { error: error.message };
  }
  return { error: null };
}

export async function deleteBarber(id: string) {
  const { error } = await supabase.from("barbers").delete().eq("id", id);
  return { error: error?.message ?? null };
}
