import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PostType, Post, CreatePostDto } from '../models/post.model';
import { PostService } from './post.service';
import { FeedService } from './feed.service';
import { OfflineDbService } from './offline-db.service';

export type QueueKind = 'case' | 'feed';
export type QueueStatus = 'pending' | 'syncing' | 'failed';

/** Métadonnées communes à toute entrée de la file d'attente */
export interface PendingQueueMeta {
  status: QueueStatus;
  /** Nombre d'échecs cumulés (aide au diagnostic) */
  attempts: number;
  error?: string;
}

/** Publication "cas" (formulaire /posts/new) — optionnellement avec une image */
export interface PendingCasePost extends PendingQueueMeta {
  tempId: string;
  kind: 'case';
  title: string;
  content: string;
  location: string;
  type: PostType;
  isAnonymous?: boolean;
  /** Stockée en IndexedDB, envoyée à la reconnexion */
  image?: File;
  createdAt: string;
}

/** Publication de flux (composant feed) — avec médias optionnels */
export interface PendingFeedPost extends PendingQueueMeta {
  tempId: string;
  kind: 'feed';
  content: string;
  location?: string;
  /** Stockés en IndexedDB, envoyés à la reconnexion */
  media: File[];
  createdAt: string;
}

export type PendingPost = PendingCasePost | PendingFeedPost;

@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly SAVED_KEY = 'offline_saved_posts';

  /** File d'attente — réactive (chargée depuis IndexedDB à l'init) */
  private _pendingPosts = signal<PendingPost[]>([]);

  /** Posts sauvegardés manuellement — réactif (localStorage, données texte) */
  private _savedPosts = signal<Post[]>(this.loadSavedPosts());

  /** Statut réseau */
  online = signal(navigator.onLine);

  /** Une passe de synchro est en cours */
  syncing = signal(false);

  /** Compteur incrémenté à la fin de chaque passe (permet de rafraîchir les écrans) */
  syncCompleted = signal(0);

  /** Nombre total de publications en attente (badge navbar) */
  pendingCount = computed(() => this._pendingPosts().length);

  /** Publications de flux en attente (affichage optimiste dans le feed) */
  pendingFeedPosts = computed<PendingFeedPost[]>(() =>
    this._pendingPosts().filter((p): p is PendingFeedPost => p.kind === 'feed'),
  );

  /** Publications "cas" en attente */
  pendingCasePosts = computed<PendingCasePost[]>(() =>
    this._pendingPosts().filter((p): p is PendingCasePost => p.kind === 'case'),
  );

  private postService = inject(PostService);
  private feedService = inject(FeedService);
  private db = inject(OfflineDbService);

  constructor() {
    void this.hydrateFromDb();

    window.addEventListener('online', () => {
      this.online.set(true);
      void this.syncPendingPosts();
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

  // ── File d'attente (création hors-ligne) ───────────────────────

  private async hydrateFromDb(): Promise<void> {
    try {
      const items = await this.db.getAll<PendingPost>();
      // Une entrée laissée en "syncing" par un onglet fermé repasse en attente
      const restored = items.map(item =>
        item.status === 'syncing'
          ? ({ ...item, status: 'pending' } as PendingPost)
          : item,
      );
      restored.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      this._pendingPosts.set(restored);

      if (this.online() && restored.length > 0) {
        void this.syncPendingPosts();
      }
    } catch {
      // IndexedDB indisponible : on dégrade sans faire planter l'app
    }
  }

  getPendingPosts(): PendingPost[] {
    return this._pendingPosts();
  }

  async queueCasePost(
    data: Omit<PendingCasePost, 'tempId' | 'kind' | 'status' | 'attempts'>,
  ): Promise<string> {
    const entry: PendingCasePost = {
      tempId: this.newTempId(),
      kind: 'case',
      status: 'pending',
      attempts: 0,
      ...data,
    };
    await this.persist(entry);
    return entry.tempId;
  }

  async queueFeedPost(
    data: Omit<PendingFeedPost, 'tempId' | 'kind' | 'status' | 'attempts'>,
  ): Promise<string> {
    const entry: PendingFeedPost = {
      tempId: this.newTempId(),
      kind: 'feed',
      status: 'pending',
      attempts: 0,
      ...data,
    };
    await this.persist(entry);
    return entry.tempId;
  }

  async removePendingPost(tempId: string): Promise<void> {
    this._pendingPosts.update(list => list.filter(p => p.tempId !== tempId));
    try {
      await this.db.delete(tempId);
    } catch {
      // Best effort : l'entrée est déjà retirée de l'affichage
    }
  }

  /** Repasse une entrée en attente et tente immédiatement l'envoi */
  async retryPending(tempId: string): Promise<void> {
    this.updateEntry(tempId, { status: 'pending', attempts: 0, error: undefined });
    if (this.online()) await this.syncPendingPosts();
  }

  private async persist(entry: PendingPost): Promise<void> {
    // Mise à jour optimiste de l'UI avant l'écriture disque
    this._pendingPosts.update(list => [entry, ...list.filter(p => p.tempId !== entry.tempId)]);
    try {
      await this.db.put(entry);
    } catch {
      this._pendingPosts.update(list => list.filter(p => p.tempId !== entry.tempId));
      throw new Error('INDEXEDDB_UNAVAILABLE');
    }
  }

  private updateEntry(tempId: string, patch: Partial<PendingQueueMeta>): void {
    this._pendingPosts.update(list =>
      list.map(item =>
        item.tempId === tempId ? ({ ...item, ...patch } as PendingPost) : item,
      ),
    );
  }

  private newTempId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ── Synchronisation au retour connexion ────────────────────────

  async syncPendingPosts(): Promise<void> {
    if (this.syncing() || !this.online()) return;

    const queue = this._pendingPosts()
      .filter(p => p.status !== 'failed')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)); // FIFO
    if (queue.length === 0) return;

    this.syncing.set(true);
    try {
      for (const item of queue) {
        if (!this.online()) break;
        const outcome = await this.syncOne(item);
        // Erreur réseau (status 0) : inutile d'échouer sur tous les suivants,
        // la reprise se fera au prochain évènement « online ».
        if (outcome === 'stop') break;
      }
    } finally {
      this.syncing.set(false);
      this.syncCompleted.update(n => n + 1);
    }
  }

  /** Résultat d'un envoi : publié / échec (poursuite) / coupure réseau (arrêt) */
  private async syncOne(item: PendingPost): Promise<'ok' | 'continue' | 'stop'> {
    this.updateEntry(item.tempId, { status: 'syncing' });
    try {
      if (item.kind === 'case') {
        const dto: CreatePostDto = {
          title: item.title,
          content: item.content,
          location: item.location,
          type: item.type,
          isAnonymous: item.isAnonymous,
        };
        await firstValueFrom(this.postService.createPost(dto, item.image));
      } else {
        const formData = new FormData();
        formData.append('content', item.content);
        if (item.location) formData.append('location', item.location);
        (item.media ?? []).forEach(file => formData.append('media', file, file.name));
        await firstValueFrom(this.feedService.createPost(formData));
      }
      await this.removePendingPost(item.tempId);
      return 'ok';
    } catch (err: any) {
      // `status` absent => erreur locale (ex. modération côté client) : réessayer ne sert à rien.
      // HTTP 4xx métier (hors 408/429) : idem. Réseau/5xx => réessayer plus tard.
      const status = err?.status as number | undefined;
      const permanent =
        status === undefined
          ? true
          : status >= 400 && status < 500 && status !== 408 && status !== 429;
      this.updateEntry(item.tempId, {
        status: permanent ? 'failed' : 'pending',
        attempts: item.attempts + 1,
        error: String(err?.error?.message ?? err?.message ?? 'SYNC_ERROR'),
      });
      if (!permanent && status === 0) return 'stop';
      return 'continue';
    }
  }
}
