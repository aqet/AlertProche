import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { VersionCheckService } from './version-check.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AppInitService {
  private versionCheckService = inject(VersionCheckService);
  private authService         = inject(AuthService);

  /**
   * Appelé au démarrage de l'application (AppComponent.ngOnInit).
   * Synchronise appVersion + fcmToken avec le backend si l'utilisateur est connecté.
   * Vérifie ensuite la version et met à jour le signal versionStatus.
   */
  async initializeApp(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    let appVersion = '0.0.0';
    let fcmToken: string | undefined;

    // 1. Récupérer la version de l'app via Capacitor
    try {
      const info = await App.getInfo();
      appVersion = info.version;
    } catch (err) {
      console.warn('AppInitService: impossible de lire la version app', err);
    }

    // 2. Récupérer le token FCM (déjà présent en localStorage après initialiserPush())
    try {
      // On tente de lire le token depuis la registration listener (best-effort)
      // Si déjà enregistré via NotificationService, on ne le récupère pas ici pour éviter le doublon
      const existing = localStorage.getItem('fcm_token_cache');
      if (existing) fcmToken = existing;
    } catch { /* ignore */ }

    // 3. Vérification de version (même si non connecté)
    this.versionCheckService.checkVersion(appVersion).subscribe({
      next: (status) => {
        this.versionCheckService.versionStatus.set(status);
        console.log(`VersionCheck: latest=${status.latestVersion}, hard=${status.needsHardUpdate}, soft=${status.needsSoftUpdate}`);
      },
      error: (err) => console.warn('VersionCheck échoué:', err?.message),
    });

    // 4. Synchroniser device info si connecté
    if (this.authService.isAuthenticated()) {
      this.versionCheckService.updateDeviceInfo(appVersion, fcmToken).subscribe({
        next: () => console.log(`DeviceInfo synchronisé: version=${appVersion}`),
        error: (err) => console.warn('DeviceInfo sync échoué:', err?.message),
      });
    }
  }
}
