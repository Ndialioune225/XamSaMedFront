/* ============================================================
   XamSaMed — Données mock (démo réaliste)
   Porté depuis le prototype Claude Design (data.jsx)
   Les types/interfaces vivent dans ../interfaces/models.
   ============================================================ */

import {
  RoleId, Med, Pharmacy, Dispo, StockItem, Demande, DemandeReg,
  ZoneInfo, Tension, AlerteHop, Role, NavItem, Notif, Feature,
} from '../interfaces/models';

// Ré-export pour compatibilité : `import { RoleId } from './mock-data'` reste valide.
export type {
  RoleId, StockState, DispoState, ZoneLevel, NotifKind,
  Med, Pharmacy, Dispo, StockItem, Demande, DemandeReg,
  ZoneInfo, Tension, AlerteHop, Role, NavItem, Notif, Feature,
} from '../interfaces/models';

// Médicaments suivis (avec médicaments critiques ex: morphine)
export const MEDS: Med[] = [
  { id: 'm1', nom: 'Paracétamol 1000mg', dci: 'Paracétamol', forme: 'Comprimé · B/8', crit: false, cat: 'Antalgique' },
  { id: 'm2', nom: 'Amoxicilline 500mg', dci: 'Amoxicilline', forme: 'Gélule · B/12', crit: false, cat: 'Antibiotique' },
  { id: 'm3', nom: 'Morphine 10mg/ml', dci: 'Sulfate de morphine', forme: 'Injectable · Ampoule', crit: true, cat: 'Stupéfiant' },
  { id: 'm4', nom: 'Insuline Glargine', dci: 'Insuline glargine', forme: 'Stylo · 100U/ml', crit: true, cat: 'Antidiabétique' },
  { id: 'm5', nom: 'Salbutamol', dci: 'Salbutamol', forme: 'Aérosol · 100µg', crit: false, cat: 'Bronchodilatateur' },
  { id: 'm6', nom: 'Ventoline', dci: 'Salbutamol', forme: 'Inhalateur', crit: false, cat: 'Bronchodilatateur' },
  { id: 'm7', nom: 'Amlodipine 5mg', dci: 'Amlodipine', forme: 'Comprimé · B/30', crit: false, cat: 'Antihypertenseur' },
  { id: 'm8', nom: 'Diazépam 10mg', dci: 'Diazépam', forme: 'Injectable', crit: true, cat: 'Stupéfiant' },
];

// Pharmacies / officines
export const PHARMACIES: Pharmacy[] = [
  { id: 'p1', nom: 'Pharmacie Centrale', ville: 'Dakar Plateau', dist: '0,8 km', tel: '33 821 00 00', horaires: '08h–22h', lat: 32, lng: 42 },
  { id: 'p2', nom: 'Officine du Marché', ville: 'Médina', dist: '1,4 km', tel: '33 842 11 22', horaires: '08h–20h', lat: 55, lng: 30 },
  { id: 'p3', nom: 'Pharmacie de la Gare', ville: 'Thiès', dist: '2,1 km', tel: '33 951 44 55', horaires: '24h/24', lat: 70, lng: 60 },
  { id: 'p4', nom: 'Grande Pharmacie', ville: 'Rufisque', dist: '3,6 km', tel: '33 836 77 88', horaires: '08h–21h', lat: 40, lng: 72 },
  { id: 'p5', nom: 'Pharmacie Espoir', ville: 'Pikine', dist: '4,2 km', tel: '33 854 33 21', horaires: '07h–23h', lat: 24, lng: 64 },
];

// Disponibilité par médicament/pharmacie (pour la recherche patient)
export const DISPO: Record<string, Dispo[]> = {
  m1: [{ p: 'p1', q: 'En stock', s: 'ok' }, { p: 'p2', q: 'En stock', s: 'ok' }, { p: 'p3', q: 'Stock faible', s: 'low' }],
  m3: [{ p: 'p3', q: 'En stock', s: 'ok' }, { p: 'p1', q: 'Rupture', s: 'out' }, { p: 'p4', q: 'Sur commande', s: 'low' }],
  m4: [{ p: 'p1', q: 'Stock faible', s: 'low' }, { p: 'p5', q: 'En stock', s: 'ok' }],
  m5: [{ p: 'p2', q: 'En stock', s: 'ok' }, { p: 'p4', q: 'En stock', s: 'ok' }, { p: 'p1', q: 'En stock', s: 'ok' }],
  m7: [{ p: 'p1', q: 'En stock', s: 'ok' }, { p: 'p3', q: 'Rupture', s: 'out' }],
};

// Stock pharmacien (tableau de bord)
export const STOCK: StockItem[] = [
  { id: 'm1', q: 340, seuil: 120, s: 'ok' },
  { id: 'm2', q: 54, seuil: 80, s: 'low' },
  { id: 'm3', q: 6, seuil: 15, s: 'crit' },
  { id: 'm5', q: 210, seuil: 60, s: 'ok' },
  { id: 'm7', q: 0, seuil: 40, s: 'out' },
  { id: 'm4', q: 28, seuil: 25, s: 'ok' },
];

// Demandes ciblées reçues par le pharmacien (non partage global)
export const DEMANDES: Demande[] = [
  { id: 'd1', med: 'm3', de: 'Hôpital Principal', type: 'Hôpital', qte: '4 ampoules', urgence: 'Critique', quand: 'il y a 12 min', statut: 'new' },
  { id: 'd2', med: 'm7', de: 'Pharmacie Espoir', type: 'Officine', qte: '2 boîtes', urgence: 'Normal', quand: 'il y a 38 min', statut: 'new' },
  { id: 'd3', med: 'm4', de: 'Patient · M. Diop', type: 'Patient', qte: '1 stylo', urgence: 'Élevé', quand: 'il y a 1 h', statut: 'vue' },
];

// Zones critiques (carte santé publique / distributeur)
export const ZONES: ZoneInfo[] = [
  { nom: 'Dakar', x: 28, y: 34, niveau: 'crit', ruptures: 14 },
  { nom: 'Thiès', x: 46, y: 46, niveau: 'crit', ruptures: 9 },
  { nom: 'Saint-Louis', x: 38, y: 18, niveau: 'haute', ruptures: 6 },
  { nom: 'Kaolack', x: 54, y: 62, niveau: 'moyenne', ruptures: 4 },
  { nom: 'Ziguinchor', x: 30, y: 84, niveau: 'basse', ruptures: 2 },
  { nom: 'Tambacounda', x: 78, y: 58, niveau: 'moyenne', ruptures: 3 },
];

// Médicaments en tension (stats)
export const TENSION: Tension[] = [
  { nom: 'Morphine 10mg/ml', pct: 86, delai: '4,2 j' },
  { nom: 'Insuline Glargine', pct: 72, delai: '3,1 j' },
  { nom: 'Amoxicilline 500mg', pct: 54, delai: '2,4 j' },
  { nom: 'Ventoline', pct: 38, delai: '1,8 j' },
  { nom: 'Amlodipine 5mg', pct: 21, delai: '1,1 j' },
];

// Alertes hôpital internes
export const ALERTES_HOP: AlerteHop[] = [
  { id: 'h1', med: 'Morphine 10mg/ml', service: 'Réanimation', niveau: 'crit', reste: '1 j', quand: 'il y a 5 min' },
  { id: 'h2', med: 'Diazépam 10mg', service: 'Urgences', niveau: 'haute', reste: '2 j', quand: 'il y a 22 min' },
  { id: 'h3', med: 'Insuline Glargine', service: 'Endocrinologie', niveau: 'moyenne', reste: '4 j', quand: 'il y a 1 h' },
];

export const medById = (id: string): Med => MEDS.find(m => m.id === id) ?? { id, nom: id, dci: '', forme: '', crit: false, cat: '' };
export const phById = (id: string): Pharmacy => PHARMACIES.find(p => p.id === id) ?? { id, nom: id, ville: '', dist: '', tel: '', horaires: '', lat: 0, lng: 0 };

export const ROLES: Role[] = [
  { id: 'patient', label: 'Patient / Accompagnant', icon: 'user', desc: 'Rechercher, localiser et réserver un médicament' },
  { id: 'pharma', label: 'Pharmacien', icon: 'pill', desc: 'Gérer le stock, les alertes et les demandes ciblées' },
  { id: 'distrib', label: 'Distributeur / Grossiste', icon: 'truck', desc: 'Piloter les demandes régionales et la logistique' },
  { id: 'hopital', label: 'Hôpital / Chef de service', icon: 'hospital', desc: 'Alertes internes et suivi des médicaments critiques' },
  { id: 'sante', label: 'Responsable santé publique', icon: 'chart', desc: 'Statistiques nationales et zones en tension' },
];

export const roleById = (id: RoleId): Role => ROLES.find(r => r.id === id) ?? ROLES[0];

/* ---- Navigation par rôle ---- */
export const NAV: Record<RoleId, NavItem[]> = {
  patient: [
    { id: 'search', label: 'Rechercher', icon: 'search' },
    { id: 'resa', label: 'Mes réservations', icon: 'cart', badge: 0 },
    { id: 'phar', label: 'Pharmacies', icon: 'pin' },
    { id: 'profil', label: 'Mon profil', icon: 'user' },
  ],
  pharma: [
    { id: 'home', label: 'Tableau de bord', icon: 'grid' },
    { id: 'stock', label: 'Gestion de stock', icon: 'box' },
    { id: 'alert', label: 'Alertes de seuil', icon: 'alert', badge: 2 },
    { id: 'dem', label: 'Demandes ciblées', icon: 'mail', badge: 2 },
    { id: 'ordo', label: 'Ordonnances', icon: 'doc' },
    { id: 'grouped', label: 'Alertes groupées', icon: 'layers' },
    { id: 'history', label: 'Historique', icon: 'clock' },
    { id: 'profil', label: 'Officine', icon: 'pill' },
  ],
  distrib: [
    { id: 'home', label: 'Tableau de bord', icon: 'grid' },
    { id: 'reg', label: 'Demandes régionales', icon: 'layers', badge: 4 },
    { id: 'inst', label: 'Institutionnel', icon: 'hospital' },
    { id: 'livraisons', label: 'Livraisons', icon: 'truck' },
    { id: 'zones', label: 'Zones critiques', icon: 'pin' },
    { id: 'prev', label: 'Prévisions', icon: 'trend' },
  ],
  hopital: [
    { id: 'home', label: 'Tableau de bord', icon: 'grid' },
    { id: 'alert', label: 'Alertes internes', icon: 'alert', badge: 3 },
    { id: 'pra', label: 'Commandes PRA', icon: 'truck' },
    { id: 'history', label: 'Historique', icon: 'clock' },
    { id: 'res', label: 'Réseau partenaires', icon: 'link' },
    { id: 'crit', label: 'Médicaments critiques', icon: 'shield' },
  ],
  sante: [
    { id: 'home', label: 'Vue nationale', icon: 'chart' },
    { id: 'zones', label: 'Zones en tension', icon: 'pin' },
    { id: 'tension', label: 'Médicaments en tension', icon: 'trend' },
    { id: 'rapport', label: 'Rapports', icon: 'doc' },
    { id: 'users', label: 'Utilisateurs', icon: 'user' },
    { id: 'structures', label: 'Structures', icon: 'hospital' },
  ],
};

/* ---- Notifications par rôle ---- */
export const NOTIFS: Record<RoleId, Notif[]> = {
  patient: [
    { icon: 'checkC', s: 'ok', t: 'Réservation confirmée', d: 'Morphine 10mg/ml · Pharmacie de la Gare' },
    { icon: 'pin', s: 'info', t: 'Disponibilité mise à jour', d: 'Insuline Glargine disponible à 1,4 km' },
  ],
  pharma: [
    { icon: 'alert', s: 'alert', t: 'Seuil critique atteint', d: 'Morphine 10mg/ml — 6 unités restantes' },
    { icon: 'mail', s: 'info', t: 'Nouvelle demande ciblée', d: 'Hôpital Principal · 4 ampoules' },
    { icon: 'box', s: 'alert', t: 'Rupture de stock', d: 'Amlodipine 5mg — 0 unité' },
  ],
  distrib: [
    { icon: 'trend', s: 'alert', t: 'Tension régionale élevée', d: 'Dakar — Morphine 10mg/ml' },
    { icon: 'layers', s: 'info', t: 'Nouvelle demande régionale', d: 'Thiès · Insuline Glargine' },
  ],
  hopital: [
    { icon: 'alert', s: 'alert', t: 'Alerte Réanimation', d: 'Morphine — 1 jour de stock restant' },
    { icon: 'shield', s: 'alert', t: 'Médicament critique en tension', d: 'Diazépam 10mg · Urgences' },
  ],
  sante: [
    { icon: 'pin', s: 'alert', t: '2 nouvelles zones critiques', d: 'Dakar et Thiès' },
    { icon: 'chart', s: 'info', t: 'Rapport hebdomadaire prêt', d: 'Semaine 23 · à consulter' },
  ],
};

/* ---- Fonctionnalités par cible (site vitrine) ---- */
export const FEATURES: Feature[] = [
  {
    role: 'Patients / Accompagnants', icon: 'user', color: 'green', items: [
      ['search', 'Recherche de médicament', 'Trouvez un traitement par nom ou DCI en quelques secondes.'],
      ['list', 'Points de disponibilité', 'Liste claire des officines qui disposent du médicament.'],
      ['pin', 'Pharmacie la plus proche', "Affichage de l'officine la plus proche qui l'a réellement en stock."],
      ['cart', 'Réservation ou commande', 'Réservez votre médicament et retirez-le sans attente.'],
    ],
  },
  {
    role: 'Pharmaciens', icon: 'pill', color: 'blue', items: [
      ['box', 'Tableau de bord de stock', "Suivez vos quantités et seuils en un coup d'œil."],
      ['alert', 'Alerte de seuil critique', 'Soyez prévenu automatiquement avant la rupture.'],
      ['mail', 'Demandes ciblées', 'Recevez des demandes précises — sans partage global de vos stocks.'],
      ['link', 'Orientation officine', "En cas de rupture, orientez le patient vers une autre pharmacie."],
    ],
  },
  {
    role: 'Distributeurs / Grossistes', icon: 'truck', color: 'blue', items: [
      ['grid', 'Demandes régionales', "Pilotez toutes les demandes d'une zone depuis une seule interface."],
      ['bell', 'Alertes automatiques', "Recevez les signaux de tension dès qu'ils émergent."],
      ['pin', 'Zones critiques', 'Visualisez les territoires en rupture sur une carte.'],
      ['trend', 'Prévisions logistiques', 'Anticipez les besoins et planifiez les réapprovisionnements.'],
    ],
  },
  {
    role: 'Hôpitaux & chefs de service', icon: 'hospital', color: 'blue', items: [
      ['alert', "Système d'alerte interne", 'Déclenchez et recevez des alertes au niveau du service.'],
      ['link', 'Connexion pharmacies/distributeurs', 'Reliez votre établissement à un réseau de partenaires.'],
      ['send', 'Signalement rapide', 'Remontez une rupture en quelques secondes.'],
      ['shield', 'Médicaments critiques', 'Suivi renforcé des produits sensibles (ex. morphine).'],
    ],
  },
];
