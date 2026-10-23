import { Component, computed, effect, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { DirectMessageService } from '../../core/services/direct-message.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NgIf, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  private el = inject(ElementRef);
  isOpen = false;
  menuOpen = signal(false);
  scrolled = signal(false);

  /**
   * Largeur de la fenêtre, réactive.
   * Sert à n'afficher dans le menu burger que les liens réellement masqués
   * dans la barre (voir les seuils dans navbar.component.css).
   */
  winWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1920);

  /**
   * true sur mobile (largeur ≤ 1000px) OU en mode PWA standalone installée.
   * Contrôle l'affichage de la bottom nav.
   */
  IsMobile = false;

  isAuth = computed(() => this.auth.isAuthenticated());
  user = computed(() => this.auth.currentUser());
  isDark = computed(() => this.theme.currentTheme() === 'dark');
  canModerate = computed(() => {
    const u = this.user();
    return u?.role === 'Moderateur' || u?.role === 'Admin';
  });

  constructor(
    public auth: AuthService,
    public theme: ThemeService,
    public lang: LanguageService,
    public dm: DirectMessageService,
  ) {
    this.checkMobile();

    // Badge "messages non lus" : polling uniquement si connecté
    effect(() => {
      if (this.isAuth()) {
        this.dm.startBadgePolling();
      } else {
        this.dm.stopBadgePolling();
      }
    });
  }

  private checkMobile(): void {
    // PWA installée (standalone ou fullscreen, ou Safari iOS)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true;

    // Bottom nav : PWA installée ET taille smartphone (≤ 768px)
    this.IsMobile = isStandalone && window.innerWidth <= 768;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.winWidth.set(window.innerWidth);
    this.checkMobile();

    // Si la barre repasse en mode bureau, le menu mobile n'a plus de bouton
    // pour le refermer : on le ferme automatiquement.
    const hamburger = (this.el.nativeElement as HTMLElement).querySelector(
      '.hamburger',
    ) as HTMLElement | null;
    if (this.isOpen && hamburger && getComputedStyle(hamburger).display === 'none') {
      this.isOpen = false;
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 20);
  }

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }
  closeMenu() {
    this.isOpen = false;
  }
  logout() {
    this.auth.logout();
    this.closeMenu();
  }

  toggleLang(): void {
    this.lang.setLanguage(this.lang.currentLang() === 'fr' ? 'en' : 'fr');
  }

  /* ── Ce qui reste visible dans la barre, selon la largeur ──────────
     Les seuils doivent rester alignés avec navbar.component.css :
       ≤ 940  : plus aucun lien (ni actions) dans la barre
       ≤ 1120 : plus de liens secondaires (À propos, Avis)
       ≤ 1360 : plus de liens staff (Modération, Admin, Analytics)
       ≤ 1500 : compactage (l'Historique est un lien secondaire)
     Le menu burger n'affiche que ce qui est masqué. */

  /** Les liens de navigation sont-ils visibles dans la barre ? */
  get showNavLinks(): boolean {
    return this.winWidth() > 940;
  }

  /** Les actions de droite (thème, langue, publier, compte) sont-elles visibles ? */
  get showNavActions(): boolean {
    return this.winWidth() > 940;
  }

  /** Les liens staff sont-ils visibles dans la barre ? */
  get showStaffLinks(): boolean {
    return this.winWidth() > 1360;
  }

  /** Les liens secondaires sont-ils visibles dans la barre ? */
  get showSecondaryLinks(): boolean {
    return this.winWidth() > 1120;
  }
}
