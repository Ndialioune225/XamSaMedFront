import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { Tag } from '../../../components/tag/tag';
import { MedicineService } from '../../../services/medicines/medicines';
import { AvailabilityRow, Med } from '../../../interfaces/models';

const ORDER: Record<string, number> = { ok: 0, low: 1, out: 2 };

/* Résultats de recherche patient : points de disponibilité (API réelle). */
@Component({
  selector: 'app-patient-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Card, Tag],
  templateUrl: './patient-results.html',
  styleUrl: './patient-results.css',
})
export class PatientResults {
  private readonly meds = inject(MedicineService);

  readonly med = input.required<Med>();
  readonly back = output<void>();
  readonly reserve = output<number>(); // émet l'id de structure (officine)

  readonly rows = signal<AvailabilityRow[]>([]);
  readonly loading = signal(true);

  readonly best = computed(() => this.rows().find(r => r.s !== 'out'));
  readonly availableCount = computed(() => this.rows().filter(r => r.s !== 'out').length);

  constructor() {
    effect(() => {
      const m = this.med();
      this.loading.set(true);
      this.meds.availability(Number(m.id)).subscribe({
        next: list => {
          this.rows.set([...list].sort((a, b) => (ORDER[a.s] ?? 9) - (ORDER[b.s] ?? 9)));
          this.loading.set(false);
        },
        error: () => { this.rows.set([]); this.loading.set(false); },
      });
    });
  }
}
