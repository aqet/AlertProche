import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = `${environment.apiUrl}`;
  private readonly sessionKey = 'ap_session';

  private http   = inject(HttpClient);
  private router = inject(Router);

  private getSession(): { token: string; user: { _id: string } } | null {
    try {
      const storedData = localStorage.getItem(this.sessionKey);
      if (!storedData) return null;
      const parsed = JSON.parse(storedData);
      return parsed?.token && parsed?.user?._id ? parsed : null;
    } catch {
      return null;
    }
  }

  async initialiserPush() {
    const session = this.getSession();
    if (!session) {
      console.warn('Aucun utilisateur authentifié, enregistrement FCM ignoré.');
      return;
    }

    if (!Capacitor.isNativePlatform()) return;

    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') {
      console.warn('Permission notification refusée.');
      return;
    }

    await PushNotifications.register();

    // ── Enregistrement du token FCM ────────────────────────────────────
    PushNotifications.addListener('registration', (token) => {
      this.http
        .post(
          `${this.apiUrl}/auth/fcm-token`,
          { token: token.value },
          { headers: { Authorization: `Bearer ${session.token}` } },
        )
        .subscribe({
          next: () => console.log('Token FCM enregistré.'),
          error: (err) => console.error('Erreur enregistrement token FCM', err),
        });
    });

    // ── Notification reçue en foreground ──────────────────────────────
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const data = notification.data || {};
      console.log('Notification reçue foreground :', data.type);
      // Le floating button gère lui-même le polling — pas d'action UI supplémentaire ici
    });

    // ── Tap sur une notification (app en background ou fermée) ────────
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data || {};
      const type  = data.type as string;
      const sosId = data.sosId as string;

      console.log('Tap notification :', type, sosId);

      switch (type) {
        // Contact B reçoit le SOS → ouvre la page de réponse
        case 'SOS_TRUSTED':
        case 'SOS_PROXIMITY':
          if (sosId) this.router.navigate(['/sos', sosId]);
          break;

        // Alerte batterie critique → ouvre aussi la page SOS
        case 'LOW_BATTERY':
          if (sosId) this.router.navigate(['/sos', sosId]);
          break;

        // SOS résolu ou annulé → si on est sur la page SOS, elle se rafraîchit seule
        case 'SOS_RESOLVED':
          if (sosId) this.router.navigate(['/sos', sosId]);
          break;

        // Invitation contact de confiance → ouvre le dashboard onglet SOS
        case 'TRUSTED_CONTACT_INVITE':
        case 'TRUSTED_CONTACT_RESPONSE':
          this.router.navigate(['/dashboard'], { queryParams: { tab: 'sos' } });
          break;

        default:
          break;
      }
    });

    // ── Créer le canal Android haute priorité ─────────────────────────
    await this.setupNotificationChannel();
  }

  async setupNotificationChannel() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await PushNotifications.createChannel({
        id: 'alertproche_notifications',
        name: 'Alertes AlertProche',
        description: 'Notifications SOS et alertes urgentes',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
      });
    } catch { /* Canal déjà créé ou non supporté */ }
  }
}
