import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Tag } from '../../../components/tag/tag';
import { PlatformState } from '../../../services/platform/platform';
import { MedicineService } from '../../../services/medicines/medicines';
import { OrderService } from '../../../services/orders/orders';
import { Med, ResaRow } from '../../../interfaces/models';
import { PatientResults } from '../patient-results/patient-results';
import { PatientPharmacies } from '../patient-pharmacies/patient-pharmacies';
import { SimpleProfile } from '../profile/profile';

/* ============================================================
   PATIENT — recherche, réservations, pharmacies, profil (API réelle)
   ============================================================ */
@Component({
  selector: 'app-patient-dash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Card, PageHead, Tag, PatientResults, PatientPharmacies, SimpleProfile],
  templateUrl: './patient.html',
  styleUrl: './patient.css',
})
export class PatientDash {
  private readonly platform = inject(PlatformState);
  private readonly meds = inject(MedicineService);
  private readonly orders = inject(OrderService);

  readonly section = model.required<string>();
  readonly q = signal('');
  readonly active = signal<Med | null>(null);
  readonly results = signal<Med[]>([]);
  readonly searching = signal(false);
  readonly resas = signal<ResaRow[]>([]);

  readonly suggestions = ['Morphine', 'Insuline Glargine', 'Paracétamol', 'Ventoline', 'Amlodipine'];
  readonly profilFields: readonly [string, string][] = [
    ['Téléphone', '+221 77 123 45 67'],
    ['Ville', 'Dakar — Plateau'],
    ['Notifications', 'Activées (rupture & disponibilité)'],
    ['Pharmacie favorite', 'Pharmacie Centrale'],
  ];

  constructor() { this.loadResas(); }

  onSearch(e: Event): void { this.runSearch((e.target as HTMLInputElement).value); }
  setQuery(s: string): void { this.runSearch(s); }
  clear(): void { this.q.set(''); this.results.set([]); this.active.set(null); }

  private runSearch(term: string): void {
    this.q.set(term);
    this.active.set(null);
    const t = term.trim();
    if (!t) { this.results.set([]); return; }
    this.searching.set(true);
    this.meds.search(t).subscribe({
      next: list => { this.results.set(list); this.searching.set(false); },
      error: () => { this.results.set([]); this.searching.set(false); },
    });
  }

  reserve(med: Med, structureId: number): void {
    this.orders.create(Number(med.id), structureId).subscribe({
      next: () => {
        this.platform.notify('Réservation envoyée pour ' + med.nom, 'ok');
        this.active.set(null);
        this.loadResas();
        this.section.set('resa');
      },
      error: () => this.platform.notify('Échec de la réservation', 'alert'),
    });
  }

  private loadResas(): void {
    this.orders.list().subscribe({ next: r => this.resas.set(r), error: () => { /* ignore */ } });
  }
}
