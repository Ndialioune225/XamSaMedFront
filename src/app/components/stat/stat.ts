import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/* Carte statistique (icône + valeur + libellé + delta) */
@Component({
  selector: 'pf-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './stat.html',
  styleUrl: './stat.css',
})
export class Stat {
  readonly icon = input.required<string>();
  readonly label = input('');
  readonly value = input<string | number>('');
  readonly delta = input('');
  readonly deltaUp = input(false);
  readonly tone = input<'blue' | 'green' | 'red' | 'amber'>('blue');
}
