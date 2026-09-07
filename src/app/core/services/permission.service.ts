import { Injectable, signal, inject } from '@angular/core';
import { NotificationService } from './notification.service';

/**
 * PermissionService
 * -----------------
 * Centralise la gestion des permissions Notifications et Géolocalisation.
 *
 * Règles :
 *  - Les demandes de permission doivent TOUJOURS être déclenchées par un
 *    geste utilisateur (clic) — jamais automatiquement au chargement.
 *  - iOS/Safari : les Web Push ne fonctionnent qu'en mode PWA standalone
 *    (l'app doit être installée via "Ajouter à l'écran d'accueil").
 *  - On affiche une bannière persistante tant qu'une permission est manquante.
 *  - On re-demande à chaque chargement si la permission est encore 'default'
 *    (jamais demandée), mais jamais si elle est 'denied' (bloquer = respect de
 *    la décision de l'utilisateur, on affiche un message guide).
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private notifSvc = inject(NotificationService);

  // ── État des permissions ───────────────────────────────────────────────
  notificationStatus  = signal<NotificationPermission | 'unsupported' | 'needs-pwa'>('default');
  geolocationStatus   = signal<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  showBanner          = signal(false);
  isRequesting        = signal(false);

  // ── Détection contexte ─────────────────────────────────────────────────
  readonly isIos: boolean = /iphone|ipad|ipod/i.test(navigator.userAgent);
  readonly isSafari: boolean = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  readonly isPwa: boolean =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true;

  /**
   * Appelé au chargement de l'app (AppComponent.ngOnInit).
   * Lit l'état actuel des permissions et affiche la bannière si nécessaire.
   * NE déclenche AUCUNE demande de permission ici.
   */
  async checkPermissionsOnLoad(): Promise<void> {
    await Promise.all([
      this.refreshNotificationStatus(),
      this.refreshGeolocationStatus(),
    ]);
    this.updateBannerVisibility();
  }

  /**
   * Appelé UNIQUEMENT depuis un gestionnaire de clic (geste utilisateur).
   * Demande les deux permissions manquantes l'une après l'autre.
   */
  async requestAllPermissions(): Promise<void> {
    if (this.isRequesting()) return;
    this.isRequesting.set(true);

    try {
      await this.requestNotifications();
      await this.requestGeolocation();
    } finally {
      this.isRequesting.set(false);
      this.updateBannerVisibility();
    }
  }

  /**
   * Demande la permission de notifications.
   * Gère les cas iOS PWA vs navigateur normal.
   */
  async requestNotifications(): Promise<void> {
    // iOS Safari hors PWA : impossible d'avoir des push → on guide
    if (this.isIos && !this.isPwa) {
      this.notificationStatus.set('needs-pwa');
      return;
    }

    // Pas de support API Notification
    if (!('Notification' in window)) {
      this.notificationStatus.set('unsupported');
      return;
    }

    // Déjà accordé → initialiser Push directement
    if (Notification.permission === 'granted') {
      this.notificationStatus.set('granted');
      await this.notifSvc.initialiserPush();
      return;
    }

    // Déjà refusé → ne pas redemander (le navigateur ignore de toute façon)
    if (Notification.permission === 'denied') {
      this.notificationStatus.set('denied');
      return;
    }

    // 'default' → demander (on est dans un geste utilisateur)
    try {
      const result = await Notification.requestPermission();
      this.notificationStatus.set(result);
      if (result === 'granted') {
        // Précharger le son (on est dans un geste utilisateur)
        this.notifSvc.preloadSosSound();
        await this.notifSvc.initialiserPush();
      }
    } catch (err) {
      console.warn('[Permissions] Erreur requestPermission:', err);
      this.notificationStatus.set('denied');
    }
  }

  /**
   * Demande la permission de géolocalisation.
   */
  async requestGeolocation(): Promise<void> {
    if (!('geolocation' in navigator)) {
      this.geolocationStatus.set('unsupported');
      return;
    }

    // Vérifier via Permissions API si disponible
    const status = await this.getGeolocationPermissionState();

    if (status === 'granted') {
      this.geolocationStatus.set('granted');
      return;
    }

    if (status === 'denied') {
      this.geolocationStatus.set('denied');
      return;
    }

    // 'prompt' ou inconnu → demander
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10_000,
          enableHighAccuracy: false,
          maximumAge: 60_000,
        });
      });
      this.geolocationStatus.set('granted');
    } catch (err: any) {
      const code = err?.code as number;
      // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
      this.geolocationStatus.set(code === 1 ? 'denied' : 'default');
    }
  }

  // ── Helpers privés ─────────────────────────────────────────────────────

  private async refreshNotificationStatus(): Promise<void> {
    if (this.isIos && !this.isPwa) {
      this.notificationStatus.set('needs-pwa');
      return;
    }
    if (!('Notification' in window)) {
      this.notificationStatus.set('unsupported');
      return;
    }
    const p = Notification.permission;
    this.notificationStatus.set(p);

    // Si déjà accordé, initialiser silencieusement
    if (p === 'granted') {
      await this.notifSvc.initialiserPush();
    }
  }

  private async refreshGeolocationStatus(): Promise<void> {
    if (!('geolocation' in navigator)) {
      this.geolocationStatus.set('unsupported');
      return;
    }
    const state = await this.getGeolocationPermissionState();
    this.geolocationStatus.set(state as any);
  }

  private async getGeolocationPermissionState(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state as 'granted' | 'denied' | 'prompt';
      }
    } catch { /* Permissions API non disponible (iOS < 16) */ }
    return 'prompt';
  }

  private updateBannerVisibility(): void {
    const notif = this.notificationStatus();
    const geo   = this.geolocationStatus();

    const notifMissing = notif === 'default' || notif === 'needs-pwa';
    const geoMissing   = geo === 'default';

    // notifMissing couvre déjà 'needs-pwa', pas besoin de le répéter
    this.showBanner.set(notifMissing || geoMissing);
  }

  /** Libellé court pour la bannière */
  get bannerMessage(): string {
    const notif = this.notificationStatus();
    const geo   = this.geolocationStatus();

    if (notif === 'needs-pwa') {
      return 'Pour recevoir les alertes SOS sur iOS, installez l\'app via Safari → "Sur l\'écran d\'accueil".';
    }
    if (notif === 'denied' && geo === 'denied') {
      return 'Notifications et localisation bloquées. Autorisez-les dans les réglages de votre navigateur.';
    }
    if (notif === 'denied') {
      return 'Notifications bloquées. Autorisez-les dans les réglages pour recevoir les alertes SOS.';
    }
    if (geo === 'denied') {
      return 'Localisation bloquée. Autorisez-la pour que vos contacts puissent vous localiser lors d\'un SOS.';
    }

    const missing: string[] = [];
    if (notif === 'default') missing.push('les notifications');
    if (geo === 'default')   missing.push('la localisation');
    return `Activez ${missing.join(' et ')} pour utiliser AlertProche en toute sécurité.`;
  }

  /** True si la bannière doit afficher un bouton d'action (pas juste un guide) */
  get canRequestFromBanner(): boolean {
    const notif = this.notificationStatus();
    const geo   = this.geolocationStatus();
    return (
      notif === 'default' || geo === 'default'
    ) && notif !== 'needs-pwa';
  }
}
