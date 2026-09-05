/**
 * AlertProche - Service Worker Wrapper
 * Charge le ngsw-worker.js d'Angular ET ajoute la gestion du son SOS.
 *
 * Enregistré à la place de ngsw-worker.js dans app.config.ts.
 */

// ── Importer le ngsw-worker Angular ───────────────────────────────────────
importScripts('/ngsw-worker.js');

// ── Override du handler push pour forcer le son SOS ───────────────────────
// Note: addEventListener en mode "capture" s'exécute AVANT le handler Angular
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    const payload = event.data.json();
    data = payload.data || payload.notification?.data || {};
  } catch {
    return;
  }

  const isSos = data.type === 'SOS_TRUSTED' || data.type === 'SOS_PROXIMITY';
  if (!isSos) return;

  // Envoyer le message aux fenêtres ouvertes pour jouer le son
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'PLAY_SOS_SOUND', soundUrl: '/sounds/sos-alert.mp3' });
      });
    })
  );
}, true); // true = capture phase, s'exécute avant le listener Angular
