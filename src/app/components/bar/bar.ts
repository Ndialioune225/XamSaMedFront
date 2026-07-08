import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/* Barre de progression (quantité vs seuil, tension, etc.) */
@Component({
  selector: 'pf-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bar.html',
  styleUrl: './bar.css',
})
export class Bar {
  readonly pct = input(0);
  readonly tone = input<'green' | 'amber' | 'red' | 'blue'>('green');
}
