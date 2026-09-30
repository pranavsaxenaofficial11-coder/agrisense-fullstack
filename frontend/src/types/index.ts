export interface ZoneInfo {
  id: number;
  zone_code: string;
  name: string;
  crop: string;
  moisture_min: number;
  moisture_max: number;
  current_moisture: number;
  status: string;
}

export interface SensorReading {
  id: number;
  zone: string;
  moisture_pct: number;
  temp_c: number;
  humidity_pct: number;
  sunlight_lux: number;
  npk_n: number;
  npk_p: number;
  npk_k: number;
  timestamp: string;
}

export interface FieldOverviewData {
  ambient_temp: number;
  humidity: number;
  sunlight_lux: number;
  water_tank_level: number;
  pump_running: boolean;
  zones: ZoneInfo[];
  recent_readings: SensorReading[];
  sparkline_moisture: number[];
}

export interface ControlStatus {
  pump_state: boolean;
  auto_mode: boolean;
  manual_override: boolean;
  pump_runtime_minutes: number;
  water_tank_level: number;
  valve_a: boolean;
  valve_b: boolean;
  valve_c: boolean;
  valve_d: boolean;
  flow_rate_lpm: number;
}

export interface MarketListing {
  id: number;
  title: string;
  category: string;
  crop_name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  mandi_benchmark: number;
  quality_grade: string;
  location: string;
  seller_name: string;
  seller_phone: string;
  description?: string;
  is_available: boolean;
  created_at: string;
}

export interface BuyerRequirement {
  id: number;
  buyer_name: string;
  company?: string;
  crop_name: string;
  quantity_needed: number;
  unit: string;
  max_budget_per_unit: number;
  delivery_location: string;
  contact_phone: string;
  urgency: string;
  notes?: string;
  created_at: string;
}

export interface CommunityPost {
  id: number;
  author_name: string;
  author_location: string;
  channel: string;
  title: string;
  content: string;
  upvotes: number;
  replies_count: number;
  created_at: string;
}

export interface DirectMessage {
  id: number;
  sender_email: string;
  recipient_email: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface TransportListing {
  id: number;
  owner_name: string;
  vehicle_type: string;
  capacity: string;
  rate: string;
  location: string;
  phone: string;
  is_available: boolean;
  notes?: string;
  created_at: string;
}

export interface FinanceRecord {
  id: number;
  entry_type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  entry_date: string;
  created_at: string;
}

export interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  top_expense_category: string;
}

export interface CalendarEvent {
  id: number;
  crop_name: string;
  stage: string;
  title: string;
  action_type: string;
  target_date: string;
  is_completed: boolean;
}

export interface GovtScheme {
  id: number;
  name: string;
  short_code: string;
  category: string;
  benefit: string;
  eligibility: string;
  documents: string;
  apply_url: string;
}

export interface ActivityLog {
  id: number;
  level: string;
  category: string;
  message: string;
  timestamp: string;
}

export interface UserProfile {
  id: number;
  uid: string;
  name: string;
  role?: string;
  business_name?: string;
  email: string;
  phone: string;
  state: string;
  district: string;
  village: string;
  farm_size_acres: number;
  primary_crop: string;
  soil_type: string;
  irrigation_system: string;
  points: number;
}

export interface DailyForecast {
  day: string;
  temp_max: number;
  temp_min: number;
  condition: string;
  rain_probability: number;
  advisory: string;
}

export interface WeatherData {
  location: string;
  current_temp: number;
  humidity: number;
  wind_speed_kmh: number;
  uv_index: number;
  rain_risk: string;
  spray_window_status: string;
  forecast: DailyForecast[];
}

export interface FarmReport {
  overall_status: string;
  soil_and_water: string;
  weekly_todo: string[];
  moisture_range: string;
  irrigation_efficiency: string;
  estimated_water_saved_liters: number;
}

export interface CropScanResult {
  diagnosis: string;
  severity: string;
  confidence: number;
  recommended_action: string;
  preventive_measures: string[];
}

export interface UserInspectionData {
  user_profile: UserProfile;
  device_info: {
    device_type: string;
    os: string;
    browser: string;
    ip_address: string;
    user_agent: string;
    last_active_page: string;
    last_seen: string;
  };
  website_usage: {
    features_used: string[];
    total_sessions: number;
    total_activity_events: number;
    preferred_theme: string;
  };
  messages: {
    community_posts: any[];
    direct_messages: any[];
    ai_queries: string[];
  };
}
