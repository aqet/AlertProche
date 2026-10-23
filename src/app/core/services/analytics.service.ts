import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AnalyticsPeriod,
  AudienceResponse,
  MissionResponse,
} from '../models/tracking.models';

const API = `${environment.apiUrl}/tracking/analytics`;

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private http: HttpClient) {}

  getAudience(period: AnalyticsPeriod = '30d'): Observable<AudienceResponse> {
    return this.http.get<AudienceResponse>(`${API}/audience`, { params: { period } });
  }

  getMission(period: AnalyticsPeriod = '30d'): Observable<MissionResponse> {
    return this.http.get<MissionResponse>(`${API}/mission`, { params: { period } });
  }
}
