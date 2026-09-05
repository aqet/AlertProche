import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

/**
 * Clé publique VAPID pour Web Push (PWA).
 * Chargée depuis le backend via GET /auth/vapid-public-key.
 * Fallback sur environment.vapidPublicKey si disponible.
 */
const VAPID_PUBLIC_KEY = environment.vapidPublicKey ?? '';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = `${environment.apiUrl}`;

  private http   = inject(HttpClient);
  private router = inject(Router);
  private swPush = inject(SwPush);

  private sosSoundAudio: HTMLAudioElement | null = null;

  private getSession(): { token: string; user: { _id: string } } | null {
    try {
      const stored = localStorage.getItem('ap_session');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed?.token && parsed?.user?._id ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Initialise le Push PWA via SwPush.
   * Appeler après que l'utilisateur est connecté.
   */
  async initialiserPush(): Promise<void> {
    if (!this.swPush.isEnabled) {
      console.warn('[Push] SwPush non disponible (dev mode ou SW non enregistré).');
      this.listenSwMessages();
      return;
    }

    const session = this.getSession();

    // ── Récupérer la clé VAPID depuis le backend (ou fallback env) ──────
    let vapidKey = VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      try {
        const res = await firstValueFrom(
          this.http.get<{ key: string | null }>(`${this.apiUrl}/auth/vapid-public-key`)
        );
        vapidKey = res.key ?? '';
      } catch {
        console.warn('[Push] Impossible de charger la clé VAPID depuis le backend.');
      }
    }

    if (!vapidKey) {
      console.warn('[Push] Clé VAPID manquante — notifications Web Push désactivées.');
      this.listenSwMessages();
      return;
    }

    // ── Demande de permission + souscription VAPID ──────────────────────
    try {
      const sub = await this.swPush.requestSubscription({ serverPublicKey: vapidKey });
      if (session) await this.sendSubscriptionToBackend(sub, session.token);
    } catch (err) {
      console.warn('[Push] Permission refusée ou erreur VAPID:', err);
    }

    // ── Écoute des notifications reçues en foreground ───────────────────
    this.swPush.messages.subscribe((msg: any) => {
      console.log('[Push] Message foreground:', msg);
      const data = msg?.data || msg?.notification?.data || {};
      if (data.type === 'SOS_TRUSTED' || data.type === 'SOS_PROXIMITY') {
        if (data.threatLevel === 'CRITICAL' || data.threatLevel === 'HIGH') {
          this.playSosSound();
        }
      }
    });

    // ── Écoute des clics sur notification ──────────────────────────────
    this.swPush.notificationClicks.subscribe(({ action, notification }) => {
      const data = (notification as any).data || {};
      this.handleNotificationClick(action, data);
    });

    // ── Messages depuis le Service Worker custom (son SOS) ──────────────
    this.listenSwMessages();
  }

  /** Envoie la PushSubscription au backend — compatible avec l'endpoint /auth/fcm-token */
  private async sendSubscriptionToBackend(
    sub: PushSubscription,
    jwtToken: string,
  ): Promise<void> {
    // On envoie le JSON complet de la subscription comme "token"
    // Le backend stocke cette valeur dans user.token[]
    // Le backend devra détecter si c'est un objet JSON (Web Push) ou une string (FCM legacy)
    const tokenValue = JSON.stringify(sub);

    this.http
      .post(
        `${this.apiUrl}/auth/fcm-token`,
        { token: tokenValue },
        { headers: { Authorization: `Bearer ${jwtToken}` } },
      )
      .subscribe({
        next: () => console.log('[Push] Subscription Web Push enregistrée.'),
        error: (err) => console.error('[Push] Erreur enregistrement subscription:', err),
      });
  }

  /** Gère la navigation au clic sur une notification */
  private handleNotificationClick(action: string, data: any): void {
    const sosId   = data.sosId;
    const postId  = data.postId;
    const type    = data.type as string;

    if (action === 'respond' && sosId) {
      this.router.navigate(['/sos', sosId]);
      return;
    }

    switch (type) {
      case 'SOS_TRUSTED':
      case 'SOS_PROXIMITY':
      case 'SOS_RESOLVED':
      case 'LOW_BATTERY':
        if (sosId) this.router.navigate(['/sos', sosId]);
        break;
      case 'TRUSTED_CONTACT_INVITE':
      case 'TRUSTED_CONTACT_RESPONSE':
        this.router.navigate(['/dashboard'], { queryParams: { tab: 'sos' } });
        break;
      case 'NEW_POST':
        if (postId) this.router.navigate(['/posts', postId]);
        break;
      default:
        if (sosId) this.router.navigate(['/sos', sosId]);
        break;
    }
  }

  /** Écoute les messages postMessage() depuis le Service Worker custom */
  private listenSwMessages(): void {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PLAY_SOS_SOUND') {
        this.playSosSound();
      }
    });
  }

  /** Joue le son SOS d'urgence */
  playSosSound(): void {
    try {
      if (!this.sosSoundAudio) {
        this.sosSoundAudio = new Audio('/sounds/sos-alert.mp3');
        this.sosSoundAudio.loop = false;
        this.sosSoundAudio.volume = 1.0;
      }
      // Repart depuis le début si déjà en cours
      this.sosSoundAudio.currentTime = 0;
      this.sosSoundAudio.play().catch(err => {
        // Autoplay bloqué par le navigateur — sera joué lors de la prochaine interaction
        console.warn('[Push] Autoplay son SOS bloqué:', err.message);
      });
    } catch (e) {
      console.warn('[Push] Impossible de jouer le son SOS:', e);
    }
  }

  /** Demande la permission Notifications seule (sans VAPID, pour afficher le prompt) */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  }

  /** Demande la permission micro */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // libère immédiatement
      return true;
    } catch {
      return false;
    }
  }
}
