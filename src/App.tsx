import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SitePage } from "@/pages/SitePage";
import { CookieConsent } from "@/components/CookieConsent";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Split out of the main bundle: neither is needed for the marketing site's
// first paint (the common case — an anonymous visitor landing on "/"), and
// AdminPage in particular pulls in every admin tab component.
const AccountPage = lazy(() => import("@/pages/AccountPage").then((m) => ({ default: m.AccountPage })));
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const TermsPage = lazy(() => import("@/pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-ink" />}>
            <Routes>
              <Route path="/" element={<SitePage />} />
              <Route path="/conta" element={<AccountPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/termos" element={<TermsPage />} />
              <Route path="/privacidade" element={<PrivacyPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          {/* Inside the router so its "Política de privacidade" link can navigate. */}
          <CookieConsent />
          <SpeedInsights />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
