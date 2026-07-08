import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '../icon/icon';
import { PlatformState } from '../../services/platform/platform';

/* Pile de toasts (notifications éphémères) — alimentée par PlatformState */
@Component({
  selector: 'pf-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './toast-host.html',
  styleUrl: './toast-host.css',
})
export class ToastHost {
  readonly platform = inject(PlatformState);
}
