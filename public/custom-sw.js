/**
 * AlertProche - Custom Service Worker Extension
 * Étend le ngsw-worker.js d'Angular pour gérer les notifications push PWA
 * et déclencher le son SOS lors d'alertes critiques.
 *
 * Ce fichier est importé par ngsw-worker.js via importScripts (configuré dans angular.json).
 */

// ── Réception d'une notification push ─────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'AlertProche', body: event.data.text() } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  const isSos = data.type === 'SOS_TRUSTED' || data.type === 'SOS_PROXIMITY';
  const isCritical = data.threatLevel === 'CRITICAL' || data.threatLevel === 'HIGH';

  const options = {
    body: notification.body || '',
    icon: '/icons/web-app-manifest-192x192.png',
    badge: '/icons/favicon-96x96.png',
    tag: data.sosId || data.postId || 'alertproche',
    renotify: true,
    requireInteraction: isSos,
    vibrate: isSos ? [300, 100, 300, 100, 300] : [200, 100, 200],
    data: { ...data, soundUrl: isSos ? '/sounds/sos-alert.mp3' : null },
    actions: isSos ? [
      { action: 'respond', title: "J'arrive" },
      { action: 'dismiss', title: 'Ignorer' },
    ] : [],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notification.title || 'AlertProche', options),
      // Son SOS : lecture via AudioContext dans le SW si alerte critique
      isSos && isCritical ? playSosSound() : Promise.resolve(),
    ])
  );
});

// ── Lecture du son SOS ─────────────────────────────────────────────────────
async function playSosSound() {
  try {
    // Ouvrir un client existant et lui demander de jouer le son
    // (AudioContext ne fonctionne pas directement dans le SW)
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({ type: 'PLAY_SOS_SOUND', soundUrl: '/sounds/sos-alert.mp3' });
      });
    } else {
      // Aucune fenêtre ouverte — on tente via fetch pour garder le SW éveillé
      // Le son sera joué à l'ouverture de la notification
      console.log('[SW] Aucun client ouvert pour jouer le son SOS.');
    }
  } catch (e) {
    console.warn('[SW] Impossible d\'envoyer le message de son SOS:', e);
  }
}

// ── Clic sur la notification ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  let targetUrl = '/';

  if (action === 'respond' && data.sosId) {
    targetUrl = `/sos/${data.sosId}`;
  } else if (data.type === 'SOS_TRUSTED' || data.type === 'SOS_PROXIMITY') {
    targetUrl = data.sosId ? `/sos/${data.sosId}` : '/';
  } else if (data.type === 'NEW_POST' && data.postId) {
    targetUrl = `/posts/${data.postId}`;
  } else if (data.type === 'TRUSTED_CONTACT_INVITE' || data.type === 'TRUSTED_CONTACT_RESPONSE') {
    targetUrl = '/dashboard?tab=sos';
  } else if (data.sosId) {
    targetUrl = `/sos/${data.sosId}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Si une fenêtre est déjà ouverte, la focaliser et naviguer
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Sinon ouvrir un nouvel onglet
      return self.clients.openWindow(targetUrl);
    })
  );
});
