import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Modèles ────────────────────────────────────────────────────────────────

export interface TrustedContact {
  userId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  addedAt: string;
  profile?: { _id: string; pseudo: string; photoUrl?: string; email?: string } | null;
}

export interface PendingInvitation {
  inviterId: string;
  pseudo: string;
  photoUrl?: string;
}

export interface WhoTrustedMe {
  userId: string;
  pseudo: string;
  photoUrl?: string;
}

export interface SosAlert {
  _id: string;
  userId: string;
  location: { type: string; coordinates: [number, number] };
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  threatLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  voiceTranscription?: string;
  respondingContacts?: string[];
  notifiedContacts?: string[];
  resolvedReason?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface SosStatus {
  _id: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  threatLevel?: string;
  voiceTranscription?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  resolvedAt?: string;
  resolvedReason?: string;
  emitter: { _id: string; pseudo: string; photoUrl?: string } | null;
  respondingCount: number;
  respondingContacts: { _id: string; pseudo: string; photoUrl?: string }[];
  isOwner: boolean;
}

export interface SosHistoryItem {
  _id: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  threatLevel?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  resolvedAt?: string;
  resolvedReason?: string;
  respondingCount: number;
  notifiedCount: number;
  emitter: { _id: string; pseudo: string; photoUrl?: string } | null;
  role: 'emitted' | 'responded' | 'received';
}

export interface SosHistory {
  emitted:   SosHistoryItem[];
  responded: SosHistoryItem[];
  received:  SosHistoryItem[];
  total: number;
}

export interface UserSearchResult {
  _id: string;
  pseudo: string;
  photoUrl?: string;
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SosService {
  private readonly API_SOS      = `${environment.apiUrl}/sos`;
  private readonly API_CONTACTS = `${environment.apiUrl}/users/trusted-contacts`;
  private readonly API_SEARCH   = `${environment.apiUrl}/auth/users`;

  activeSos = signal<SosAlert | null>(null);

  constructor(private http: HttpClient) {}

  // ══ SOS ════════════════════════════════════════════════════════════════

  trigger(payload: {
    latitude: number;
    longitude: number;
    voiceTranscription?: string;
    threatLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    audioUrl?: string;
  }): Observable<SosAlert> {
    return this.http.post<SosAlert>(`${this.API_SOS}/trigger`, payload).pipe(
      tap(sos => this.activeSos.set(sos)),
    );
  }

  cancel(sosId: string, reason?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_SOS}/cancel`, { sosId, reason }).pipe(
      tap(() => this.activeSos.set(null)),
    );
  }

  resolve(sosId: string, reason?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_SOS}/resolve`, { sosId, reason }).pipe(
      tap(() => this.activeSos.set(null)),
    );
  }

  updateLocation(sosId: string, latitude: number, longitude: number): Observable<void> {
    return this.http.post<void>(`${this.API_SOS}/update-location`, { sosId, latitude, longitude });
  }

  confirmResponse(sosId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_SOS}/respond/${sosId}`, {});
  }

  lowBattery(sosId: string): Observable<void> {
    return this.http.post<void>(`${this.API_SOS}/low-battery`, { sosId });
  }

  getActiveSos(): Observable<SosAlert | null> {
    return this.http.get<SosAlert | null>(`${this.API_SOS}/active`).pipe(
      tap(sos => this.activeSos.set(sos)),
    );
  }

  getSosStatus(sosId: string): Observable<SosStatus> {
    return this.http.get<SosStatus>(`${this.API_SOS}/${sosId}/status`);
  }

  getHistory(): Observable<SosHistory> {
    return this.http.get<SosHistory>(`${this.API_SOS}/history`);
  }

  // ══ CONTACTS DE CONFIANCE ══════════════════════════════════════════════

  getMyContacts(): Observable<TrustedContact[]> {
    return this.http.get<TrustedContact[]>(this.API_CONTACTS);
  }

  getPendingInvitations(): Observable<PendingInvitation[]> {
    return this.http.get<PendingInvitation[]>(`${this.API_CONTACTS}/pending`);
  }

  /** Utilisateurs qui m'ont ajouté comme personne de confiance */
  getWhoTrustedMe(): Observable<WhoTrustedMe[]> {
    return this.http.get<WhoTrustedMe[]>(`${this.API_CONTACTS}/trusted-by-me`);
  }

  addContact(contactUserId: string): Observable<{ message: string; contact: any }> {
    return this.http.post<{ message: string; contact: any }>(this.API_CONTACTS, { contactUserId });
  }

  respondToInvitation(inviterId: string, action: 'accept' | 'reject'): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.API_CONTACTS}/${inviterId}`, { action });
  }

  removeContact(contactId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_CONTACTS}/${contactId}`);
  }

  /** Se retirer soi-même de la liste d'un autre utilisateur */
  leaveTrustedList(ownerId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_CONTACTS}/leave/${ownerId}`);
  }

  // ══ RECHERCHE UTILISATEUR ══════════════════════════════════════════════

  searchUsers(query: string): Observable<UserSearchResult[]> {
    return this.http.get<UserSearchResult[]>(`${this.API_SEARCH}/search?q=${encodeURIComponent(query)}`);
  }
}
