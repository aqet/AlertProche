import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Remplace par l'URL de ton backend NestJS
  private apiUrl = `${environment.apiUrl}`;
  // private apiUrl = 'http://localhost:3000/';

  private readonly sessionKey = 'ap_session';

  constructor(private http: HttpClient) {}

  private getSession(): { token: string; user: { _id: string } } | null {
    try {
      const storedData = localStorage.getItem(this.sessionKey);
      if (!storedData) return null;
      const parsed = JSON.parse(storedData);
      return parsed?.token && parsed?.user?._id ? parsed : null;
    } catch (error) {
      console.error('Failed to parse ap_session:', error);
      return null;
    }
  }

  async initialiserPush() {
    const session = this.getSession();
    if (!session) {
      console.warn('Aucun utilisateur authentifié trouvé, enregistrement FCM ignoré.');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let permStatus = await PushNotifications.requestPermissions();

    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
    } else {
      console.error('Permission refusée');
      return;
    }

    PushNotifications.addListener('registration', (token) => {
      console.log('Token FCM : ', token.value);

      this.http
        .post(
          `${this.apiUrl}/auth/fcm-token`,
          { token: token.value },
          { headers: { Authorization: `Bearer ${session.token}` } },
        )
        .subscribe({
          next: (response: any) => {
            console.log('Token sauvegardé avec succès sur le serveur', response);
            if (!response?.token?.length) {
              console.warn('Réponse serveur reçue, mais aucun token enregistré retourné.');
            }
          },
          error: (err) =>
            console.error('Erreur lors de la sauvegarde du token', err),
        });
    });

    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('Notification reçue : ', notification);
      },
    );
  }
}
