import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  sendEmailCode: (email: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ error: string | null }>;
  updateProfile: (patch: { full_name?: string; phone?: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session?.user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile(data ?? null);
      });
    return () => {
      active = false;
    };
  }, [session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      async sendEmailCode(email, fullName, phone) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { data: { full_name: fullName, phone } },
        });
        return { error: error ? traduzErroAuth(error.message) : null };
      },
      async verifyEmailCode(email, code) {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: "email",
        });
        return { error: error ? traduzErroAuth(error.message) : null };
      },
      async updateProfile(patch) {
        if (!session?.user) return { error: "Você precisa estar logado." };
        const { error } = await supabase.from("profiles").update(patch).eq("id", session.user.id);
        if (!error) setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
        return { error: error ? error.message : null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  return ctx;
}

function traduzErroAuth(message: string): string {
  if (/rate limit/i.test(message)) return "Muitas tentativas. Aguarde um instante e tente de novo.";
  if (/invalid/i.test(message) && /otp|token/i.test(message)) return "Código inválido ou expirado.";
  if (/email/i.test(message)) return "Confira o e-mail digitado.";
  return message;
}
