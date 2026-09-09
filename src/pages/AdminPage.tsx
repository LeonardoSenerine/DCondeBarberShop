import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AgendaTab } from "@/components/admin/AgendaTab";
import { FinanceTab } from "@/components/admin/FinanceTab";
import { ClientsTab } from "@/components/admin/ClientsTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { ServicesTab } from "@/components/admin/ServicesTab";
import { GalleryTab } from "@/components/admin/GalleryTab";
import { BarbersTab } from "@/components/admin/BarbersTab";

const TABS = [
  { id: "agenda", name: "Agenda do dia" },
  { id: "fin", name: "Financeiro" },
  { id: "clientes", name: "Clientes" },
  { id: "produtos", name: "Produtos" },
  { id: "servicos", name: "Serviços" },
  { id: "galeria", name: "Galeria" },
  { id: "barbeiros", name: "Barbeiros" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminPage() {
  const { session, loading, isAdmin } = useAuth();
  const [tab, setTab] = useState<TabId>("agenda");

  if (loading) return null;
  if (!session || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-ink">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <img src="/img/monogram.jpg" alt="" className="h-10 w-11 object-contain" style={{ filter: "brightness(1.25) contrast(3.4)", mixBlendMode: "screen" }} />
            <span className="font-heading text-[13px] tracking-[0.22em] text-white uppercase">
              Painel da barbearia
            </span>
          </div>
          <Link to="/" className="flex min-h-11 items-center rounded-lg border border-border px-4.5 font-heading text-xs tracking-[0.18em] text-white uppercase transition-colors hover:border-silver">
            Ver site
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1360px] flex-wrap items-start gap-7 px-6 py-8 pb-20">
        <div className="flex min-w-0 flex-1 basis-[190px] gap-1.5 overflow-x-auto pb-1 sm:max-w-[230px] sm:flex-col">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="min-h-11.5 flex-shrink-0 rounded-lg px-4.5 text-left font-heading text-xs tracking-[0.16em] whitespace-nowrap uppercase transition-colors"
                style={{
                  background: on ? "rgba(255,255,255,0.07)" : "transparent",
                  border: `1px solid ${on ? "#E0E0E0" : "#2A2A2A"}`,
                  color: on ? "#FFFFFF" : "#A3A3A3",
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 basis-[460px]">
          {tab === "agenda" && <AgendaTab />}
          {tab === "fin" && <FinanceTab />}
          {tab === "clientes" && <ClientsTab />}
          {tab === "produtos" && <ProductsTab />}
          {tab === "servicos" && <ServicesTab />}
          {tab === "galeria" && <GalleryTab />}
          {tab === "barbeiros" && <BarbersTab />}
        </div>
      </div>
    </div>
  );
}
