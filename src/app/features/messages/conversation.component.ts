import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  DirectMessageService,
  ConversationSummary,
  DirectMessage,
} from '../../core/services/direct-message.service';
import { AuthService } from '../../core/services/auth.service';
import { TimeAgoService } from '../../core/services/time-ago.service';

const POLL_INTERVAL_MS = 4_000;

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.css'],
})
export class ConversationComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dm = inject(DirectMessageService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  private timeAgo = inject(TimeAgoService);

  @ViewChild('scrollBox') scrollBox?: ElementRef<HTMLDivElement>;

  conversationId = '';
  peer = signal<ConversationSummary['peer'] | null>(null);
  messages = signal<DirectMessage[]>([]);
  loading = signal(true);
  sending = signal(false);
  error = signal('');

  draft = signal('');

  currentUserId = '';

  /** Curseur `since` (serverNow) pour le polling delta */
  private cursor = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  /** Abonnement aux changements d'`id` dans l'URL */
  private paramSub?: Subscription;
  /** Nombre de messages reçus pendant que la page était ouverte (badge) */
  private pendingUnread = 0;

  ngOnInit(): void {
    this.currentUserId = this.auth.currentUser()?._id ?? '';
    // Abonnement aux changements de paramètre : gère la navigation depuis
    // une notification push ou l'historique sans réinstancier le composant.
    this.paramSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      if (!id) {
        this.router.navigate(['/messages']);
        return;
      }
      if (id === this.conversationId) return;
      this.conversationId = id;
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
    this.stopPolling();
  }

  private load(): void {
    // Réinitialise l'état lors d'un changement de conversation
    this.stopPolling();
    this.messages.set([]);
    this.loading.set(true);
    this.error.set('');
    this.cursor = '';
    this.pendingUnread = 0;
    this.peer.set(null);

    // Identifiant figé : évite qu'une réponse en vol d'une ancienne
    // conversation écrase l'état de la nouvelle.
    const convId = this.conversationId;

    // Informations de l'interlocuteur via l'inbox (1 requête, 0 préférence)
    this.dm.getConversations().subscribe({
      next: (convs) => {
        if (convId !== this.conversationId) return;
        const conv = convs.find((c) => c._id === convId);
        if (conv) this.peer.set(conv.peer);
      },
      error: () => {},
    });

    // Chargement initial
    this.dm.getMessages(convId).subscribe({
      next: (page) => {
        if (convId !== this.conversationId) return;
        this.messages.set([...page.messages].sort(byCreatedAt));
        this.cursor = page.serverNow;
        this.loading.set(false);
        this.markConversationRead();
        setTimeout(() => this.scrollToBottom(true), 50);
      },
      error: () => {
        if (convId !== this.conversationId) return;
        this.error.set(this.translate.instant('CHAT.ERROR_LOAD'));
        this.loading.set(false);
      },
    });

    this.startPolling();
  }

  // ── Polling ─────────────────────────────────────────────────────────

  private startPolling(): void {
    if (this.pollTimer !== null) return;
    this.pollTimer = setInterval(() => {
      // Pause quand l'onglet est masqué
      if (document.visibilityState !== 'visible') return;

      const convId = this.conversationId;
      this.dm.getMessages(convId, this.cursor).subscribe({
        next: (page) => {
          if (convId !== this.conversationId) return; // navigation intervenue
          this.cursor = page.serverNow;
          if (page.messages.length === 0) return;

          const wasAtBottom = this.isAtBottom();
          this.mergeMessages(page.messages);
          this.pendingUnread += page.messages.length;

          if (wasAtBottom) {
            setTimeout(() => this.scrollToBottom(true), 30);
            this.markConversationRead();
          }
        },
        error: () => {}, // erreurs transitoires : on réessaiera au prochain tick
      });
    }, POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ── Envoi ───────────────────────────────────────────────────────────

  send(): void {
    const text = this.draft().trim();
    if (!text || this.sending()) return;

    this.sending.set(true);
    this.error.set('');

    this.dm.sendMessage(this.conversationId, text).subscribe({
      next: (message) => {
        this.mergeMessages([message]);
        this.draft.set('');
        this.sending.set(false);
        this.markConversationRead();
        setTimeout(() => this.scrollToBottom(true), 30);
      },
      error: (err) => {
        // 422 = modération, 429 = rate-limit, 400 = validation (message = string[])
        const raw = err?.error?.message;
        const msg = Array.isArray(raw) ? raw.join(' · ') : raw;
        this.error.set(
          typeof msg === 'string' && msg
            ? msg
            : this.translate.instant('CHAT.ERROR_SEND'),
        );
        this.sending.set(false);
      },
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private mergeMessages(incoming: DirectMessage[]): void {
    this.messages.update((existing) => {
      const map = new Map(existing.map((m) => [m._id, m]));
      // L'état serveur fait foi : un message déjà connu est remplacé pour
      // faire remonter ses accusés (reçu / lu) mis à jour par le polling.
      for (const m of incoming) {
        map.set(m._id, m);
      }
      return [...map.values()].sort(byCreatedAt);
    });
  }

  /** Classe CSS de l'accusé (mes messages uniquement) */
  receiptIcon(m: DirectMessage): string {
    if (m.readAt) return 'fa-check-double receipt-read';
    if (m.deliveredAt) return 'fa-check-double receipt-delivered';
    return 'fa-check receipt-sent';
  }

  /** Libellé i18n de l'accusé (tooltip + lecteur d'écran) */
  receiptLabel(m: DirectMessage): string {
    if (m.readAt) return 'CHAT.STATUS_READ';
    if (m.deliveredAt) return 'CHAT.STATUS_DELIVERED';
    return 'CHAT.STATUS_SENT';
  }

  private markConversationRead(): void {
    this.dm.markRead(this.conversationId).subscribe({
      next: (res) => {
        // Rafraîchit le badge si ce marquage a réellement changé quelque chose
        if ((res?.updated ?? 0) > 0 || this.pendingUnread > 0) {
          this.pendingUnread = 0;
          this.dm.fetchUnreadTotal().subscribe({
            next: (r) => this.dm.unreadTotal.set(r.count ?? 0),
            error: () => {},
          });
        }
      },
      error: () => {},
    });
  }

  private isAtBottom(): boolean {
    const el = this.scrollBox?.nativeElement;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }

  private scrollToBottom(force = false): void {
    const el = this.scrollBox?.nativeElement;
    if (!el) return;
    if (force || this.isAtBottom()) {
      el.scrollTop = el.scrollHeight;
    }
  }

  isMine(message: DirectMessage): boolean {
    return message.sender === this.currentUserId;
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getRelativeTime(dateStr: string): string {
    return this.timeAgo.format(dateStr);
  }

  initials(pseudo: string): string {
    return (pseudo || '?').charAt(0).toUpperCase();
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/messages']);
    }
  }
}

function byCreatedAt(a: DirectMessage, b: DirectMessage): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}
