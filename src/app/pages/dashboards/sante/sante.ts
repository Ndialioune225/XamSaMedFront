import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Stat } from '../../../components/stat/stat';
import { Bar } from '../../../components/bar/bar';
import { Tag } from '../../../components/tag/tag';
import { ZoneMap } from '../../../components/zone-map/zone-map';
import { PlatformState } from '../../../services/platform/platform';
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
  private readonly platform = inject(PlatformState);

  readonly section = model.required<string>();
  readonly sel = signal<string | null>(null);
  readonly tension = signal<Tension[]>([]);
  readonly zones = signal<ZoneInfo[]>([]);
  readonly overview = signal<ApiOverview>({ ruptures: 0, low: 0, zones_tracked: 0, medicines_in_tension: 0 });

  readonly generateModal = signal(false);

  readonly topTension = computed(() => this.tension().slice(0, 5));
  readonly critZones = computed(() => this.zones().filter(z => z.niveau === 'crit').length);
  readonly tensionMid = computed(() => this.tension().filter(t => t.pct > 40).length);
  readonly sortedZones = computed(() => [...this.zones()].sort((a, b) => b.ruptures - a.ruptures));

  readonly reports = signal<any[]>([]);
  readonly keyStats = computed<readonly [string, string, string][]>(() => [
    ['Médicaments en tension', String(this.overview().medicines_in_tension), 'pill'],
    ['Zones critiques actives', String(this.critZones()), 'pin'],
    ['Ruptures signalées', String(this.overview().ruptures), 'alert'],
  ]);

  constructor() {
    this.ph.overview().subscribe({ next: o => this.overview.set(o), error: () => { /* ignore */ } });
    this.ph.zones().subscribe({ next: z => this.zones.set(z), error: () => { /* ignore */ } });
    this.ph.tension().subscribe({ next: t => this.tension.set(t), error: () => { /* ignore */ } });
    this.loadReports();
  }

  tone(pct: number): BarTone { return pct > 70 ? 'red' : pct > 40 ? 'amber' : 'green'; }
  ztag(n: string): string { return n === 'crit' ? 'crit' : n === 'haute' ? 'low' : 'ok'; }
  ttag(pct: number): string { return pct > 70 ? 'crit' : pct > 40 ? 'low' : 'ok'; }
  tlabel(pct: number): string { return pct > 70 ? 'Critique' : pct > 40 ? 'Élevée' : 'Modérée'; }

  generateReport(): void { this.generateModal.set(true); }
  exportReport(reportId?: number): void {
    const report = reportId
      ? this.reports().find(item => item.id === reportId)
      : this.reports().find(item => item.status === 'Prêt');
    if (!report) {
      this.platform.notify('Aucun rapport prêt à exporter', 'alert');
      return;
    }
    this.ph.downloadReport(report.id).subscribe({
      next: blob => this.download(blob, `rapport-xamsamed-${report.id}.pdf`),
      error: () => this.platform.notify('Impossible de consulter ce rapport', 'alert'),
    });
  }

  submitGenerate(period: string, type: string): void {
    const periods: Record<string, string> = {
      'Cette semaine': 'week',
      'Ce mois-ci': 'month',
      'Le mois dernier': 'month',
      'Année en cours': 'quarter',
    };
    const types: Record<string, string> = {
      'Synthèse nationale': 'national',
      'Tensions critiques': 'tensions',
      'Rapport régional détaillé': 'regional',
    };
    this.ph.generateReport(periods[period] ?? 'week', types[type] ?? 'national').subscribe({
      next: report => {
        if (!report) {
          this.platform.notify('La génération du rapport a échoué', 'alert');
          return;
        }
        this.platform.notify(`Rapport '${type}' généré avec succès`, 'ok');
        this.generateModal.set(false);
        this.loadReports();
      },
      error: () => this.platform.notify('La génération du rapport a échoué', 'alert'),
    });
  }

  private loadReports(): void {
    this.ph.reports().subscribe({
      next: reports => this.reports.set(reports.map(report => ({
        ...report,
        status: report.status === 'completed' ? 'Prêt' : report.status === 'generating' ? 'En cours' : 'Échec',
        s: report.status === 'completed' ? 'ok' : 'low',
      }))),
    });
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    this.platform.notify('Rapport téléchargé', 'ok');
  }
}
