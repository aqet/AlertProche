import { Injectable } from '@angular/core';

export type RecordingState = 'idle' | 'recording' | 'processing';

/**
 * Service d'enregistrement audio — PWA uniquement (MediaRecorder HTML5).
 * Aucun fichier n'est écrit sur le disque : tout est traité en mémoire.
 */
@Injectable({ providedIn: 'root' })
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;

  /** Démarre la capture micro et l'enregistrement. */
  async startRecording(): Promise<void> {
    this.chunks = [];

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Accès au microphone refusé. Veuillez autoriser le microphone dans les paramètres de votre navigateur.');
      }
      if (err.name === 'NotFoundError') {
        throw new Error('Aucun microphone détecté sur cet appareil.');
      }
      throw new Error('Impossible d\'accéder au microphone.');
    }

    const mimeType = this.getBestMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };

    // Slice toutes les 250ms pour des chunks réguliers
    this.mediaRecorder.start(250);
  }

  /**
   * Arrête l'enregistrement et retourne le Blob audio en mémoire.
   * Le flux micro est libéré immédiatement.
   */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Aucun enregistrement en cours.'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type: mimeType });
        this.chunks = [];
        this.releaseMic();
        resolve(blob);
      };

      this.mediaRecorder.onerror = () => {
        this.releaseMic();
        reject(new Error('Erreur lors de l\'arrêt de l\'enregistrement.'));
      };

      this.mediaRecorder.stop();
    });
  }

  /** Annule l'enregistrement sans retourner de données. */
  cancelRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.chunks = [];
    this.releaseMic();
    return Promise.resolve();
  }

  // ── Privé ─────────────────────────────────────────────────────────

  private releaseMic(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
  }

  private getBestMimeType(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
  }
}
