export type TrafficSource = 'Direct' | 'Organic Search' | 'Social' | 'Referral' | 'Unknown';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type TrackingEventType =
  | 'post_created'
  | 'comment_posted'
  | 'post_reported'
  | 'image_search_performed'
  | 'user_login'
  | 'user_registered';

// Payload envoyé au backend pour créer une session
export interface TrackingSessionPayload {
  sessionId: string;
  visitorId: string;
  userId?: string;
  device: DeviceType;
  browser: string;
  os: string;
  entryPage: string;
  trafficSource: TrafficSource;
  isNewVisitor: boolean;
  startedAt: string; // ISO date
}

// Payload d'un pageview (envoyé en batch)
export interface PageviewPayload {
  sessionId: string;
  visitorId: string;
  userId?: string;
  type: 'pageview';  // requis par le DTO backend
  url: string;       // URL normalisée
  duration: number;  // ms passés sur la page
  timestamp: string; // ISO date
}

// Payload d'un event clé (login, post créé, etc.)
export interface TrackingEventPayload {
  sessionId: string;
  visitorId: string;
  userId?: string;
  type: TrackingEventType;
  metadata?: Record<string, any>;
  timestamp: string;
}

// Réponse GET /tracking/analytics/overview
export interface AnalyticsOverview {
  totalSessions: number;
  totalPageviews: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  conversionRate: number;    // %
  activeSessions: number;    // sessions actives dans les 5 dernières minutes
  todaySessions: number;
}

// Réponse GET /tracking/analytics/pages et /top-posts
export interface PageStat {
  url: string;
  views: number;
}

// Réponse GET /tracking/analytics/geo
export interface GeoStat {
  country: string;
  city?: string;
  count: number;
}

// Réponse GET /tracking/analytics/devices
export interface DeviceStat {
  device: DeviceType;
  count: number;
  percentage: number;
}

// Réponse GET /tracking/analytics/sources
export interface SourceStat {
  source: TrafficSource;
  count: number;
  percentage: number;
}

// Réponse GET /tracking/analytics/activity (un point par jour)
export interface ActivityPoint {
  date: string;       // YYYY-MM-DD
  sessions: number;
  pageviews: number;
}

// Type union pour les onglets de la page analytics
export type AnalyticsTab = 'overview' | 'pages' | 'geo' | 'sources' | 'devices';
export type AnalyticsPeriod = '7d' | '30d' | '90d';
