import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Administration (réservé au rôle admin) : utilisateurs + structures. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ── Utilisateurs ──────────────────────────────────────────────
  /** GET /admin/users */
  users(): Observable<any[]> {
    return this.http.get<{ data: any[] }>(`${this.base}/admin/users`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** POST /admin/users (mot de passe auto-généré + envoyé par email). */
  createUser(payload: { name: string; email: string; phone?: string; role: string; structure_id?: number | null }): Observable<unknown> {
    return this.http.post(`${this.base}/admin/users`, payload);
  }

  /** DELETE /admin/users/{id} (soft delete). */
  deleteUser(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/admin/users/${id}`);
  }

  // ── Structures ────────────────────────────────────────────────
  /** GET /structures (actives). */
  structures(): Observable<any[]> {
    return this.http.get<{ data: any[] }>(`${this.base}/structures`).pipe(
      map(r => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** POST /admin/structures */
  createStructure(payload: { name: string; type: string; city?: string; contact_phone?: string; code?: string }): Observable<unknown> {
    return this.http.post(`${this.base}/admin/structures`, payload);
  }

  /** DELETE /admin/structures/{id} (désactivation). */
  deleteStructure(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/admin/structures/${id}`);
  }
}
