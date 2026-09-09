import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type Barber = Database["public"]["Tables"]["barbers"]["Row"];
type BarberHours = Database["public"]["Tables"]["barber_hours"]["Row"];
type Service = Database["public"]["Tables"]["services"]["Row"];
type GalleryPhoto = Database["public"]["Tables"]["gallery_photos"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

interface Loadable<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function useTable<T>(
  loader: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  fallback: T,
  deps: unknown[] = [],
): Loadable<T> {
  const [state, setState] = useState<Omit<Loadable<T>, "reload">>({ data: fallback, loading: true, error: null });

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    loader().then(({ data, error }) => {
      setState({ data: data ?? fallback, loading: false, error: error?.message ?? null });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true }));
    loader().then(({ data, error }) => {
      if (!active) return;
      setState({ data: data ?? fallback, loading: false, error: error?.message ?? null });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload };
}

export function useBarbers() {
  return useTable<Barber[]>(
    () => supabase.from("barbers").select("*").order("sort_order"),
    [],
  );
}

export function useBarberHours() {
  return useTable<BarberHours[]>(
    () => supabase.from("barber_hours").select("*"),
    [],
  );
}

export function useServices() {
  return useTable<Service[]>(
    () =>
      supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("sort_order"),
    [],
  );
}

export function useGallery() {
  return useTable<GalleryPhoto[]>(
    () => supabase.from("gallery_photos").select("*").order("sort_order"),
    [],
  );
}

export function useProducts() {
  return useTable<Product[]>(
    () =>
      supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("name"),
    [],
  );
}

export type { Barber, BarberHours, Service, GalleryPhoto, Product };
