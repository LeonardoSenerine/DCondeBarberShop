import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

export interface ReviewWithDetails extends ReviewRow {
  barbers: { name: string } | null;
  services: { name: string } | null;
}

/** The logged-in customer's own reviews, keyed by booking_id — lets "Meus agendamentos" know which completed bookings still need the "avalie seu atendimento" prompt. */
export function useMyReviews(customerId: string | null) {
  const [reviewsByBooking, setReviewsByBooking] = useState<Record<string, ReviewRow>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!customerId) {
      setReviewsByBooking({});
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("reviews")
      .select("*")
      .eq("customer_id", customerId)
      .then(({ data }) => {
        const map: Record<string, ReviewRow> = {};
        (data ?? []).forEach((r) => {
          if (r.booking_id) map[r.booking_id] = r as ReviewRow;
        });
        setReviewsByBooking(map);
        setLoading(false);
      });
  }, [customerId]);

  useEffect(() => reload(), [reload]);

  return { reviewsByBooking, loading, reload };
}

export async function submitReview(input: {
  bookingId: string;
  customerId: string;
  customerName: string;
  barberId: string;
  serviceId: string;
  rating: number;
  comment: string | null;
}) {
  const { error } = await supabase.from("reviews").insert({
    booking_id: input.bookingId,
    customer_id: input.customerId,
    customer_name: input.customerName,
    barber_id: input.barberId,
    service_id: input.serviceId,
    rating: input.rating,
    comment: input.comment,
  });
  return { error: error?.message ?? null };
}

/** "Ignorar" on the review prompt — hides it for this booking without leaving a review. */
export async function dismissReviewPrompt(bookingId: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ review_dismissed_at: new Date().toISOString() })
    .eq("id", bookingId);
  return { error: error?.message ?? null };
}

/** Every review, for the admin "Avaliações" tab. */
export function useAdminReviews() {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    supabase
      .from("reviews")
      .select("*, barbers(name), services(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setReviews((data ?? []) as unknown as ReviewWithDetails[]);
        setLoading(false);
      });
  }, []);

  useEffect(() => reload(), [reload]);

  return { reviews, loading, reload };
}

export async function setReviewPublished(id: string, published: boolean) {
  const { error } = await supabase.from("reviews").update({ published }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/** DEV-only mocked testimonials, so the site's carousel can be previewed without any real published review. */
function samplePublishedReviews(): ReviewWithDetails[] {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

  const rows: Omit<ReviewWithDetails, "id" | "booking_id" | "customer_id" | "published">[] = [
    {
      customer_name: "Rafael Prado",
      barber_id: "daniel",
      service_id: "corte-barba-terapia",
      rating: 5,
      comment: "Ambiente top, atendimento pontual e o resultado ficou impecável. Já é minha barbearia fixa.",
      created_at: daysAgo(2),
      barbers: { name: "Daniel" },
      services: { name: "Corte + barba terapia" },
    },
    {
      customer_name: "Lucas Andrade",
      barber_id: "joao",
      service_id: "corte",
      rating: 5,
      comment: "Melhor fade que já fiz na cidade. Recomendo de olhos fechados.",
      created_at: daysAgo(5),
      barbers: { name: "João Lima" },
      services: { name: "Corte" },
    },
    {
      customer_name: "Bruno Castilho",
      barber_id: "daniel",
      service_id: "barba-terapia",
      rating: 4,
      comment: null,
      created_at: daysAgo(9),
      barbers: { name: "Daniel" },
      services: { name: "Barba terapia" },
    },
    {
      customer_name: "Felipe Nogueira",
      barber_id: "joao",
      service_id: "corte-barba-tradicional",
      rating: 5,
      comment: "Atenção aos detalhes que faz diferença. Saí de lá outra pessoa.",
      created_at: daysAgo(12),
      barbers: { name: "João Lima" },
      services: { name: "Corte + barba tradicional" },
    },
    {
      customer_name: "Thiago Ramos",
      barber_id: "daniel",
      service_id: "corte-sobrancelha",
      rating: 4,
      comment: "Muito bom, só demorou um pouco mais que o combinado.",
      created_at: daysAgo(18),
      barbers: { name: "Daniel" },
      services: { name: "Corte + sobrancelha" },
    },
    {
      customer_name: "Gustavo Lemos",
      barber_id: "joao",
      service_id: "corte-bigode",
      rating: 5,
      comment: null,
      created_at: daysAgo(24),
      barbers: { name: "João Lima" },
      services: { name: "Corte + bigode" },
    },
  ];

  return rows.map((r, i) => ({
    id: `sample-review-${i}`,
    booking_id: `sample-review-booking-${i}`,
    customer_id: null,
    published: true,
    ...r,
  }));
}

/** Admin-approved reviews shown on the public site's testimonials carousel. */
export function usePublishedReviews() {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("reviews")
      .select("*, barbers(name), services(name)")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? []) as unknown as ReviewWithDetails[];
        setReviews(rows.length === 0 && import.meta.env.DEV ? samplePublishedReviews() : rows);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { reviews, loading };
}
