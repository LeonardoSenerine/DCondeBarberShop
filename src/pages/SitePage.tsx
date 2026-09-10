import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Footer } from "@/components/Footer";
import { WhatsAppButton, MobileBottomBar } from "@/components/FloatingActions";
import { Lightbox } from "@/components/Lightbox";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { useCreateBooking } from "@/hooks/useBooking";
import { useGallery } from "@/hooks/useCatalog";
import { takePendingBooking } from "@/lib/pendingBooking";

export function SitePage() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const { createBooking } = useCreateBooking();
  const { data: photos } = useGallery();

  const [authOpen, setAuthOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<BookingDraft | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Completes a booking left pending across the magic-link email round
  // trip: once the session shows up (same tab after the redirect, or
  // another tab picking up the synced session), finish the booking the
  // user was making before they had to confirm their e-mail.
  useEffect(() => {
    if (!session?.user) return;
    const stored = takePendingBooking();
    if (!stored) return;
    createBooking({
      customer_id: session.user.id,
      barber_id: stored.draft.barberId,
      service_id: stored.draft.serviceId,
      scheduled_date: stored.draft.dateIso,
      scheduled_time: stored.draft.time,
      status: "confirmed",
      price_cents: stored.draft.priceCents,
      customer_name: stored.name,
      customer_phone: stored.phone,
    }).then(() => {
      setAuthOpen(false);
      setPendingBooking(null);
      navigate("/conta");
    });
  }, [session?.user, createBooking, navigate]);

  async function handleConfirmBooking(draft: BookingDraft) {
    if (session?.user) {
      await createBooking({
        customer_id: session.user.id,
        barber_id: draft.barberId,
        service_id: draft.serviceId,
        scheduled_date: draft.dateIso,
        scheduled_time: draft.time,
        status: "confirmed",
        price_cents: draft.priceCents,
        customer_name: profile?.full_name ?? "",
        customer_phone: profile?.phone ?? "",
      });
      navigate("/conta");
      return;
    }
    setPendingBooking(draft);
    setAuthOpen(true);
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
      <BookingWizard onConfirm={handleConfirmBooking} />
      <ServicesCarousel />
      <Ambiente onOpenLightbox={setLightbox} />
      <Gallery onOpenLightbox={setLightbox} />
      <LightBanner />
      <Perks />
      <About />
      <Contact />
      <Shop />
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
    </div>
  );
}
