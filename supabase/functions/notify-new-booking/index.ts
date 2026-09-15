// D'Conde Barbearia — e-mail automático de "novo agendamento" para o barbeiro
//
// Esta função NÃO roda sozinha: ela precisa ser (1) implantada no projeto
// Supabase e (2) chamada por um Database Webhook em INSERT na tabela
// `bookings`. Nada disso acontece automaticamente ao editar este arquivo —
// são passos manuais no painel, descritos abaixo.
//
// ─────────────────────────────────────────────────────────────────────────
// 1) IMPLANTAR A FUNÇÃO
//
//    Com a Supabase CLI (supabase login && supabase link já feitos):
//      supabase functions deploy notify-new-booking
//
//    Sem CLI: Painel do Supabase → Edge Functions → Create a function →
//    nome "notify-new-booking" → cole o conteúdo deste arquivo → Deploy.
//
// 2) CONFIGURAR OS SEGREDOS (Edge Functions → notify-new-booking → Secrets,
//    ou `supabase secrets set NOME=valor`):
//
//      SMTP_HOST   — ex: smtp.seudominio.com
//      SMTP_PORT   — ex: 465 (SSL) ou 587 (STARTTLS)
//      SMTP_USER   — usuário de autenticação do SMTP
//      SMTP_PASS   — senha/senha de app do SMTP
//      SMTP_FROM   — remetente, ex: "D'Conde Barbearia <no-reply@seudominio.com>"
//      SITE_URL    — opcional, ex: https://dcondebarbearia.com — se definido,
//                    o e-mail inclui um link direto pro painel; se ausente o
//                    e-mail sai sem esse link, sem quebrar nada.
//
//    SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente em
//    toda Edge Function — não precisa (e não deve) cadastrar esses dois.
//
// 3) CRIAR O DATABASE WEBHOOK
//
//    Painel do Supabase → Database → Webhooks → Create a new hook
//      Nome:      notify-new-booking
//      Tabela:    public.bookings
//      Eventos:   apenas Insert
//      Tipo:      Supabase Edge Functions
//      Função:    notify-new-booking
//      Headers:   Authorization: Bearer <SERVICE_ROLE_KEY do projeto>
//                 (Settings → API → Project API keys → service_role — é o
//                 que faz o painel aceitar a chamada; sem isso a invocação
//                 volta 401.)
//
//    A função já ignora sozinha qualquer INSERT que não seja um pedido de
//    cliente aguardando confirmação (status diferente de "pending"), então
//    não precisa filtrar isso no próprio webhook.
//
// 4) QUEM RECEBE O E-MAIL
//
//    Hoje é fixo: senerineleonardo@gmail.com (pedido explícito, todo aviso
//    cai num único e-mail em vez de ir pro barbeiro/donos individualmente).
//    Pra voltar a mandar por barbeiro + donos, troca a linha `recipients`
//    lá embaixo por uma consulta em public.barbers.email (pelo
//    booking.barber_id) e public.profiles.email (role = 'owner').
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

interface BookingRow {
  id: string;
  barber_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  price_cents: number;
  customer_name: string;
  customer_phone: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: BookingRow | null;
}

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function formatTimeShort(time: string): string {
  return time.slice(0, 5);
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  // Só avisa sobre pedidos novos aguardando o barbeiro aceitar — mesmo
  // filtro do alerta em tempo real do painel (AdminPage.tsx).
  if (!booking || booking.status !== "pending") {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = Number(Deno.env.get("SMTP_PORT") ?? "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpFrom = Deno.env.get("SMTP_FROM");
  const siteUrl = Deno.env.get("SITE_URL");

  if (!supabaseUrl || !serviceRoleKey || !smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    console.error("notify-new-booking: missing required secrets");
    return new Response(JSON.stringify({ error: "Function not configured" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const [{ data: barber }, { data: service }] = await Promise.all([
    supabase.from("barbers").select("name").eq("id", booking.barber_id).maybeSingle(),
    supabase.from("services").select("name").eq("id", booking.service_id).maybeSingle(),
  ]);

  // Todo mundo cai neste e-mail por enquanto, em vez de barbeiro/donos
  // individuais — pedido explícito, pra ter um único ponto de recebimento.
  const recipients = ["senerineleonardo@gmail.com"];

  const dateLabel = formatDateBR(booking.scheduled_date);
  const timeLabel = formatTimeShort(booking.scheduled_time);
  const serviceName = service?.name ?? "Serviço";
  const barberName = barber?.name ?? "Barbeiro";
  const priceLabel = formatCents(booking.price_cents);
  const agendaLink = siteUrl ? `${siteUrl}/admin` : null;

  const subject = `Novo agendamento: ${booking.customer_name} — ${dateLabel} ${timeLabel}`;
  const text = [
    `Novo pedido de agendamento na D'Conde Barbearia.`,
    ``,
    `Cliente: ${booking.customer_name}`,
    `Telefone: ${booking.customer_phone}`,
    `Serviço: ${serviceName}`,
    `Barbeiro: ${barberName}`,
    `Data: ${dateLabel} às ${timeLabel}`,
    `Valor: ${priceLabel}`,
    ``,
    `Aguardando confirmação no painel.`,
    agendaLink ? agendaLink : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif; background:#0a0a0a; padding:32px 16px;">
      <div style="max-width:440px; margin:0 auto; background:#141414; border:1px solid #2a2a2a; border-radius:16px; padding:32px;">
        <p style="margin:0 0 4px; font-size:12px; letter-spacing:2px; color:#9e9e9e; text-transform:uppercase;">D&rsquo;Conde Barbearia</p>
        <h1 style="margin:0 0 20px; font-size:20px; color:#ffffff;">Novo agendamento</h1>
        <table role="presentation" style="width:100%; border-collapse:collapse; font-size:14px; color:#e0e0e0;">
          <tr><td style="padding:6px 0; color:#9e9e9e;">Cliente</td><td style="padding:6px 0; text-align:right;">${booking.customer_name}</td></tr>
          <tr><td style="padding:6px 0; color:#9e9e9e;">Telefone</td><td style="padding:6px 0; text-align:right;">${booking.customer_phone}</td></tr>
          <tr><td style="padding:6px 0; color:#9e9e9e;">Serviço</td><td style="padding:6px 0; text-align:right;">${serviceName}</td></tr>
          <tr><td style="padding:6px 0; color:#9e9e9e;">Barbeiro</td><td style="padding:6px 0; text-align:right;">${barberName}</td></tr>
          <tr><td style="padding:6px 0; color:#9e9e9e;">Data</td><td style="padding:6px 0; text-align:right;">${dateLabel} às ${timeLabel}</td></tr>
          <tr><td style="padding:6px 0; color:#9e9e9e;">Valor</td><td style="padding:6px 0; text-align:right;">${priceLabel}</td></tr>
        </table>
        <p style="margin:20px 0 0; font-size:13px; color:#a3a3a3;">Aguardando confirmação no painel.</p>
        ${agendaLink ? `<a href="${agendaLink}" style="display:inline-block; margin-top:16px; padding:12px 24px; background:#e0e0e0; color:#0a0a0a; border-radius:10px; text-decoration:none; font-size:13px; font-weight:600;">Abrir painel</a>` : ""}
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
    await transporter.sendMail({
      from: smtpFrom,
      to: recipients,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("notify-new-booking: failed to send email", err);
    return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
  }

  return new Response(JSON.stringify({ sent: true, recipients: recipients.length }), { status: 200 });
});
