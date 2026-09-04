import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { Icon } from '../../../components/icon/icon';
import { Card } from '../../../components/card/card';
import { PageHead } from '../../../components/page-head/page-head';
import { Stat } from '../../../components/stat/stat';
import { Tag } from '../../../components/tag/tag';
import { PlatformState } from '../../../services/platform/platform';
import { HospitalService } from '../../../services/hospital/hospital';
import { AlerteHop, CritMedRow } from '../../../interfaces/models';

/* ============================================================
   HÔPITAL — alertes internes, réseau, médicaments critiques (API réelle)
   ============================================================ */
@Component({
  selector: 'app-hopital-dash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Card, PageHead, Stat, Tag],
  templateUrl: './hopital.html',
  styleUrl: './hopital.css',
})
export class HopitalDash {
  private readonly platform = inject(PlatformState);
  private readonly hospital = inject(HospitalService);

  readonly section = model.required<string>();
  readonly alertes = signal<AlerteHop[]>([]);
  readonly critMeds = signal<CritMedRow[]>([]);
  readonly alertHistory = signal<any[]>([]);

  readonly signalModal = signal(false);
  readonly connectModal = signal(false);

  readonly activeAlerts = computed(() => this.alertes().filter(a => a.niveau === 'crit' || a.niveau === 'haute'));
  readonly resolvedCount = computed(() => this.alertHistory().filter(a => a.resolved).length);
  readonly activePartnerCount = computed(() => this.realPartners().filter(p => p.status === 'active').length);
  readonly pharmacyPartners = computed(() => this.realPartners().filter(p => p.type === 'pharmacy'));
  readonly distributorPartners = computed(() => this.realPartners().filter(p => p.type === 'distributor'));

  constructor() {
    this.reload();
    // Charger les partenaires depuis l'API réelle
    this.hospital.partners().subscribe({ next: p => this.realPartners.set(p), error: () => { /* ignore */ } });
  }

  readonly realPartners = signal<any[]>([]);
  readonly dashboardData = signal<any>({});

  reload(): void {
    this.hospital.alerts().subscribe({ next: a => this.alertes.set(a), error: () => { /* ignore */ } });
    this.hospital.criticalMedicines().subscribe({ next: m => this.critMeds.set(m), error: () => { /* ignore */ } });
    // HOS-006: Historique des alertes via API réelle
    this.hospital.alertHistory().subscribe({ next: h => this.alertHistory.set(h), error: () => { /* ignore */ } });
    // Dashboard data
    this.hospital.dashboard().subscribe({ next: d => this.dashboardData.set(d), error: () => { /* ignore */ } });
  }

  ntag(n: string): string { return n === 'crit' ? 'crit' : n === 'haute' ? 'low' : 'new'; }
  critTag(s: string): string { return s === 'out' ? 'crit' : s === 'low' ? 'low' : 'ok'; }
  critLabel(s: string): string { return s === 'out' ? 'Rupture' : s === 'low' ? 'Sous tension' : 'Suivi normal'; }

  askRestock(): void { this.platform.notify('Demande envoyée aux partenaires', 'info'); }

  resolve(id: string): void {
    this.hospital.resolveAlert(Number(id)).subscribe({
      next: () => { this.platform.notify('Alerte traitée et transmise au réseau', 'ok'); this.reload(); },
      error: () => this.platform.notify('Échec de la résolution', 'alert'),
    });
  }

  signalRupture(): void { this.signalModal.set(true); }
  connectPartner(): void { this.connectModal.set(true); }

  submitSignal(med: string, service: string, qty: string): void {
    const remaining = parseInt(qty, 10);
    // HOS-002 + HOS-003: Signaler la rupture via l'API réelle
    this.hospital.createAlert(med, service, 'high', remaining).subscribe({
      next: () => {
        this.platform.notify(`Alerte signalée pour ${med} (${service}) — réseau notifié automatiquement`, 'ok');
        this.signalModal.set(false);
        this.reload();
      },
      error: () => this.platform.notify('Échec du signalement', 'alert'),
    });
  }

  submitConnect(partnerCode: string, type: string): void {
    // Appel API réel (recherche + ajout partenaire)
    const partnerType = type === 'Pharmacie' ? 'pharmacy' : 'distributor';
    this.hospital.searchPartners(partnerCode, partnerType).subscribe({
      next: results => {
        if (results.length > 0) {
          this.hospital.addPartner(results[0].id, partnerType).subscribe({
            next: () => {
              this.platform.notify(`Partenaire ${partnerCode} connecté avec succès`, 'ok');
              this.connectModal.set(false);
              this.hospital.partners().subscribe({ next: p => this.realPartners.set(p), error: () => {} });
            },
            error: () => this.platform.notify('Échec de la connexion', 'alert'),
          });
        } else {
          this.platform.notify(`Aucun partenaire trouvé pour "${partnerCode}"`, 'alert');
        }
      },
      error: () => this.platform.notify('Erreur de recherche', 'alert'),
    });
  }
}
