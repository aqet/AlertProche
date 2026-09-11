import {
  Component, OnInit, OnDestroy, signal, computed, inject, AfterViewInit, NgZone, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FeedService, FeedPost } from '../../core/services/feed.service';
import { AuthService } from '../../core/services/auth.service';
import { CreateFeedPostComponent } from './create-feed-post/create-feed-post.component';
import { environment } from '../../../environments/environment';

const TEXT_TRUNCATE_LIMIT = 280; // caractères avant troncature

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, CreateFeedPostComponent],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css'],
})
export class FeedComponent implements OnInit, OnDestroy, AfterViewInit {
  private feedSvc = inject(FeedService);
  private auth    = inject(AuthService);
  private zone    = inject(NgZone);
  private el      = inject(ElementRef);

  posts        = signal<FeedPost[]>([]);
  loading      = signal(true);
  loadingMore  = signal(false);
  error        = signal('');
  currentPage  = signal(1);
  hasMore      = signal(false);
  deletingId   = signal<string | null>(null);

  isAuth        = computed(() => this.auth.isAuthenticated());
  currentUserId = computed(() => this.auth.currentUser()?._id);

  likedIds = signal<Set<string>>(new Set());

  // ── Lightbox galerie ──────────────────────────────────────────────────
  lightboxItems = signal<{ url: string; type: 'image' | 'video' }[]>([]);
  lightboxIndex = signal(0);
  lightboxOpen  = computed(() => this.lightboxItems().length > 0);

  get lightboxCurrent() {
    const items = this.lightboxItems();
    const idx   = this.lightboxIndex();
    return items[idx] ?? null;
  }

  get lightboxHasPrev(): boolean {
    return this.lightboxIndex() > 0;
  }

  get lightboxHasNext(): boolean {
    return this.lightboxIndex() < this.lightboxItems().length - 1;
  }

  // ── Commentaires inline ───────────────────────────────────────────────
  commentingPostId = signal<string | null>(null);
  commentTexts     = signal<Map<string, string>>(new Map());
  commentsMap      = signal<Map<string, any[]>>(new Map());
  loadingComments  = signal<string | null>(null);

  // ── Texte tronqué : Set des IDs dont le texte est étendu ──────────────
  expandedPosts = signal<Set<string>>(new Set());

  // ── Bouton retour en haut ─────────────────────────────────────────────
  showScrollTop = signal(false);

  private scrollListener: (() => void) | null = null;
  private videoObserver: IntersectionObserver | null = null;

  readonly TEXT_LIMIT = TEXT_TRUNCATE_LIMIT;

  ngOnInit(): void {
    this.loadFeed(1);
    this.setupScrollListeners();
  }

  ngAfterViewInit(): void {
    this.setupVideoAutoplay();
  }

  ngOnDestroy(): void {
    if (this.scrollListener) window.removeEventListener('scroll', this.scrollListener);
    if (this.videoObserver) this.videoObserver.disconnect();
    this.detachKeyboardListener();
  }

  // ── Chargement ──────────────────────────────────────────────────────────

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

        const uid = this.currentUserId();
        if (uid) {
          const newLiked = new Set<string>(
            data.posts.filter(p => p.likedBy?.includes(uid)).map(p => p._id)
          );
          if (page === 1) {
            this.likedIds.set(newLiked);
          } else {
            this.likedIds.update(prev => {
              const merged = new Set(prev);
              newLiked.forEach(id => merged.add(id));
              return merged;
            });
          }
        }

        this.loading.set(false);
        this.loadingMore.set(false);

        // Réattacher l'observer sur les nouvelles vidéos
        setTimeout(() => this.observeVideos(), 100);
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
    setTimeout(() => this.observeVideos(), 100);
  }

  // ── Texte tronqué ────────────────────────────────────────────────────────

  isTextLong(post: FeedPost): boolean {
    return (post.content?.length ?? 0) > TEXT_TRUNCATE_LIMIT;
  }

  isExpanded(postId: string): boolean {
    return this.expandedPosts().has(postId);
  }

  getDisplayText(post: FeedPost): string {
    if (!post.content) return '';
    if (!this.isTextLong(post) || this.isExpanded(post._id)) return post.content;
    return post.content.slice(0, TEXT_TRUNCATE_LIMIT) + '…';
  }

  toggleExpand(postId: string): void {
    this.expandedPosts.update(set => {
      const next = new Set(set);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  // ── Like ────────────────────────────────────────────────────────────────

  toggleLike(post: FeedPost): void {
    if (!this.isAuth()) return;
    const wasLiked = this.likedIds().has(post._id);
    this.likedIds.update(set => {
      const next = new Set(set);
      wasLiked ? next.delete(post._id) : next.add(post._id);
      return next;
    });
    this.posts.update(list =>
      list.map(p => p._id === post._id
        ? { ...p, likesCount: wasLiked ? p.likesCount - 1 : p.likesCount + 1 }
        : p)
    );
    this.feedSvc.toggleLike(post._id).subscribe({
      error: () => {
        this.likedIds.update(set => {
          const next = new Set(set);
          wasLiked ? next.add(post._id) : next.delete(post._id);
          return next;
        });
        this.posts.update(list =>
          list.map(p => p._id === post._id
            ? { ...p, likesCount: wasLiked ? p.likesCount + 1 : p.likesCount - 1 }
            : p)
        );
      },
    });
  }

  isLiked(postId: string): boolean { return this.likedIds().has(postId); }

  // ── Suppression ─────────────────────────────────────────────────────────

  confirmDelete(postId: string): void { this.deletingId.set(postId); }
  cancelDelete(): void { this.deletingId.set(null); }

  deletePost(postId: string): void {
    this.feedSvc.deletePost(postId).subscribe({
      next: () => { this.posts.update(p => p.filter(post => post._id !== postId)); this.deletingId.set(null); },
      error: () => this.deletingId.set(null),
    });
  }

  canDelete(post: FeedPost): boolean {
    const uid = this.currentUserId();
    const role = this.auth.currentUser()?.role;
    return uid === post.author.userId || role === 'Admin' || role === 'Moderateur';
  }

  // ── Partage ──────────────────────────────────────────────────────────────

  sharePost(post: FeedPost): void {
    // URL OG backend — crawlée par WhatsApp, Telegram, iMessage, etc.
    const apiBase    = environment.apiUrl.replace(/\/api$/, '');
    const shareUrl   = `${apiBase}/share/feed/${post._id}`;
    // URL frontend — destination finale pour les humains
    const frontendUrl = `${window.location.origin}/feed/${post._id}`;

    if (navigator.share) {
      navigator.share({
        title: `${post.author.pseudo} sur AlertProche`,
        text:  post.content?.slice(0, 100) || 'Découvrez cette publication sur AlertProche.',
        url:   shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(frontendUrl).catch(() => {});
      });
    } else {
      navigator.clipboard.writeText(frontendUrl).catch(() => {});
    }
    this.posts.update(list =>
      list.map(p => p._id === post._id ? { ...p, sharesCount: (p.sharesCount ?? 0) + 1 } : p)
    );
    this.feedSvc.incrementShares(post._id).subscribe({ error: () => {} });
  }

  // ── Lightbox galerie ─────────────────────────────────────────────────────

  openLightbox(post: FeedPost, startIndex: number): void {
    // Construire la liste des médias du post avec leur type individuel
    const items = post.mediaUrls.map((url, i) => ({
      url,
      type: this.getMediaType(post, i),
    }));
    this.lightboxItems.set(items);
    this.lightboxIndex.set(startIndex);
    this.pauseAllVideos();
    // Écouter les touches clavier
    this.attachKeyboardListener();
  }

  closeLightbox(): void {
    this.lightboxItems.set([]);
    this.lightboxIndex.set(0);
    this.detachKeyboardListener();
  }

  lightboxPrev(): void {
    if (this.lightboxHasPrev) {
      this.lightboxIndex.update(i => i - 1);
    }
  }

  lightboxNext(): void {
    if (this.lightboxHasNext) {
      this.lightboxIndex.update(i => i + 1);
    }
  }

  private keyboardListener: ((e: KeyboardEvent) => void) | null = null;

  private attachKeyboardListener(): void {
    this.keyboardListener = (e: KeyboardEvent) => {
      this.zone.run(() => {
        if (e.key === 'ArrowLeft')  this.lightboxPrev();
        if (e.key === 'ArrowRight') this.lightboxNext();
        if (e.key === 'Escape')     this.closeLightbox();
      });
    };
    window.addEventListener('keydown', this.keyboardListener);
  }

  private detachKeyboardListener(): void {
    if (this.keyboardListener) {
      window.removeEventListener('keydown', this.keyboardListener);
      this.keyboardListener = null;
    }
  }

  // ── Commentaires inline ──────────────────────────────────────────────────

  openComments(postId: string): void {
    if (this.commentingPostId() === postId) {
      this.commentingPostId.set(null);
    } else {
      this.commentingPostId.set(postId);
      if (!this.commentsMap().has(postId)) {
        this.loadingComments.set(postId);
        this.feedSvc.getComments(postId).subscribe({
          next: (comments) => {
            this.commentsMap.update(m => { const n = new Map(m); n.set(postId, comments); return n; });
            this.loadingComments.set(null);
          },
          error: () => {
            this.commentsMap.update(m => { const n = new Map(m); n.set(postId, []); return n; });
            this.loadingComments.set(null);
          },
        });
      }
    }
  }

  getComments(postId: string): any[] { return this.commentsMap().get(postId) ?? []; }
  closeComments(): void { this.commentingPostId.set(null); }
  getCommentText(postId: string): string { return this.commentTexts().get(postId) ?? ''; }

  setCommentText(postId: string, value: string): void {
    this.commentTexts.update(map => { const n = new Map(map); n.set(postId, value); return n; });
  }

  submitComment(postId: string): void {
    const text = this.getCommentText(postId).trim();
    if (!text || !this.isAuth()) return;
    this.feedSvc.addComment(postId, text).subscribe({
      next: (comment) => {
        this.commentsMap.update(m => {
          const n = new Map(m);
          n.set(postId, [...(n.get(postId) ?? []), comment]);
          return n;
        });
        this.posts.update(list =>
          list.map(p => p._id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)
        );
        this.setCommentText(postId, '');
      },
      error: () => {},
    });
  }

  currentUserInitial = computed(() => {
    const pseudo = this.auth.currentUser()?.pseudo ?? '';
    return pseudo.charAt(0).toUpperCase();
  });

  // ── Autoplay vidéo via IntersectionObserver ───────────────────────────────

  private setupVideoAutoplay(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.videoObserver = new IntersectionObserver(
      (entries) => {
        this.zone.run(() => {
          entries.forEach(entry => {
            const video = entry.target as HTMLVideoElement;
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
              video.muted = true; // obligatoire pour l'autoplay navigateur
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          });
        });
      },
      { threshold: 0.6 } // 60% de la vidéo visible = autoplay
    );

    this.observeVideos();
  }

  private observeVideos(): void {
    if (!this.videoObserver) return;
    const videos = (this.el.nativeElement as HTMLElement).querySelectorAll('video.post-media-video');
    videos.forEach(v => this.videoObserver!.observe(v));
  }

  private pauseAllVideos(): void {
    const videos = (this.el.nativeElement as HTMLElement).querySelectorAll('video.post-media-video');
    videos.forEach((v: any) => v.pause());
  }

  // ── Scroll : infinite scroll + bouton retour en haut ────────────────────

  private setupScrollListeners(): void {
    this.scrollListener = () => {
      const scrollY  = window.scrollY;
      const scrolled = scrollY + window.innerHeight;
      const threshold = document.documentElement.scrollHeight - 300;

      // Infinite scroll
      if (scrolled >= threshold) this.loadMore();

      // Bouton retour en haut : visible après 400px
      this.zone.run(() => this.showScrollTop.set(scrollY > 400));
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Utilitaires ──────────────────────────────────────────────────────────

  getTimeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)      return 'À l\'instant';
    if (diff < 3600)    return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400)   return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 2592000) return `Il y a ${Math.floor(diff / 86400)} j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  trackByPost(_: number, p: FeedPost): string { return p._id; }

  getMediaType(post: FeedPost, index: number): 'image' | 'video' {
    const types = post.mediaFileTypes;
    if (types && types[index]) return types[index] as 'image' | 'video';
    return post.mediaType === 'video' ? 'video' : 'image';
  }
}