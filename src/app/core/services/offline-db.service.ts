import { Injectable } from '@angular/core';

const DB_NAME = 'alertproche-offline';
const DB_VERSION = 1;
const PENDING_STORE = 'pending';

/**
 * Stockage hors-ligne basé sur IndexedDB.
 *
 * Contrairement à localStorage, IndexedDB stocke nativement les objets
 * File/Blob : c'est ce qui permet de mettre en file des publications
 * avec photos/vidéos jusqu'au retour de la connexion.
 */
@Injectable({ providedIn: 'root' })
export class OfflineDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /** IndexedDB est-il utilisable (mode privé / vieux navigateur = non) */
  get available(): boolean {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  }

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    if (!this.available) {
      return Promise.reject(new Error('INDEXEDDB_UNAVAILABLE'));
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          db.createObjectStore(PENDING_STORE, { keyPath: 'tempId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('INDEXEDDB_OPEN_FAILED'));
      request.onblocked = () => reject(new Error('INDEXEDDB_BLOCKED'));
    });

    // Une ouverture en échec ne doit pas bloquer les tentatives suivantes
    this.dbPromise.catch(() => {
      this.dbPromise = null;
    });

    return this.dbPromise;
  }

  /** Liste complète des enregistrements (la clé primaire est `tempId`) */
  async getAll<T>(): Promise<T[]> {
    const db = await this.open();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, 'readonly');
      const request = tx.objectStore(PENDING_STORE).getAll();
      request.onsuccess = () => resolve((request.result ?? []) as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  /** Insère ou remplace un enregistrement (File/Blob inclus) */
  async put<T>(record: T): Promise<void> {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, 'readwrite');
      tx.objectStore(PENDING_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  /** Supprime un enregistrement par sa clé primaire */
  async delete(key: string): Promise<void> {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, 'readwrite');
      tx.objectStore(PENDING_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
