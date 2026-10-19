import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  currentLang = signal<'fr' | 'en'>('fr');

  constructor(private translate: TranslateService) {
    const saved = localStorage.getItem('lang') as 'fr' | 'en' | null;
    const browserLang = navigator.language.startsWith('en') ? 'en' : 'fr';
    const lang: 'fr' | 'en' = saved ?? browserLang;
    this.setLanguage(lang);
  }

  setLanguage(lang: 'fr' | 'en'): void {
    this.currentLang.set(lang);
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }

  getSupportedLangs(): string[] {
    return ['fr', 'en'];
  }
}
