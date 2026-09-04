import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../../components/icon/icon';
import { Logo } from '../../components/logo/logo';
import { PlatformState } from '../../services/platform/platform';
import { AuthService } from '../../services/auth/auth';
import { NAV, NOTIFS, ROLES, roleById } from '../../data/mock-data';
import { RoleId } from '../../interfaces/models';
import { GlobalSearchResult } from '../../interfaces/api';
import { MedicineService } from '../../services/medicines/medicines';
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
  private readonly medicines = inject(MedicineService);

  readonly role = this.platform.role;
  readonly collapsed = signal(false);
  readonly notifOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly sec = signal<string>('search');
  readonly globalQuery = signal('');
  readonly globalResults = signal<GlobalSearchResult[]>([]);
  readonly dismissedNotifications = signal<Set<string>>(new Set());

  readonly current = computed(() => { const r = this.role(); return r ? roleById(r) : null; });
  readonly nav = computed(() => { const r = this.role(); return r ? NAV[r] : []; });
  readonly notifs = computed(() => {
    const r = this.role();
    const dismissed = this.dismissedNotifications();
    return r ? NOTIFS[r].filter(n => !dismissed.has(`${r}:${n.t}:${n.d}`)) : [];
  });

  constructor() {
    const r = this.platform.role();
    if (!r) { this.router.navigateByUrl('/login'); }
    else { this.sec.set(NAV[r][0].id); }
  }

  shortLabel(label: string): string { return label.split(' / ')[0]; }
  select(id: string): void { this.sec.set(id); this.notifOpen.set(false); }
  openNotification(index: number): void {
    const role = this.role();
    const target: Record<RoleId, string[]> = {
      patient: ['resa', 'search'],
      pharma: ['alert', 'dem', 'stock'],
      distrib: ['zones', 'reg'],
      hopital: ['alert', 'alert'],
      sante: ['zones', 'rapport'],
    };
    const notification = this.notifs()[index];
    if (role && notification) {
      this.dismissedNotifications.update(items => {
        const next = new Set(items);
        next.add(`${role}:${notification.t}:${notification.d}`);
        return next;
      });
      this.select(target[role][index] ?? target[role][0]);
    }
  }
  searchGlobal(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.globalQuery.set(query);
    if (query.trim().length < 2) { this.globalResults.set([]); return; }
    this.medicines.globalSearch(query.trim()).subscribe(results => this.globalResults.set(results));
  }
  openGlobalResult(result: GlobalSearchResult): void {
    this.globalQuery.set(result.label);
    this.globalResults.set([]);
    if (this.role() === 'patient' && result.type === 'medicine') this.sec.set('search');
  }
  closeGlobalSearch(): void { this.globalResults.set([]); }
  toggleCollapse(): void { this.collapsed.update(c => !c); }
  toggleNotif(e: Event): void { e.stopPropagation(); this.profileOpen.set(false); this.notifOpen.update(o => !o); }
  toggleProfile(e: Event): void { e.stopPropagation(); this.notifOpen.set(false); this.profileOpen.update(o => !o); }
  closeMenus(): void {
    if (this.notifOpen()) this.notifOpen.set(false);
    if (this.profileOpen()) this.profileOpen.set(false);
  }
  exit(): void {
    // Révoque le token côté serveur ; le nettoyage local (rôle + token) est
    // assuré par AuthService.logout(). Navigation immédiate vers le site public.
    this.auth.logout().subscribe({ error: () => { /* token déjà invalide : ignoré */ } });
    this.router.navigateByUrl('/');
  }
}
