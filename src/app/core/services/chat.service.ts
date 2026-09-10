import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatAction {
  type: 'direct_redirect' | 'attach_link';
  route: string;
}

export interface ChatApiResponse {
  text: string;
  action?: ChatAction;
}

export interface ChatHistoryResponse {
  messages: { role: 'user' | 'assistant'; text: string; timestamp: string }[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly API = `${environment.apiUrl}/chat`;
  private http = inject(HttpClient);

  /** Envoie un message (utilisateur connecté, historique persisté) */
  sendMessage(message: string, threadId: string): Observable<ChatApiResponse> {
    return this.http.post<ChatApiResponse>(`${this.API}/message`, { message, threadId });
  }

  /** Récupère l'historique d'une session */
  getHistory(threadId: string): Observable<ChatHistoryResponse> {
    return this.http.get<ChatHistoryResponse>(`${this.API}/history/${threadId}`);
  }

  /** Envoie un message en tant que visiteur non connecté (pas de stockage) */
  sendGuestMessage(message: string, threadId: string): Observable<ChatApiResponse> {
    return this.http.post<ChatApiResponse>(`${this.API}/guest`, { message, threadId });
  }
}
