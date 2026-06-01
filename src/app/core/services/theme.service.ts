import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'ap_theme';

  currentTheme = signal<Theme>('dark');

  constructor() {
    this.loadTheme();
  }

  private loadTheme(): void {
    const saved = localStorage.getItem(this.THEME_KEY) as Theme | null;
    const theme = saved || 'light';
    this.applyTheme(theme);
  }

  toggleTheme(): void {
    const next: Theme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    localStorage.setItem(this.THEME_KEY, next);
  }

  private applyTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}
