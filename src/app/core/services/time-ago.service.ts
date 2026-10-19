import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from './language.service';

/**
 * TimeAgoService
 * --------------
 * Formate une date en texte relatif ("il y a 5 min", "5 min ago").
 * Centralise la logique autrefois dupliquée dans plusieurs composants
 * et la rend traduisible (fr / en).
 */
@Injectable({ providedIn: 'root' })
export class TimeAgoService {
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  /** Locale BCP-47 correspondant à la langue courante */
  get locale(): string {
    return this.lang.currentLang() === 'en' ? 'en-GB' : 'fr-FR';
  }

  format(dateStr: string | Date): string {
    if (!dateStr) return '';
    const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diff < 60)     return this.translate.instant('TIME.JUST_NOW');
    if (diff < 3600)   return this.translate.instant('TIME.MINUTES_AGO', { count: Math.floor(diff / 60) });
    if (diff < 86400)  return this.translate.instant('TIME.HOURS_AGO',   { count: Math.floor(diff / 3600) });
    if (diff < 2592000) return this.translate.instant('TIME.DAYS_AGO',   { count: Math.floor(diff / 86400) });

    return date.toLocaleDateString(this.locale);
  }

  /** Date longue et lisible (ex: 16 oct. 2026 / 16 Oct 2026) */
  formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(
      this.locale,
      options ?? { day: '2-digit', month: 'short', year: 'numeric' },
    );
  }
}
