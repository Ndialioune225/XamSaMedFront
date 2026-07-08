import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Stat } from '../../../components/stat/stat';
import { Bar } from '../../../components/bar/bar';
import { Tag } from '../../../components/tag/tag';
import { ZoneMap } from '../../../components/zone-map/zone-map';
import { PublicHealthService } from '../../../services/public-health/public-health';
import { ApiOverview } from '../../../interfaces/api';
import { Tension, ZoneInfo } from '../../../interfaces/models';

type BarTone = 'green' | 'amber' | 'red' | 'blue';

/* ============================================================
   SANTÉ PUBLIQUE — vue nationale, zones, tensions, rapports (API réelle)
   ============================================================ */
@Component({
  selector: 'app-sante-dash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Card, PageHead, Stat, Bar, Tag, ZoneMap],
  templateUrl: './sante.html',
  styleUrl: './sante.css',
})
export class SanteDash {
  private readonly ph = inject(PublicHealthService);

  readonly section = input.required<string>();
  readonly sel = signal<string | null>(null);
  readonly tension = signal<Tension[]>([]);
  readonly zones = signal<ZoneInfo[]>([]);
  readonly overview = signal<ApiOverview>({ ruptures: 0, low: 0, zones_tracked: 0, medicines_in_tension: 0 });

  readonly topTension = computed(() => this.tension().slice(0, 5));
  readonly critZones = computed(() => this.zones().filter(z => z.niveau === 'crit').length);
  readonly tensionMid = computed(() => this.tension().filter(t => t.pct > 40).length);
  readonly sortedZones = computed(() => [...this.zones()].sort((a, b) => b.ruptures - a.ruptures));

  readonly reports: readonly [string, string, string, string][] = [
    ['Semaine 23 · 2026', 'Rapport hebdomadaire', 'Prêt', 'ok'],
    ['Mai 2026', 'Rapport mensuel régional', 'Prêt', 'ok'],
    ['T2 · 2026', 'Bilan trimestriel', 'En cours', 'low'],
  ];
  readonly keyStats: readonly [string, string, string][] = [
    ['Délais moyens de réappro.', '2,8 jours', 'trend'],
    ['Médicaments en tension', '5 références', 'pill'],
    ['Zones critiques actives', '2 régions', 'pin'],
  ];

  constructor() {
    this.ph.overview().subscribe({ next: o => this.overview.set(o), error: () => { /* ignore */ } });
    this.ph.zones().subscribe({ next: z => this.zones.set(z), error: () => { /* ignore */ } });
    this.ph.tension().subscribe({ next: t => this.tension.set(t), error: () => { /* ignore */ } });
  }

  tone(pct: number): BarTone { return pct > 70 ? 'red' : pct > 40 ? 'amber' : 'green'; }
  ztag(n: string): string { return n === 'crit' ? 'crit' : n === 'haute' ? 'low' : 'ok'; }
  ttag(pct: number): string { return pct > 70 ? 'crit' : pct > 40 ? 'low' : 'ok'; }
  tlabel(pct: number): string { return pct > 70 ? 'Critique' : pct > 40 ? 'Élevée' : 'Modérée'; }
}
