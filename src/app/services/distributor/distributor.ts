import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiRegionalDemand, ApiZone, DistributorAlertsResponse, ShortageAlert } from '../../interfaces/api';
import { DemandeReg, ZoneInfo, ZoneLevel } from '../../interfaces/models';

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

  /** GET /distributor/alerts — ruptures signalées par les officines. */
  alerts(): Observable<ShortageAlert[]> {
    return this.http.get<DistributorAlertsResponse>(`${this.base}/distributor/alerts`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** GET /distributor/regional-demands — agrégation par zone + médicament. */
  regionalDemands(): Observable<DemandeReg[]> {
    return this.http.get<{ data: ApiRegionalDemand[] }>(`${this.base}/distributor/regional-demands`).pipe(
      map(r => r.data.map(toDemandeReg)),
      catchError(() => of([])),
    );
  }

  /** GET /distributor/zones — villes avec ruptures + niveau de tension. */
  zones(): Observable<ZoneInfo[]> {
    return this.http.get<{ data: ApiZone[] }>(`${this.base}/distributor/zones`).pipe(
      map(r => r.data.map(z => toZoneInfo(z.name, z.level, z.ruptures))),
      catchError(() => of([])),
    );
  }
}

function toDemandeReg(d: ApiRegionalDemand): DemandeReg {
  return {
    id: `${d.zone}-${d.medicine}`,
    zone: d.zone,
    med: d.medicine,
    vol: `~${Math.max(1, d.officines) * 30} u.`,
    tension: asZoneLevel(d.tension),
    officines: d.officines,
  };
}
