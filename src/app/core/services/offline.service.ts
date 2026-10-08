import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PostType, Post } from '../models/post.model';
import { PostService } from './post.service';

export interface PendingPost {
  tempId: string;
  title: string;
  content: string;
  location: string;
  type: PostType;
  isAnonymous?: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly SAVED_KEY = 'offline_saved_posts';
  private readonly PENDING_KEY = 'offline_pending_posts';

  /** Signal interne pour posts en attente — réactif */
  private _pendingPosts = signal<PendingPost[]>(this.getPendingPosts());

  /** Signal interne pour posts sauvegardés — réactif (fix: isSaved réactif) */
  private _savedPosts = signal<Post[]>(this.loadSavedPosts());

  /** Signal public pour les posts sauvegardés — réactif dans les computed */
  readonly savedPosts = this._savedPosts.asReadonly();

  /** Statut réseau */
  online = signal(navigator.onLine);

  /** Nombre de posts en attente de sync */
  pendingCount = computed(() => this._pendingPosts().length);

  private postService = inject(PostService);

  constructor() {
    window.addEventListener('online', () => {
      this.online.set(true);
      // Synchroniser les posts en attente dès que la connexion revient (centralisé ici)
      this.syncPendingPosts();
    });
    window.addEventListener('offline', () => this.online.set(false));
  }

  // ── Posts sauvegardés hors-ligne (lecture) ──────────────────────

  /** Lit localStorage sans mettre à jour le signal (usage interne à l'init) */
  private loadSavedPosts(): Post[] {
    try {
      return JSON.parse(localStorage.getItem(this.SAVED_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  savePostOffline(post: Post): void {
    const saved = this._savedPosts();
    if (!saved.find(p => p._id === post._id)) {
      const updated = [...saved, post];
      localStorage.setItem(this.SAVED_KEY, JSON.stringify(updated));
      this._savedPosts.set(updated);
    }
  }

  getSavedPosts(): Post[] {
    return this._savedPosts();
  }

  removeSavedPost(postId: string): void {
    const updated = this._savedPosts().filter(p => p._id !== postId);
    localStorage.setItem(this.SAVED_KEY, JSON.stringify(updated));
    this._savedPosts.set(updated);
  }

  isPostSaved(postId: string): boolean {
    return this._savedPosts().some(p => p._id === postId);
  }

  // ── Posts en attente de sync (création hors-ligne) ──────────────

  queuePost(postData: Omit<PendingPost, 'tempId'>): void {
    const pending = this.getPendingPosts();
    const entry: PendingPost = {
      tempId: 'offline_' + Date.now(),
      ...postData,
    };
    pending.push(entry);
    localStorage.setItem(this.PENDING_KEY, JSON.stringify(pending));
    this._pendingPosts.set(pending);
  }

  getPendingPosts(): PendingPost[] {
    try {
      return JSON.parse(localStorage.getItem(this.PENDING_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  removePendingPost(tempId: string): void {
    const updated = this.getPendingPosts().filter(p => p.tempId !== tempId);
    localStorage.setItem(this.PENDING_KEY, JSON.stringify(updated));
    this._pendingPosts.set(updated);
  }

  // ── Synchronisation au retour connexion ────────────────────────

  async syncPendingPosts(): Promise<void> {
    const pending = this.getPendingPosts();
    for (const post of pending) {
      try {
        await firstValueFrom(
          this.postService.createPost({
            title: post.title,
            content: post.content,
            location: post.location,
            type: post.type,
            isAnonymous: post.isAnonymous,
          })
        );
        this.removePendingPost(post.tempId);
      } catch {
        // Silencieux : sera retenté à la prochaine reconnexion
      }
    }
  }
}
