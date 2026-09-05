import { Injectable, inject } from '@angular/core';
import { VersionCheckService } from './version-check.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AppInitService {
  private versionCheckService = inject(VersionCheckService);
  private authService         = inject(AuthService);

  /**
   * Appelé au démarrage de l'application (AppComponent.ngOnInit).
   * Vérifie la version de l'app et synchronise les infos device si connecté.
   */
  async initializeApp(): Promise<void> {
    const appVersion = '1.0.0'; // Version PWA statique — à synchroniser avec package.json si besoin

    // Vérification de version (même si non connecté)
    this.versionCheckService.checkVersion(appVersion).subscribe({
      next: (status) => {
        this.versionCheckService.versionStatus.set(status);
        console.log(`VersionCheck: latest=${status.latestVersion}, hard=${status.needsHardUpdate}, soft=${status.needsSoftUpdate}`);
      },
      error: (err) => console.warn('VersionCheck échoué:', err?.message),
    });

    // Synchroniser device info si connecté
    if (this.authService.isAuthenticated()) {
      this.versionCheckService.updateDeviceInfo(appVersion, undefined).subscribe({
        next: () => console.log(`DeviceInfo synchronisé: version=${appVersion}`),
        error: (err) => console.warn('DeviceInfo sync échoué:', err?.message),
      });
    }
  }
}
