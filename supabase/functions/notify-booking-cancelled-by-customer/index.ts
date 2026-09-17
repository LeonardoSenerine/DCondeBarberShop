// D'Conde Barbearia — e-mail automático pro barbeiro quando o CLIENTE
// cancela o próprio agendamento (ver CancelBookingModal.tsx). Espelha
// notify-booking-declined, só que na direção oposta: lá o barbeiro avisa o
// cliente; aqui o cliente avisa o barbeiro.
//
// Esta função NÃO roda sozinha: ela precisa ser (1) implantada no projeto
// Supabase e (2) chamada por um Database Webhook em UPDATE na tabela
// `bookings`. Nada disso acontece automaticamente ao editar este arquivo —
// são passos manuais no painel, descritos abaixo.
//
// ─────────────────────────────────────────────────────────────────────────
// 1) IMPLANTAR A FUNÇÃO
//
//    Com a Supabase CLI (supabase login && supabase link já feitos):
//      supabase functions deploy notify-booking-cancelled-by-customer
//
//    Sem CLI: Painel do Supabase → Edge Functions → Create a function →
//    nome "notify-booking-cancelled-by-customer" → cole o conteúdo deste
//    arquivo → Deploy.
//
// 2) SEGREDOS — reaproveita os mesmos de notify-new-booking (Edge Functions
//    → notify-booking-cancelled-by-customer → Secrets, ou
//    `supabase secrets set`): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
//    SMTP_FROM. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm prontos em
//    toda Edge Function.
//
// 3) CRIAR O DATABASE WEBHOOK
//
//    Painel do Supabase → Database → Webhooks → Create a new hook
//      Nome:      notify-booking-cancelled-by-customer
//      Tabela:    public.bookings
//      Eventos:   apenas Update
//      Tipo:      Supabase Edge Functions
//      Função:    notify-booking-cancelled-by-customer
//      Headers:   Authorization: Bearer <SERVICE_ROLE_KEY do projeto>
//                 (Settings → API → Project API keys → service_role — sem
//                 isso a invocação volta 401.)
//
//    A função já ignora sozinha qualquer UPDATE que não seja um
//    cancelamento feito pelo cliente (só dispara quando status virou
//    "cancelled" NA HORA, com cancel_reason preenchido — decline_reason,
//    setado pelo barbeiro ao recusar, não conta), então não precisa
//    filtrar isso no próprio webhook.
//
// 4) QUEM RECEBE O E-MAIL
//
//    Primeiro tenta o e-mail cadastrado do barbeiro daquele agendamento
//    (public.barbers.email). Se ele não tiver e-mail salvo, cai pro mesmo
//    e-mail fixo que notify-new-booking usa hoje — troque o FALLBACK_EMAIL
//    abaixo, ou apague esse bloco, se preferir só pular o aviso nesse caso.
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const FALLBACK_EMAIL = "senerineleonardo@gmail.com";

interface BookingRow {
  id: string;
  status: string;
  cancel_reason: string | null;
  barber_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  customer_name: string;
  customer_phone: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: BookingRow | null;
  old_record: BookingRow | null;
}

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function formatTimeShort(time: string): string {
  return time.slice(0, 5);
}

// booking.customer_name/cancel_reason are typed by the client, so neither
// can be trusted verbatim inside HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const booking = payload.record;
  const wasCancelled = payload.old_record?.status === "cancelled";
  // Only the customer self-cancel flow sets cancel_reason — the barber's
  // own decline flow sets decline_reason instead (see
  // notify-booking-declined), so this never double-fires for that case.
  // wasCancelled guards against firing again on some unrelated later
  // update to the same row.
  if (!booking || booking.status !== "cancelled" || !booking.cancel_reason || wasCancelled) {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = Number(Deno.env.get("SMTP_PORT") ?? "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpFrom = Deno.env.get("SMTP_FROM");

  if (!supabaseUrl || !serviceRoleKey || !smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    console.error("notify-booking-cancelled-by-customer: missing required secrets");
    return new Response(JSON.stringify({ error: "Function not configured" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const [{ data: barber }, { data: service }] = await Promise.all([
    supabase.from("barbers").select("name, email").eq("id", booking.barber_id).maybeSingle(),
    supabase.from("services").select("name").eq("id", booking.service_id).maybeSingle(),
  ]);

  const recipient = barber?.email || FALLBACK_EMAIL;
  const dateLabel = formatDateBR(booking.scheduled_date);
  const timeLabel = formatTimeShort(booking.scheduled_time);
  const serviceName = service?.name ?? "o atendimento";
  const barberName = barber?.name ?? "Barbeiro";
  const reason = booking.cancel_reason;

  const subject = `${booking.customer_name} cancelou o horário de ${dateLabel} às ${timeLabel}`;
  const text = [
    `Olá, ${barberName}!`,
    ``,
    `${booking.customer_name} cancelou o agendamento:`,
    `${serviceName}`,
    `${dateLabel} às ${timeLabel}`,
    ``,
    `Motivo: ${reason}`,
    ``,
    `Telefone do cliente: ${booking.customer_phone}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif; background:#0a0a0a; padding:32px 16px;">
      <div style="max-width:440px; margin:0 auto; background:#141414; border:1px solid #2a2a2a; border-radius:16px; padding:32px;">
        <p style="margin:0 0 4px; font-size:12px; letter-spacing:2px; color:#9e9e9e; text-transform:uppercase;">D&rsquo;Conde Barbearia</p>
        <h1 style="margin:0 0 20px; font-size:20px; color:#ffffff;">Cliente cancelou o agendamento</h1>
        <p style="margin:0 0 16px; font-size:14px; color:#e0e0e0;">Olá, ${escapeHtml(barberName)}! ${escapeHtml(booking.customer_name)} cancelou:</p>
        <table role="presentation" style="width:100%; border-collapse:collapse; font-size:14px; color:#e0e0e0;">
          <tr><td style="padding:6px 0; color:#9e9e9e;">Serviço</td><td style="padding:6px 0; text-align:right;">${escapeHtml(serviceName)}</td></tr>
          <tr><td style="padding:6px 0; color:#9e9e9e;">Data</td><td style="padding:6px 0; text-align:right;">${dateLabel} às ${timeLabel}</td></tr>
          <tr><td style="padding:6px 0; color:#9e9e9e;">Telefone</td><td style="padding:6px 0; text-align:right;">${escapeHtml(booking.customer_phone)}</td></tr>
        </table>
        <p style="margin:20px 0 0; padding:14px; background:#1a1a1a; border:1px solid #2a2a2a; border-radius:10px; font-size:14px; color:#e0e0e0;"><strong style="color:#9e9e9e;">Motivo:</strong> ${escapeHtml(reason)}</p>
      </div>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.sendMail({ from: smtpFrom, to: recipient, subject, text, html });
  } catch (err) {
    console.error(`notify-booking-cancelled-by-customer: failed to email booking ${booking.id}`, err);
    return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
  }

  return new Response(JSON.stringify({ sent: true, recipient }), { status: 200 });
});
