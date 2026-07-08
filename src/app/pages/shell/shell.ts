import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../../components/icon/icon';
import { Logo } from '../../components/logo/logo';
import { PlatformState } from '../../services/platform/platform';
import { AuthService } from '../../services/auth/auth';
import { NAV, NOTIFS, ROLES, roleById } from '../../data/mock-data';
import { RoleId } from '../../interfaces/models';
import { ToastHost } from '../../components/toast-host/toast-host';
import { PatientDash } from '../dashboards/patient/patient';
import { PharmaDash } from '../dashboards/pharma/pharma';
import { DistribDash } from '../dashboards/distrib/distrib';
import { HopitalDash } from '../dashboards/hopital/hopital';
import { SanteDash } from '../dashboards/sante/sante';

/* ---------------- Shell de l'application ---------------- */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Logo, ToastHost, PatientDash, PharmaDash, DistribDash, HopitalDash, SanteDash],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly platform = inject(PlatformState);
  private readonly auth = inject(AuthService);

  readonly role = this.platform.role;
  readonly roles = ROLES;
  readonly collapsed = signal(false);
  readonly notifOpen = signal(false);
  readonly roleMenu = signal(false);
  readonly sec = signal<string>('search');

  readonly current = computed(() => { const r = this.role(); return r ? roleById(r) : null; });
  readonly nav = computed(() => { const r = this.role(); return r ? NAV[r] : []; });
  readonly notifs = computed(() => { const r = this.role(); return r ? NOTIFS[r] : []; });

  constructor() {
    const r = this.platform.role();
    if (!r) { this.router.navigateByUrl('/login'); }
    else { this.sec.set(NAV[r][0].id); }
  }

  shortLabel(label: string): string { return label.split(' / ')[0]; }
  select(id: string): void { this.sec.set(id); this.notifOpen.set(false); }
  toggleCollapse(): void { this.collapsed.update(c => !c); }
  toggleNotif(e: Event): void { e.stopPropagation(); this.notifOpen.update(o => !o); this.roleMenu.set(false); }
  toggleRoleMenu(e: Event): void { e.stopPropagation(); this.roleMenu.update(m => !m); this.notifOpen.set(false); }
  closeMenus(): void { if (this.notifOpen()) this.notifOpen.set(false); if (this.roleMenu()) this.roleMenu.set(false); }

  switchRole(id: RoleId): void {
    this.platform.setRole(id);
    this.sec.set(NAV[id][0].id);
    this.roleMenu.set(false);
    this.notifOpen.set(false);
  }
  exit(): void {
    // Révoque le token côté serveur ; le nettoyage local (rôle + token) est
    // assuré par AuthService.logout(). Navigation immédiate vers le site public.
    this.auth.logout().subscribe({ error: () => { /* token déjà invalide : ignoré */ } });
    this.router.navigateByUrl('/');
  }
}
