/* ============================================================
   Contrats d'API du backend Laravel (XamSaMed / Sanctum).
   ============================================================ */

export type BackendRole =
  | 'patient' | 'pharmacy_user' | 'hospital_user' | 'distributor_user' | 'admin';

/** Type de structure en base (structures.type). */
export type StructureType = 'pharmacy' | 'hospital' | 'distributor' | 'pna' | 'pra';

/** Structure rattachée à l'utilisateur (renvoyée par /login et /me). */
export interface ApiUserStructure {
  id: number;
  name: string;
  type: StructureType;
  code?: string | null;
  city: string | null;
  region: string | null;
  address?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: BackendRole;
  structure_id: number | null;
  /** Le périmètre distributeur (PNA / PRA / privé) se lit ici, en base. */
  structure?: ApiUserStructure | null;
  profile_meta?: Record<string, unknown> | null;
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
  pharmacies: PharmacyReport[];
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

export interface GlobalSearchResult {
  type: 'medicine' | 'pharmacy' | string;
  id: number;
  label: string;
  name?: string;
  dosage?: string | null;
  form?: string | null;
  city?: string | null;
}
export interface ApiAvailabilityRow {
  structure_id: number;
  pharmacy_name: string;
  pharmacy?: string;
  city: string | null;
  phone: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  status: string;
  available: number;
  label: string;
  distance_label?: string | null;
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
  medicine?: string | null;
  medicine_name?: string | null;
  form: string | null;
  dosage: string | null;
  is_controlled: boolean;
  quantity: number;
  reserved: number;
  available: number;
  threshold?: number;
  threshold_qty?: number;
  status: string;
}
export interface ApiDemande {
  id: number;
  medicine: string | null;
  medicine_id: number;
  from: string | null;
  patient?: string | null;
  type: string;
  qty: number;
  urgency: string;
  status: string;
  created_at: string | null;
}
export interface ApiRegionalDemandPharmacy {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  status: string;
  available: number;
}
export interface ApiRegionalDemand {
  zone: string;
  medicine_id: number;
  medicine: string;
  officines_count: number;
  estimated_need: number;
  tension: string;
  pharmacies: ApiRegionalDemandPharmacy[];
}

/* ---- Chaîne d'approvisionnement ---- */

/** GET /distributors?medicine_id= — fournisseurs (privés + PRA) avec leur stock du médicament. */
export interface ApiSupplier {
  id: number;
  name: string;
  type: 'distributor' | 'pra' | string;
  kind: string;
  city: string | null;
  region: string | null;
  phone: string | null;
  is_partner: boolean;
  available: number | null;
  has_stock: boolean | null;
  stock_status: string | null;
}

/** GET /pharmacy/restock-requests & /hospital/restock-requests — suivi d'une demande envoyée. */
export interface ApiRestockRequest {
  id: number;
  source_alert_id?: number | null;
  medicine_id: number | null;
  medicine: string | null;
  service?: string | null;
  distributor_id: number | null;
  distributor: string;
  quantity: number | null;
  status: 'pending' | 'resolved' | 'rejected' | string;
  delivery_id: number | null;
  delivery_date: string | null;
  rejection_reason: string | null;
  created_at: string | null;
}

/** GET /distributor/requests — demande reçue par un fournisseur. */
export interface ApiIncomingRequest {
  id: number;
  kind: 'pharmacy' | 'hospital';
  structure_id: number | null;
  structure: string | null;
  medicine_id: number | null;
  medicine: string | null;
  available: number | string | null;
  threshold: number | null;
  quantity_requested: number | null;
  service: string | null;
  message: string | null;
  targeted: boolean;
  status: string;
  delivery_id: number | null;
  delivery_date: string | null;
  rejection_reason: string | null;
  created_at: string | null;
}

/** GET /distributor/destinations?medicine_id= — structure livrable + état de son stock. */
export interface ApiDestination {
  id: number;
  name: string;
  type: StructureType;
  city: string | null;
  region: string | null;
  phone: string | null;
  available: number | null;
  status: string | null;
  threshold: number | null;
  suggested_qty: number | null;
}

/** Commande institutionnelle (hôpital → PRA ou PRA → PNA). */
export interface ApiInstitutionalOrder {
  id: number;
  origin_type?: 'hospital_to_pra' | 'pra_to_pna' | string;
  hospital?: string | null;
  hospital_id?: number | null;
  pra?: string | null;
  pra_id?: number | null;
  pra_region?: string | null;
  pna?: string | null;
  medicine: string | null;
  medicine_id?: number | null;
  quantity: number;
  urgency: 'normal' | 'urgent' | 'critical' | string;
  service?: string | null;
  notes?: string | null;
  status: string;
  delivery_id?: number | null;
  delivery_date?: string | null;
  rejection_reason?: string | null;
  ordered_at: string | null;
}
export interface ApiZone {
  name: string;
  ruptures: number;
  tensions?: number;
  level: string;
}
export interface ApiHospitalAlert {
  id: number;
  medicine_id?: number | null;
  medicine: string | null;
  service: string | null;
  level: string;
  remaining: string | null;
  remaining_quantity?: number | null;
  restock_requested_to?: number[];
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
