import { useState } from "react";
import { useAdminReviews, setReviewPublished, deleteReview, type ReviewWithDetails } from "@/hooks/useReviews";
import { formatDateBR } from "@/lib/format";
import { StarRating } from "@/components/StarRating";
import { Skeleton } from "@/components/Skeleton";
import { Select } from "@/components/admin/Select";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { Toast } from "@/components/admin/Toast";

const RATING_OPTIONS = [
  { value: "all", label: "Todas as notas" },
  { value: "5", label: "5 estrelas" },
  { value: "4", label: "4 estrelas" },
  { value: "3", label: "3 estrelas" },
  { value: "2", label: "2 estrelas" },
  { value: "1", label: "1 estrela" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigas" },
];

export function ReviewsTab() {
  const { reviews, loading, reload } = useAdminReviews();
  const [acting, setActing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ReviewWithDetails | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("recent");

  const publishedCount = reviews.filter((r) => r.published).length;
  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const visibleReviews = reviews
    .filter((r) => ratingFilter === "all" || r.rating === Number(ratingFilter))
    .sort((a, b) =>
      sortOrder === "recent" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at),
    );

  async function togglePublish(review: ReviewWithDetails) {
    setActing(review.id);
    const { error } = await setReviewPublished(review.id, !review.published);
    setActing(null);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    setToast({ message: review.published ? "Avaliação despublicada." : "Avaliação publicada.", variant: "success" });
    reload();
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    setActing(deleting.id);
    const { error } = await deleteReview(deleting.id);
    setActing(null);
    if (error) {
      setToast({ message: error, variant: "error" });
      return;
    }
    setDeleting(null);
    setToast({ message: "Avaliação removida.", variant: "success" });
    reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-surface p-7">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="m-0 font-heading text-3xl font-semibold tracking-[0.06em] text-white uppercase">
            Avaliações dos clientes
          </h2>
          <span className="text-base text-muted">
            {reviews.length} avaliações · {publishedCount} publicadas
            {reviews.length > 0 && ` · média ${avgRating.toFixed(1)}`}
          </span>
        </div>

        {reviews.length > 0 && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Select value={ratingFilter} onChange={setRatingFilter} options={RATING_OPTIONS} className="sm:w-50" />
            <Select value={sortOrder} onChange={setSortOrder} options={SORT_OPTIONS} className="sm:w-50" />
          </div>
        )}

        {loading && reviews.length === 0 && (
          <div className="flex flex-col">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 border-t border-border px-1 py-5 first:border-t-0">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" count={2} />
              </div>
            ))}
          </div>
        )}

        {!loading && reviews.length === 0 && <p className="text-muted">Nenhuma avaliação recebida ainda.</p>}
        {!loading && reviews.length > 0 && visibleReviews.length === 0 && (
          <p className="text-muted">Nenhuma avaliação com esse filtro.</p>
        )}

        <div className="flex flex-col">
          {visibleReviews.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 border-t border-border px-1 py-5 first:border-t-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-heading text-lg text-white">{r.customer_name}</span>
                  <StarRating value={r.rating} size={16} />
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase"
                    style={
                      r.published
                        ? { background: "rgba(120,200,140,0.14)", color: "#7FC98F" }
                        : { background: "rgba(255,255,255,0.08)", color: "#9E9E9E" }
                    }
                  >
                    {r.published ? "Publicada" : "Não publicada"}
                  </span>
                </div>
                <span className="mt-1 block text-sm text-muted">
                  {r.services?.name} com {r.barbers?.name} · {formatDateBR(r.created_at.slice(0, 10))}
                </span>
                {r.comment && <p className="m-0 mt-2.5 max-w-[60ch] text-[15px] text-white">{r.comment}</p>}
              </div>
              <div className="flex shrink-0 gap-2.5">
                <button
                  onClick={() => togglePublish(r)}
                  disabled={acting === r.id}
                  className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-border px-4.5 font-heading text-sm tracking-[0.14em] text-white uppercase transition-colors hover:border-silver disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {r.published ? "Despublicar" : "Publicar"}
                </button>
                <button
                  onClick={() => setDeleting(r)}
                  disabled={acting === r.id}
                  className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-border px-4.5 font-heading text-sm tracking-[0.14em] text-muted uppercase transition-colors hover:border-silver hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {deleting && (
        <ConfirmModal
          title="Excluir avaliação?"
          message={`Tem certeza que deseja excluir a avaliação de ${deleting.customer_name}? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir avaliação"
          cancelLabel="Voltar"
          busy={acting === deleting.id}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}

      {toast && <Toast message={toast.message} onDismiss={() => setToast(null)} variant={toast.variant} />}
    </div>
  );
}
