// D'Conde Barbearia — lembrete automático por e-mail, 3h antes do horário.
//
// Diferente de notify-new-booking (que reage a um INSERT), esta função não
// espera nenhum payload — ela mesma consulta o banco toda vez que é chamada
// e manda o lembrete pra quem estiver na janela certa. Ela só funciona
// disparada por um agendador (cron): sozinha, editar este arquivo não faz
// nada rodar automaticamente.
//
// ─────────────────────────────────────────────────────────────────────────
// 1) IMPLANTAR A FUNÇÃO
//
//    Com a Supabase CLI (supabase login && supabase link já feitos):
//      supabase functions deploy send-booking-reminders
//
//    Sem CLI: Painel do Supabase → Edge Functions → Create a function →
//    nome "send-booking-reminders" → cole o conteúdo deste arquivo → Deploy.
//
// 2) SEGREDOS — reaproveita os mesmos de notify-new-booking (Edge Functions
//    → send-booking-reminders → Secrets): SMTP_HOST, SMTP_PORT, SMTP_USER,
//    SMTP_PASS, SMTP_FROM. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm
//    prontos em toda Edge Function.
//
// 3) AGENDAR A EXECUÇÃO
//
//    Rode supabase/sql/schedule-booking-reminders.sql no SQL Editor — ele
//    configura um pg_cron que chama esta função a cada 15 minutos.
//
// 4) COMO A JANELA DE 3H FUNCIONA
//
//    A cada execução, a função calcula o alvo "agora + 3h" em horário de
//    Brasília e busca agendamentos confirmados cujo horário caia até 15min
//    antes ou depois desse alvo (uma janela de 30min) e que ainda não
//    tenham `reminder_sent_at`. A metade "antes" existe só pra dar uma
//    segunda chance: se o envio de um agendamento falhar (SMTP fora do ar,
//    por exemplo), ele não é marcado como enviado e continua aparecendo
//    nessa janela até o próximo ciclo do cron conseguir tentar de novo.
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const BARBERSHOP_TZ = "America/Sao_Paulo";
const WINDOW_HOURS_AHEAD = 3;
const WINDOW_SPAN_MINUTES = 15;

interface BookingForReminder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  scheduled_date: string;
  scheduled_time: string;
  barbers: { name: string } | null;
  services: { name: string } | null;
}

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function formatTimeShort(time: string): string {
  return time.slice(0, 5);
}

// booking.customer_name comes straight from the public booking form, so it
// can't be trusted verbatim inside the HTML e-mail.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** {date: "YYYY-MM-DD", time: "HH:MM"} for a UTC instant, read as wall-clock time in `BARBERSHOP_TZ`. */
function localParts(instant: Date): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: BARBERSHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(instant).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = Number(Deno.env.get("SMTP_PORT") ?? "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpFrom = Deno.env.get("SMTP_FROM");

  if (!supabaseUrl || !serviceRoleKey || !smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    console.error("send-booking-reminders: missing required secrets");
    return new Response(JSON.stringify({ error: "Function not configured" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const targetInstant = new Date(now.getTime() + WINDOW_HOURS_AHEAD * 3600_000);
  // Looks one extra cron cycle further back than the exact 3h target, so a
  // booking whose e-mail failed to send (transient SMTP error) is still
  // `reminder_sent_at is null` and gets picked up again on the next run,
  // instead of its window passing and it being silently dropped forever.
  const windowStart = new Date(targetInstant.getTime() - WINDOW_SPAN_MINUTES * 60_000);
  const windowEnd = new Date(targetInstant.getTime() + WINDOW_SPAN_MINUTES * 60_000);
  const start = localParts(windowStart);
  const end = localParts(windowEnd);

  // Same calendar day in both cases except right around midnight — split
  // into up to two date buckets so the "scheduled_time" range comparison
  // stays correct either way.
  const buckets =
    start.date === end.date
      ? [{ date: start.date, gte: start.time, lt: end.time }]
      : [
          { date: start.date, gte: start.time, lt: "24:00" },
          { date: end.date, gte: "00:00", lt: end.time },
        ];

  const due: BookingForReminder[] = [];
  for (const b of buckets) {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, customer_name, customer_phone, customer_email, scheduled_date, scheduled_time, barbers(name), services(name)",
      )
      .eq("status", "confirmed")
      .is("reminder_sent_at", null)
      .eq("scheduled_date", b.date)
      .gte("scheduled_time", b.gte)
      .lt("scheduled_time", b.lt);
    if (error) {
      console.error("send-booking-reminders: query failed", error);
      return new Response(JSON.stringify({ error: "Query failed" }), { status: 500 });
    }
    due.push(...((data as unknown as BookingForReminder[]) ?? []));
  }

  if (due.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: 0 }), { status: 200 });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  let sent = 0;
  let skipped = 0;

  for (const booking of due) {
    const dateLabel = formatDateBR(booking.scheduled_date);
    const timeLabel = formatTimeShort(booking.scheduled_time);
    const serviceName = booking.services?.name ?? "seu atendimento";
    const barberName = booking.barbers?.name ?? "seu barbeiro";

    if (booking.customer_email) {
      const subject = `Lembrete: seu horário é hoje às ${timeLabel}`;
      const text = [
        `Olá, ${booking.customer_name}!`,
        ``,
        `Este é um lembrete do seu horário na D'Conde Barbearia:`,
        `${serviceName} com ${barberName}`,
        `Hoje, ${dateLabel} às ${timeLabel}`,
        ``,
        `Aguardamos sua visita!`,
      ].join("\n");

      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif; background:#0a0a0a; padding:32px 16px;">
          <div style="max-width:440px; margin:0 auto; background:#141414; border:1px solid #2a2a2a; border-radius:16px; padding:32px;">
            <p style="margin:0 0 4px; font-size:12px; letter-spacing:2px; color:#9e9e9e; text-transform:uppercase;">D&rsquo;Conde Barbearia</p>
            <h1 style="margin:0 0 20px; font-size:20px; color:#ffffff;">Lembrete do seu horário</h1>
            <p style="margin:0 0 20px; font-size:14px; color:#e0e0e0;">Olá, ${escapeHtml(booking.customer_name)}! Este é um lembrete do seu horário hoje.</p>
            <table role="presentation" style="width:100%; border-collapse:collapse; font-size:14px; color:#e0e0e0;">
              <tr><td style="padding:6px 0; color:#9e9e9e;">Serviço</td><td style="padding:6px 0; text-align:right;">${escapeHtml(serviceName)}</td></tr>
              <tr><td style="padding:6px 0; color:#9e9e9e;">Barbeiro</td><td style="padding:6px 0; text-align:right;">${escapeHtml(barberName)}</td></tr>
              <tr><td style="padding:6px 0; color:#9e9e9e;">Data</td><td style="padding:6px 0; text-align:right;">${dateLabel} às ${timeLabel}</td></tr>
            </table>
            <p style="margin:20px 0 0; font-size:13px; color:#a3a3a3;">Aguardamos sua visita!</p>
          </div>
        </div>
      `;

      try {
        await transporter.sendMail({ from: smtpFrom, to: booking.customer_email, subject, text, html });
        sent++;
      } catch (err) {
        // Leave reminder_sent_at unset so the widened lookback window above
        // gives this booking one more chance to send on the next cron run,
        // instead of the reminder being lost silently.
        console.error(`send-booking-reminders: failed to email booking ${booking.id}`, err);
        continue;
      }
    } else {
      skipped++;
    }

    // Marked as handled — a sent e-mail or an e-mail-less booking (nothing
    // to retry) would otherwise keep matching this query on future runs.
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", booking.id);
    if (updateError) {
      console.error(`send-booking-reminders: failed to mark booking ${booking.id} as reminded`, updateError);
    }
  }

  return new Response(JSON.stringify({ sent, skipped }), { status: 200 });
});
