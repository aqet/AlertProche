import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export type RecordingState = 'idle' | 'recording' | 'processing';

@Injectable({ providedIn: 'root' })
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;

  /** true si on tourne sur un appareil natif Capacitor (Android/iOS) */
  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Démarre l'enregistrement audio.
   * - Native  : utilise @capacitor-community/voice-recorder
   * - Web     : utilise MediaRecorder (API HTML5)
   */
  async startRecording(): Promise<void> {
    if (this.isNative) {
      await this.startNative();
    } else {
      await this.startWeb();
    }
  }

  /**
   * Arrête l'enregistrement et retourne le Blob audio.
   * Le Blob est en mémoire uniquement — aucun fichier créé sur le disque.
   */
  async stopRecording(): Promise<Blob> {
    if (this.isNative) {
      return this.stopNative();
    } else {
      return this.stopWeb();
    }
  }

  /** Annule un enregistrement en cours sans retourner de données */
  async cancelRecording(): Promise<void> {
    if (this.isNative) {
      try {
        const { VoiceRecorder } = await import('capacitor-voice-recorder');
        await VoiceRecorder.stopRecording();
      } catch { /* ignore */ }
    } else {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.releaseMic();
    }
    this.chunks = [];
  }

  // ── Implémentation Web (MediaRecorder) ────────────────────────────

  private async startWeb(): Promise<void> {
    this.chunks = [];

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Accès au microphone refusé. Veuillez autoriser le microphone dans les paramètres de votre navigateur.');
      }
      throw new Error('Impossible d\'accéder au microphone.');
    }

    // Choisir le format le mieux supporté par le navigateur
    const mimeType = this.getBestMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.start(250); // Slice toutes les 250ms pour avoir des chunks réguliers
  }

  private stopWeb(): Promise<Blob> {
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

      this.mediaRecorder.onerror = (e: Event) => {
        this.releaseMic();
        reject(new Error('Erreur lors de l\'arrêt de l\'enregistrement.'));
      };

      this.mediaRecorder.stop();
    });
  }

  private releaseMic(): void {
    this.stream?.getTracks().forEach(track => track.stop());
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

  // ── Implémentation Native (Capacitor) ─────────────────────────────

  private async startNative(): Promise<void> {
    try {
      const { VoiceRecorder } = await import('capacitor-voice-recorder');

      const permResult = await VoiceRecorder.requestAudioRecordingPermission();
      if (!permResult.value) {
        throw new Error('Permission microphone refusée.');
      }

      await VoiceRecorder.startRecording();
    } catch (err: any) {
      throw new Error(err?.message || 'Impossible de démarrer l\'enregistrement natif.');
    }
  }

  private async stopNative(): Promise<Blob> {
    try {
      const { VoiceRecorder } = await import('capacitor-voice-recorder');
      const result = await VoiceRecorder.stopRecording();

      // Le plugin retourne un base64 de fichier AAC/M4A
      const base64 = result.value.recordDataBase64;
      if (!base64) throw new Error('Données audio vides reçues du plugin natif.');
      const mimeType = result.value.mimeType || 'audio/aac';
      const byteChars = atob(base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      return new Blob([byteArray], { type: mimeType });
    } catch (err: any) {
      throw new Error(err?.message || 'Impossible d\'arrêter l\'enregistrement natif.');
    }
  }
}
