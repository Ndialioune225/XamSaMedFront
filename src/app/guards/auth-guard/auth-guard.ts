import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlatformState } from '../../services/platform/platform';

/**
 * Protège les routes de la plateforme : un rôle doit être sélectionné
 * (via l'écran de connexion). Sinon, redirection vers /login.
 */
export const authGuard: CanActivateFn = () => {
  const platform = inject(PlatformState);
  const router = inject(Router);
  return platform.role() !== null ? true : router.createUrlTree(['/login']);
};
