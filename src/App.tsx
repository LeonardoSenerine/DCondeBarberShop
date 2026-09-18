import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SitePage } from "@/pages/SitePage";
import { CookieConsent } from "@/components/CookieConsent";

// Split out of the main bundle: neither is needed for the marketing site's
// first paint (the common case — an anonymous visitor landing on "/"), and
// AdminPage in particular pulls in every admin tab component.
const AccountPage = lazy(() => import("@/pages/AccountPage").then((m) => ({ default: m.AccountPage })));
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));

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
            </Routes>
          </Suspense>
        </BrowserRouter>
        <CookieConsent />
      </CartProvider>
    </AuthProvider>
  );
}
