import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/* Bloc carte de dashboard avec en-tête optionnel + slot droit ([right]) */
@Component({
  selector: 'pf-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  readonly title = input('');
  readonly sub = input('');
  readonly extra = input('');
}
