import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RoleId, Notif } from '../../interfaces/models';
import { OrderService } from '../orders/orders';
import { PharmacyService } from '../pharmacy/pharmacy';
import { DistributorService } from '../distributor/distributor';
import { HospitalService } from '../hospital/hospital';
import { PublicHealthService } from '../public-health/public-health';

/** Notifications construites à partir des données API du rôle connecté. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly orders = inject(OrderService);
  private readonly pharmacy = inject(PharmacyService);
  private readonly distributor = inject(DistributorService);
  private readonly hospital = inject(HospitalService);
  private readonly publicHealth = inject(PublicHealthService);

  load(role: RoleId): Observable<Notif[]> {
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
