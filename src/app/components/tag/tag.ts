import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const TAG_CLASS: Record<string, string> = {
  ok: 'chip-green', low: 'chip-amber', crit: 'chip-red',
  out: 'chip-red', vue: 'chip-gray', new: 'chip-blue',
};

/* Chip d'état (statut de stock, urgence, tension…) */
@Component({
  selector: 'pf-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tag.html',
  styleUrl: './tag.css',
})
export class Tag {
  readonly s = input.required<string>();
  readonly cls = computed(() => TAG_CLASS[this.s()] || 'chip-gray');
}
