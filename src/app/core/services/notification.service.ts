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

  storedData = localStorage.getItem('ap_session') || '';
  userId!: string;
  // Injection du HttpClient
  constructor(private http: HttpClient) {}

  async initialiserPush() {
    console.log(this.apiUrl);
    if (this.storedData) {
      try {
        const userId = JSON.parse(this.storedData).user._id;
      } catch (error) {
        console.error('Failed to parse user_session:', error);
        // Handle corrupted state (e.g., clear storage and redirect to login)
      }
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

    // Récupération et envoi du Token au Backend
    PushNotifications.addListener('registration', (token) => {
      console.log('Token FCM : ', token.value);

      // Envoi du token à NestJS
      this.http
        .post(`${this.apiUrl}/api/notifications/save-token`, {
          userId: this.userId, // À remplacer par l'ID de l'utilisateur connecté
          token: token.value,
        })
        .subscribe({
          next: () =>
            console.log('Token sauvegardé avec succès sur le serveur'),
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
