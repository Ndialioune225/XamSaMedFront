import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Stat } from '../../../components/stat/stat';
import { Tag } from '../../../components/tag/tag';
import { PlatformState } from '../../../services/platform/platform';
import { HospitalService } from '../../../services/hospital/hospital';
import { StructureService } from '../../../services/structures/structures';
import { AlerteHop, CritMedRow, Pharmacy } from '../../../interfaces/models';

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
  private readonly structures = inject(StructureService);

  readonly section = input.required<string>();
  readonly alertes = signal<AlerteHop[]>([]);
  readonly critMeds = signal<CritMedRow[]>([]);
  readonly connectedPharma = signal<Pharmacy[]>([]);

  readonly partners: readonly [string, string, string][] = [
    ['Pharmacie de la Gare', 'Officine 24h/24', 'green'],
    ['PNA Dakar', 'Distributeur régional', 'blue'],
    ['Grande Pharmacie', 'Officine partenaire', 'green'],
  ];
  readonly distributors: readonly [string, string][] = [
    ['PNA', "Pharmacie Nationale d'Approvisionnement"],
    ['Ubipharm', 'Grossiste répartiteur'],
  ];

  constructor() {
    this.reload();
    this.structures.pharmacies().subscribe({ next: p => this.connectedPharma.set(p.slice(0, 3)), error: () => { /* ignore */ } });
  }

  reload(): void {
    this.hospital.alerts().subscribe({ next: a => this.alertes.set(a), error: () => { /* ignore */ } });
    this.hospital.criticalMedicines().subscribe({ next: m => this.critMeds.set(m), error: () => { /* ignore */ } });
  }

  ntag(n: string): string { return n === 'crit' ? 'crit' : n === 'haute' ? 'low' : 'new'; }
  critTag(s: string): string { return s === 'out' ? 'crit' : s === 'low' ? 'low' : 'ok'; }
  critLabel(s: string): string { return s === 'out' ? 'Rupture' : s === 'low' ? 'Sous tension' : 'Suivi normal'; }

  askRestock(): void { this.platform.notify('Demande envoyée aux partenaires', 'info'); }

  resolve(id: string): void {
    this.hospital.resolveAlert(Number(id)).subscribe({
      next: () => { this.platform.notify('Alerte traitée et transmise au réseau', 'ok'); this.reload(); },
      error: () => this.platform.notify('Échec de la résolution', 'alert'),
    });
  }
}
