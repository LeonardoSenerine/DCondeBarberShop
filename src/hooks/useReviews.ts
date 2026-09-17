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
          map[r.booking_id] = r as ReviewRow;
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
        setReviews((data ?? []) as unknown as ReviewWithDetails[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { reviews, loading };
}
