import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { BookingWizard, type BookingDraft } from "@/components/BookingWizard";
import { ServicesCarousel } from "@/components/ServicesCarousel";
import { Ambiente } from "@/components/Ambiente";
import { Gallery } from "@/components/Gallery";
import { LightBanner } from "@/components/LightBanner";
import { Perks } from "@/components/Perks";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Shop } from "@/components/Shop";
import { Testimonials } from "@/components/Testimonials";
import { Footer } from "@/components/Footer";
import { WhatsAppButton, MobileBottomBar } from "@/components/FloatingActions";
import { Lightbox } from "@/components/Lightbox";
import { AuthModal } from "@/components/AuthModal";
import { Toast } from "@/components/admin/Toast";
import { useAuth } from "@/context/AuthContext";
import { useCreateBooking } from "@/hooks/useBooking";
import { useGallery } from "@/hooks/useCatalog";
import { clearPendingBooking, peekPendingBooking } from "@/lib/pendingBooking";
import { friendlyBookingError } from "@/lib/format";
import { isViewingSiteAsAdmin, markViewingSiteAsAdmin } from "@/lib/adminSiteView";

export function SitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile, isAdmin } = useAuth();
  const { createBooking } = useCreateBooking();
  const { data: photos } = useGallery();

  const [authOpen, setAuthOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<BookingDraft | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // "Remarcar" in "Meus agendamentos" sends the customer here instead of
  // opening the booking modal, with the same barber/service already picked
  // so they only need to pick a new day and time.
  const rebook = (location.state as { rebook?: { barberId: string; serviceId: string } } | null)?.rebook;
  useEffect(() => {
    if (!rebook) return;
    document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [rebook]);

  // Completes a booking left pending across the magic-link email round
  // trip: once the session shows up (same tab after the redirect, or
  // another tab picking up the synced session), finish the booking the
  // user was making before they had to confirm their e-mail. The "Entrar"
  // mode doesn't collect name/phone, so for those drafts we wait for the
  // existing profile to load and use its contact info instead — reading
  // (not clearing) the draft until we actually have what we need avoids
  // losing it to a premature read.
  useEffect(() => {
    if (!session?.user) return;
    const stored = peekPendingBooking();
    if (!stored) return;
    if (!stored.name && !profile) return;

    const customerName = stored.name || profile?.full_name || "";
    const customerPhone = stored.phone || profile?.phone || "";
    clearPendingBooking();
    createBooking({
      customer_id: session.user.id,
      barber_id: stored.draft.barberId,
      service_id: stored.draft.serviceId,
      scheduled_date: stored.draft.dateIso,
      scheduled_time: stored.draft.time,
      status: "pending",
      price_cents: stored.draft.priceCents,
      // A draft saved to localStorage before this field existed (e.g. the
      // magic-link round trip started right as this shipped) won't have it
      // — fall back to a single slot rather than sending undefined/null,
      // which the bookings_insert_own RLS check would just reject outright.
      duration_minutes: stored.draft.durationMinutes ?? 60,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: profile?.email ?? session.user.email ?? null,
    }).then(({ error }) => {
      setAuthOpen(false);
      setPendingBooking(null);
      if (error) {
        setBookingError(`Não foi possível confirmar seu agendamento: ${friendlyBookingError(error)}`);
        return;
      }
      navigate("/conta");
    });
  }, [session?.user, profile, createBooking, navigate]);

  // Once the user is authenticated, drop the auth modal — covers the
  // login-only flow where they confirmed the magic link elsewhere and
  // came back to a tab still showing "check your e-mail".
  useEffect(() => {
    if (session?.user && authOpen) setAuthOpen(false);
  }, [session?.user, authOpen]);

  async function handleConfirmBooking(draft: BookingDraft) {
    if (session?.user) {
      const { error } = await createBooking({
        customer_id: session.user.id,
        barber_id: draft.barberId,
        service_id: draft.serviceId,
        scheduled_date: draft.dateIso,
        scheduled_time: draft.time,
        status: "pending",
        price_cents: draft.priceCents,
        duration_minutes: draft.durationMinutes,
        customer_name: profile?.full_name ?? "",
        customer_phone: profile?.phone ?? "",
        customer_email: profile?.email ?? session.user.email ?? null,
      });
      if (error) {
        setBookingError(`Não foi possível confirmar seu agendamento: ${friendlyBookingError(error)}`);
        return;
      }
      navigate("/conta");
      return;
    }
    setPendingBooking(draft);
    setAuthOpen(true);
  }

  // Owner/staff land on the marketing homepage right after login with
  // nothing to do there, so send them straight to their panel by default.
  // But "Ver site" in the admin panel deliberately sends them here (with
  // this state flag) to preview the live site — including using the same
  // booking flow a customer would, e.g. to book an appointment for
  // themselves — so don't bounce them right back in that case. The flag
  // alone would only survive this one navigation, so it's also persisted
  // for the rest of the tab's session (isViewingSiteAsAdmin), letting them
  // refresh, browse around and go through login/booking without being
  // redirected mid-flow.
  const fromAdminNav = (location.state as { fromAdmin?: boolean } | null)?.fromAdmin ?? false;
  useEffect(() => {
    if (fromAdminNav) markViewingSiteAsAdmin();
  }, [fromAdminNav]);
  if (isAdmin && !fromAdminNav && !isViewingSiteAsAdmin()) {
    return <Navigate to="/admin" replace />;
  }

  const lightboxIndex = photos.findIndex((p) => p.image_path === lightbox);
  const lightboxLabel = lightboxIndex >= 0 ? (photos[lightboxIndex].service_label ?? "D'Conde") : "";

  function moveLightbox(dir: 1 | -1) {
    if (photos.length === 0) return;
    const next = (lightboxIndex + dir + photos.length) % photos.length;
    setLightbox(photos[next].image_path);
  }

  return (
    <div style={{ overflowX: "hidden" }}>
      <Header onOpenAuth={() => setAuthOpen(true)} />
      <Hero />
      <BookingWizard
        onConfirm={handleConfirmBooking}
        initialBarberId={rebook?.barberId}
        initialServiceId={rebook?.serviceId}
        initialStep={rebook ? 3 : undefined}
      />
      <ServicesCarousel />
      <Ambiente onOpenLightbox={setLightbox} />
      <Gallery onOpenLightbox={setLightbox} />
      <LightBanner />
      <Shop
        onRequireAuth={() => {
          setPendingBooking(null);
          setAuthOpen(true);
        }}
      />
      <Perks />
      <Testimonials />
      <About />
      <Contact />
      <Footer onOpenAuth={() => setAuthOpen(true)} />
      <MobileBottomBar />
      <WhatsAppButton />

      {lightbox && (
        <Lightbox
          src={lightbox}
          label={lightboxLabel}
          onClose={() => setLightbox(null)}
          {...(lightboxIndex >= 0 ? { onPrev: () => moveLightbox(-1), onNext: () => moveLightbox(1) } : {})}
        />
      )}

      {authOpen && (
        <AuthModal
          pendingBooking={pendingBooking}
          onClose={() => {
            setAuthOpen(false);
            setPendingBooking(null);
          }}
        />
      )}

      {bookingError && (
        <Toast message={bookingError} onDismiss={() => setBookingError(null)} duration={6000} variant="error" />
      )}
    </div>
  );
}
