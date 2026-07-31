export type RequestStatus =
  | "solicitado"
  | "asignado"
  | "en_curso"
  | "completado"
  | "cancelado";

export type ServiceLocation = {
  label: string;
  address: string;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  location_labels: string[];
  active: boolean;
  created_at: string;
};

export type ServiceRequest = {
  id: string;
  service_id: string;
  service_name: string;
  price: number;
  locations: ServiceLocation[];
  client_name: string;
  worker_name: string | null;
  status: RequestStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
