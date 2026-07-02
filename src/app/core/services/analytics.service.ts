import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AnalyticsOverview, PageStat, GeoStat,
  DeviceStat, SourceStat, ActivityPoint, AnalyticsPeriod
} from '../models/tracking.models';

const API = `${environment.apiUrl}/tracking/analytics`;

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private http: HttpClient) {}

  getOverview(period: AnalyticsPeriod = '30d'): Observable<AnalyticsOverview> {
    return this.http.get<AnalyticsOverview>(`${API}/overview`, { params: { period } });
  }

  getPages(period: AnalyticsPeriod = '30d'): Observable<PageStat[]> {
    return this.http.get<PageStat[]>(`${API}/pages`, { params: { period } });
  }

  getGeo(period: AnalyticsPeriod = '30d'): Observable<GeoStat[]> {
    return this.http.get<GeoStat[]>(`${API}/geo`, { params: { period } });
  }

  getDevices(period: AnalyticsPeriod = '30d'): Observable<DeviceStat[]> {
    return this.http.get<DeviceStat[]>(`${API}/devices`, { params: { period } });
  }

  getSources(period: AnalyticsPeriod = '30d'): Observable<SourceStat[]> {
    return this.http.get<SourceStat[]>(`${API}/sources`, { params: { period } });
  }

  getActivity(period: AnalyticsPeriod = '30d'): Observable<ActivityPoint[]> {
    return this.http.get<ActivityPoint[]>(`${API}/activity`, { params: { period } });
  }

  getTopPosts(period: AnalyticsPeriod = '30d'): Observable<PageStat[]> {
    return this.http.get<PageStat[]>(`${API}/top-posts`, { params: { period } });
  }
}
