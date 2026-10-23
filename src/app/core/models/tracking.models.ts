export type TrafficSource = 'Direct' | 'Organic Search' | 'Social' | 'Referral' | 'Unknown';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type TrackingEventType =
  | 'post_created'
  | 'comment_posted'
  | 'post_reported'
  | 'post_confirmed'
  | 'post_confirmation_removed'
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
  isBot: boolean;
  isStaff: boolean;
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
  isBot: boolean;
  isStaff: boolean;
  timestamp: string; // ISO date
}

// Payload d'un event clé (login, post créé, etc.)
export interface TrackingEventPayload {
  sessionId: string;
  visitorId: string;
  userId?: string;
  type: TrackingEventType;
  metadata?: Record<string, any>;
  isBot: boolean;
  isStaff: boolean;
  timestamp: string;
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '12m' | 'all';
export type AnalyticsTab = 'audience' | 'alerts';
export type AnalyticsGranularity = 'day' | 'month';

export interface AnalyticsSeriesPoint {
  date: string;
  visitors: number;
  sessions: number;
  pageviews: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

export interface CountryItem {
  code: string;
  country: string;
  count: number;
  percentage: number;
}

export interface CityItem {
  city: string;
  country: string;
  count: number;
}

export interface PageItem {
  url: string;
  views: number;
}

export interface AudiencePrevious {
  visitors: number;
  sessions: number;
  pageviews: number;
  avgDurationMs: number;
}

export interface AudienceResponse {
  period: AnalyticsPeriod;
  since: string;
  until: string;
  granularity: AnalyticsGranularity;
  kpis: {
    visitors: number;
    sessions: number;
    pageviews: number;
    avgDurationMs: number;
    pagesPerSession: number;
    newVisitors: number;
    returningVisitors: number;
    staffSessions: number;
    botsExcluded: number;
  };
  previous: AudiencePrevious | null;
  series: AnalyticsSeriesPoint[];
  pages: PageItem[];
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  sources: BreakdownItem[];
  countries: CountryItem[];
  localization: { localized: number; total: number; rate: number };
  cities: CityItem[];
}

export interface MissionSeriesPoint {
  date: string;
  published: number;
  resolved: number;
}

export interface MissionPost {
  id: string;
  title: string;
  location: string;
  type: string;
  imageUrl: string | null;
  isResolved: boolean;
  createdAt: string;
  views: number;
}

export interface MissionNoViewPost {
  id: string;
  title: string;
  location: string;
  type: string;
  createdAt: string;
}

export interface MissionResponse {
  period: AnalyticsPeriod;
  since: string;
  until: string;
  live: {
    activeAlerts: number;
    disappearances: number;
    resolvedTotal: number;
    activeNow: number;
    imageSearches24h: number;
  };
  kpis: {
    published: number;
    views: number;
    contacts: number;
    comments: number;
    conversations: number;
    resolved: number;
    medianResolutionHours: number | null;
  };
  previous: {
    published: number;
    views: number;
    contacts: number;
    resolved: number;
  } | null;
  funnel: {
    active: number;
    viewed: number;
    contacted: number;
    resolved: number;
  };
  series: MissionSeriesPoint[];
  topPosts: MissionPost[];
  noViews: MissionNoViewPost[];
  cities: { city: string; count: number }[];
  community: {
    registrations: number;
    previousRegistrations: number | null;
    activeMembers: number;
    messages: number;
    comments: number;
    imageSearches: number;
    reports: number;
  };
}
