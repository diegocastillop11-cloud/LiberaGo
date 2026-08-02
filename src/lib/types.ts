export type WorkerStatus = "none" | "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  worker_status: WorkerStatus;
  created_at: string;
};

export type RequestStatus =
  | "pendiente_pago"
  | "solicitado"
  | "asignado"
  | "en_curso"
  | "completado"
  | "cancelado"
  | "no_completado";

export type ServiceLocation = {
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
  completed_at: string | null;
};

export type WorkerNote = {
  text: string;
  created_at: string;
};

export type PricingType = "fixed" | "distance";

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  location_labels: string[];
  active: boolean;
  pricing_type: PricingType;
  price_per_km: number | null;
  created_at: string;
};

export type ServiceRequest = {
  id: string;
  service_id: string;
  service_name: string;
  price: number;
  locations: ServiceLocation[];
  distance_km: number | null;
  client_id: string;
  client_name: string;
  client_phone: string | null;
  worker_id: string | null;
  worker_name: string | null;
  worker_notes: WorkerNote[];
  status: RequestStatus;
  notes: string | null;
  failure_reason: string | null;
  offered_to: string | null;
  offer_expires_at: string | null;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
};
