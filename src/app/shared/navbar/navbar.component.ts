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
    this.checkMobile();
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
}
