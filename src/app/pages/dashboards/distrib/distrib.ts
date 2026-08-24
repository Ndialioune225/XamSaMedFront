import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Stat } from '../../../components/stat/stat';
import { Bar } from '../../../components/bar/bar';
import { Tag } from '../../../components/tag/tag';
import { ZoneMap } from '../../../components/zone-map/zone-map';
import { PlatformState } from '../../../services/platform/platform';
import { DistributorService } from '../../../services/distributor/distributor';
import { ShortageAlert } from '../../../interfaces/api';
import { DemandeReg, Tension, ZoneInfo, DeliveryRow, DeliveryStatus } from '../../../interfaces/models';
import { AuthService } from '../../../services/auth/auth';

type BarTone = 'green' | 'amber' | 'red' | 'blue';

/* ============================================================
   DISTRIBUTEUR — demandes régionales, zones, prévisions (API réelle)
   ============================================================ */
@Component({
  selector: 'app-distrib-dash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Card, PageHead, Stat, Bar, Tag, ZoneMap],
  templateUrl: './distrib.html',
  styleUrl: './distrib.css',
})
export class DistribDash {
  private readonly platform = inject(PlatformState);
  private readonly distributor = inject(DistributorService);
  private readonly auth = inject(AuthService);

  readonly section = model.required<string>();
  readonly demandes = signal<DemandeReg[]>([]);
  readonly zones = signal<ZoneInfo[]>([]);
  readonly autoAlerts = signal<ShortageAlert[]>([]);
  readonly sel = signal<string | null>(null);
  readonly planModal = signal(false);
  
  // --- LIVRAISONS ---
  readonly deliveries = signal<DeliveryRow[]>([]);
  readonly filterStatus = signal<DeliveryStatus | 'Toutes'>('Toutes');
  readonly editLivraisonModal = signal<DeliveryRow | null>(null);

  // Contexte du distributeur basé sur profile_meta
  readonly distributorContext = computed(() => {
    const user = this.auth.user();
    if (!user) return 'Distributeur inconnu';
    const meta = user.profile_meta as any;
    const type = meta?.type || 'PNA';
    const region = meta?.region;
    
    if (type === 'PNA') return 'PNA — Vue Nationale';
    if (type === 'PRA') return `PRA — Vue Régionale (${region || 'Toutes'})`;
    if (type === 'PRIVATE') return 'Distributeur Privé — Partenaires Uniquement';
    return 'Distributeur';
  });

  // Prévisions dérivées des ruptures réelles signalées.
  readonly tension = computed<Tension[]>(() => this.autoAlerts().map(a => ({
    nom: a.name,
    pct: a.severity === 'high' ? Math.min(95, 60 + a.pharmacy_reports.length * 8) : Math.min(70, 40 + a.pharmacy_reports.length * 6),
    delai: ((a.pharmacy_reports.length * 0.6) + 1).toFixed(1).replace('.', ',') + ' j',
  })));
  readonly critZones = computed(() => this.zones().filter(z => z.niveau === 'crit').length);
  readonly tensionHigh = computed(() => this.autoAlerts().filter(a => a.severity === 'high').length);
  readonly urgentes = computed(() => this.demandes().filter(d => d.tension === 'haute').length);
  readonly zonesList = computed<ZoneInfo[]>(() => {
    const s = this.sel();
    return s ? this.zones().filter(z => z.nom === s) : this.zones();
  });
  
  readonly filteredDeliveries = computed(() => {
    const s = this.filterStatus();
    return s === 'Toutes' ? this.deliveries() : this.deliveries().filter(d => d.status === s);
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.distributor.regionalDemands().subscribe({ next: d => this.demandes.set(d), error: () => { /* ignore */ } });
    this.distributor.zones().subscribe({ next: z => this.zones.set(z), error: () => { /* ignore */ } });
    this.distributor.alerts().subscribe({ next: a => this.autoAlerts.set(a), error: () => { /* ignore */ } });
    this.distributor.deliveries().subscribe({ next: d => this.deliveries.set(d), error: () => { /* ignore */ } });
  }

  tcol(t: string): string { return t === 'haute' ? 'crit' : t === 'moyenne' ? 'low' : 'ok'; }
  ztag(n: string): string { return n === 'crit' ? 'crit' : n === 'haute' ? 'low' : 'ok'; }
  tone(pct: number): BarTone { return pct > 70 ? 'red' : pct > 40 ? 'amber' : 'green'; }
  sevTag(sev: string): string { return sev === 'high' ? 'crit' : 'low'; }
  sevLabel(sev: string): string { return sev === 'high' ? 'Critique' : 'Élevé'; }

  forecast(zone: string): void { this.platform.notify('Prévision mise à jour pour ' + zone, 'info'); }
  plan(id: string, zone: string): void {
    this.demandes.update(list => list.filter(d => d.id !== id));
    this.platform.notify('Livraison planifiée vers ' + zone, 'ok');
  }
  planLivraison(): void { this.planModal.set(true); }

  submitPlan(zone: string, med: string, qty: string, date: string): void {
    const q = parseInt(qty, 10);
    this.distributor.createDelivery(zone, med, q, date).subscribe({
      next: () => {
        this.platform.notify(`Livraison de ${qty}u de ${med} planifiée pour le ${date} vers ${zone}`, 'ok');
        this.planModal.set(false);
        this.reload();
      }
    });
  }

  // --- ACTIONS LIVRAISON ---
  startTransit(id: string): void {
    this.distributor.changeDeliveryStatus(id, 'En transit').subscribe({
      next: () => { this.platform.notify('La livraison est en transit', 'info'); this.reload(); }
    });
  }
  
  confirmDelivery(id: string): void {
    this.distributor.changeDeliveryStatus(id, 'Livrée').subscribe({
      next: () => { this.platform.notify('Réception confirmée, stock mis à jour', 'ok'); this.reload(); }
    });
  }
  
  cancelDelivery(id: string): void {
    this.distributor.changeDeliveryStatus(id, 'Annulée').subscribe({
      next: () => { this.platform.notify('Livraison annulée', 'alert'); this.reload(); }
    });
  }

  submitEditLivraison(qtyInput: string, date: string): void {
    const s = this.editLivraisonModal();
    if (!s) return;
    const qty = parseInt(qtyInput, 10);
    this.distributor.updateDelivery(s.id, qty, date).subscribe({
      next: () => {
        this.platform.notify('Livraison modifiée avec succès', 'ok');
        this.editLivraisonModal.set(null);
        this.reload();
      }
    });
  }
}
