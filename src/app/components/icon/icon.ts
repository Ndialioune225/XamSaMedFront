import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/* ============================================================
   XamSaMed — Icônes (line icons géométriques simples)
   Couleur héritée via currentColor — émeraude par défaut dans l'UI
   Porté depuis icons.jsx
   ============================================================ */
@Component({
  selector: 'nv-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input(20);
  readonly sw = input(1.9);
  readonly fill = input('none');
  readonly color = input('');
  readonly rotate = input(0);
}
