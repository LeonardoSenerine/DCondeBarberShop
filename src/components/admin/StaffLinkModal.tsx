import { useState } from "react";
import { searchProfileByEmail, linkBarberAccount, unlinkBarberAccount, type StaffProfile } from "@/hooks/useAdmin";
import type { Barber } from "@/hooks/useCatalog";
import { useFormErrors, fieldClass } from "@/hooks/useFormErrors";

interface StaffLinkModalProps {
  barber: Barber;
  /** The account currently linked to this barber, if any — present means this is a swap, not a first link. */
  currentAccount?: StaffProfile | null;
  onClose: () => void;
  onLinked: () => void;
}

const ROLE_LABEL: Record<StaffProfile["role"], string> = {
  customer: "Cliente",
  staff: "Barbeiro",
  owner: "Dono",
};

export function StaffLinkModal({ barber, currentAccount, onClose, onLinked }: StaffLinkModalProps) {
  const isSwap = !!currentAccount;
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<StaffProfile | null | undefined>(undefined);
  const [linking, setLinking] = useState(false);
  const { message: error, fail, clear, clearField, fieldProps } = useFormErrors();

  async function handleSearch() {
    if (!email.trim()) return fail("Digite o e-mail da pessoa.", ["email"]);
    clear();
    setSearching(true);
    setFound(undefined);
    const { data, error: err } = await searchProfileByEmail(email.trim());
    setSearching(false);
    if (err) return fail(err);
    setFound(data);
  }

  async function handleConfirm() {
    if (!found) return;
    setLinking(true);
    clear();
    const { error: err } = await linkBarberAccount(found.id, barber.id);
    if (err) {
      setLinking(false);
      return fail(err);
    }
    // Swapping to a different account — release the old one back to a
    // plain customer so it doesn't keep pointing at this barber too.
    if (currentAccount && currentAccount.id !== found.id) {
      const { error: unlinkErr } = await unlinkBarberAccount(currentAccount.id);
      if (unlinkErr) {
        setLinking(false);
        return fail(`Nova conta vinculada, mas não deu pra liberar a antiga: ${unlinkErr}`);
      }
    }
    setLinking(false);
    onLinked();
  }

  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto"
      style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[460px] rounded-2xl border border-border bg-surface p-7 shadow-[0_40px_90px_rgba(0,0,0,0.8)]"
        >
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-silver hover:text-white"
          >
            ×
          </button>

          <h3 className="m-0 mb-1 font-heading text-xl font-semibold tracking-[0.06em] text-white uppercase">
            {isSwap ? "Trocar conta vinculada" : "Vincular conta de acesso"}
          </h3>
          <p className="m-0 mb-6 text-[14px] text-muted">
            {isSwap
              ? `Substitui quem tem acesso ao painel como ${barber.name}. A conta atual (${currentAccount!.full_name || currentAccount!.email}) volta a ser um cliente comum.`
              : `Dá acesso ao painel pra ${barber.name}. A pessoa precisa já ter feito login pelo menos uma vez no site.`}
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] text-muted">E-mail de login</span>
            <div className="flex gap-2.5">
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFound(undefined);
                  clearField("email");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="pessoa@email.com"
                className={`min-h-12 flex-1 rounded-lg border border-border bg-surface-alt px-3.5 text-[15px] text-white outline-none focus:border-silver ${fieldClass(fieldProps("email"))}`}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-border px-5 font-heading text-xs tracking-[0.14em] text-white uppercase transition-colors hover:border-silver disabled:cursor-not-allowed disabled:opacity-60"
              >
                {searching ? "Buscando…" : "Buscar"}
              </button>
            </div>
          </label>

          {found === null && (
            <p className="mt-4 text-[14px] text-muted">
              Nenhuma conta encontrada com esse e-mail. A pessoa precisa criar login no site primeiro (aba "Entrar").
            </p>
          )}

          {found && (
            <div className="mt-5 flex flex-col gap-3 rounded-lg border border-border bg-surface-alt p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-white">{found.full_name || "—"}</span>
                  <span className="block truncate text-[13px] text-muted">{found.email}</span>
                </span>
                <span className="flex-shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] tracking-[0.08em] text-muted uppercase">
                  {ROLE_LABEL[found.role]}
                </span>
              </div>
              {found.role !== "customer" && found.barber_id !== barber.id && (
                <p className="m-0 text-[13px]" style={{ color: "#E0B341" }}>
                  Essa conta já tem acesso vinculado a outro barbeiro. Vincular agora move o acesso dela pra {barber.name}.
                </p>
              )}
            </div>
          )}

          {error && (
            <span className="mt-4 block rounded-lg border border-border-strong bg-surface-alt p-2.5 text-[13px] text-white">
              {error}
            </span>
          )}

          <div className="mt-6 flex gap-2.5">
            <button
              onClick={onClose}
              disabled={linking}
              className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border font-heading text-sm tracking-[0.16em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!found || linking}
              className="bg-silver-gradient flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg font-heading text-sm font-semibold tracking-[0.16em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-60"
            >
              {linking ? (isSwap ? "Trocando…" : "Vinculando…") : isSwap ? "Trocar" : "Vincular"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
