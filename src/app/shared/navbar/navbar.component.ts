import { Component, computed, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NgIf ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  isOpen = false;
  menuOpen = signal(false);
  scrolled = signal(false);
  IsMobile: boolean = false;
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
  ) {
    if (Capacitor.isNativePlatform()) {
      this.IsMobile=true
    }
    console.log(this.IsMobile);
    
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
}
