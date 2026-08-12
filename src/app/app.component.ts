import { Component, inject, OnInit, NgZone } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { SosFloatingButtonComponent } from './shared/components/sos-floating-button/sos-floating-button.component';
import { UpdateModalComponent } from './shared/components/update-modal/update-modal.component';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core'
import { App, URLOpenListenerEvent } from '@capacitor/app'
import { NotificationService } from './core/services/notification.service';
import { AppInitService } from './core/services/app-init.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, RouterLink, SosFloatingButtonComponent, UpdateModalComponent],
  template: `
    <app-navbar></app-navbar>
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
  styles: [
    `
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
      .footer-brand i {
        color: var(--color-accent);
      }
      .footer-accent {
        color: var(--color-accent);
      }
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
      .footer-links a:hover {
        color: var(--color-accent);
      }
      .footer-copy {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin: 0;
      }
    `,
  ],
})
export class AppComponent implements OnInit {

  constructor(private notificationService: NotificationService,){}

  private router     = inject(Router);
  private zone       = inject(NgZone);
  private appInit    = inject(AppInitService);

  ngOnInit() {
    this.initDeepLinking();
    this.notificationService.initialiserPush();
    this.appInit.initializeApp();
  }

  initDeepLinking() {
    if (!Capacitor.isNativePlatform()) return;

    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.zone.run(() => {
        try {
          const rawUrl = event.url;
          let path: string | null = null;

          // Schéma custom : alertproche://posts/123  →  /posts/123
          if (rawUrl.startsWith('alertproche://')) {
            path = rawUrl.replace('alertproche:/', '') || '/';
          }
          // Schéma HTTPS : https://alertproche.com/posts/123  →  /posts/123
          else if (rawUrl.startsWith('http')) {
            const url = new URL(rawUrl);
            path = url.pathname + url.search;
          }

          if (path && path !== '/') {
            this.router.navigateByUrl(path);
          }
        } catch (e) {
          console.warn('Deep link parsing error:', e);
        }
      });
    });
  }
}
