/**
 * Hand-written mirror of supabase/schema.sql.
 * Regenerate with `npx supabase gen types typescript` once the project is
 * linked to a real Supabase instance, then this file can be replaced.
 */

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type OrderStatus = "pending" | "ready" | "completed" | "cancelled";
export type ProductCategory = "Cabelo" | "Barba" | "Pele";
export type PaymentMethod = "Pix" | "Crédito" | "Débito" | "Dinheiro";
export type UserRole = "customer" | "admin";
export type GalleryKind = "autoral" | "dia";

type ProfilesRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
};

type BarbersRow = {
  id: string;
  name: string;
  role_title: string;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  photo_path: string;
  gallery_paths: string[];
  sort_order: number;
};

type BarberHoursRow = {
  id: number;
  barber_id: string;
  weekday: number;
  is_open: boolean;
  label: string;
  slots: string[];
};

type ServicesRow = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  sort_order: number;
  active: boolean;
};

type BookingsRow = {
  id: string;
  customer_id: string | null;
  barber_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: BookingStatus;
  price_cents: number;
  customer_name: string;
  customer_phone: string;
  created_at: string;
};

type ProductsRow = {
  id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  price_cents: number;
  stock: number;
  image_path: string | null;
  sale_percent: number;
  sale_until: string | null;
  active: boolean;
};

type OrdersRow = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
};

type OrderItemsRow = {
  id: number;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
};

type GalleryPhotosRow = {
  id: string;
  image_path: string;
  kind: GalleryKind;
  service_label: string | null;
  client_label: string | null;
  barber_id: string | null;
  taken_on: string | null;
  sort_order: number;
};

type TransactionsRow = {
  id: number;
  occurred_on: string;
  description: string;
  payment_method: PaymentMethod;
  amount_cents: number;
  booking_id: string | null;
  order_id: string | null;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow;
        Insert: Partial<ProfilesRow> & { id: string };
        Update: Partial<ProfilesRow>;
        Relationships: [];
      };
      barbers: {
        Row: BarbersRow;
        Insert: Omit<BarbersRow, "email" | "phone" | "gallery_paths" | "sort_order" | "instagram"> &
          Partial<Pick<BarbersRow, "email" | "phone" | "gallery_paths" | "sort_order" | "instagram">>;
        Update: Partial<BarbersRow>;
        Relationships: [];
      };
      barber_hours: {
        Row: BarberHoursRow;
        Insert: Omit<BarberHoursRow, "id">;
        Update: Partial<BarberHoursRow>;
        Relationships: [];
      };
      services: {
        Row: ServicesRow;
        Insert: ServicesRow;
        Update: Partial<ServicesRow>;
        Relationships: [];
      };
      bookings: {
        Row: BookingsRow;
        Insert: Omit<BookingsRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<BookingsRow>;
        Relationships: [];
      };
      products: {
        Row: ProductsRow;
        Insert: Omit<ProductsRow, "id" | "description" | "image_path" | "sale_percent" | "sale_until" | "active"> & {
          id?: string;
          description?: string | null;
          image_path?: string | null;
          sale_percent?: number;
          sale_until?: string | null;
          active?: boolean;
        };
        Update: Partial<ProductsRow>;
        Relationships: [];
      };
      orders: {
        Row: OrdersRow;
        Insert: Omit<OrdersRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<OrdersRow>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItemsRow;
        Insert: Omit<OrderItemsRow, "id">;
        Update: Partial<OrderItemsRow>;
        Relationships: [];
      };
      gallery_photos: {
        Row: GalleryPhotosRow;
        Insert: Omit<GalleryPhotosRow, "id"> & { id?: string };
        Update: Partial<GalleryPhotosRow>;
        Relationships: [];
      };
      transactions: {
        Row: TransactionsRow;
        Insert: Omit<TransactionsRow, "id" | "created_at"> & { id?: number; created_at?: string };
        Update: Partial<TransactionsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
