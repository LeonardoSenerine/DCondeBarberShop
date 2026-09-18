import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { dateKey, formatTimeShort } from "@/lib/format";
import type { BookingWithDetails } from "@/hooks/useBooking";
import type { BookingStatus, Database, OrderStatus, PaymentMethod } from "@/types/database";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type Service = Database["public"]["Tables"]["services"]["Row"];
export type GalleryPhoto = Database["public"]["Tables"]["gallery_photos"]["Row"];
type BarberHours = Database["public"]["Tables"]["barber_hours"]["Row"];

export function useAgendaForDate(date: Date) {
  const [agenda, setAgenda] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const key = dateKey(date);
  // reload() runs both from the date-change effect below and from callers
  // reloading after an action — bump this on every call and only apply the
  // response that's still the latest one requested, so a slower stale
  // fetch (e.g. from a date switched away from) can't overwrite fresher data.
  const requestId = useRef(0);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    supabase
      .from("bookings")
      .select("*, barbers(name), services(name, duration_minutes)")
      .eq("scheduled_date", key)
      .order("scheduled_time")
      .then(({ data }) => {
        if (id !== requestId.current) return;
        const rows = (data ?? []) as unknown as BookingWithDetails[];
        setAgenda(rows.length === 0 && import.meta.env.DEV ? sampleAgenda(key) : rows);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => reload(), [reload]);

  // Keeps the visible day in sync with bookings created or changed by anyone
  // else (customer, other staff) while this tab is open — no manual refresh needed.
  useEffect(() => {
    const channel = supabase
      .channel(`agenda-${key}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [key, reload]);

  return { agenda, loading, reload };
}

/**
 * All bookings still needing action, across every date — not just today.
 * Split into "pending" (awaiting accept/decline) and "confirmed" (awaiting
 * completion) so nothing scheduled for another day gets missed.
 */
export function useAgendaTotals() {
  const [pending, setPending] = useState<BookingWithDetails[]>([]);
  const [confirmed, setConfirmed] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  // See the matching comment in useAgendaForDate — same stale-response guard.
  const requestId = useRef(0);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    supabase
      .from("bookings")
      .select("*, barbers(name), services(name, duration_minutes)")
      .in("status", ["pending", "confirmed"])
      .order("scheduled_date")
      .order("scheduled_time")
      .then(({ data }) => {
        if (id !== requestId.current) return;
        const rows = (data ?? []) as unknown as BookingWithDetails[];
        const source = rows.length === 0 && import.meta.env.DEV ? sampleAgendaTotals() : rows;
        setPending(source.filter((r) => r.status === "pending"));
        setConfirmed(source.filter((r) => r.status === "confirmed"));
        setLoading(false);
      });
  }, []);

  useEffect(() => reload(), [reload]);

  // Same live-refresh as useAgendaForDate, so the pending/confirmed totals shown
  // in the sidebar and header stay accurate without a page reload.
  useEffect(() => {
    const channel = supabase
      .channel("agenda-totals")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [reload]);

  return { pending, confirmed, loading, reload };
}

/** Barber accepts ("confirmed") or turns down ("cancelled") a pending request. */
export async function setBookingStatus(id: string, status: "confirmed" | "cancelled") {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  return { error: error?.message ?? null };
}

/** Turns down a pending request with a reason, so the customer sees why instead of a silent cancellation. */
export async function declineBooking(id: string, reason: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", decline_reason: reason.trim() })
    .eq("id", id);
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
  barberId: string;
  serviceId: string;
  serviceName: string;
  serviceCents: number;
  durationMinutes: number;
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
  // Reserve all the stock first, atomically and all-or-nothing (see
  // adjust_product_stock_batch in schema.sql). Doing this before any other
  // write means that if it fails — e.g. losing a race for the last unit of
  // a product — nothing below has been written yet, so simply retrying is
  // safe instead of a second attempt duplicating the revenue/order rows a
  // partially-completed first attempt already inserted.
  if (input.products.length > 0) {
    const { error: stockErr } = (await (supabase.rpc as any)("adjust_product_stock_batch", {
      deltas: input.products.map((p) => ({ id: p.productId, delta: -p.qty })),
    })) as { error: { message: string } | null };
    if (stockErr) {
      if (stockErr.message === "insufficient_stock") {
        return { error: "Estoque insuficiente para um dos produtos selecionados." };
      }
      if (stockErr.message === "product_not_found") {
        return { error: "Um dos produtos selecionados não foi encontrado." };
      }
      return { error: stockErr.message };
    }
  }

  // service_id/price_cents/duration_minutes are normally locked (see
  // bookings_restrict_update in schema.sql) — writable here because this is
  // the one place an admin is allowed to swap in whatever the barber
  // actually performed, if it ended up different from what was booked.
  const { error: bookingErr } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      service_id: input.serviceId,
      price_cents: input.serviceCents,
      duration_minutes: input.durationMinutes,
    })
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
    barber_id: input.barberId,
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
      barber_id: input.barberId,
    });
    if (productTxErr) return { error: productTxErr.message };
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

export type FinancePeriod = "7d" | "30d" | "custom";

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
    case "7d":
      start.setDate(today.getDate() - 6);
      return { from: dateKey(start), to: dateKey(today), label: "Últimos 7 dias" };
    case "custom": {
      if (custom?.from && custom?.to) {
        const a = custom.from <= custom.to ? custom.from : custom.to;
        const b = custom.from <= custom.to ? custom.to : custom.from;
        return { from: a, to: b, label: "Personalizado" };
      }
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: dateKey(first), to: dateKey(today), label: "Personalizado" };
    }
    case "30d":
    default:
      start.setDate(today.getDate() - 29);
      return { from: dateKey(start), to: dateKey(today), label: "Últimos 30 dias" };
  }
}

const OPEN_HOUR = 9;
const CLOSE_HOUR = 20;

// ---- DEV-only sample ledger, so the panel shows a populated finance view
// on `npm run dev` before there is real data / an admin session. ----
const SAMPLE_SERVICES: [string, number, number][] = [
  ["Corte", 4500, 45],
  ["Corte + sobrancelha", 5000, 55],
  ["Barba terapia", 5000, 40],
  ["Corte + barba terapia", 9500, 80],
  ["Corte infantil", 4500, 40],
  ["Barba tradicional completa", 4500, 40],
  ["Platinado", 20000, 180],
  ["Luzes", 15000, 240],
  ["Pezinho", 2500, 20],
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
    const [serviceName, priceCents, durationMinutes] = SAMPLE_SERVICES[Math.floor(rnd() * SAMPLE_SERVICES.length)];
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
      duration_minutes: durationMinutes,
      customer_name: client,
      customer_phone: `(18) 9${String(90000000 + Math.floor(rnd() * 9999999)).slice(0, 8)}`,
      customer_email: null,
      reminder_sent_at: null,
      review_dismissed_at: null,
      decline_reason: null,
      decline_seen_at: null,
      cancel_reason: null,
      created_at: new Date().toISOString(),
      barbers: { name: barber.name },
      services: { name: serviceName, duration_minutes: durationMinutes },
    });
  }

  return rows.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
}

/** DEV-only mocked agenda spanning a few days, for previewing the "totals" queue. */
function sampleAgendaTotals(): BookingWithDetails[] {
  const today = new Date();
  const keys = [-1, 0, 1, 2, 3].map((d) => dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + d)));
  return keys
    .flatMap((k) => sampleAgenda(k).map((r) => ({ ...r, id: `${r.id}-totals` })))
    .filter((r) => r.status === "pending" || r.status === "confirmed");
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

/** Shared shape for a "mais vendidos" ranking, whether it's services or products. */
export interface FinanceRankItem {
  name: string;
  count: number;
  value: number;
  pct: number;
}

export interface FinanceBar {
  key: string;
  label: string;
  value: number;
}

/** The equivalent period immediately before `range`, same length — for the "vs. período anterior" comparison. */
function previousRange(range: FinanceRange): { from: string; to: string } {
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T00:00:00`);
  const spanDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  const prevTo = new Date(from.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - (spanDays - 1) * 86400000);
  return { from: dateKey(prevFrom), to: dateKey(prevTo) };
}

export function useFinance(
  period: FinancePeriod = "30d",
  custom?: { from: string; to: string },
  barberId: string = "all",
) {
  const [allTx, setAllTx] = useState<FinanceTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSample, setIsSample] = useState(false);
  const [previousRevenue, setPreviousRevenue] = useState<number | null>(null);
  const [productItems, setProductItems] = useState<{ name: string; quantity: number; unitCents: number; orderId: string }[]>([]);
  const range = financeRange(period, custom);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("transactions")
      .select("*, bookings(customer_name)")
      .gte("occurred_on", range.from)
      .lte("occurred_on", range.to)
      .order("occurred_on", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        const raw = (data ?? []) as (Transaction & { bookings: { customer_name: string } | null })[];
        const rows: FinanceTx[] = raw.map(({ bookings, ...t }) => ({
          ...t,
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

  // Just the total for the "vs. período anterior" badge — no need for full rows.
  useEffect(() => {
    let active = true;
    const prev = previousRange(range);
    supabase
      .from("transactions")
      .select("amount_cents, barber_id")
      .gte("occurred_on", prev.from)
      .lte("occurred_on", prev.to)
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? []) as { amount_cents: number; barber_id: string | null }[];
        const scoped = barberId === "all" ? rows : rows.filter((r) => r.barber_id === barberId);
        setPreviousRevenue(scoped.reduce((s, r) => s + r.amount_cents, 0));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, barberId]);

  const transactions = barberId === "all" ? allTx : allTx.filter((t) => t.barber_id === barberId);
  const revenue = transactions.reduce((s, t) => s + t.amount_cents, 0);
  const serviceRows = transactions.filter((t) => t.booking_id);
  const serviceCount = serviceRows.length;
  const serviceRevenue = serviceRows.reduce((s, t) => s + t.amount_cents, 0);
  const productOrderRows = transactions.filter((t) => t.order_id);
  const productRevenue = productOrderRows.reduce((s, t) => s + t.amount_cents, 0);
  const avgTicket = serviceCount > 0 ? Math.round(serviceRevenue / serviceCount) : 0;
  const revenueChangePct = previousRevenue && previousRevenue > 0 ? (revenue - previousRevenue) / previousRevenue : null;

  // Each transaction with an order_id can bundle several products together
  // (its description is a comma list, e.g. "2x Pomada, 1x Óleo"), so a
  // per-product ranking needs the actual order_items — fetched separately
  // once we know which orders fall in this period/barber.
  const productOrderIds = productOrderRows.map((t) => t.order_id as string);
  const productOrderIdsKey = [...new Set(productOrderIds)].sort().join(",");

  useEffect(() => {
    let active = true;
    if (productOrderIds.length === 0) {
      setProductItems([]);
      return;
    }
    supabase
      .from("order_items")
      .select("order_id, quantity, unit_price_cents, products(name)")
      .in("order_id", [...new Set(productOrderIds)])
      .then(({ data }) => {
        if (!active) return;
        type Row = { order_id: string; quantity: number; unit_price_cents: number; products: { name: string } | null };
        setProductItems(
          ((data ?? []) as Row[]).map((it) => ({
            orderId: it.order_id,
            name: it.products?.name ?? "Produto removido",
            quantity: it.quantity,
            unitCents: it.unit_price_cents,
          })),
        );
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productOrderIdsKey]);

  const byDayMap = new Map<string, number>();
  transactions.forEach((t) => byDayMap.set(t.occurred_on, (byDayMap.get(t.occurred_on) ?? 0) + t.amount_cents));
  const chart: FinanceBar[] = Array.from(byDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ key: date, label: date.slice(8, 10), value }));

  const byMethod: FinanceMethodSlice[] = SAMPLE_METHODS.map((method) => {
    const value = transactions.filter((t) => t.payment_method === method).reduce((s, t) => s + t.amount_cents, 0);
    return { method, value, pct: revenue > 0 ? value / revenue : 0 };
  }).sort((a, b) => b.value - a.value);

  function rankByCount(entries: Map<string, { count: number; value: number }>): FinanceRankItem[] {
    const max = Math.max(1, ...Array.from(entries.values()).map((v) => v.count));
    return Array.from(entries.entries())
      .map(([name, { count, value }]) => ({ name, count, value, pct: count / max }))
      .sort((a, b) => b.count - a.count);
  }

  // Grouped by description rather than a join to services — completeBooking()
  // writes the service actually performed as the transaction's description
  // (see CompleteBookingModal's "Serviço realizado"), so this already
  // reflects a swapped service correctly without extra joins. Ranked by how
  // many times each service was performed, not by revenue — a R$200 "luzes"
  // done twice shouldn't outrank a R$40 corte done 30 times on a "mais
  // vendidos" list.
  const byServiceMap = new Map<string, { count: number; value: number }>();
  serviceRows.forEach((t) => {
    const prev = byServiceMap.get(t.description) ?? { count: 0, value: 0 };
    byServiceMap.set(t.description, { count: prev.count + 1, value: prev.value + t.amount_cents });
  });
  const byService = rankByCount(byServiceMap);

  const byProductMap = new Map<string, { count: number; value: number }>();
  productItems.forEach((it) => {
    const prev = byProductMap.get(it.name) ?? { count: 0, value: 0 };
    byProductMap.set(it.name, { count: prev.count + it.quantity, value: prev.value + it.quantity * it.unitCents });
  });
  const byProduct = rankByCount(byProductMap);

  return {
    transactions,
    revenueChangePct,
    loading,
    isSample,
    range,
    revenue,
    productRevenue,
    avgTicket,
    serviceCount,
    chart,
    byMethod,
    byService,
    byProduct,
    productItems,
  };
}

// Goes through the adjust_product_stock() Postgres function (a single
// atomic UPDATE) instead of a JS read-then-write, so two concurrent callers
// decrementing the same product's last unit can't both succeed — see the
// function's definition in schema.sql for why.
export async function adjustProductStock(id: string, delta: number) {
  const { error } = (await (supabase.rpc as any)("adjust_product_stock", {
    p_product_id: id,
    p_delta: delta,
  })) as { data: number | null; error: { message: string } | null };
  if (!error) return { error: null };
  if (error.message === "insufficient_stock") return { error: "Estoque insuficiente para essa operação." };
  if (error.message === "product_not_found") return { error: "Produto não encontrado." };
  return { error: error.message };
}

/**
 * Declares the true stock count (e.g. after a manual inventory count),
 * unlike adjustProductStock()'s relative delta — a plain overwrite, not
 * computed from a value the admin saw earlier, so it can't land on the
 * wrong number if a sale/restock happened while the edit form was open.
 */
export async function setProductStock(id: string, stock: number) {
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
  if (id) {
    // Stock is excluded here on purpose: this form captures it once when it
    // opens, so writing it back would stomp any sale/restock that went
    // through adjust_product_stock() while the form was open. Stock only
    // ever changes through that atomic path — see ProductsTab's +/- stepper.
    const { stock: _stock, ...fields } = input;
    const { error } = await supabase.from("products").update(fields).eq("id", id);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from("products").insert({ ...input, active: true });
  return { error: error?.message ?? null };
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (!error) return { error: null };
  // 23503 = foreign_key_violation — order_items references products
  // without ON DELETE CASCADE, so a product that was ever part of an
  // order can't just vanish and silently corrupt that order's history.
  if (error.code === "23503") {
    return { error: "Esse produto já foi vendido em algum pedido e não pode ser removido enquanto esse pedido existir." };
  }
  return { error: error.message };
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

export interface ProductSale {
  productId: string;
  name: string;
  qty: number;
  revenueCents: number;
}

/**
 * Units sold and revenue per product, from completed orders only — an order
 * placed through the site sits at "pending"/"ready" without ever touching
 * stock (see Shop.tsx), so counting it here would report sales that haven't
 * actually happened yet. completeBooking() is what inserts "completed" rows.
 */
export function useProductSales() {
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    supabase
      .from("orders")
      .select("order_items(product_id, quantity, unit_price_cents, products(name))")
      .eq("status", "completed")
      .then(({ data }) => {
        type Row = {
          order_items:
            | { product_id: string; quantity: number; unit_price_cents: number; products: { name: string } | null }[]
            | null;
        };
        const byProduct = new Map<string, ProductSale>();
        ((data ?? []) as Row[]).forEach((order) => {
          (order.order_items ?? []).forEach((it) => {
            const existing = byProduct.get(it.product_id);
            if (existing) {
              existing.qty += it.quantity;
              existing.revenueCents += it.quantity * it.unit_price_cents;
            } else {
              byProduct.set(it.product_id, {
                productId: it.product_id,
                name: it.products?.name ?? "Produto removido",
                qty: it.quantity,
                revenueCents: it.quantity * it.unit_price_cents,
              });
            }
          });
        });
        setSales(Array.from(byProduct.values()).sort((a, b) => b.qty - a.qty));
        setLoading(false);
      });
  }, []);

  useEffect(() => reload(), [reload]);

  return { sales, loading, reload };
}

export interface AdminOrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitCents: number;
}

export interface AdminOrder {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  cancelReason: string | null;
  items: AdminOrderItem[];
}

/** Reservations placed through the site's shop (Shop.tsx) — separate from
 * the products a client buys at the counter while a booking is completed. */
export function useAdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    supabase
      .from("orders")
      .select(
        "id, customer_name, customer_phone, status, total_cents, created_at, cancel_reason, order_items(product_id, quantity, unit_price_cents, products(name))",
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        type Row = {
          id: string;
          customer_name: string | null;
          customer_phone: string | null;
          status: OrderStatus;
          total_cents: number;
          created_at: string;
          cancel_reason: string | null;
          order_items:
            | { product_id: string; quantity: number; unit_price_cents: number; products: { name: string } | null }[]
            | null;
        };
        const rows = ((data ?? []) as Row[]).map((o) => ({
          id: o.id,
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          status: o.status,
          totalCents: o.total_cents,
          createdAt: o.created_at,
          cancelReason: o.cancel_reason,
          items: (o.order_items ?? []).map((it) => ({
            productId: it.product_id,
            name: it.products?.name ?? "Produto removido",
            quantity: it.quantity,
            unitCents: it.unit_price_cents,
          })),
        }));
        setOrders(rows);
        setLoading(false);
      });
  }, []);

  useEffect(() => reload(), [reload]);

  // Live-refreshes the list on any change (new order, status update from another
  // staff member) so the tab never shows stale data without a manual reload.
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [reload]);

  return { orders, loading, reload };
}

/** Barber reviewed the reservation and accepted it — starts preparing the items. */
export async function acceptOrder(id: string) {
  const { error } = await supabase.from("orders").update({ status: "confirmed" }).eq("id", id);
  return { error: error?.message ?? null };
}

/** Staff prepared the items — the customer can come pick them up. */
export async function markOrderReady(id: string) {
  const { error } = await supabase.from("orders").update({ status: "ready" }).eq("id", id);
  return { error: error?.message ?? null };
}

/** The reservation won't be picked up — no stock to release since it was never reserved. */
export async function cancelOrder(id: string) {
  const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
  return { error: error?.message ?? null };
}

export interface CompleteOrderInput {
  orderId: string;
  items: { productId: string; quantity: number }[];
  totalCents: number;
  description: string;
  paymentMethod: PaymentMethod;
  barberId: string | null;
}

/**
 * Customer paid and picked up the order at the counter: takes the stock out
 * now (a site reservation doesn't touch it — see Shop.tsx), marks the order
 * completed, and books the revenue, mirroring what completeBooking() does
 * for products sold alongside a haircut.
 */
export async function completeOrder(input: CompleteOrderInput) {
  if (input.items.length > 0) {
    const { error: stockErr } = (await (supabase.rpc as any)("adjust_product_stock_batch", {
      deltas: input.items.map((it) => ({ id: it.productId, delta: -it.quantity })),
    })) as { error: { message: string } | null };
    if (stockErr) {
      if (stockErr.message === "insufficient_stock") {
        return { error: "Estoque insuficiente para um dos produtos deste pedido." };
      }
      if (stockErr.message === "product_not_found") {
        return { error: "Um dos produtos deste pedido não foi encontrado." };
      }
      return { error: stockErr.message };
    }
  }

  const { error: orderErr } = await supabase.from("orders").update({ status: "completed" }).eq("id", input.orderId);
  if (orderErr) return { error: orderErr.message };

  const { error: txErr } = await supabase.from("transactions").insert({
    occurred_on: dateKey(new Date()),
    description: input.description,
    payment_method: input.paymentMethod,
    amount_cents: input.totalCents,
    booking_id: null,
    order_id: input.orderId,
    barber_id: input.barberId,
  });
  if (txErr) return { error: txErr.message };

  return { error: null };
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

export async function updateGalleryPhoto(id: string, meta: GalleryPhotoMeta) {
  const { error } = await supabase
    .from("gallery_photos")
    .update({ barber_id: meta.barberId, service_label: meta.serviceLabel, client_label: meta.clientLabel })
    .eq("id", id);
  return { error: error?.message ?? null };
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

const TIME_OFF_MAX_DAYS = 90;

/**
 * A one-off closure (holiday, vacation) for a barber, on top of their weekly
 * hours — `from`/`to` can be the same day for a single closed day, or span a
 * period (e.g. a week of vacation); one row per day gets stored, so the
 * booking-availability check stays a simple per-date lookup.
 */
export async function addBarberTimeOff(barberId: string, from: string, to: string) {
  const dates: string[] = [];
  let cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    dates.push(dateKey(cursor));
    cursor = new Date(cursor.getTime() + 86400000);
    if (dates.length > TIME_OFF_MAX_DAYS) return { error: `Período muito longo — o máximo é ${TIME_OFF_MAX_DAYS} dias.` };
  }
  const { error } = await supabase
    .from("barber_time_off")
    .insert(dates.map((date) => ({ barber_id: barberId, date, reason: null })));
  if (error?.code === "23505") return { error: "Um ou mais desses dias já estão marcados como fechados." };
  return { error: error?.message ?? null };
}

export async function removeBarberTimeOff(ids: string[]) {
  const { error } = await supabase.from("barber_time_off").delete().in("id", ids);
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
  if (!error) return { error: null };
  // Raised by barbers_guard_delete (schema.sql) when the barber still has
  // a pending/confirmed booking — cancelled, completed and no_show ones
  // don't count and get cleared automatically by that same trigger.
  if (error.message === "barber_has_active_bookings") {
    return {
      error: "Esse barbeiro ainda tem agendamentos pendentes ou confirmados e não pode ser removido enquanto eles existirem.",
    };
  }
  // 23503 = foreign_key_violation — belt-and-suspenders backstop in case
  // some other reference (or a project that hasn't re-run schema.sql yet)
  // still blocks it.
  if (error.code === "23503") {
    return {
      error: "Esse barbeiro tem registros vinculados e não pode ser removido enquanto eles existirem.",
    };
  }
  return { error: error.message };
}

// ---------------------------------------------------------------------------
// Staff accounts: linking an existing login (someone who already signed up
// on the site, as a plain customer) to a barber, promoting them to `staff`
// so they can log into /admin scoped to that barber's own agenda/financeiro/
// clientes. Only an owner can actually make this change — the
// prevent_role_escalation trigger in schema.sql silently blocks a staff
// account from granting itself or anyone else more access, even though the
// RLS UPDATE policy lets the request through.
// ---------------------------------------------------------------------------
export interface StaffProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: "customer" | "staff" | "owner";
  barber_id: string | null;
}

/** Every profile currently promoted to staff/owner, so BarbersTab can show who's linked to which barber without a query per card. */
export function useStaffProfiles() {
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, barber_id")
      .in("role", ["staff", "owner"])
      .then(({ data }) => {
        setProfiles((data ?? []) as StaffProfile[]);
        setLoading(false);
      });
  }, []);

  useEffect(() => reload(), [reload]);

  return { profiles, loading, reload };
}

/** Looks up an existing account by e-mail, to link as a barber's staff login — the person has to have signed up on the site at least once already. */
export async function searchProfileByEmail(email: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, barber_id")
    .ilike("email", email.trim())
    .limit(1)
    .maybeSingle();
  return { data: data as StaffProfile | null, error: error?.message ?? null };
}

export async function linkBarberAccount(profileId: string, barberId: string) {
  const { error } = await supabase.from("profiles").update({ role: "staff", barber_id: barberId }).eq("id", profileId);
  return { error: error?.message ?? null };
}

/** Revokes admin access, back to a plain customer account. */
export async function unlinkBarberAccount(profileId: string) {
  const { error } = await supabase.from("profiles").update({ role: "customer", barber_id: null }).eq("id", profileId);
  return { error: error?.message ?? null };
}
