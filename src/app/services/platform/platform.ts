import { Injectable, signal } from '@angular/core';
import { RoleId, NotifKind } from '../../interfaces/models';

export interface Toast { id: number; msg: string; kind: NotifKind; }

const STORAGE_KEY = 'nova-role';

/* ============================================================
   XamSaMed — État plateforme (rôle courant) + bus de toasts
   ============================================================ */
@Injectable({ providedIn: 'root' })
export class PlatformState {
  readonly role = signal<RoleId | null>(this.restore());
  readonly toasts = signal<Toast[]>([]);

  setRole(role: RoleId): void {
    this.role.set(role);
    try { localStorage.setItem(STORAGE_KEY, role); } catch { /* ignore */ }
  }

  clearRole(): void {
    this.role.set(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  /** Affiche un toast (auto-disparition après 3,4 s). */
  notify(msg: string, kind: NotifKind = 'ok'): void {
    const toast: Toast = { id: Date.now() + Math.random(), msg, kind };
    this.toasts.update(list => [...list, toast]);
    setTimeout(() => this.toasts.update(list => list.filter(t => t.id !== toast.id)), 3400);
  }

  private restore(): RoleId | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v as RoleId | null;
    } catch {
      return null;
    }
  }
}
