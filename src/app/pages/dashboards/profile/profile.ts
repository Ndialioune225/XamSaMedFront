import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Qr } from '../../../components/qr/qr';
import { roleById } from '../../../data/mock-data';
import { RoleId } from '../../../interfaces/models';

/* Profil générique (patient / officine) — fiche + QR d'accès */
@Component({
  selector: 'app-simple-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Card, PageHead, Qr],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class SimpleProfile {
  readonly role = input.required<RoleId>();
  readonly title = input('');
  readonly name = input('');
  readonly sub = input('');
  readonly fields = input<readonly [string, string][]>([]);
  readonly roleIcon = computed(() => roleById(this.role()).icon);
}
