import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/* En-tête de page de dashboard (titre + sous-titre + actions projetées) */
@Component({
  selector: 'pf-page-head',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-head.html',
  styleUrl: './page-head.css',
})
export class PageHead {
  readonly title = input('');
  readonly sub = input('');
}
