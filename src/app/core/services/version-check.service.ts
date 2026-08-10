import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VersionCheckResult {
  needsHardUpdate: boolean;
  needsSoftUpdate: boolean;
  latestVersion: string;
  minSupportedVersion: string;
  downloadUrl: string | null;
  releaseNotes: string | null;
}

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
  private readonly API = `${environment.apiUrl}/versions`;

  /** Signal partagé - accessible depuis le composant modal */
  versionStatus = signal<VersionCheckResult | null>(null);

  constructor(private http: HttpClient) {}

  checkVersion(currentVersion: string): Observable<VersionCheckResult> {
    return this.http.get<VersionCheckResult>(
      `${this.API}/check?currentVersion=${encodeURIComponent(currentVersion)}`,
    );
  }

  updateDeviceInfo(appVersion: string, fcmToken?: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/users/device-info`, {
      appVersion,
      ...(fcmToken ? { fcmToken } : {}),
    });
  }
}
