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
import { DemandeRow, StockRow } from '../../../interfaces/models';
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

  readonly section = model.required<string>();
  readonly stock = signal<StockRow[]>([]);
  readonly demandes = signal<DemandeRow[]>([]);

  readonly addRefModal = signal(false);
  readonly restockModal = signal<StockRow | null>(null);
  readonly sellModal = signal<StockRow | null>(null);
  readonly adjustModal = signal<StockRow | null>(null);

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
    this.pharmacy.stock().subscribe({
      next: s => {
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
      error: () => { this.stock.set([]); this.history.set([]); },
    });
    this.pharmacy.demandes().subscribe({ next: d => this.demandes.set(d), error: () => { /* ignore */ } });
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
      }
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
      }
    });
  }

  // --- Alerte Distributeur ---
  alertDistrib(s: StockRow): void {
    this.pharmacy.alertDistributor(s.stockId, `Stock faible pour ${s.name}`).subscribe({
      next: () => this.platform.notify(`Alerte envoyée au distributeur pour ${s.name}`, 'ok'),
      error: () => this.platform.notify('Échec de l’envoi de l’alerte', 'alert'),
    });
  }
}
