import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { BookingDraft } from "@/components/BookingWizard";
import { formatCents } from "@/lib/format";
import { savePendingBooking } from "@/lib/pendingBooking";

type Phase = "dados" | "enviado";
type Mode = "cadastro" | "login";

interface AuthModalProps {
  pendingBooking: BookingDraft | null;
  onClose: () => void;
}

export function AuthModal({ pendingBooking, onClose }: AuthModalProps) {
  const { session, sendMagicLink } = useAuth();
  const [mode, setMode] = useState<Mode>("cadastro");
  const [phase, setPhase] = useState<Phase>("dados");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSendLink() {
    if (mode === "cadastro" && !name.trim()) return setError("Digite seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Digite um e-mail válido.");
    if (mode === "cadastro" && phone.replace(/\D/g, "").length < 10) return setError("Digite o celular com DDD.");

    setBusy(true);
    const { error: err } = await sendMagicLink(email.trim(), {
      fullName: mode === "cadastro" ? name.trim() : undefined,
      phone: mode === "cadastro" ? phone.trim() : undefined,
      shouldCreateUser: mode === "cadastro",
    });
    setBusy(false);
    if (err) return setError(err);

    if (pendingBooking) {
      savePendingBooking({ draft: pendingBooking, name: name.trim(), phone: phone.trim() });
    }

    setError(null);
    setPhase("enviado");
  }

  const eyebrow = "Acesso do cliente";
  const title = phase === "dados" ? (mode === "cadastro" ? "Criar cadastro" : "Entrar") : "Confira seu e-mail";
  const lead =
    phase === "dados"
      ? mode === "cadastro"
        ? "Enviamos um link de confirmação por e-mail. Isso cria sua conta."
        : "Já tem conta? Digite seu e-mail e mandamos o link de acesso."
      : `Mandamos um link para ${email || "seu e-mail"}. Abra o e-mail e clique no link — você volta aqui já logado${pendingBooking ? " e com seu horário confirmado" : ""}.`;

  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
    >
      <div className="flex min-h-full items-center justify-center p-6">
      <div className="relative w-full max-w-[440px] animate-[dc-up_400ms_ease_both] rounded-lg border border-border bg-surface p-8 shadow-[0_40px_90px_rgba(0,0,0,0.8)]">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3.5 right-3.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
        >
          ×
        </button>
        <span className="font-heading text-xs tracking-[0.3em] text-muted-2 uppercase">{eyebrow}</span>

        {phase === "dados" && (
          <div className="mt-4 mb-5 flex gap-2">
            <button
              onClick={() => switchMode("cadastro")}
              className="flex-1 cursor-pointer rounded-lg border py-2.5 font-heading text-xs font-semibold tracking-[0.14em] uppercase transition-colors"
              style={{
                borderColor: mode === "cadastro" ? "#E0E0E0" : "#2A2A2A",
                color: mode === "cadastro" ? "#FFFFFF" : "#9E9E9E",
                background: mode === "cadastro" ? "rgba(255,255,255,0.06)" : "transparent",
              }}
            >
              Cadastro
            </button>
            <button
              onClick={() => switchMode("login")}
              className="flex-1 cursor-pointer rounded-lg border py-2.5 font-heading text-xs font-semibold tracking-[0.14em] uppercase transition-colors"
              style={{
                borderColor: mode === "login" ? "#E0E0E0" : "#2A2A2A",
                color: mode === "login" ? "#FFFFFF" : "#9E9E9E",
                background: mode === "login" ? "rgba(255,255,255,0.06)" : "transparent",
              }}
            >
              Entrar
            </button>
          </div>
        )}

        <h3 className="m-0 mt-3 mb-2 font-heading text-2xl font-semibold tracking-[0.04em] text-white uppercase">
          {title}
        </h3>
        <p className="m-0 mb-6 text-[15px] text-muted">{lead}</p>

        {pendingBooking && (
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
            {mode === "cadastro" && (
              <label className="flex flex-col gap-2">
                <span className="text-[13px] text-muted">Nome</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="min-h-[52px] rounded-lg border border-border bg-surface-alt px-3.5 text-base text-white outline-none focus:border-silver"
                />
              </label>
            )}
            <label className="flex flex-col gap-2">
              <span className="text-[13px] text-muted">E-mail</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                type="email"
                className="min-h-[52px] rounded-lg border border-border bg-surface-alt px-3.5 text-base text-white outline-none focus:border-silver"
              />
            </label>
            {mode === "cadastro" && (
              <label className="flex flex-col gap-2">
                <span className="text-[13px] text-muted">Celular com DDD</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(18) 99730-7852"
                  className="min-h-[52px] rounded-lg border border-border bg-surface-alt px-3.5 text-base text-white outline-none focus:border-silver"
                />
                <span className="text-xs text-muted-2">É pra gente confirmar seu horário, não é usado no login.</span>
              </label>
            )}
            {error && (
              <span className="rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
                {error}
              </span>
            )}
            <button
              onClick={handleSendLink}
              disabled={busy}
              className="bg-silver-gradient flex min-h-[54px] cursor-pointer items-center justify-center rounded-lg font-heading text-[13px] font-semibold tracking-[0.2em] text-ink uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Enviando…" : mode === "cadastro" ? "Enviar link por e-mail" : "Enviar link de acesso"}
            </button>
          </div>
        )}

        {phase === "enviado" && (
          <div className="flex flex-col gap-3.5">
            {error && (
              <span className="rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
                {error}
              </span>
            )}
            <button
              onClick={handleSendLink}
              disabled={busy}
              className="flex min-h-[52px] cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-xs font-semibold tracking-[0.2em] text-white uppercase transition-colors hover:border-silver disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Reenviando…" : "Reenviar link"}
            </button>
            <button
              onClick={() => {
                setPhase("dados");
                setError(null);
              }}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-xs tracking-[0.18em] text-muted uppercase transition-colors hover:text-white"
            >
              Corrigir dados
            </button>
          </div>
        )}

        {session && <p className="mt-4 text-center text-xs text-muted-2">Você já está logado. Feche esta janela.</p>}
      </div>
      </div>
    </div>
  );
}
