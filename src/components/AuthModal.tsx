import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCreateBooking } from "@/hooks/useBooking";
import type { BookingDraft } from "@/components/BookingWizard";
import { formatCents } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";

type Phase = "dados" | "codigo" | "ok";

interface AuthModalProps {
  pendingBooking: BookingDraft | null;
  onClose: () => void;
  onDone: () => void;
}

export function AuthModal({ pendingBooking, onClose, onDone }: AuthModalProps) {
  const { session, sendPhoneCode, verifyPhoneCode } = useAuth();
  const { createBooking, submitting } = useCreateBooking();
  const [phase, setPhase] = useState<Phase>("dados");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSendCode() {
    const digits = phone.replace(/\D/g, "");
    if (!name.trim()) return setError("Digite seu nome.");
    if (digits.length < 10) return setError("Digite o celular com DDD.");
    setBusy(true);
    const { error: err } = await sendPhoneCode(phone, name.trim());
    setBusy(false);
    if (err) return setError(err);
    setError(null);
    setPhase("codigo");
  }

  async function handleVerify() {
    setBusy(true);
    const { error: err } = await verifyPhoneCode(phone, code);
    if (err) {
      setBusy(false);
      return setError(err);
    }

    if (pendingBooking) {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (userId) {
        await createBooking({
          customer_id: userId,
          barber_id: pendingBooking.barberId,
          service_id: pendingBooking.serviceId,
          scheduled_date: pendingBooking.dateIso,
          scheduled_time: pendingBooking.time,
          status: "confirmed",
          price_cents: pendingBooking.priceCents,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
        });
      }
    }

    setBusy(false);
    setError(null);
    setPhase("ok");
  }

  const eyebrow = phase === "ok" ? "Agendamento confirmado" : "Acesso do cliente";
  const title = phase === "dados" ? "Seus dados" : phase === "codigo" ? "Código enviado" : "Tudo certo";
  const lead =
    phase === "dados"
      ? "Enviamos um código por SMS para confirmar seu número. Na primeira vez, isso cria seu cadastro."
      : phase === "codigo"
        ? `Digite o código que enviamos para ${phone || "seu celular"}.`
        : "Guardamos seu agendamento e o histórico na sua conta.";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-6"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
    >
      <div className="relative w-full max-w-[440px] animate-[dc-up_400ms_ease_both] rounded-lg border border-border bg-surface p-8 shadow-[0_40px_90px_rgba(0,0,0,0.8)]">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3.5 right-3.5 flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
        >
          ×
        </button>
        <span className="font-heading text-xs tracking-[0.3em] text-muted-2 uppercase">{eyebrow}</span>
        <h3 className="m-0 mt-3 mb-2 font-heading text-2xl font-semibold tracking-[0.04em] text-white uppercase">
          {title}
        </h3>
        <p className="m-0 mb-6 text-[15px] text-muted">{lead}</p>

        {pendingBooking && phase !== "ok" && (
          <div className="mb-5 flex flex-col gap-1 rounded-lg border border-border bg-surface-alt p-3.5 text-[13px] text-muted">
            <span className="text-white">{pendingBooking.serviceName}</span>
            <span>
              {pendingBooking.barberName} · {pendingBooking.dateLabel} · {pendingBooking.time} ·{" "}
              {formatCents(pendingBooking.priceCents)}
            </span>
          </div>
        )}

        {phase === "dados" && (
          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] text-muted">Nome</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="min-h-[52px] rounded-lg border border-border bg-surface-alt px-3.5 text-base text-white outline-none focus:border-silver"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] text-muted">Celular com DDD</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(18) 99730-7852"
                className="min-h-[52px] rounded-lg border border-border bg-surface-alt px-3.5 text-base text-white outline-none focus:border-silver"
              />
            </label>
            {error && (
              <span className="rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
                {error}
              </span>
            )}
            <button
              onClick={handleSendCode}
              disabled={busy}
              className="bg-silver-gradient flex min-h-[54px] items-center justify-center rounded-lg font-heading text-[13px] font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Enviando…" : "Enviar código por SMS"}
            </button>
          </div>
        )}

        {phase === "codigo" && (
          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] text-muted">Código de 6 dígitos</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                className="min-h-14 rounded-lg border border-border bg-surface-alt px-4 text-center font-heading text-2xl tracking-[0.5em] text-white outline-none focus:border-silver"
              />
            </label>
            {error && (
              <span className="rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
                {error}
              </span>
            )}
            <button
              onClick={handleVerify}
              disabled={busy || submitting}
              className="bg-silver-gradient flex min-h-[54px] items-center justify-center rounded-lg font-heading text-[13px] font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
            >
              {busy || submitting ? "Confirmando…" : "Confirmar e agendar"}
            </button>
            <button
              onClick={() => {
                setPhase("dados");
                setError(null);
              }}
              className="flex min-h-11 items-center justify-center rounded-lg border border-border font-heading text-xs tracking-[0.18em] text-muted uppercase transition-colors hover:text-white"
            >
              Corrigir número
            </button>
          </div>
        )}

        {phase === "ok" && (
          <div className="flex flex-col gap-3.5">
            <button
              onClick={onDone}
              className="bg-silver-gradient flex min-h-[54px] items-center justify-center rounded-lg font-heading text-[13px] font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110"
            >
              Ver minha conta
            </button>
            <button
              onClick={onClose}
              className="flex min-h-11 items-center justify-center rounded-lg border border-border font-heading text-xs tracking-[0.18em] text-muted uppercase transition-colors hover:text-white"
            >
              Voltar ao site
            </button>
          </div>
        )}

        {phase !== "ok" && session && (
          <p className="mt-4 text-center text-xs text-muted-2">Você já está logado — feche esta janela.</p>
        )}
      </div>
    </div>
  );
}
