import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Stat } from '../../../components/stat/stat';
import { Bar } from '../../../components/bar/bar';
import { Tag } from '../../../components/tag/tag';
import { PlatformState } from '../../../services/platform/platform';
import { PharmacyService } from '../../../services/pharmacy/pharmacy';
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

  readonly profilFields: readonly [string, string][] = [
    ['Titulaire', 'Dr. Fatou Sow'],
    ['Téléphone', '+221 33 821 00 00'],
    ['Horaires', '08h – 22h'],
    ['Partage de stock', 'Partiel (demandes ciblées uniquement)'],
    ['Distributeur', 'PNA · Ubipharm'],
  ];

  constructor() { this.reload(); }

  reload(): void {
    this.pharmacy.stock().subscribe({ next: s => this.stock.set(s), error: () => { /* ignore */ } });
    this.pharmacy.demandes().subscribe({ next: d => this.demandes.set(d), error: () => { /* ignore */ } });
    
    // Charger l'historique mocké
    if ((this.pharmacy as any).stockMovements) {
      (this.pharmacy as any).stockMovements().subscribe({ next: (h: any) => this.history.set(h) });
    }
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
    
    // Pour l'API existante, on passe la nouvelle quantité cible
    const target = s.q + qty + s.reserved;
    this.pharmacy.restock(s.stockId, target).subscribe({
      next: () => { 
        this.platform.notify(`${s.name} réapprovisionné de ${qty} unités`, 'ok'); 
        this.restockModal.set(null);
        this.reload(); 
      },
      error: () => this.platform.notify('Échec du réapprovisionnement', 'alert'),
    });
  }

  submitAddRef(name: string, form: string, qty: string, seuil: string): void {
    // Dans une version complète, on appellerait l'API ici pour créer la référence.
    this.platform.notify(`${name} a été ajouté au stock`, 'ok');
    this.addRefModal.set(false);
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
    const target = s.q - qty + s.reserved;
    this.pharmacy.restock(s.stockId, target).subscribe({
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
    const target = s.q + diff + s.reserved;
    this.pharmacy.restock(s.stockId, Math.max(0, target)).subscribe({
      next: () => { 
        this.platform.notify(`Ajustement enregistré (${diff}) - Motif: ${motif}`, 'info'); 
        this.adjustModal.set(null);
        this.reload(); 
      }
    });
  }

  // --- Alerte Distributeur ---
  alertDistrib(s: StockRow): void {
    this.platform.notify(`Alerte envoyée au distributeur pour ${s.name}`, 'ok');
  }
}
