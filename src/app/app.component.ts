import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { SosFloatingButtonComponent } from './shared/components/sos-floating-button/sos-floating-button.component';
import { UpdateModalComponent } from './shared/components/update-modal/update-modal.component';
import { PermissionBannerComponent } from './shared/components/permission-banner/permission-banner.component';
import { PermissionService } from './core/services/permission.service';
import { AppInitService } from './core/services/app-init.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, RouterLink, SosFloatingButtonComponent, UpdateModalComponent, PermissionBannerComponent],
  template: `
    <app-navbar></app-navbar>
    <app-permission-banner></app-permission-banner>
    <router-outlet></router-outlet>
    <app-sos-floating-button></app-sos-floating-button>
    <app-update-modal></app-update-modal>
    <footer class="app-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <i class="fas fa-shield-heart"></i>
          <span>Alert<span class="footer-accent">Proche</span></span>
        </div>
        <p class="footer-tagline">
          Plateforme citoyenne de protection des mineurs au Cameroun.
        </p>
        <nav class="footer-links">
          <a routerLink="/">Accueil</a>
          <a routerLink="/a-propos">À propos</a>
          <a routerLink="/confidentialite">Confidentialité</a>
          <a routerLink="/auth">Connexion</a>
        </nav>
        <p class="footer-copy">
          © 2026 AlertProche - TNIC - Tous droits réservés.
        </p>
      </div>
    </footer>
  `,
  styles: [`
    .app-footer {
      background: var(--color-bg-secondary);
      border-top: 1px solid var(--color-border);
      padding: 40px 24px;
      text-align: center;
    }
    .footer-inner {
      max-width: 600px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--color-text-primary);
    }
    .footer-brand i { color: var(--color-accent); }
    .footer-accent { color: var(--color-accent); }
    .footer-tagline {
      font-size: 0.82rem;
      color: var(--color-text-muted);
      margin: 0;
    }
    .footer-links {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .footer-links a {
      font-size: 0.82rem;
      color: var(--color-text-secondary);
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .footer-links a:hover { color: var(--color-accent); }
    .footer-copy {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin: 0;
    }
  `],
})
export class AppComponent implements OnInit {

  private appInit   = inject(AppInitService);
  private permSvc   = inject(PermissionService);

  ngOnInit() {
    this.applyPwaBodyClass();
    this.appInit.initializeApp();

    // Vérifier l'état des permissions au chargement (sans demander)
    // La bannière s'affichera si une permission manque
    this.permSvc.checkPermissionsOnLoad();
  }

  /** Ajoute 'pwa-standalone' sur <body> si l'app est installée */
  private applyPwaBodyClass(): void {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) document.body.classList.add('pwa-standalone');

    window.matchMedia('(display-mode: standalone)').addEventListener('change', e => {
      document.body.classList.toggle('pwa-standalone', e.matches);
    });
  }
}
