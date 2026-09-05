import { Injectable, signal } from '@angular/core';

export type InstallPlatform = 'android' | 'ios' | 'desktop' | 'already-installed';

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  /** Événement natif d'installation PWA (Android/Chrome/Edge) */
  private deferredPrompt: any = null;

  /** Plateforme détectée */
  readonly platform: InstallPlatform = this.detectPlatform();

  /** Contrôle la modale iOS */
  showIosModal = signal(false);

  constructor() {
    // Capturer l'événement beforeinstallprompt (Android/Chrome/Edge)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });
  }

  /**
   * Appelé au clic sur le bouton "Télécharger / Installer".
   * - Android/Desktop : déclenche le prompt natif d'installation PWA
   * - iOS : ouvre la modale d'instructions
   * - Déjà installé : ne fait rien
   */
  async handleInstallClick(): Promise<void> {
    if (this.platform === 'already-installed') return;

    if (this.platform === 'ios') {
      this.showIosModal.set(true);
      return;
    }

    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      return;
    }

    // Fallback desktop sans prompt (navigateur non compatible ou déjà installé)
    this.showIosModal.set(true);
  }

  closeIosModal(): void {
    this.showIosModal.set(false);
  }

  /** Libellé et icône du bouton selon la plateforme */
  get buttonLabel(): string {
    switch (this.platform) {
      case 'ios':             return 'Installer l\'app';
      case 'android':         return 'Installer l\'app';
      case 'already-installed': return 'App installée';
      default:                return 'Installer l\'app';
    }
  }

  get buttonIcon(): string {
    switch (this.platform) {
      case 'ios':   return 'fa-apple';
      case 'android': return 'fa-android';
      default:      return 'fa-download';
    }
  }

  // ── Détection ────────────────────────────────────────────────────

  private detectPlatform(): InstallPlatform {
    const ua = navigator.userAgent.toLowerCase();

    // Déjà installé en standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return 'already-installed';

    // iOS : iPhone, iPad, iPod
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';

    // Android
    if (/android/.test(ua)) return 'android';

    return 'desktop';
  }
}
