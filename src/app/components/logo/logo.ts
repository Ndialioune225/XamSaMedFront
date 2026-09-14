import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/* ---------------- Logo XamSaMed ---------------- */
@Component({
  selector: 'nv-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './logo.html',
  styleUrl: './logo.css',
})
export class Logo {
  readonly light = input(false);
  /** Sidebar repliée / écran étroit : n'affiche que la pastille. */
  readonly compact = input(false);
  readonly clicked = output<void>();
}
