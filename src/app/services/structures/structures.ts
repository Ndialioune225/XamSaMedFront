import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiStructure, ApiSupplier } from '../../interfaces/api';
import { Pharmacy } from '../../interfaces/models';

const REF = { lat: 14.6928, lng: -17.4467 }; // Dakar Plateau — position patient de démo

/** Distance à vol d'oiseau (Haversine) depuis la position de démo, en km. */
export function distanceKm(lat: number, lng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - REF.lat);
  const dLng = toRad(lng - REF.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(REF.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function distanceLabel(lat: number | string | null, lng: number | string | null): string {
  const la = Number(lat);
  const ln = Number(lng);
  if (!isFinite(la) || !isFinite(ln)) return '—';
  return distanceKm(la, ln).toFixed(1).replace('.', ',') + ' km';
}

/** Projette des coordonnées géographiques (région de Dakar) dans une boîte 0–100 % pour la mini-carte. */
export function projectToBox(lat: number | string | null, lng: number | string | null): { x: number; y: number } {
  const la = Number(lat);
  const ln = Number(lng);
  const LAT_MIN = 14.4, LAT_MAX = 16.2, LNG_MIN = -17.65, LNG_MAX = -16.0;
  const clamp = (v: number) => Math.max(4, Math.min(96, v));
  const x = isFinite(ln) ? ((ln - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100 : 50;
  const y = isFinite(la) ? ((LAT_MAX - la) / (LAT_MAX - LAT_MIN)) * 100 : 50;
  return { x: clamp(x), y: clamp(y) };
}

/** Accès aux structures (pharmacies / hôpitaux / distributeurs). */
@Injectable({ providedIn: 'root' })
export class StructureService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /pharmacies → Pharmacy[] (lat/lng projetés en % pour la carte, dist = Haversine). */
  pharmacies(): Observable<Pharmacy[]> {
    return this.http.get<{ data: ApiStructure[] }>(`${this.base}/pharmacies`).pipe(
      map(r => r.data.map(toPharmacy)),
      catchError(() => of([])),
    );
  }

  /**
   * GET /distributors?medicine_id= → fournisseurs (distributeurs privés + PRA)
   * avec, pour le médicament donné, leur quantité disponible lue en base et le
   * flag partenaire. Sert au choix « à qui envoyer la demande ».
   */
  suppliers(medicineId?: number | null): Observable<ApiSupplier[]> {
    let params = new HttpParams();
    if (medicineId) params = params.set('medicine_id', String(medicineId));
    return this.http.get<{ data: ApiSupplier[] }>(`${this.base}/distributors`, { params }).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }
}

function toPharmacy(s: ApiStructure): Pharmacy {
  const p = projectToBox(s.latitude, s.longitude);
  return {
    id: String(s.id),
    nom: s.name,
    ville: s.city ?? '',
    dist: distanceLabel(s.latitude, s.longitude),
    tel: s.phone ?? '',
    horaires: s.hours ?? '',
    lat: p.y, // top %
    lng: p.x, // left %
  };
}
