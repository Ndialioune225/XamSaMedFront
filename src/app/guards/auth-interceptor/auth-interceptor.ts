import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'nova-token';

/**
 * Ajoute le jeton Sanctum (Bearer) et force des réponses JSON sur chaque
 * requête sortante. Le token est lu depuis le localStorage afin de rester
 * indépendant du cycle de vie des services (évite toute dépendance circulaire
 * avec AuthService, qui dépend lui-même de HttpClient).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token: string | null = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch { token = null; }

  const setHeaders: Record<string, string> = { Accept: 'application/json' };
  if (token) setHeaders['Authorization'] = `Bearer ${token}`;

  return next(req.clone({ setHeaders }));
};
