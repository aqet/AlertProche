import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const DB_NAME = 'alertproche_images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

@Injectable({ providedIn: 'root' })
export class ImageStorageService {
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) { resolve(this.db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Saves an image file to IndexedDB.
   * Returns an Observable that emits the internal reference key (e.g. "idb://post_abc123").
   */
  saveImage(postId: string, file: File): Observable<string> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const db = await this.initDB();
          const key = `img_${postId}`;
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put({ id: key, data: reader.result, type: file.type, name: file.name });
          tx.oncomplete = () => {
            observer.next(`idb://${key}`);
            observer.complete();
          };
          tx.onerror = () => {
            // Fallback to base64 inline if IndexedDB fails
            observer.next(reader.result as string);
            observer.complete();
          };
        } catch {
          observer.next(reader.result as string);
          observer.complete();
        }
      };
      reader.onerror = () => {
        observer.next('');
        observer.complete();
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Resolves an image URL:
   * - If it starts with "idb://", fetches from IndexedDB and returns a blob URL
   * - Otherwise returns the URL as-is (base64 or http)
   */
  resolveImageUrl(url: string): Observable<string> {
    return new Observable(observer => {
      if (!url || !url.startsWith('idb://')) {
        observer.next(url);
        observer.complete();
        return;
      }
      const key = url.replace('idb://', '');
      this.initDB().then(db => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result) {
            observer.next(req.result.data as string);
          } else {
            observer.next('');
          }
          observer.complete();
        };
        req.onerror = () => { observer.next(''); observer.complete(); };
      }).catch(() => { observer.next(''); observer.complete(); });
    });
  }

  deleteImage(postId: string): void {
    const key = `img_${postId}`;
    this.initDB().then(db => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    }).catch(() => {});
  }
}
