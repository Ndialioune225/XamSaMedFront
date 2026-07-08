import { ChangeDetectionStrategy, Component } from '@angular/core';

const SEED = [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0];

function buildCells(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  let k = 0;
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      if (SEED[k++ % SEED.length]) cells.push({ x: x * 18 + 2, y: y * 18 + 2 });
    }
  }
  return cells;
}

/* QR décoratif (motif géométrique simple) */
@Component({
  selector: 'pf-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './qr.html',
  styleUrl: './qr.css',
})
export class Qr {
  readonly cells = buildCells();
}
