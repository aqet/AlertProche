import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppVersionConfig {
  _id?: string;
  latestVersion: string;
  minSupportedVersion: string;
  downloadUrl?: string;
  releaseNotes?: string;
  updatedAt?: string;
}

export interface NotifyPayload {
  customMessage?: string;
  targetVersion?: string;
}

export interface NotifyResult {
  notifiedCount: number;
  failedCount: number;
}

@Injectable({ providedIn: 'root' })
export class VersionAdminService {
  private readonly API = `${environment.apiUrl}/admin/versions`;

  constructor(private http: HttpClient) {}

  /** Récupère la configuration de version actuelle */
  getConfig(): Observable<AppVersionConfig | null> {
    return this.http.get<AppVersionConfig | null>(this.API);
  }

  /** Définit latestVersion + minSupportedVersion */
  setAppVersion(config: AppVersionConfig): Observable<AppVersionConfig> {
    return this.http.post<AppVersionConfig>(this.API, config);
  }

  /** Envoi manuel de notification aux utilisateurs obsolètes */
  sendManualNotification(payload: NotifyPayload): Observable<NotifyResult> {
    return this.http.post<NotifyResult>(`${this.API}/notify`, payload);
  }
}
