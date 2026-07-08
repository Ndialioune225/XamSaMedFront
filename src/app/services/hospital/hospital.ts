import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiCriticalMedicine, ApiHospitalAlert } from '../../interfaces/api';
import { AlerteHop, CritMedRow, StockState } from '../../interfaces/models';
import { formatWhen } from '../orders/orders';
import { asZoneLevel } from '../distributor/distributor';

/** Espace hôpital : alertes internes + médicaments critiques. */
@Injectable({ providedIn: 'root' })
export class HospitalService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /hospital/alerts */
  alerts(): Observable<AlerteHop[]> {
    return this.http.get<{ data: ApiHospitalAlert[] }>(`${this.base}/hospital/alerts`).pipe(
      map(r => r.data.map(toAlerteHop)),
      catchError(() => of([])),
    );
  }

  /** POST /hospital/alerts/{alert}/resolve */
  resolveAlert(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/hospital/alerts/${id}/resolve`, {});
  }

  /** GET /hospital/critical-medicines */
  criticalMedicines(): Observable<CritMedRow[]> {
    return this.http.get<{ data: ApiCriticalMedicine[] }>(`${this.base}/hospital/critical-medicines`).pipe(
      map(r => r.data.map(toCritMed)),
      catchError(() => of([])),
    );
  }
}

function toAlerteHop(a: ApiHospitalAlert): AlerteHop {
  return {
    id: String(a.id),
    med: a.medicine ?? '—',
    service: a.service ?? '—',
    niveau: asZoneLevel(a.level),
    reste: a.remaining ?? '—',
    quand: formatWhen(a.created_at),
  };
}

function toCritMed(m: ApiCriticalMedicine): CritMedRow {
  const s: StockState = m.status === 'out_of_stock' ? 'out' : m.status === 'low' ? 'low' : 'ok';
  return { medId: m.medicine_id, name: m.medicine ?? '—', available: m.available, s };
}
