import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { StructureService } from '../../../services/structures/structures';
import { Pharmacy } from '../../../interfaces/models';

/* Pharmacies à proximité : carte cliquable + liste (API réelle). */
@Component({
  selector: 'app-patient-pharmacies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Card, PageHead],
  templateUrl: './patient-pharmacies.html',
  styleUrl: './patient-pharmacies.css',
})
export class PatientPharmacies {
  private readonly structures = inject(StructureService);

  readonly pharmacies = signal<Pharmacy[]>([]);
  readonly sel = signal<string | null>(null);

  constructor() {
    this.structures.pharmacies().subscribe({ next: p => this.pharmacies.set(p), error: () => { /* ignore */ } });
  }
}
