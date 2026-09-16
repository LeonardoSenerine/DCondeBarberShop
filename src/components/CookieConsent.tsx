import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent";

export type CookieConsentValue = "accepted" | "declined";

export function getCookieConsent(): CookieConsentValue | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
  }, []);

  function choose(value: CookieConsentValue) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // storage indisponível (modo privado) — mantém a escolha só nesta sessão
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border px-4 py-4 backdrop-blur-lg md:px-6"
      style={{ background: "rgba(10,10,10,0.96)" }}
    >
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
        <p className="text-sm text-muted">
          Usamos cookies para melhorar sua experiência de navegação e agendamento. Ao continuar, você concorda com o
          uso de cookies.
        </p>
        <div className="flex w-full shrink-0 gap-3 md:w-auto">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="flex-1 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-paper md:flex-none"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="bg-silver-gradient flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5 hover:brightness-110 md:flex-none"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
