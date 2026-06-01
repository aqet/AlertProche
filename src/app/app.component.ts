import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, RouterLink],
  template: `
    <app-navbar></app-navbar>
    <router-outlet></router-outlet>
    <footer class="app-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <i class="fas fa-shield-heart"></i>
          <span>Alert<span class="footer-accent">Proche</span></span>
        </div>
        <p class="footer-tagline">Plateforme citoyenne de protection des mineurs au Cameroun.</p>
        <nav class="footer-links">
          <a routerLink="/">Accueil</a>
          <a routerLink="/a-propos">À propos</a>
          <a routerLink="/confidentialite">Confidentialité</a>
          <a routerLink="/auth">Connexion</a>
        </nav>
        <p class="footer-copy">© 2026 AlertProche — TNIC — Tous droits réservés.</p>
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
    .footer-accent  { color: var(--color-accent); }
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
  `]
})
export class AppComponent {}
