import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Tag } from '../../../components/tag/tag';
import { PlatformState } from '../../../services/platform/platform';
import { PharmacyService } from '../../../services/pharmacy/pharmacy';
import { StructureService } from '../../../services/structures/structures';
import { DemandeRow, Pharmacy } from '../../../interfaces/models';

/* Demandes ciblées reçues par le pharmacien : accepter / orienter (API réelle). */
@Component({
  selector: 'app-pharma-demandes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Card, PageHead, Tag],
  templateUrl: './pharma-demandes.html',
  styleUrl: './pharma-demandes.css',
})
export class PharmaDemandes {
  private readonly platform = inject(PlatformState);
  private readonly pharmacy = inject(PharmacyService);
  private readonly structures = inject(StructureService);

  readonly demandes = input.required<DemandeRow[]>();
  readonly changed = output<void>();

  readonly orient = signal<number | null>(null);
  readonly orientOptions = signal<Pharmacy[]>([]);

  constructor() {
    this.structures.pharmacies().subscribe({ next: p => this.orientOptions.set(p.slice(0, 4)), error: () => { /* ignore */ } });
  }

  typeIcon(type: string): string { return type === 'Hôpital' ? 'hospital' : type === 'Patient' ? 'user' : 'pill'; }
  urg(u: string): string { return u === 'Critique' ? 'crit' : u === 'Élevé' ? 'low' : 'new'; }

  accept(id: number): void {
    this.pharmacy.acceptDemande(id).subscribe({
      next: () => { this.platform.notify('Demande acceptée et confirmée', 'ok'); this.changed.emit(); },
      error: () => this.platform.notify('Échec de l’acceptation', 'alert'),
    });
  }

  doOrient(id: number, p: Pharmacy): void {
    this.pharmacy.orientDemande(id, Number(p.id)).subscribe({
      next: () => { this.orient.set(null); this.platform.notify('Patient orienté vers ' + p.nom, 'info'); this.changed.emit(); },
      error: () => this.platform.notify('Échec de l’orientation', 'alert'),
    });
  }
}
