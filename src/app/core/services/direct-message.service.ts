import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatPeer {
  userId: string;
  pseudo: string;
  photoUrl: string | null;
}

export interface ConversationSummary {
  _id: string;
  peer: ChatPeer;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
}

export interface DirectMessage {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  /** Accusé de réception : date à laquelle le destinataire a récupéré le message */
  deliveredAt?: string | null;
  /** Accusé de lecture : date à laquelle le destinataire a ouvert la conversation */
  readAt: string | null;
  createdAt: string;
}

export interface MessagesPage {
  messages: DirectMessage[];
  /** Curseur à réutiliser pour le prochain appel `since` */
  serverNow: string;
}

const BADGE_POLL_MS = 45_000;

/**
 * Messagerie directe entre utilisateurs (1:1).
 * ⚠️ Ne pas confondre avec ChatService (= chatbot IA).
 */
@Injectable({ providedIn: 'root' })
export class DirectMessageService {
  private readonly API = `${environment.apiUrl}/messages`;
  private http = inject(HttpClient);

  /** Total des messages non lus (badge navbar) */
  unreadTotal = signal(0);

  private badgeTimer: ReturnType<typeof setInterval> | null = null;
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') this.fetchBadge();
  };

  // ── API ─────────────────────────────────────────────────────────────

  getConversations(): Observable<ConversationSummary[]> {
    return this.http.get<ConversationSummary[]>(`${this.API}/conversations`);
  }

  /** Créer (ou récupérer) la conversation avec un utilisateur */
  startConversation(recipientId: string): Observable<ConversationSummary> {
    return this.http.post<ConversationSummary>(`${this.API}/conversations`, { recipientId });
  }

  /** Messages - avec `since` = polling delta, sans = chargement initial */
  getMessages(conversationId: string, since?: string): Observable<MessagesPage> {
    const url = since
      ? `${this.API}/conversations/${conversationId}/messages?since=${encodeURIComponent(since)}`
      : `${this.API}/conversations/${conversationId}/messages`;
    return this.http.get<MessagesPage>(url);
  }

  sendMessage(conversationId: string, text: string): Observable<DirectMessage> {
    return this.http.post<DirectMessage>(`${this.API}/conversations/${conversationId}/messages`, { text });
  }

  markRead(conversationId: string): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.API}/conversations/${conversationId}/read`, {});
  }

  fetchUnreadTotal(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API}/unread-total`);
  }

  // ── Badge navbar (polling léger) ────────────────────────────────────

  /** Démarre le polling du badge - idempotent, appelé par la navbar. */
  startBadgePolling(): void {
    if (this.badgeTimer !== null) return;
    this.fetchBadge();
    this.badgeTimer = setInterval(() => this.fetchBadge(), BADGE_POLL_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  stopBadgePolling(): void {
    if (this.badgeTimer !== null) {
      clearInterval(this.badgeTimer);
      this.badgeTimer = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.unreadTotal.set(0);
  }

  /** Incrémente le badge localement (message reçu dans une conversation ouverte) */
  incrementUnread(): void {
    this.unreadTotal.update((n) => n + 1);
  }

  private fetchBadge(): void {
    if (document.visibilityState !== 'visible') return;
    this.fetchUnreadTotal().subscribe({
      next: (res) => this.unreadTotal.set(res.count ?? 0),
      error: () => {}, // silencieux : le badge est non bloquant
    });
  }
}
