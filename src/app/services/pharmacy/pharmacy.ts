import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDemande, ApiStockRow } from '../../interfaces/api';
import { DemandeRow, StockRow, StockState } from '../../interfaces/models';
import { formatWhen } from '../orders/orders';

/** Espace pharmacien : stock, demandes ciblées. */
@Injectable({ providedIn: 'root' })
export class PharmacyService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /pharmacy/stock */
  stock(): Observable<StockRow[]> {
    return this.http.get<{ data: ApiStockRow[] }>(`${this.base}/pharmacy/stock`).pipe(
      map(r => r.data.map(toStockRow)),
      catchError(() => of([])),
    );
  }

  /** POST /pharmacy/stock/{stock}/restock */
  restock(stockId: number, quantity: number): Observable<unknown> {
    return this.http.post(`${this.base}/pharmacy/stock/${stockId}/restock`, { quantity });
  }

  /** GET /pharmacy/demandes */
  demandes(): Observable<DemandeRow[]> {
    return this.http.get<{ data: ApiDemande[] }>(`${this.base}/pharmacy/demandes`).pipe(
      map(r => r.data.map(toDemandeRow)),
      catchError(() => of([])),
    );
  }

  /** POST /pharmacy/demandes/{order}/accept */
  acceptDemande(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/pharmacy/demandes/${id}/accept`, {});
  }

  /** POST /pharmacy/demandes/{order}/orient */
  orientDemande(id: number, toStructureId: number): Observable<unknown> {
    return this.http.post(`${this.base}/pharmacy/demandes/${id}/orient`, { to_structure_id: toStructureId });
  }
}

function toStockState(status: string): StockState {
  return status === 'out_of_stock' ? 'out' : status === 'low' ? 'low' : 'ok';
}

function toStockRow(s: ApiStockRow): StockRow {
  const sub = [s.form, s.dosage].filter(Boolean).join(' · ') || (s.is_controlled ? 'Médicament contrôlé' : '—');
  return {
    stockId: s.id,
    medId: s.medicine_id,
    name: s.medicine ?? '—',
    sub,
    q: s.available,
    reserved: s.reserved,
    seuil: s.threshold,
    s: toStockState(s.status),
  };
}

function toDemandeRow(d: ApiDemande): DemandeRow {
  return {
    id: d.id,
    medName: d.medicine ?? '—',
    from: d.from ?? '—',
    type: d.type,
    qty: d.qty,
    urgency: d.urgency,
    status: d.status,
    quand: formatWhen(d.created_at),
  };
}
