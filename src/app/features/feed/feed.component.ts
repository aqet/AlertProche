import {
  Component, OnInit, OnDestroy, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FeedService, FeedPost } from '../../core/services/feed.service';
import { AuthService } from '../../core/services/auth.service';
import { CreateFeedPostComponent } from './create-feed-post/create-feed-post.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, CreateFeedPostComponent],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css'],
})
export class FeedComponent implements OnInit, OnDestroy {
  private feedSvc = inject(FeedService);
  private auth    = inject(AuthService);

  posts        = signal<FeedPost[]>([]);
  loading      = signal(true);
  loadingMore  = signal(false);
  error        = signal('');
  currentPage  = signal(1);
  hasMore      = signal(false);
  deletingId   = signal<string | null>(null);

  isAuth        = computed(() => this.auth.isAuthenticated());
  currentUserId = computed(() => this.auth.currentUser()?._id);

  // Set des IDs likés par l'utilisateur courant (pour l'état du bouton)
  likedIds = signal<Set<string>>(new Set());

  // ── Lightbox ────────────────────────────────────────────────────────────
  lightboxUrl  = signal<string | null>(null);
  lightboxType = signal<'image' | 'video'>('image');

  // ── Commentaires inline ───────────────────────────────────────────────
  commentingPostId = signal<string | null>(null);
  commentTexts     = signal<Map<string, string>>(new Map());
  // Commentaires chargés par postId
  commentsMap      = signal<Map<string, any[]>>(new Map());
  loadingComments  = signal<string | null>(null);

  private scrollListener: (() => void) | null = null;

  ngOnInit(): void {
    this.loadFeed(1);
    this.setupInfiniteScroll();
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  // ── Chargement ────────────────────────────────────────────────────────────

  loadFeed(page: number): void {
    if (page === 1) {
      this.loading.set(true);
      this.posts.set([]);
    } else {
      this.loadingMore.set(true);
    }

    this.feedSvc.getFeed(page, 10).subscribe({
      next: (data) => {
        if (page === 1) {
          this.posts.set(data.posts);
        } else {
          this.posts.update(p => [...p, ...data.posts]);
        }
        this.currentPage.set(page);
        this.hasMore.set(data.hasMore);

        // Initialiser / fusionner les likes de l'utilisateur courant
        const uid = this.currentUserId();
        if (uid) {
          const newLiked = new Set<string>(
            data.posts
              .filter(p => p.likedBy?.includes(uid))
              .map(p => p._id)
          );
          if (page === 1) {
            this.likedIds.set(newLiked);
          } else {
            // Fusionner avec les anciens
            this.likedIds.update(prev => {
              const merged = new Set(prev);
              newLiked.forEach(id => merged.add(id));
              return merged;
            });
          }
        }

        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger le fil d\'actualité.');
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadFeed(this.currentPage() + 1);
  }

  onPostCreated(post: FeedPost): void {
    this.posts.update(p => [post, ...p]);
  }

  // ── Like ──────────────────────────────────────────────────────────────────

  toggleLike(post: FeedPost): void {
    if (!this.isAuth()) return;

    // Optimistic update
    const wasLiked = this.likedIds().has(post._id);
    this.likedIds.update(set => {
      const next = new Set(set);
      wasLiked ? next.delete(post._id) : next.add(post._id);
      return next;
    });
    this.posts.update(list =>
      list.map(p =>
        p._id === post._id
          ? { ...p, likesCount: wasLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      )
    );

    this.feedSvc.toggleLike(post._id).subscribe({
      error: () => {
        // Rollback si erreur
        this.likedIds.update(set => {
          const next = new Set(set);
          wasLiked ? next.add(post._id) : next.delete(post._id);
          return next;
        });
        this.posts.update(list =>
          list.map(p =>
            p._id === post._id
              ? { ...p, likesCount: wasLiked ? p.likesCount + 1 : p.likesCount - 1 }
              : p
          )
        );
      },
    });
  }

  isLiked(postId: string): boolean {
    return this.likedIds().has(postId);
  }

  // ── Suppression ───────────────────────────────────────────────────────────

  confirmDelete(postId: string): void {
    this.deletingId.set(postId);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  deletePost(postId: string): void {
    this.feedSvc.deletePost(postId).subscribe({
      next: () => {
        this.posts.update(p => p.filter(post => post._id !== postId));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }

  canDelete(post: FeedPost): boolean {
    const uid = this.currentUserId();
    const role = this.auth.currentUser()?.role;
    return uid === post.author.userId || role === 'Admin' || role === 'Moderateur';
  }

  // ── Partage ───────────────────────────────────────────────────────────────

  sharePost(post: FeedPost): void {
    const url = `${window.location.origin}/feed/${post._id}`;
    if (navigator.share) {
      navigator.share({ title: 'AlertProche', text: post.content, url });
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    // Incrémenter le compteur local et en base
    this.posts.update(list =>
      list.map(p =>
        p._id === post._id
          ? { ...p, sharesCount: (p.sharesCount ?? 0) + 1 }
          : p
      )
    );
    this.feedSvc.incrementShares(post._id).subscribe({ error: () => {} });
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────

  openLightbox(url: string, type: 'image' | 'video'): void {
    this.lightboxUrl.set(url);
    this.lightboxType.set(type);
  }

  closeLightbox(): void {
    this.lightboxUrl.set(null);
  }

  // ── Commentaires inline ───────────────────────────────────────────────────

  openComments(postId: string): void {
    // toggle : ferme si déjà ouvert, sinon ouvre et charge les commentaires
    if (this.commentingPostId() === postId) {
      this.commentingPostId.set(null);
    } else {
      this.commentingPostId.set(postId);
      // Charger les commentaires si pas encore en cache
      if (!this.commentsMap().has(postId)) {
        this.loadingComments.set(postId);
        this.feedSvc.getComments(postId).subscribe({
          next: (comments) => {
            this.commentsMap.update(m => {
              const next = new Map(m);
              next.set(postId, comments);
              return next;
            });
            this.loadingComments.set(null);
          },
          error: () => {
            this.commentsMap.update(m => {
              const next = new Map(m);
              next.set(postId, []);
              return next;
            });
            this.loadingComments.set(null);
          },
        });
      }
    }
  }

  getComments(postId: string): any[] {
    return this.commentsMap().get(postId) ?? [];
  }

  closeComments(): void {
    this.commentingPostId.set(null);
  }

  getCommentText(postId: string): string {
    return this.commentTexts().get(postId) ?? '';
  }

  setCommentText(postId: string, value: string): void {
    this.commentTexts.update(map => {
      const next = new Map(map);
      next.set(postId, value);
      return next;
    });
  }

  submitComment(postId: string): void {
    const text = this.getCommentText(postId).trim();
    if (!text || !this.isAuth()) return;

    this.feedSvc.addComment(postId, text).subscribe({
      next: (comment) => {
        // Ajouter le commentaire dans le cache local
        this.commentsMap.update(m => {
          const next = new Map(m);
          const existing = next.get(postId) ?? [];
          next.set(postId, [...existing, comment]);
          return next;
        });
        // Incrémenter localement
        this.posts.update(list =>
          list.map(p =>
            p._id === postId
              ? { ...p, commentsCount: p.commentsCount + 1 }
              : p
          )
        );
        // Effacer le texte
        this.setCommentText(postId, '');
      },
      error: () => {},
    });
  }

  // Initiale de l'utilisateur courant pour l'avatar de commentaire
  currentUserInitial = computed(() => {
    const pseudo = this.auth.currentUser()?.pseudo ?? '';
    return pseudo.charAt(0).toUpperCase();
  });

  // ── Infinite scroll natif ─────────────────────────────────────────────────

  private setupInfiniteScroll(): void {
    this.scrollListener = () => {
      const scrolled  = window.scrollY + window.innerHeight;
      const threshold = document.documentElement.scrollHeight - 300;
      if (scrolled >= threshold) this.loadMore();
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────

  getTimeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)      return 'À l\'instant';
    if (diff < 3600)    return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400)   return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 2592000) return `Il y a ${Math.floor(diff / 86400)} j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  trackByPost(_: number, p: FeedPost): string { return p._id; }

  /** Retourne le type d'un média à un index donné */
  getMediaType(post: FeedPost, index: number): 'image' | 'video' {
    const types = post.mediaFileTypes;
    if (types && types[index]) return types[index] as 'image' | 'video';
    // Fallback : déduire du mediaType global
    return post.mediaType === 'video' ? 'video' : 'image';
  }
}
