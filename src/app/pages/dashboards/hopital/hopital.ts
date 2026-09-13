import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
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
import { ApiInstitutionalOrder, ApiRestockRequest, ApiSupplier } from '../../../interfaces/api';

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
  readonly alertHistory = signal<any[]>([]);

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

  readonly activeAlerts = computed(() => this.alertes().filter(a => a.niveau === 'crit' || a.niveau === 'haute'));
  readonly resolvedCount = computed(() => this.alertHistory().filter(a => a.resolved).length);
  readonly activePartnerCount = computed(() => this.realPartners().filter(p => p.status === 'active').length);
  readonly pharmacyPartners = computed(() => this.realPartners().filter(p => p.type === 'pharmacy'));
  readonly distributorPartners = computed(() => this.realPartners().filter(p => p.type === 'distributor'));

  constructor() {
    this.reload();
    // Charger les partenaires depuis l'API réelle
    this.hospital.partners().subscribe({ next: p => this.realPartners.set(p), error: () => { /* ignore */ } });
  }

  readonly realPartners = signal<any[]>([]);
  readonly dashboardData = signal<any>({});

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
    this.medicines.search(med.trim()).subscribe({
      next: matches => {
        const medicine = matches[0];
        if (!medicine) { this.platform.notify('Médicament introuvable dans le catalogue', 'alert'); return; }
        this.hospital.createPraOrder({
          medicine_id: Number(medicine.id), quantity, urgency,
          service: service.trim() || undefined, notes: notes.trim() || undefined,
        }).subscribe({
          next: () => {
            this.platform.notify('Commande envoyée à la PRA régionale', 'ok');
            this.praModal.set(false);
            this.hospital.praOrders().subscribe({ next: o => this.praOrders.set(o), error: () => {} });
          },
          error: (e: any) => this.platform.notify(e?.error?.message ?? 'Échec (aucune PRA pour votre région ?)', 'alert'),
        });
      },
      error: () => this.platform.notify('Impossible de consulter le catalogue', 'alert'),
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
  alreadyAsked(alert: AlerteHop): Set<number> {
    return new Set(this.pendingRequests()
      .filter(r => String(r.source_alert_id ?? '') === alert.id && r.distributor_id)
      .map(r => r.distributor_id as number));
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
      error: (e: any) => { this.sending.set(false); this.platform.notify(e?.error?.message ?? 'Échec de la demande de réapprovisionnement', 'alert'); },
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
    this.medicines.search(med).subscribe({
      next: matches => {
        const medicine = matches[0];
        if (!medicine) { this.platform.notify('Médicament introuvable dans le catalogue', 'alert'); return; }
        this.hospital.createAlert(medicine.id, service, 'haute', remaining).subscribe({
          next: () => {
            this.platform.notify(`Alerte signalée pour ${medicine.nom} (${service})`, 'ok');
            this.signalModal.set(false);
            this.reload();
          },
          error: () => this.platform.notify('Échec du signalement', 'alert'),
        });
      },
      error: () => this.platform.notify('Impossible de consulter le catalogue', 'alert'),
    });
  }

  submitConnect(partnerCode: string, type: string): void {
    // Appel API réel (recherche + ajout partenaire)
    const partnerType = type === 'Pharmacie' ? 'pharmacy' : 'distributor';
    this.hospital.searchPartners(partnerCode, partnerType).subscribe({
      next: results => {
        if (results.length > 0) {
          this.hospital.addPartner(results[0].id, partnerType).subscribe({
            next: () => {
              this.platform.notify(`Partenaire ${partnerCode} connecté avec succès`, 'ok');
              this.connectModal.set(false);
              this.hospital.partners().subscribe({ next: p => this.realPartners.set(p), error: () => {} });
            },
            error: () => this.platform.notify('Échec de la connexion', 'alert'),
          });
        } else {
          this.platform.notify(`Aucun partenaire trouvé pour "${partnerCode}"`, 'alert');
        }
      },
      error: () => this.platform.notify('Erreur de recherche', 'alert'),
    });
  }
}
