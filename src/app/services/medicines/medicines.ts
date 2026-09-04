import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiAvailabilityRow, ApiMedicine, GlobalSearchResult } from '../../interfaces/api';
import { AvailabilityRow, DispoState, Med } from '../../interfaces/models';
import { distanceLabel } from '../structures/structures';

/** Référentiel médicaments + disponibilité (recherche patient). */
@Injectable({ providedIn: 'root' })
export class MedicineService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /medicines?search= → Med[] (vue patient). */
  search(q: string): Observable<Med[]> {
    const searchParams = new HttpParams().set('search', q);
    return this.http.get<{ data: ApiMedicine[] }>(`${this.base}/medicines`, { params: searchParams }).pipe(
      map(r => r.data.map(toMed)),
      catchError(() => of([])),
    );
  }

  /** GET /search?q= → médicaments et officines pour la recherche globale. */
  globalSearch(q: string): Observable<GlobalSearchResult[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<{ data: GlobalSearchResult[] }>(`${this.base}/search`, { params }).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** GET /medicines/{id}/availability → points de disponibilité (officines). */
  availability(medId: number): Observable<AvailabilityRow[]> {
    return this.http.get<{ data: ApiAvailabilityRow[] }>(`${this.base}/medicines/${medId}/availability`).pipe(
      map(r => r.data.map(toAvailabilityRow)),
      catchError(() => of([])),
    );
  }
}

export function toMed(m: ApiMedicine): Med {
  return {
    id: String(m.id),
    nom: m.dosage ? `${m.name} ${m.dosage}` : m.name,
    dci: m.brand ?? m.name,
    forme: m.form ?? '',
    crit: m.is_controlled,
    cat: m.is_controlled ? 'Médicament contrôlé' : 'Médicament',
  };
}

function toDispoState(status: string): DispoState {
  return status === 'out_of_stock' ? 'out' : status === 'low' ? 'low' : 'ok';
}

function toAvailabilityRow(r: ApiAvailabilityRow): AvailabilityRow {
  return {
    structureId: r.structure_id,
    pharmacy: r.pharmacy,
    city: r.city ?? '',
    phone: r.phone ?? '',
    dist: distanceLabel(r.latitude, r.longitude),
    s: toDispoState(r.status),
    label: r.label,
  };
}
