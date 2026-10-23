import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Post } from '../../core/models/post.model';
import { MediaUrlPipe } from '../pipes/media-url.pipe';
import { AlertStatusBadgeComponent } from '../components/alert-status-badge/alert-status-badge.component';
import { UserTrustBadgeComponent } from '../components/user-trust-badge/user-trust-badge.component';
import { TimeAgoService } from '../../core/services/time-ago.service';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { TrackingService } from '../../core/services/tracking.service';

/** Types d'alertes qui peuvent être confirmées par la communauté. */
const CONFIRMABLE_TYPES = ['Disparition', 'Appel à l\'aide'];

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MediaUrlPipe, AlertStatusBadgeComponent, UserTrustBadgeComponent, TranslateModule],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.css']
})
export class PostCardComponent {
  @Input() post!: Post;

  private timeAgo = inject(TimeAgoService);
  private postService = inject(PostService);
  private auth = inject(AuthService);
  private tracking = inject(TrackingService);

  /** Vrai pendant l'appel réseau du vote (évite les doubles clics). */
  voting = false;

  getBadgeClass(): string {
    const map: Record<string, string> = {
      'Disparition': 'badge-disparition',
      'Abus': 'badge-abus',
      'Prevention': 'badge-prevention',
      'Appel à l\'aide': 'badge-appel'
    };
    return map[this.post.type] || '';
  }

  getBadgeIcon(): string {
    const map: Record<string, string> = {
      'Disparition': 'fa-triangle-exclamation',
      'Abus': 'fa-shield-exclamation',
      'Prevention': 'fa-circle-info',
      'Appel à l\'aide': 'fa-hand-holding-heart'
    };
    return map[this.post.type] || 'fa-circle';
  }

  getTimeAgo(dateStr: string): string {
    return this.timeAgo.format(dateStr);
  }

  /* ── Vote de confirmation ───────────────────────────────────────── */

  /** Le type d'alerte se confirme-t-il ? (les abus et la prévention non) */
  get isConfirmable(): boolean {
    return CONFIRMABLE_TYPES.includes(this.post.type);
  }

  /** L'utilisateur est-il connecté ? (sinon le bouton n'est pas proposé) */
  get canConfirm(): boolean {
    return this.isConfirmable && this.auth.isAuthenticated();
  }

  /** L'auteur ne peut pas confirmer sa propre alerte. */
  get isOwnPost(): boolean {
    const uid = this.auth.currentUser()?._id;
    return !!uid && uid === this.post.author_id;
  }

  /**
   * Vote de confirmation. Bascule on/off : un second clic retire le vote.
   * Le clic ne doit PAS ouvrir la fiche de l'alerte (la carte entière est
   * un lien) → on stoppe la propagation.
   */
  confirm(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.canConfirm || this.voting) return;
    if (this.isOwnPost) return;

    this.voting = true;

    this.postService.confirmPost(this.post._id).subscribe({
      next: (res) => {
        this.voting = false;
        this.post.hasConfirmed = res.hasConfirmed;
        this.post.trustVoteCount = res.trustVoteCount;
        this.post.trustedVoteCount = res.trustedVoteCount;
        this.post.communityConfirmed = res.communityConfirmed;
        this.post.viewsCount = res.viewsCount;
        this.post.reportCount = res.reportCount;
        this.post.underReview = res.underReview;
        this.tracking.trackEvent(
          res.hasConfirmed ? 'post_confirmed' : 'post_confirmation_removed',
          { postType: this.post.type },
        );
      },
      error: (err) => {
        this.voting = false;
        // Message discret : le serveur explique (compte trop jeune, auteur…).
        console.warn('Vote de confirmation refusé :', err?.error?.message ?? err);
      },
    });
  }
}
