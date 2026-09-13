import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Stat } from '../../../components/stat/stat';
import { Bar } from '../../../components/bar/bar';
import { Tag } from '../../../components/tag/tag';
import { PlatformState } from '../../../services/platform/platform';
import { PharmacyService } from '../../../services/pharmacy/pharmacy';
import { MedicineService } from '../../../services/medicines/medicines';
import { AuthService } from '../../../services/auth/auth';
import { StructureService } from '../../../services/structures/structures';
import { DemandeRow, StockRow } from '../../../interfaces/models';
import { ApiRestockRequest, ApiSupplier } from '../../../interfaces/api';
import { PharmaDemandes } from '../pharma-demandes/pharma-demandes';
import { SimpleProfile } from '../profile/profile';

type BarTone = 'green' | 'amber' | 'red' | 'blue';

/* ============================================================
   PHARMACIEN — tableau de bord, stock, alertes, demandes (API réelle)
   ============================================================ */
@Component({
  selector: 'app-pharma-dash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Card, PageHead, Stat, Bar, Tag, PharmaDemandes, SimpleProfile],
  templateUrl: './pharma.html',
  styleUrl: './pharma.css',
})
export class PharmaDash {
  private readonly platform = inject(PlatformState);
  private readonly pharmacy = inject(PharmacyService);
  private readonly medicines = inject(MedicineService);
  private readonly structures = inject(StructureService);

  readonly section = model.required<string>();
  readonly loading = signal(true);
  readonly stock = signal<StockRow[]>([]);
  readonly demandes = signal<DemandeRow[]>([]);

  readonly addRefModal = signal(false);
  readonly restockModal = signal<StockRow | null>(null);
  readonly sellModal = signal<StockRow | null>(null);
  readonly adjustModal = signal<StockRow | null>(null);

  // Demande de réapprovisionnement ciblée : fournisseurs (lus en base avec
  // leur stock du médicament) + sélection multiple.
  readonly supplierModal = signal<StockRow | null>(null);
  readonly suppliers = signal<ApiSupplier[]>([]);
  readonly suppliersLoading = signal(false);
  readonly selectedSuppliers = signal<Set<number>>(new Set());
  readonly sending = signal(false);
  // Suivi des demandes envoyées (en attente / livraison planifiée / rejetée).
  readonly restockRequests = signal<ApiRestockRequest[]>([]);
  readonly pendingRequests = computed(() => this.restockRequests().filter(r => r.status === 'pending'));

  // Ordonnances numériques reçues
  readonly prescriptions = signal<any[]>([]);
  readonly processModal = signal<any | null>(null);

  // Alertes groupées reçues (recherches patient)
  readonly groupedAlerts = signal<any[]>([]);

  // Historique (mock)
  readonly history = signal<any[]>([]);

  readonly crit = computed(() => this.stock().filter(s => s.s === 'crit' || s.s === 'out'));
  readonly alerts = computed(() => this.stock().filter(s => s.s !== 'ok'));
  readonly lowCount = computed(() => this.stock().filter(s => s.s === 'low').length);
  readonly newDem = computed(() => this.demandes().filter(d => d.status === 'pending').length);
  readonly topStock = computed(() => this.stock().slice(0, 5));

  protected readonly auth = inject(AuthService);

  readonly profilFields = computed<readonly [string, string][]>(() => {
    const u = this.auth.user();
    if (!u) return [];
    const meta = u.profile_meta as any || {};
    return [
      ['Titulaire', meta.titulaire || 'Non renseigné'],
      ['Téléphone', u.phone || '+221 33 000 00 00'],
      ['Email', u.email || 'Non renseigné'],
      ['Région', meta.region || 'Non renseignée'],
    ];
  });

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.pharmacy.stock().subscribe({
      next: s => {
        this.loading.set(false);
        this.stock.set(s);
        if (s.length) {
          forkJoin(s.map(stock => this.pharmacy.stockMovements(stock.stockId))).subscribe({
            next: movements => this.history.set(movements.flat().map((movement: any) => ({
              id: movement.id,
              date: movement.created_at ? new Date(movement.created_at).toLocaleString('fr-FR') : '',
              type: movement.type_label ?? movement.type,
              medName: movement.medicine ?? '—',
              qty: movement.direction === 'sortie' ? -movement.quantity : movement.quantity,
              newStock: movement.new_quantity,
              user: movement.user ?? '—',
            }))),
            error: () => this.history.set([]),
          });
        } else this.history.set([]);
      },
      error: () => { this.loading.set(false); this.stock.set([]); this.history.set([]); },
    });
    this.pharmacy.demandes().subscribe({ next: d => this.demandes.set(d), error: () => { /* ignore */ } });
    this.pharmacy.restockRequests().subscribe({ next: r => this.restockRequests.set(r), error: () => { /* ignore */ } });
    this.pharmacy.prescriptions().subscribe({ next: p => this.prescriptions.set(p), error: () => { /* ignore */ } });
    this.pharmacy.groupedAlerts().subscribe({ next: g => this.groupedAlerts.set(g), error: () => { /* ignore */ } });
  }

  pct(s: StockRow): number {
    if (s.seuil > 0) return Math.min(100, Math.round((s.q / (s.seuil * 3)) * 100));
    return s.q > 0 ? 100 : 0;
  }
  barTone(s: StockRow): BarTone { return s.s === 'ok' ? 'green' : s.s === 'low' ? 'amber' : 'red'; }
  urg(u: string): string { return u === 'Critique' ? 'crit' : u === 'Élevé' ? 'low' : 'new'; }
  homeBadge(s: StockRow): string {
    return s.s === 'ok' ? s.q + ' u.' : s.s === 'low' ? 'Stock faible · ' + s.q : s.s === 'out' ? 'Rupture' : 'Critique · ' + s.q;
  }
  stateLabel(s: string): string {
    return s === 'ok' ? 'En stock' : s === 'low' ? 'Stock faible' : s === 'out' ? 'Rupture' : 'Critique';
  }
  alertLabel(s: string): string { return s === 'low' ? 'Stock faible' : s === 'out' ? 'Rupture' : 'Critique'; }

  restock(s: StockRow): void {
    this.restockModal.set(s);
  }

  submitRestock(qtyInput: string): void {
    const s = this.restockModal();
    if (!s) return;

    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) return;

    this.pharmacy.restock(s.stockId, qty).subscribe({
      next: () => {
        this.platform.notify(`${s.name} réapprovisionné de ${qty} unités`, 'ok');
        this.restockModal.set(null);
        this.reload();
      },
      error: () => this.platform.notify('Échec du réapprovisionnement', 'alert'),
    });
  }

  submitAddRef(name: string, form: string, qty: string, seuil: string): void {
    const quantity = parseInt(qty, 10);
    const threshold = parseInt(seuil, 10);
    if (!name.trim() || isNaN(quantity) || quantity < 0 || isNaN(threshold) || threshold < 0) {
      this.platform.notify('Informations de référence invalides', 'alert');
      return;
    }
    this.medicines.search(name.trim()).subscribe({
      next: matches => {
        const medicine = matches[0];
        if (!medicine) {
          this.platform.notify('Médicament introuvable dans le catalogue', 'alert');
          return;
        }
        this.pharmacy.addStock(Number(medicine.id), quantity, threshold).subscribe({
          next: () => { this.platform.notify(`${medicine.nom} a été ajouté au stock`, 'ok'); this.addRefModal.set(false); this.reload(); },
          error: () => this.platform.notify('Cette référence existe peut-être déjà dans le stock', 'alert'),
        });
      },
      error: () => this.platform.notify('Impossible de consulter le catalogue', 'alert'),
    });
  }

  // --- Vente ---
  sell(s: StockRow): void { this.sellModal.set(s); }
  submitSell(qtyInput: string): void {
    const s = this.sellModal();
    if (!s) return;
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0 || qty > s.q) {
      this.platform.notify('Quantité invalide', 'alert');
      return;
    }
    this.pharmacy.externalSale(s.stockId, qty, 'Vente hors plateforme').subscribe({
      next: () => {
        this.platform.notify(`Vente de ${qty} unité(s) enregistrée`, 'ok');
        this.sellModal.set(null);
        this.reload();
      },
      error: (e: any) => this.platform.notify(e?.error?.message ?? 'Échec de la vente', 'alert'),
    });
  }

  // --- Ajustement ---
  adjust(s: StockRow): void { this.adjustModal.set(s); }
  submitAdjust(qtyInput: string, motif: string): void {
    const s = this.adjustModal();
    if (!s) return;
    const diff = parseInt(qtyInput, 10);
    if (isNaN(diff)) return;
    const target = Math.max(0, s.q + diff);
    this.pharmacy.inventoryAdjustment(s.stockId, target, motif).subscribe({
      next: () => {
        this.platform.notify(`Ajustement enregistré (${diff}) - Motif: ${motif}`, 'info');
        this.adjustModal.set(null);
        this.reload();
      },
      error: (e: any) => this.platform.notify(e?.error?.message ?? 'Échec de l\'ajustement', 'alert'),
    });
  }

  // --- Demande de réapprovisionnement aux fournisseurs ---

  /** Ouvre le choix des fournisseurs : ceux qui disposent du médicament sont proposés en premier. */
  alertDistrib(s: StockRow): void {
    this.supplierModal.set(s);
    this.suppliers.set([]);
    this.selectedSuppliers.set(new Set());
    this.suppliersLoading.set(true);
    this.structures.suppliers(s.medId).subscribe({
      next: list => {
        this.suppliers.set(list);
        this.suppliersLoading.set(false);
        // Pré-sélection : les fournisseurs qui ont le médicament et ne sont pas déjà sollicités.
        const asked = this.alreadyAsked(s);
        this.selectedSuppliers.set(new Set(list.filter(d => d.has_stock && !asked.has(d.id)).map(d => d.id)));
      },
      error: () => this.suppliersLoading.set(false),
    });
  }

  /** Fournisseurs ayant déjà une demande en attente pour ce stock. */
  alreadyAsked(s: StockRow): Set<number> {
    return new Set(this.pendingRequests().filter(r => r.medicine_id === s.medId && r.distributor_id).map(r => r.distributor_id as number));
  }

  toggleSupplier(id: number): void {
    const next = new Set(this.selectedSuppliers());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedSuppliers.set(next);
  }

  suggestedQty(s: StockRow): number {
    return s.seuil > 0 ? Math.max(1, s.seuil * 3 - s.q) : 100;
  }

  submitSupplierRequest(qtyInput: string, message: string): void {
    const s = this.supplierModal();
    if (!s) return;
    const ids = [...this.selectedSuppliers()];
    if (ids.length === 0) { this.platform.notify('Sélectionnez au moins un fournisseur', 'alert'); return; }
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) { this.platform.notify('Quantité invalide', 'alert'); return; }

    this.sending.set(true);
    this.pharmacy.alertDistributor(s.stockId, ids, qty, message.trim() || undefined).subscribe({
      next: res => {
        this.sending.set(false);
        const names = res.data.map(d => d.distributor).join(', ');
        this.platform.notify(res.data.length ? `Demande envoyée à ${names}` : 'Demande déjà en attente chez ces fournisseurs', res.data.length ? 'ok' : 'info');
        this.supplierModal.set(null);
        this.pharmacy.restockRequests().subscribe({ next: r => this.restockRequests.set(r), error: () => { /* ignore */ } });
      },
      error: (e: any) => { this.sending.set(false); this.platform.notify(e?.error?.message ?? 'Échec de l’envoi de la demande', 'alert'); },
    });
  }

  requestStatusLabel(r: ApiRestockRequest): string {
    return r.status === 'resolved' ? 'Livraison planifiée' + (r.delivery_date ? ' · ' + r.delivery_date : '')
      : r.status === 'rejected' ? 'Refusée' + (r.rejection_reason ? ' · ' + r.rejection_reason : '')
      : 'En attente';
  }
  requestTag(status: string): string { return status === 'resolved' ? 'ok' : status === 'rejected' ? 'crit' : 'low'; }

  // --- Ordonnances numériques ---
  openProcess(p: any): void { this.processModal.set(p); }

  downloadOrdo(p: any): void {
    this.pharmacy.downloadPrescription(p.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `ordonnance-${p.id}`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.platform.notify('Impossible de télécharger l’ordonnance', 'alert'),
    });
  }

  submitProcess(medName: string, qtyInput: string, priceInput: string): void {
    const p = this.processModal();
    if (!p) return;
    const qty = parseInt(qtyInput, 10);
    if (!medName.trim() || isNaN(qty) || qty <= 0) { this.platform.notify('Médicament et quantité requis', 'alert'); return; }
    const price = priceInput ? Number(priceInput) : undefined;
    this.medicines.search(medName.trim()).subscribe({
      next: matches => {
        const med = matches[0];
        if (!med) { this.platform.notify('Médicament introuvable dans le catalogue', 'alert'); return; }
        this.pharmacy.processPrescription(p.id, Number(med.id), qty, price).subscribe({
          next: () => { this.platform.notify('Ordonnance traitée — commande prête au retrait', 'ok'); this.processModal.set(null); this.reload(); },
          error: () => this.platform.notify('Échec du traitement (stock insuffisant ?)', 'alert'),
        });
      },
      error: () => this.platform.notify('Impossible de consulter le catalogue', 'alert'),
    });
  }

  rejectOrdo(p: any): void {
    this.pharmacy.rejectPrescription(p.id, 'Ordonnance non traitable').subscribe({
      next: () => { this.platform.notify('Ordonnance rejetée', 'info'); this.reload(); },
      error: () => this.platform.notify('Échec du rejet', 'alert'),
    });
  }

  // --- Alertes groupées ---
  respondGrouped(a: any, available: boolean): void {
    const qty = available ? (this.stock().find(s => s.medId === a.medicine_id)?.q ?? undefined) : undefined;
    this.pharmacy.respondGroupedAlert(a.response_id, available, qty).subscribe({
      next: () => { this.platform.notify(available ? 'Disponibilité transmise au patient' : 'Indisponibilité enregistrée', available ? 'ok' : 'info'); this.reload(); },
      error: () => this.platform.notify('Échec de la réponse', 'alert'),
    });
  }
}
