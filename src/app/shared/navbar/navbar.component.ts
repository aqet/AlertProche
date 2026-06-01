import { Component, computed, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  menuOpen = signal(false);
  scrolled = signal(false);

  isAuth = computed(() => this.auth.isAuthenticated());
  user = computed(() => this.auth.currentUser());
  isDark = computed(() => this.theme.currentTheme() === 'dark');
  canModerate = computed(() => {
    const u = this.user();
    return u?.role === 'Moderateur' || u?.role === 'Admin';
  });

  constructor(public auth: AuthService, public theme: ThemeService) {}

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 20);
  }

  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }
  logout() { this.auth.logout(); this.closeMenu(); }
}
