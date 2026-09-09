export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export const WEEKDAY_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h:${String(rest).padStart(2, "0")}min`;
}

/** yyyy-mm-dd -> dd/mm/yyyy */
export function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** HH:mm:ss (Postgres time) -> HH:mm */
export function formatTimeShort(time: string): string {
  return time.slice(0, 5);
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Converts a Brazilian phone number to E.164 (+55...) for Supabase phone auth. */
export function toE164BR(phone: string): string {
  const digits = normalizeDigits(phone);
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

export function whatsAppLink(phoneE164NoPlus: string, message: string): string {
  return `https://wa.me/${phoneE164NoPlus}?text=${encodeURIComponent(message)}`;
}
