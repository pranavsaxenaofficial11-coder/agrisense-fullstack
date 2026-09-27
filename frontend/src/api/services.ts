import { apiFetch } from './client';
import {
  FieldOverviewData,
  ZoneInfo,
  SensorReading,
  ControlStatus,
  MarketListing,
  BuyerRequirement,
  CommunityPost,
  DirectMessage,
  TransportListing,
  FinanceRecord,
  FinanceSummary,
  CalendarEvent,
  GovtScheme,
  ActivityLog,
  UserProfile,
  WeatherData,
  FarmReport,
  CropScanResult
} from '../types';

export const sensorApi = {
  getOverview: () => apiFetch<FieldOverviewData>('/api/sensors/overview'),
  getZones: () => apiFetch<ZoneInfo[]>('/api/sensors/zones'),
  getHistory: (zone = 'Zone A', limit = 30) => apiFetch<SensorReading[]>(`/api/sensors/history?zone=${zone}&limit=${limit}`),
};

export const controlApi = {
  getStatus: () => apiFetch<ControlStatus>('/api/controls'),
  togglePump: () => apiFetch<ControlStatus>('/api/controls/pump/toggle', { method: 'POST' }),
  updateControls: (update: Partial<ControlStatus>) =>
    apiFetch<ControlStatus>('/api/controls', {
      method: 'PUT',
      body: JSON.stringify(update)
    }),
};

export const marketApi = {
  getListings: (category?: string) =>
    apiFetch<MarketListing[]>(category ? `/api/market?category=${encodeURIComponent(category)}` : '/api/market'),
  createListing: (data: Omit<MarketListing, 'id' | 'created_at'>) =>
    apiFetch<MarketListing>('/api/market', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getRequirements: () => apiFetch<BuyerRequirement[]>('/api/market/requirements'),
  createRequirement: (data: Omit<BuyerRequirement, 'id' | 'created_at'>) =>
    apiFetch<BuyerRequirement>('/api/market/requirements', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
};

export const communityApi = {
  getPosts: (channel?: string) =>
    apiFetch<CommunityPost[]>(channel ? `/api/community/posts?channel=${channel}` : '/api/community/posts'),
  createPost: (data: { author_name: string; author_location: string; channel: string; title: string; content: string }) =>
    apiFetch<CommunityPost>('/api/community/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  upvotePost: (id: number) =>
    apiFetch<CommunityPost>(`/api/community/posts/${id}/upvote`, { method: 'POST' }),
  getMessages: (email?: string) =>
    apiFetch<DirectMessage[]>(email ? `/api/community/messages?email=${encodeURIComponent(email)}` : '/api/community/messages'),
  sendMessage: (data: { sender_email: string; recipient_email: string; sender_name: string; message: string }) =>
    apiFetch<DirectMessage>('/api/community/messages', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
};

export const transportApi = {
  getListings: () => apiFetch<TransportListing[]>('/api/transport'),
  createListing: (data: Omit<TransportListing, 'id' | 'created_at'>) =>
    apiFetch<TransportListing>('/api/transport', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
};

export const financeApi = {
  getRecords: () => apiFetch<FinanceRecord[]>('/api/finance'),
  addRecord: (data: Omit<FinanceRecord, 'id' | 'created_at'>) =>
    apiFetch<FinanceRecord>('/api/finance', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getSummary: () => apiFetch<FinanceSummary>('/api/finance/summary'),
};

export const calendarApi = {
  getEvents: () => apiFetch<CalendarEvent[]>('/api/calendar'),
  addEvent: (data: Omit<CalendarEvent, 'id' | 'is_completed'>) =>
    apiFetch<CalendarEvent>('/api/calendar', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  toggleEvent: (id: number) =>
    apiFetch<CalendarEvent>(`/api/calendar/${id}/toggle`, { method: 'POST' }),
};

export const schemesApi = {
  getSchemes: () => apiFetch<GovtScheme[]>('/api/schemes'),
};

export const userApi = {
  getProfile: () => apiFetch<UserProfile>('/api/user/profile'),
  updateProfile: (data: Partial<UserProfile>) =>
    apiFetch<UserProfile>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
};

export const weatherApi = {
  getWeather: (lat = 30.83, lon = 76.19) =>
    apiFetch<WeatherData>(`/api/weather?lat=${lat}&lon=${lon}`),
};

export const logsApi = {
  getLogs: (limit = 50) => apiFetch<ActivityLog[]>(`/api/logs?limit=${limit}`),
};

export const aiApi = {
  chat: (messages: { role: string; content: string }[], crop = 'Tomato') =>
    apiFetch<{ reply: string; model: string; suggested_actions: string[] }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, crop })
    }),
  getReport: (crop = 'Tomato') =>
    apiFetch<FarmReport>('/api/ai/report', {
      method: 'POST',
      body: JSON.stringify({ crop })
    }),
  scanCrop: (imageBase64: string, crop = 'Tomato') =>
    apiFetch<CropScanResult>('/api/ai/scan', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64, crop })
    }),
};
