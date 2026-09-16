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

/** Masks digits as the user types into Brazilian phone format: "(XX) XXXXX-XXXX" (mobile) or "(XX) XXXX-XXXX" (landline). */
export function formatPhoneBR(value: string): string {
  const digits = normalizeDigits(value).slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (digits.length <= 2) return ddd ? `(${ddd}` : "";
  if (digits.length <= 10) {
    return rest.length <= 4 ? `(${ddd}) ${rest}` : `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export function whatsAppLink(phoneE164NoPlus: string, message: string): string {
  return `https://wa.me/${phoneE164NoPlus}?text=${encodeURIComponent(message)}`;
}

/** Brazilian phone (any formatting) -> digits-only with the 55 country code, for whatsAppLink. */
export function toWhatsAppPhone(raw: string): string {
  const digits = normalizeDigits(raw);
  // A local number (DDD + phone, no country code) is always 10 or 11
  // digits — checking for a "55" prefix instead would misfire for DDD 55
  // (Rio Grande do Sul), treating its area code as an already-present
  // country code and leaving the number one "55" short.
  return digits.length > 11 ? digits : `55${digits}`;
}

/**
 * Turns a raw Postgres error from creating a booking into something a
 * customer can actually act on. The client only pre-filters obviously-taken
 * times — the database's bookings_no_overlap constraint is what actually
 * catches a slot someone else grabbed a second earlier, so this is the
 * expected (not exceptional) way that race ends up surfacing.
 */
export function friendlyBookingError(raw: string): string {
  if (raw.includes("bookings_no_overlap")) {
    return "esse horário acabou de ser reservado por outra pessoa — escolha outro horário.";
  }
  return raw;
}
