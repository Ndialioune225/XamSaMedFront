import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDemande, ApiRestockRequest, ApiStockRow } from '../../interfaces/api';
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
    return this.http.post(`${this.base}/pharmacy/stock/${stockId}/restock`, { quantity_received: quantity });
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
    return this.http.post(`${this.base}/pharmacy/demandes/${id}/orient`, { target_structure_id: toStructureId });
  }

  /** POST /pharmacy/demandes/{order}/collect — finalise un retrait (confirmed → collected). */
  collectDemande(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/pharmacy/demandes/${id}/collect`, {});
  }

  /** GET /pharmacy/prescriptions — ordonnances numériques reçues. */
  prescriptions(): Observable<any[]> {
    return this.http.get<{ data: any[] }>(`${this.base}/pharmacy/prescriptions`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** POST /pharmacy/prescriptions/{order}/process — convertit l'ordonnance en commande réelle. */
  processPrescription(id: number, medicineId: number, qty: number, price?: number, note?: string): Observable<unknown> {
    return this.http.post(`${this.base}/pharmacy/prescriptions/${id}/process`, { medicine_id: medicineId, qty, price, note });
  }

  /** POST /pharmacy/prescriptions/{order}/reject */
  rejectPrescription(id: number, reason?: string): Observable<unknown> {
    return this.http.post(`${this.base}/pharmacy/prescriptions/${id}/reject`, { reason });
  }

  /** GET /pharmacy/prescriptions/{order}/download — fichier ordonnance (blob). */
  downloadPrescription(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/pharmacy/prescriptions/${id}/download`, { responseType: 'blob' });
  }

  /** GET /pharmacy/grouped-alerts — alertes groupées en attente de réponse. */
  groupedAlerts(): Observable<any[]> {
    return this.http.get<{ data: any[] }>(`${this.base}/pharmacy/grouped-alerts`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** POST /pharmacy/grouped-alerts/{response}/respond — répondre OUI/NON. */
  respondGroupedAlert(responseId: number, available: boolean, quantity?: number): Observable<unknown> {
    return this.http.post(`${this.base}/pharmacy/grouped-alerts/${responseId}/respond`, {
      available,
      available_quantity: available ? (quantity ?? null) : null,
    });
  }

  /** GET /pharmacy/stock/{stock}/movements — historique réel des mouvements. */
  stockMovements(stockId: number): Observable<any[]> {
    return this.http.get<{ data: any[]; medicine?: string }>(`${this.base}/pharmacy/stock/${stockId}/movements`).pipe(
      map(r => (r.data ?? []).map(movement => ({ ...movement, medicine: r.medicine ?? movement.medicine }))),
      catchError(() => of([])),
    );
  }

  /** GET /pharmacy/alerts — alertes de seuil. */
  alerts(): Observable<any[]> {
    return this.http.get<{ data: any[] }>(`${this.base}/pharmacy/alerts`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /**
   * POST /pharmacy/alerts/distributor — demande de réapprovisionnement ciblée :
   * une alerte par fournisseur choisi (cf. StructureService.suppliers pour
   * savoir qui dispose du médicament).
   */
  alertDistributor(stockId: number, distributorIds: number[], quantity?: number, message?: string): Observable<SendResult> {
    return this.http.post<SendResult>(`${this.base}/pharmacy/alerts/distributor`, {
      stock_id: stockId, distributor_ids: distributorIds, quantity, message,
    });
  }

  /** GET /pharmacy/restock-requests — suivi des demandes envoyées aux fournisseurs. */
  restockRequests(): Observable<ApiRestockRequest[]> {
    return this.http.get<{ data: ApiRestockRequest[] }>(`${this.base}/pharmacy/restock-requests`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** GET /pharmacy/dashboard — indicateurs tableau de bord. */
  dashboard(): Observable<any> {
    return this.http.get<{ data: any }>(`${this.base}/pharmacy/dashboard`).pipe(
      map(r => r.data ?? {}),
      catchError(() => of({})),
    );
  }

  /** POST /pharmacy/stock/{stock}/external-sale — vente externe (PHA-010). */
  externalSale(stockId: number, qty: number, note: string): Observable<unknown> {
    return this.http.post(`${this.base}/pharmacy/stock/${stockId}/external-sale`, { quantity_sold: qty, reason: note });
  }

  /** POST /pharmacy/stock/{stock}/inventory — ajustement d'inventaire (PHA-011). */
  inventoryAdjustment(stockId: number, newQty: number, reason: string): Observable<unknown> {
    return this.http.post(`${this.base}/pharmacy/stock/${stockId}/inventory`, { real_quantity: newQty, reason });
  }

  /** POST /pharmacy/stock — ajouter un nouveau stock. */
  addStock(medicineId: number, quantity: number, threshold: number): Observable<unknown> {
    return this.http.post(`${this.base}/pharmacy/stock`, { medicine_id: medicineId, quantity, threshold_qty: threshold });
  }

  /** PUT /pharmacy/stock/{stock} — modifier un stock existant. */
  updateStock(stockId: number, data: { quantity?: number; threshold?: number }): Observable<unknown> {
    return this.http.put(`${this.base}/pharmacy/stock/${stockId}`, data);
  }

  /** DELETE /pharmacy/stock/{stock} — supprimer un stock. */
  deleteStock(stockId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/pharmacy/stock/${stockId}`);
  }
}

/** Réponse des envois de demandes ciblées (une entrée par fournisseur). */
export interface SendResult { status: string; message: string; data: { id: number; distributor: string }[]; }

function toStockState(status: string): StockState {
  return status === 'out_of_stock' ? 'out' : status === 'low' ? 'low' : 'ok';
}

function toStockRow(s: ApiStockRow): StockRow {
  const sub = [s.form, s.dosage].filter(Boolean).join(' · ') || (s.is_controlled ? 'Médicament contrôlé' : '—');
  return {
    stockId: s.id,
    medId: s.medicine_id,
    name: s.medicine_name ?? s.medicine ?? '—',
    sub,
    q: s.available,
    reserved: s.reserved,
    seuil: s.threshold_qty ?? s.threshold ?? 0,
    s: toStockState(s.status),
  };
}

function toDemandeRow(d: ApiDemande): DemandeRow {
  return {
    id: d.id,
    medId: d.medicine_id ?? null,
    medName: d.medicine ?? '—',
    from: d.patient ?? d.from ?? '—',
    type: d.type,
    qty: d.qty,
    urgency: d.urgency,
    status: d.status,
    quand: formatWhen(d.created_at),
  };
}
