import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Icon } from '../../components/icon/icon';
import { Logo } from '../../components/logo/logo';
import { AuthService } from '../../services/auth/auth';
import { ROLES, roleById } from '../../data/mock-data';
import { RoleId } from '../../interfaces/models';

/* ---------------- Login / authentification (Sanctum) ---------------- */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Logo],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginScreen {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly roles = ROLES;
  readonly points: readonly [string, string][] = [
    ['shield', 'Données de santé chiffrées'],
    ['refresh', 'Disponibilité en temps réel'],
    ['qr', 'Accès rapide par QR code'],
  ];

  // Emails de démonstration par profil (le rôle réel vient du backend).
  private readonly demoEmail: Record<RoleId, string> = {
    patient: 'patient@xamsamed.test',
    pharma: 'pharma@xamsamed.test',
    distrib: 'distrib@xamsamed.test',
    hopital: 'hopital@xamsamed.test',
    sante: 'admin@xamsamed.test',
  };

  readonly role = signal<RoleId>('pharma');
  readonly email = signal<string>(this.demoEmail['pharma']);
  readonly password = signal<string>('password123');
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  readonly current = computed(() => roleById(this.role()));

  pick(id: RoleId): void {
    this.role.set(id);
    this.email.set(this.demoEmail[id]);
    this.error.set(null);
  }
  setEmail(e: Event): void { this.email.set((e.target as HTMLInputElement).value); }
  setPassword(e: Event): void { this.password.set((e.target as HTMLInputElement).value); }

  login(): void {
    if (this.loading()) return;
    const email = this.email().trim();
    if (!email || !this.password()) {
      this.error.set('Renseignez votre identifiant et votre mot de passe.');
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.auth.login(email, this.password()).subscribe({
      next: () => { this.loading.set(false); this.router.navigateByUrl('/app'); },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.error.set(this.errorMessage(err)); },
    });
  }

  back(): void { this.router.navigateByUrl('/'); }
  firstWord(s: string): string { return s.split(' ')[0]; }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 401) return 'Identifiants invalides.';
    if (err.status === 0) return 'Serveur injoignable — démarrez le backend (php artisan serve sur :8000).';
    const msg = (err.error as { message?: string } | null)?.message;
    return msg ?? 'Une erreur est survenue. Réessayez.';
  }
}
