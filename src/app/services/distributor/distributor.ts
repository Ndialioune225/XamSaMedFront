import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiRegionalDemand, ApiZone, DistributorAlertsResponse, ShortageAlert } from '../../interfaces/api';
import { DemandeReg, ZoneInfo, ZoneLevel, DeliveryRow } from '../../interfaces/models';
import { AuthService } from '../auth/auth';

/** Coordonnées (% sur la carte) des principales villes du Sénégal. */
const CITY_GEO: Record<string, { x: number; y: number }> = {
  'Dakar': { x: 28, y: 36 }, 'Pikine': { x: 33, y: 33 }, 'Rufisque': { x: 37, y: 41 },
  'Thiès': { x: 47, y: 47 }, 'Saint-Louis': { x: 40, y: 16 }, 'Louga': { x: 49, y: 28 },
  'Kaolack': { x: 55, y: 62 }, 'Ziguinchor': { x: 30, y: 86 }, 'Tambacounda': { x: 78, y: 56 },
};

export function asZoneLevel(level: string): ZoneLevel {
  return level === 'crit' || level === 'haute' || level === 'moyenne' || level === 'basse' ? level : 'moyenne';
}

/** Construit un ZoneInfo (avec coords carte) à partir d'un nom de ville. */
export function toZoneInfo(name: string, level: string, ruptures: number): ZoneInfo {
  const g = CITY_GEO[name] ?? { x: 50, y: 50 };
  return { nom: name, x: g.x, y: g.y, niveau: asZoneLevel(level), ruptures };
}

/** Endpoints distributeur (alertes, demandes régionales, zones) — données réelles. */
@Injectable({ providedIn: 'root' })
export class DistributorService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private readonly auth = inject(AuthService);

  dashboard(): Observable<any> {
    return this.http.get<{ data: any }>(`${this.base}/distributor/dashboard`).pipe(
      map(r => r.data ?? {}),
      catchError(() => of({})),
    );
  }

  /** GET /distributor/alerts — ruptures signalées par les officines. */
  alerts(): Observable<ShortageAlert[]> {
    return this.http.get<DistributorAlertsResponse>(`${this.base}/distributor/alerts`).pipe(
      map(r => r.data ?? []),
      map(alerts => this.applyScopeFilter(alerts, 'alert')),
      catchError(() => of([])),
    );
  }

  /** GET /distributor/regional-demands — agrégation par zone + médicament. */
  regionalDemands(): Observable<DemandeReg[]> {
    return this.http.get<{ data: ApiRegionalDemand[] }>(`${this.base}/distributor/regional-demands`).pipe(
      map(r => r.data.map(toDemandeReg)),
      map(demands => this.applyScopeFilter(demands, 'demand')),
      catchError(() => of([])),
    );
  }

  /** GET /distributor/zones — villes avec ruptures + niveau de tension. */
  zones(): Observable<ZoneInfo[]> {
    return this.http.get<{ data: ApiZone[] }>(`${this.base}/distributor/zones`).pipe(
      map(r => r.data.map(z => toZoneInfo(z.name, z.level, z.ruptures))),
      map(zones => this.applyScopeFilter(zones, 'zone')),
      catchError(() => of([])),
    );
  }

  // --- API LIVRAISONS (DIS-006 à DIS-010) ---

  /** GET /distributor/deliveries */
  deliveries(): Observable<DeliveryRow[]> {
    return this.http.get<{ data: any[] }>(`${this.base}/distributor/deliveries`).pipe(
      map(r => (r.data ?? []).map(toDeliveryRow)),
      catchError(() => of([])),
    );
  }

  /** POST /distributor/deliveries */
  createDelivery(zone: string, med: string, qty: number, date: string): Observable<unknown> {
    return this.http.post(`${this.base}/distributor/deliveries`, { zone, medicine: med, quantity: qty, delivery_date: date });
  }

  /** PUT /distributor/deliveries/{id} */
  updateDelivery(id: string, qty: number, date: string): Observable<unknown> {
    return this.http.put(`${this.base}/distributor/deliveries/${id}`, { quantity: qty, delivery_date: date });
  }

  /** POST /distributor/deliveries/{id}/start */
  startDelivery(id: string): Observable<unknown> {
    return this.http.post(`${this.base}/distributor/deliveries/${id}/start`, {});
  }

  changeDeliveryStatus(id: string, status: string): Observable<unknown> {
    if (status === 'En transit') return this.startDelivery(id);
    if (status === 'Livrée') return this.http.post(`${this.base}/distributor/deliveries/${id}/complete`, {});
    return this.http.delete(`${this.base}/distributor/deliveries/${id}`);
  }

  /** GET /distributor/previsions — prévisions basées sur les données réelles. */
  previsions(): Observable<any[]> {
    return this.http.get<{ data: any[] }>(`${this.base}/distributor/previsions`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** Filtre les données selon les règles DIS-SCOPE (PNA vs PRA vs PRIVATE) */
  private applyScopeFilter<T>(items: T[], type: 'alert' | 'demand' | 'zone'): T[] {
    const user = this.auth.user();
    if (!user || user.role !== 'distributor_user') return items;

    // On cast profile_meta pour accéder aux attributs du distributeur
    const meta = user.profile_meta as any;
    const distType = meta?.type || 'PNA'; // Par défaut PNA si non défini
    const region = meta?.region;

    if (distType === 'PNA') {
      return items; // DIS-SCOPE-001: Vue nationale complète
    }

    if (distType === 'PRA' && region) {
      // DIS-SCOPE-002: Vue régionale uniquement
      return items.filter(item => {
        if (type === 'demand') return (item as unknown as DemandeReg).zone === region;
        if (type === 'zone') return (item as unknown as ZoneInfo).nom === region;
        // Pour les alertes, on simule un filtrage ou on les laisse passer si la structure ne permet pas de filtrer géographiquement ici
        return true;
      });
    }

    if (distType === 'PRIVATE') {
      // DIS-SCOPE-005: Distributeur privé (limité aux partenaires privés, simulé ici)
      return items;
    }

    return items;
  }
}

function toDemandeReg(d: ApiRegionalDemand): DemandeReg {
  return {
    id: `${d.zone}-${d.medicine}`,
    zone: d.zone,
    med: d.medicine,
    vol: `~${Math.max(0, d.estimated_need)} u.`,
    tension: asZoneLevel(d.tension),
    officines: d.officines_count,
  };
}

function toDeliveryRow(d: any): DeliveryRow {
  return {
    id: String(d.id),
    zone: d.city ?? d.destination ?? '—',
    med: d.medicine ?? '—',
    qty: Number(d.quantity ?? 0),
    date: d.delivery_date ?? '',
    status: d.status_label ?? d.status ?? 'Planifiée',
  };
}
