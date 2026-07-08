import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard/auth-guard';

export const routes: Routes = [
  { path: '',
    loadComponent: () => import('./pages/site/site').then(m => m.SiteVitrine)

  },
  { path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginScreen)

  },
  {
    path: 'app',
    loadComponent: () => import('./pages/shell/shell').then(m => m.AppShell),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
