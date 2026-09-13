import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiCriticalMedicine, ApiHospitalAlert, ApiInstitutionalOrder, ApiRestockRequest } from '../../interfaces/api';
import { SendResult } from '../pharmacy/pharmacy';
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

  /** POST /hospital/alerts */
  createAlert(medicine: string, service: string, level: string, remaining: number): Observable<unknown> {
    return this.http.post(`${this.base}/hospital/alerts`, { medicine_id: Number(medicine), service, level, remaining_quantity: remaining });
  }

  /**
   * POST /hospital/alerts/{alert}/restock — demande de réapprovisionnement
   * ciblée : une alerte par fournisseur choisi (privés / PRA).
   */
  requestRestock(alertId: number, distributorIds: number[], quantity?: number, message?: string): Observable<SendResult> {
    return this.http.post<SendResult>(`${this.base}/hospital/alerts/${alertId}/restock`, {
      distributor_ids: distributorIds, quantity, message,
    });
  }

  /** GET /hospital/restock-requests — suivi des demandes envoyées aux fournisseurs. */
  restockRequests(): Observable<ApiRestockRequest[]> {
    return this.http.get<{ data: ApiRestockRequest[] }>(`${this.base}/hospital/restock-requests`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** GET /hospital/critical-medicines */
  criticalMedicines(): Observable<CritMedRow[]> {
    return this.http.get<{ data: ApiCriticalMedicine[] }>(`${this.base}/hospital/critical-medicines`).pipe(
      map(r => r.data.map(toCritMed)),
      catchError(() => of([])),
    );
  }

  /** GET /hospital/alerts/history — historique des alertes (actives + résolues). */
  alertHistory(): Observable<AlerteHop[]> {
    return this.http.get<{ data: ApiHospitalAlert[] }>(`${this.base}/hospital/alerts/history`).pipe(
      map(r => r.data.map(toAlerteHop)),
      catchError(() => of([])),
    );
  }

  /** GET /hospital/dashboard — indicateurs du tableau de bord. */
  dashboard(): Observable<any> {
    return this.http.get<{ data: any }>(`${this.base}/hospital/dashboard`).pipe(
      map(r => r.data ?? {}),
      catchError(() => of({})),
    );
  }

  /** GET /hospital/partners — partenaires connectés. */
  partners(): Observable<any[]> {
    return this.http.get<{ data: any[] }>(`${this.base}/hospital/partners`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** POST /hospital/partners — ajouter un partenaire. */
  addPartner(structureId: number, type: string): Observable<unknown> {
    return this.http.post(`${this.base}/hospital/partners`, { partner_id: structureId, partner_type: type, identifier: String(structureId) });
  }

  /** PATCH /hospital/partners/{id} — accepter une invitation reçue. */
  acceptPartner(id: number): Observable<unknown> {
    return this.http.patch(`${this.base}/hospital/partners/${id}`, { status: 'active' });
  }

  /** PATCH /hospital/partners/{id} — rejeter une invitation reçue. */
  rejectPartner(id: number): Observable<unknown> {
    return this.http.patch(`${this.base}/hospital/partners/${id}`, { status: 'rejected' });
  }

  /** DELETE /hospital/partners/{id} — retirer un partenariat. */
  removePartner(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/hospital/partners/${id}`);
  }

  /** GET /hospital/pra-orders — commandes institutionnelles passées à la PRA. */
  praOrders(): Observable<ApiInstitutionalOrder[]> {
    return this.http.get<{ data: ApiInstitutionalOrder[] }>(`${this.base}/hospital/pra-orders`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** POST /hospital/pra-orders — passer une commande à la PRA régionale. */
  createPraOrder(payload: { medicine_id: number; quantity: number; urgency: string; service?: string; notes?: string }): Observable<unknown> {
    return this.http.post(`${this.base}/hospital/pra-orders`, payload);
  }

  /** GET /hospital/search-partners?q= — rechercher un partenaire. */
  searchPartners(q: string, type?: string): Observable<any[]> {
    const params: Record<string, string> = { q };
    if (type) params['type'] = type;
    return this.http.get<{ data: any[] }>(`${this.base}/hospital/search-partners`, { params }).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }
}

function toAlerteHop(a: ApiHospitalAlert): AlerteHop {
  return {
    id: String(a.id),
    medId: a.medicine_id ?? null,
    med: a.medicine ?? '—',
    service: a.service ?? '—',
    niveau: asZoneLevel(a.level),
    reste: a.remaining ?? '—',
    quand: formatWhen(a.created_at),
    requestedTo: a.restock_requested_to ?? [],
  };
}

function toCritMed(m: ApiCriticalMedicine): CritMedRow {
  const s: StockState = m.status === 'out_of_stock' ? 'out' : m.status === 'low' ? 'low' : 'ok';
  return { medId: m.medicine_id, name: m.medicine ?? '—', available: m.available, s };
}
