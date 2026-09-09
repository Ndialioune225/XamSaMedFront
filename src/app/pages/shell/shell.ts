import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { Icon } from '../../components/icon/icon';
import { Logo } from '../../components/logo/logo';
import { PlatformState } from '../../services/platform/platform';
import { AuthService } from '../../services/auth/auth';
import { NAV, roleById } from '../../data/mock-data';
import { Notif, RoleId } from '../../interfaces/models';
import { GlobalSearchResult } from '../../interfaces/api';
import { MedicineService } from '../../services/medicines/medicines';
import { NotificationService } from '../../services/notifications/notifications';
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
  private readonly notificationService = inject(NotificationService);
  private readonly searchInput$ = new Subject<string>();

  readonly role = this.platform.role;
  readonly collapsed = signal(false);
  readonly notifOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly sec = signal<string>('search');
  readonly globalQuery = signal('');
  readonly globalResults = signal<GlobalSearchResult[]>([]);
  readonly searchLoading = signal(false);
  readonly searchFocused = signal(false);
  readonly dismissedNotifications = signal<Set<string>>(new Set());
  readonly notifications = signal<Notif[]>([]);

  readonly current = computed(() => { const r = this.role(); return r ? roleById(r) : null; });
  readonly nav = computed(() => {
    const r = this.role();
    if (!r) return [];
    const counts = this.notifs().reduce<Record<string, number>>((result, item) => {
      if (item.target) result[item.target] = (result[item.target] ?? 0) + 1;
      return result;
    }, {});
    return NAV[r].map(item => ({ ...item, badge: counts[item.id] ?? 0 }));
  });
  readonly notifs = computed(() => {
    const role = this.role();
    const dismissed = this.dismissedNotifications();
    return this.notifications().filter(n => !dismissed.has(`${role}:${n.t}:${n.d}`));
  });

  constructor() {
    const r = this.platform.role();
    if (!r) { this.router.navigateByUrl('/login'); }
    else { this.sec.set(NAV[r][0].id); }
    this.searchInput$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(query => {
        const term = query.trim();
        if (term.length < 2) {
          this.searchLoading.set(false);
          return of([]);
        }
        this.searchLoading.set(true);
        return this.medicines.globalSearch(term);
      }),
    ).subscribe(results => {
      this.globalResults.set(results);
      this.searchLoading.set(false);
    });
    if (r) this.notificationService.load(r).subscribe(notifications => this.notifications.set(notifications));
  }

  shortLabel(label: string): string { return label.split(' / ')[0]; }
  select(id: string): void { this.sec.set(id); this.notifOpen.set(false); }
  openNotification(index: number): void {
    const role = this.role();
    const notification = this.notifs()[index];
    if (role && notification) {
      this.dismissedNotifications.update(items => {
        const next = new Set(items);
        next.add(`${role}:${notification.t}:${notification.d}`);
        return next;
      });
      this.select(notification.target ?? NAV[role][0].id);
    }
  }
  searchGlobal(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.globalQuery.set(query);
    this.searchLoading.set(query.trim().length >= 2);
    this.searchInput$.next(query);
  }
  openGlobalResult(result: GlobalSearchResult): void {
    this.globalQuery.set(result.label);
    this.globalResults.set([]);
    this.searchFocused.set(false);
    if (this.role() === 'patient') this.sec.set(result.type === 'pharmacy' ? 'phar' : 'search');
  }
  focusGlobalSearch(): void { this.searchFocused.set(true); }
  closeGlobalSearch(): void { window.setTimeout(() => this.searchFocused.set(false), 120); }
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
