import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { RoleId, Notif, NotifKind } from '../../interfaces/models';
import { OrderService } from '../orders/orders';
import { PharmacyService } from '../pharmacy/pharmacy';
import { DistributorService } from '../distributor/distributor';
import { HospitalService } from '../hospital/hospital';
import { PublicHealthService } from '../public-health/public-health';

/**
 * Notifications du rôle connecté : fusionne les notifications persistées en base
 * (événements réels — POST côté backend) avec des notifications dérivées en
 * direct des données métier (alertes, demandes, réservations).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly orders = inject(OrderService);
  private readonly pharmacy = inject(PharmacyService);
  private readonly distributor = inject(DistributorService);
  private readonly hospital = inject(HospitalService);
  private readonly publicHealth = inject(PublicHealthService);

  /** Notifications persistées non lues (table notifications). */
  persisted(): Observable<Notif[]> {
    return this.http.get<{ data: any[] }>(`${this.base}/notifications`).pipe(
      map(r => (r.data ?? [])
        .filter(n => !n.read)
        .map(n => ({
          id: n.id,
          read: n.read,
          icon: n.payload?.icon ?? 'bell',
          s: (n.payload?.tone ?? 'info') as NotifKind,
          t: n.payload?.title ?? 'Notification',
          d: n.payload?.desc ?? '',
          target: n.payload?.target,
        } as Notif))),
      catchError(() => of([])),
    );
  }

  /** POST /notifications/{id}/read */
  markRead(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/notifications/${id}/read`, {});
  }

  /** POST /notifications/read-all */
  markAllRead(): Observable<unknown> {
    return this.http.post(`${this.base}/notifications/read-all`, {});
  }

  /** Flux complet affiché dans la cloche : persistées d'abord, puis dérivées. */
  load(role: RoleId): Observable<Notif[]> {
    return forkJoin({ persisted: this.persisted(), derived: this.derived(role) }).pipe(
      map(({ persisted, derived }) => [...persisted, ...derived]),
      catchError(() => this.derived(role)),
    );
  }

  private derived(role: RoleId): Observable<Notif[]> {
    switch (role) {
      case 'patient':
        return this.orders.list().pipe(map(rows => rows.filter(row => row.s !== 'out').slice(0, 5).map(row => ({
          icon: row.s === 'ok' ? 'checkC' : 'clock', s: row.s === 'ok' ? 'ok' : 'info',
          t: row.s === 'ok' ? 'Réservation confirmée' : 'Réservation en préparation',
          d: `${row.medName} · ${row.pharmacyName}`, target: 'resa',
        } as Notif))), catchError(() => of([])));
      case 'pharma':
        return forkJoin({ alerts: this.pharmacy.alerts(), demandes: this.pharmacy.demandes() }).pipe(
          map(({ alerts, demandes }) => [
            ...alerts.slice(0, 5).map(alert => ({ icon: alert.status === 'out_of_stock' ? 'box' : 'alert', s: 'alert' as const, t: alert.status === 'out_of_stock' ? 'Rupture de stock' : 'Seuil critique atteint', d: `${alert.medicine ?? 'Médicament'} · ${alert.available ?? 0} unité(s)`, target: 'alert' })),
            ...demandes.slice(0, 5).map(demande => ({ icon: 'mail', s: 'info' as const, t: 'Nouvelle demande ciblée', d: `${demande.medName} · ${demande.qty} unité(s)`, target: 'dem' })),
          ]), catchError(() => of([])),
        );
      case 'distrib':
        return forkJoin({ alerts: this.distributor.alerts(), demands: this.distributor.regionalDemands() }).pipe(
          map(({ alerts, demands }) => [
            ...alerts.slice(0, 5).map(alert => ({ icon: 'alert', s: 'alert' as const, t: 'Tension régionale détectée', d: `${alert.name} · ${alert.pharmacies.length} officine(s)`, target: 'zones' })),
            ...demands.slice(0, 5).map(demande => ({ icon: 'layers', s: 'info' as const, t: 'Demande régionale', d: `${demande.zone} · ${demande.med}`, target: 'reg' })),
          ]), catchError(() => of([])),
        );
      case 'hopital':
        return this.hospital.alerts().pipe(map(alerts => alerts.slice(0, 5).map(alert => ({
          icon: 'alert', s: 'alert', t: `Alerte ${alert.service}`, d: `${alert.med} · ${alert.reste}`, target: 'alert',
        } as Notif))), catchError(() => of([])));
      case 'sante':
        return forkJoin({ zones: this.publicHealth.zones(), reports: this.publicHealth.reports() }).pipe(
          map(({ zones, reports }) => [
            ...zones.filter(zone => zone.niveau === 'crit').slice(0, 5).map(zone => ({ icon: 'pin', s: 'alert' as const, t: 'Zone critique détectée', d: `${zone.nom} · ${zone.ruptures} rupture(s)`, target: 'zones' })),
            ...reports.filter(report => report.status === 'completed').slice(0, 5).map(report => ({ icon: 'chart', s: 'info' as const, t: 'Rapport disponible', d: `${report.type} · ${report.period}`, target: 'rapport' })),
          ]), catchError(() => of([])),
        );
    }
  }
}
