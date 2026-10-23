import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TrustBadge } from '../../../core/models/post.model';

/**
 * Badge de confiance d'un compte.
 *
 * On ne montre JAMAIS le score brut : uniquement un niveau discret
 * (Nouveau / Confirmé / Référence). Le score exact reste visible
 * uniquement dans la console d'administration.
 */
@Component({
  selector: 'app-user-trust-badge',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './user-trust-badge.component.html',
  styleUrls: ['./user-trust-badge.component.css'],
})
export class UserTrustBadgeComponent {
  /** Badge renvoyé par l'API. */
  @Input() badge: TrustBadge = 'none';

  get visible(): boolean {
    return this.badge && this.badge !== 'none';
  }

  get icon(): string {
    switch (this.badge) {
      case 'new': return 'fa-user-clock';
      case 'confirmed': return 'fa-circle-check';
      case 'reference': return 'fa-certificate';
      default: return '';
    }
  }

  get labelKey(): string {
    switch (this.badge) {
      case 'new': return 'TRUST.BADGE_NEW';
      case 'confirmed': return 'TRUST.BADGE_CONFIRMED';
      case 'reference': return 'TRUST.BADGE_REFERENCE';
      default: return '';
    }
  }
}
