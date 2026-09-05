/**
 * AlertProche - SOS Sound Service Worker
 * Enregistré séparément du ngsw-worker.js Angular.
 * Écoute les messages push et force la lecture du son SOS.
 *
 * Ce SW est enregistré avec un scope limité (/sos-sound-scope/)
 * pour ne pas interférer avec le SW Angular principal.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Écoute les messages envoyés depuis l'app Angular
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PLAY_SOS_SOUND') {
    // Relaye aux autres clients si nécessaire
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        if (client.id !== event.source?.id) {
          client.postMessage({ type: 'PLAY_SOS_SOUND', soundUrl: '/sounds/sos-alert.mp3' });
        }
      });
    });
  }
});
