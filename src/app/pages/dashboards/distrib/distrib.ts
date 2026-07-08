import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
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
import { DemandeReg, Tension, ZoneInfo } from '../../../interfaces/models';

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

  readonly section = input.required<string>();
  readonly demandes = signal<DemandeReg[]>([]);
  readonly zones = signal<ZoneInfo[]>([]);
  readonly autoAlerts = signal<ShortageAlert[]>([]);
  readonly sel = signal<string | null>(null);

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

  constructor() {
    this.distributor.regionalDemands().subscribe({ next: d => this.demandes.set(d), error: () => { /* ignore */ } });
    this.distributor.zones().subscribe({ next: z => this.zones.set(z), error: () => { /* ignore */ } });
    this.distributor.alerts().subscribe({ next: a => this.autoAlerts.set(a), error: () => { /* ignore */ } });
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
}
