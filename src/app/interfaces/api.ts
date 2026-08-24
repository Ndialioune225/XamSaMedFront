/* ============================================================
   Contrats d'API du backend Laravel (XamSaMed / Sanctum).
   ============================================================ */

export type BackendRole =
  | 'patient' | 'pharmacy_user' | 'hospital_user' | 'distributor_user' | 'admin';

export interface DistributorMeta {
  type: 'PNA' | 'PRA' | 'PRIVATE';
  region?: string;
}

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: BackendRole;
  structure_id: number | null;
  profile_meta?: DistributorMeta | Record<string, unknown> | null;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** POST /login */
export interface LoginResponse {
  user: ApiUser;
  token: string;
}

/* ---- GET /distributor/alerts (réponse actuellement mockée côté backend) ---- */
export interface PharmacyReport {
  pharmacy_id: number;
  pharmacy_name: string;
  reported_at: string;
}
export interface ShortageAlert {
  medicine_id: number;
  name: string;
  pharmacy_reports: PharmacyReport[];
  severity: 'high' | 'medium' | 'low' | string;
}
export interface DistributorAlertsResponse {
  status: string;
  data: ShortageAlert[];
}

/* ---- Référentiel & domaine (réponses API) ---- */
export interface ApiMedicine {
  id: number;
  name: string;
  brand: string | null;
  form: string | null;
  dosage: string | null;
  is_controlled: boolean;
}
export interface ApiAvailabilityRow {
  structure_id: number;
  pharmacy: string;
  city: string | null;
  phone: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  status: string;
  available: number;
  label: string;
}
export interface ApiStructure {
  id: number;
  name: string;
  type: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  hours: string | null;
}
export interface ApiOrder {
  id: number;
  medicine: string | null;
  medicine_id: number;
  pharmacy: string | null;
  structure_id: number;
  qty: number;
  status: string;
  created_at: string | null;
}
export interface ApiStockRow {
  id: number;
  medicine_id: number;
  medicine: string | null;
  form: string | null;
  dosage: string | null;
  is_controlled: boolean;
  quantity: number;
  reserved: number;
  available: number;
  threshold: number;
  status: string;
}
export interface ApiDemande {
  id: number;
  medicine: string | null;
  medicine_id: number;
  from: string | null;
  type: string;
  qty: number;
  urgency: string;
  status: string;
  created_at: string | null;
}
export interface ApiRegionalDemand {
  zone: string;
  medicine: string;
  officines: number;
  volume: number;
  tension: string;
}
export interface ApiZone {
  name: string;
  ruptures: number;
  tensions?: number;
  level: string;
}
export interface ApiHospitalAlert {
  id: number;
  medicine: string | null;
  service: string | null;
  level: string;
  remaining: string | null;
  status: string;
  created_at: string | null;
}
export interface ApiCriticalMedicine {
  medicine_id: number;
  medicine: string | null;
  available: number;
  status: string;
}
export interface ApiOverview {
  ruptures: number;
  low: number;
  zones_tracked: number;
  medicines_in_tension: number;
}
export interface ApiTension {
  medicine_id: number;
  medicine: string | null;
  pct: number;
  shortage: number;
  total: number;
}
