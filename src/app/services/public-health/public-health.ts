import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiOverview, ApiTension, ApiZone } from '../../interfaces/api';
import { Tension, ZoneInfo } from '../../interfaces/models';
import { toZoneInfo } from '../distributor/distributor';

const EMPTY_OVERVIEW: ApiOverview = { ruptures: 0, low: 0, zones_tracked: 0, medicines_in_tension: 0 };

/** Espace responsable santé publique : vue nationale, zones, tensions. */
@Injectable({ providedIn: 'root' })
export class PublicHealthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /public-health/overview */
  overview(): Observable<ApiOverview> {
    return this.http.get<{ data: ApiOverview }>(`${this.base}/public-health/overview`).pipe(
      map(r => r.data ?? EMPTY_OVERVIEW),
      catchError(() => of(EMPTY_OVERVIEW)),
    );
  }

  /** GET /public-health/zones */
  zones(): Observable<ZoneInfo[]> {
    return this.http.get<{ data: ApiZone[] }>(`${this.base}/public-health/zones`).pipe(
      map(r => r.data.map(z => toZoneInfo(z.name, z.level, z.ruptures))),
      catchError(() => of([])),
    );
  }

  /** GET /public-health/tension */
  tension(): Observable<Tension[]> {
    return this.http.get<{ data: ApiTension[] }>(`${this.base}/public-health/tension`).pipe(
      map(r => r.data.map(toTension)),
      catchError(() => of([])),
    );
  }
}

function toTension(t: ApiTension): Tension {
  const delai = 1 + t.pct / 30;
  return { nom: t.medicine ?? '—', pct: t.pct, delai: delai.toFixed(1).replace('.', ',') + ' j' };
}
