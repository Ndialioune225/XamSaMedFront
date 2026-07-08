import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ZoneInfo, ZoneLevel } from '../../interfaces/models';

const COL: Record<ZoneLevel, string> = { crit: '#cf4338', haute: '#d8a13a', moyenne: 'var(--green)', basse: 'var(--blue)' };
const SIZE: Record<ZoneLevel, number> = { crit: 64, haute: 52, moyenne: 40, basse: 30 };

/* Carte des zones (tensions d'approvisionnement) — distrib + santé publique */
@Component({
  selector: 'pf-zone-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zone-map.html',
  styleUrl: './zone-map.css',
})
export class ZoneMap {
  readonly zones = input<ZoneInfo[]>([]);
  readonly selected = input<string | null>(null);
  readonly sel = output<string>();
  col(n: ZoneLevel): string { return COL[n]; }
  size(n: ZoneLevel): number { return SIZE[n]; }
}
