import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { map, switchMap, throwError } from 'rxjs';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Stat } from '../../../components/stat/stat';
import { Tag } from '../../../components/tag/tag';
import { PlatformState } from '../../../services/platform/platform';
import { HospitalService } from '../../../services/hospital/hospital';
import { MedicineService } from '../../../services/medicines/medicines';
import { StructureService } from '../../../services/structures/structures';
import { AlerteHop, CritMedRow } from '../../../interfaces/models';
import { ApiErrorBody, ApiHospitalDashboard, ApiInstitutionalOrder, ApiPartner, ApiRestockRequest, ApiSupplier } from '../../../interfaces/api';

const EMPTY_SET: ReadonlySet<number> = new Set<number>();

/* ============================================================
   HÔPITAL — alertes internes, réseau, médicaments critiques (API réelle)
   ============================================================ */
@Component({
  selector: 'app-hopital-dash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Card, PageHead, Stat, Tag],
  templateUrl: './hopital.html',
  styleUrl: './hopital.css',
})
export class HopitalDash {
  private readonly platform = inject(PlatformState);
  private readonly hospital = inject(HospitalService);
  private readonly medicines = inject(MedicineService);
  private readonly structures = inject(StructureService);

  readonly section = model.required<string>();
  readonly alertes = signal<AlerteHop[]>([]);
  readonly critMeds = signal<CritMedRow[]>([]);
  readonly alertHistory = signal<AlerteHop[]>([]);

  readonly signalModal = signal(false);
  readonly connectModal = signal(false);
  readonly loading = signal(true);

  // Commandes institutionnelles vers la PRA
  readonly praOrders = signal<ApiInstitutionalOrder[]>([]);
  readonly praModal = signal(false);

  // Demande de réapprovisionnement ciblée (fournisseurs lus en base avec leur stock)
  readonly supplierModal = signal<AlerteHop | null>(null);
  readonly suppliers = signal<ApiSupplier[]>([]);
  readonly suppliersLoading = signal(false);
  readonly selectedSuppliers = signal<Set<number>>(new Set());
  readonly sending = signal(false);
  readonly restockRequests = signal<ApiRestockRequest[]>([]);
  readonly pendingRequests = computed(() => this.restockRequests().filter(r => r.status === 'pending'));
  /** Fournisseurs déjà sollicités, indexés par alerte source — calculé une fois par changement. */
  readonly askedByAlert = computed(() => {
    const index = new Map<string, Set<number>>();
    for (const r of this.pendingRequests()) {
      if (r.source_alert_id == null || !r.distributor_id) continue;
      const key = String(r.source_alert_id);
      let set = index.get(key);
      if (!set) { set = new Set(); index.set(key, set); }
      set.add(r.distributor_id);
    }
    return index;
  });

  readonly activeAlerts = computed(() => this.alertes().filter(a => a.niveau === 'crit' || a.niveau === 'haute'));
  readonly activePartnerCount = computed(() => this.realPartners().filter(p => p.status === 'active').length);
  readonly pharmacyPartners = computed(() => this.realPartners().filter(p => p.type === 'pharmacy'));
  readonly distributorPartners = computed(() => this.realPartners().filter(p => p.type === 'distributor'));

  readonly realPartners = signal<ApiPartner[]>([]);
  readonly dashboardData = signal<ApiHospitalDashboard>({});

  constructor() {
    this.reload();
    this.reloadPartners();
  }

  private apiError(e: HttpErrorResponse, fallback: string): string {
    return (e.error as ApiErrorBody | null)?.message ?? fallback;
  }

  reload(): void {
    this.loading.set(true);
    this.hospital.alerts().subscribe({
      next: a => { this.alertes.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.hospital.criticalMedicines().subscribe({ next: m => this.critMeds.set(m), error: () => { /* ignore */ } });
    // HOS-006: Historique des alertes via API réelle
    this.hospital.alertHistory().subscribe({ next: h => this.alertHistory.set(h), error: () => { /* ignore */ } });
    // Dashboard data
    this.hospital.dashboard().subscribe({ next: d => this.dashboardData.set(d), error: () => { /* ignore */ } });
    // Commandes PRA
    this.hospital.praOrders().subscribe({ next: o => this.praOrders.set(o), error: () => { /* ignore */ } });
    // Suivi des demandes de réapprovisionnement envoyées aux fournisseurs
    this.hospital.restockRequests().subscribe({ next: r => this.restockRequests.set(r), error: () => { /* ignore */ } });
  }

  submitPraOrder(med: string, qty: string, urgency: string, service: string, notes: string): void {
    const quantity = parseInt(qty, 10);
    if (!med.trim() || isNaN(quantity) || quantity <= 0) { this.platform.notify('Médicament et quantité requis', 'alert'); return; }
    this.medicines.search(med.trim()).pipe(
      switchMap(matches => {
        const medicine = matches[0];
        if (!medicine) return throwError(() => new Error('not_found'));
        return this.hospital.createPraOrder({
          medicine_id: Number(medicine.id), quantity, urgency,
          service: service.trim() || undefined, notes: notes.trim() || undefined,
        });
      }),
      switchMap(() => this.hospital.praOrders()),
    ).subscribe({
      next: orders => {
        this.platform.notify('Commande envoyée à la PRA régionale', 'ok');
        this.praModal.set(false);
        this.praOrders.set(orders);
      },
      error: (e: unknown) => this.platform.notify(
        e instanceof Error && e.message === 'not_found' ? 'Médicament introuvable dans le catalogue'
          : e instanceof HttpErrorResponse ? this.apiError(e, 'Échec (aucune PRA pour votre région ?)') : 'Échec de la commande', 'alert'),
    });
  }

  praUrgencyTag(u: string): string { return u === 'critical' ? 'crit' : u === 'urgent' ? 'low' : 'new'; }
  praStatusLabel(s: string): string {
    return s === 'resolved' ? 'Traitée' : s === 'rejected' ? 'Rejetée' : s === 'received' ? 'Reçue' : 'En attente';
  }

  ntag(n: string): string { return n === 'crit' ? 'crit' : n === 'haute' ? 'low' : 'new'; }
  critTag(s: string): string { return s === 'out' ? 'crit' : s === 'low' ? 'low' : 'ok'; }
  critLabel(s: string): string { return s === 'out' ? 'Rupture' : s === 'low' ? 'Sous tension' : 'Suivi normal'; }

  // --- Demande de réapprovisionnement aux fournisseurs (privés / PRA) ---

  /** Ouvre le choix des fournisseurs : partenaires et ceux qui disposent du médicament en premier. */
  askRestock(alert: AlerteHop): void {
    this.supplierModal.set(alert);
    this.suppliers.set([]);
    this.selectedSuppliers.set(new Set());
    this.suppliersLoading.set(true);
    this.structures.suppliers(alert.medId ?? null).subscribe({
      next: list => {
        this.suppliers.set(list);
        this.suppliersLoading.set(false);
        const asked = this.alreadyAsked(alert);
        this.selectedSuppliers.set(new Set(list.filter(d => (d.has_stock || d.is_partner) && !asked.has(d.id)).map(d => d.id)));
      },
      error: () => this.suppliersLoading.set(false),
    });
  }

  /** Fournisseurs déjà sollicités (demande en attente) pour cette alerte. */
  alreadyAsked(alert: AlerteHop): ReadonlySet<number> {
    return this.askedByAlert().get(alert.id) ?? EMPTY_SET;
  }

  toggleSupplier(id: number): void {
    const next = new Set(this.selectedSuppliers());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedSuppliers.set(next);
  }

  submitSupplierRequest(qtyInput: string, message: string): void {
    const a = this.supplierModal();
    if (!a) return;
    const ids = [...this.selectedSuppliers()];
    if (ids.length === 0) { this.platform.notify('Sélectionnez au moins un fournisseur', 'alert'); return; }
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) { this.platform.notify('Quantité invalide', 'alert'); return; }

    this.sending.set(true);
    this.hospital.requestRestock(Number(a.id), ids, qty, message.trim() || undefined).subscribe({
      next: res => {
        this.sending.set(false);
        const names = res.data.map(d => d.distributor).join(', ');
        this.platform.notify(res.data.length ? 'Demande envoyée à ' + names : 'Demande déjà en attente chez ces fournisseurs', res.data.length ? 'ok' : 'info');
        this.supplierModal.set(null);
        this.reload();
      },
      error: (e: HttpErrorResponse) => { this.sending.set(false); this.platform.notify(this.apiError(e, 'Échec de la demande de réapprovisionnement'), 'alert'); },
    });
  }

  requestStatusLabel(r: ApiRestockRequest): string {
    return r.status === 'resolved' ? 'Livraison planifiée' + (r.delivery_date ? ' · ' + r.delivery_date : '')
      : r.status === 'rejected' ? 'Refusée' + (r.rejection_reason ? ' · ' + r.rejection_reason : '')
      : 'En attente';
  }
  requestTag(status: string): string { return status === 'resolved' ? 'ok' : status === 'rejected' ? 'crit' : 'low'; }

  resolve(id: string): void {
    this.hospital.resolveAlert(Number(id)).subscribe({
      next: () => { this.platform.notify('Alerte traitée et transmise au réseau', 'ok'); this.reload(); },
      error: () => this.platform.notify('Échec de la résolution', 'alert'),
    });
  }

  signalRupture(): void { this.signalModal.set(true); }
  connectPartner(): void { this.connectModal.set(true); }

  private reloadPartners(): void {
    this.hospital.partners().subscribe({ next: p => this.realPartners.set(p), error: () => { /* ignore */ } });
  }

  acceptPartner(id: number): void {
    this.hospital.acceptPartner(id).subscribe({
      next: () => { this.platform.notify('Partenariat accepté', 'ok'); this.reloadPartners(); },
      error: () => this.platform.notify('Échec de l’acceptation', 'alert'),
    });
  }

  rejectPartner(id: number): void {
    this.hospital.rejectPartner(id).subscribe({
      next: () => { this.platform.notify('Invitation rejetée', 'info'); this.reloadPartners(); },
      error: () => this.platform.notify('Échec du rejet', 'alert'),
    });
  }

  removePartner(id: number): void {
    this.hospital.removePartner(id).subscribe({
      next: () => { this.platform.notify('Partenaire retiré', 'info'); this.reloadPartners(); },
      error: () => this.platform.notify('Échec du retrait', 'alert'),
    });
  }

  submitSignal(med: string, service: string, qty: string): void {
    const remaining = parseInt(qty, 10);
    // HOS-002 + HOS-003: Signaler la rupture via l'API réelle
    this.medicines.search(med).pipe(
      switchMap(matches => {
        const medicine = matches[0];
        if (!medicine) return throwError(() => new Error('not_found'));
        return this.hospital.createAlert(medicine.id, service, 'haute', remaining).pipe(map(() => medicine));
      }),
    ).subscribe({
      next: medicine => {
        this.platform.notify(`Alerte signalée pour ${medicine.nom} (${service})`, 'ok');
        this.signalModal.set(false);
        this.reload();
      },
      error: (e: unknown) => this.platform.notify(
        e instanceof Error && e.message === 'not_found' ? 'Médicament introuvable dans le catalogue' : 'Échec du signalement', 'alert'),
    });
  }

  submitConnect(partnerCode: string, type: string): void {
    // Appel API réel (recherche + ajout partenaire)
    const partnerType = type === 'Pharmacie' ? 'pharmacy' : 'distributor';
    this.hospital.searchPartners(partnerCode, partnerType).pipe(
      switchMap(results => {
        const found = results[0];
        if (!found) return throwError(() => new Error('not_found'));
        return this.hospital.addPartner(found.id, partnerType);
      }),
    ).subscribe({
      next: () => {
        this.platform.notify(`Partenaire ${partnerCode} connecté avec succès`, 'ok');
        this.connectModal.set(false);
        this.reloadPartners();
      },
      error: (e: unknown) => this.platform.notify(
        e instanceof Error && e.message === 'not_found' ? `Aucun partenaire trouvé pour "${partnerCode}"` : 'Échec de la connexion', 'alert'),
    });
  }
}
