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
  | "solicitado"
  | "asignado"
  | "en_curso"
  | "completado"
  | "cancelado";

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
  offered_to: string | null;
  offer_expires_at: string | null;
  created_at: string;
  updated_at: string;
};
