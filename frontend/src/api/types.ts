export interface User {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  timezone: string | null;
  theme_preference: string;
  notification_preferences: Record<string, boolean>;
  dream_reminder_time: string | null;
  sleep_reminder_time: string | null;
  age_bracket: string | null;
  gender_category: string | null;
  region: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface UserUpdate {
  name?: string;
  avatar_url?: string;
  bio?: string;
  timezone?: string;
  theme_preference?: string;
  notification_preferences?: Record<string, boolean>;
  dream_reminder_time?: string;
  sleep_reminder_time?: string;
  age_bracket?: string;
  gender_category?: string;
  region?: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface Dream {
  id: number;
  user_id: number;
  title: string;
  content: string;
  mood: number;
  tags: string[];
  lucidity_level: number;
  emotions: string[];
  characters: string[];
  locations: string[];
  is_recurring: boolean;
  recurring_theme: string | null;
  vividness: number;
  dream_type: string;
  ai_interpretation: string | null;
  goal_id: number | null;
  dream_date: string;
  created_at: string;
  updated_at: string | null;
}

export interface DreamCreate {
  title: string;
  content: string;
  mood?: number;
  tags?: string[];
  dream_date?: string;
  lucidity_level?: number;
  emotions?: string[];
  characters?: string[];
  locations?: string[];
  is_recurring?: boolean;
  recurring_theme?: string | null;
  vividness?: number;
  dream_type?: string;
  goal_id?: number | null;
}

export interface AutoTagRequest {
  content: string;
  mood: number;
}

export interface AutoTagResponse {
  tags: string[];
  emotions: string[];
  characters: string[];
  locations: string[];
  dream_type: string;
}

export interface Goal {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  category: string;
  status: string;
  progress: number;
  priority: number;
  notes: string | null;
  target_date: string | null;
  milestones: { title: string; completed: boolean }[];
  ai_suggestions: string | null;
  dream_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface GoalCreate {
  title: string;
  description?: string;
  category?: string;
  target_date?: string;
  milestones?: { title: string; completed: boolean }[];
  priority?: number;
  notes?: string;
}

export interface Idea {
  id: number;
  user_id: number;
  content: string;
  category: string | null;
  tags: string[];
  priority: number;
  created_at: string;
  updated_at: string | null;
}

export interface IdeaCreate {
  content: string;
  category?: string;
  tags?: string[];
  priority?: number;
}

export interface SleepLog {
  id: number;
  user_id: number;
  dream_id: number | null;
  sleep_time: string;
  wake_time: string;
  quality: number;
  notes: string | null;
  sleep_duration_minutes: number | null;
  sleep_position: string | null;
  pre_sleep_activity: string | null;
  caffeine_intake: boolean;
  exercise_today: boolean;
  stress_level: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface SleepLogCreate {
  sleep_time: string;
  wake_time: string;
  quality?: number;
  notes?: string;
  dream_id?: number;
  sleep_duration_minutes?: number;
  sleep_position?: string;
  pre_sleep_activity?: string;
  caffeine_intake?: boolean;
  exercise_today?: boolean;
  stress_level?: number;
}

export interface SleepStats {
  avg_quality: number;
  avg_duration: number | null;
  total_logs: number;
  quality_trend: { date: string; quality: number }[];
}

export interface SleepCorrelation {
  mood_vs_quality: { date: string; mood: number; quality: number }[];
  duration_vs_vividness: { date: string; duration_minutes: number; vividness: number }[];
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface ConsentTerms {
  version: string;
  text: string;
  data_categories: string[];
}

export interface ConsentResponse {
  id: number;
  consent_version: string;
  status: string;
  consented_at: string;
  revoked_at: string | null;
}

export interface ConsentGrant {
  consent_version: string;
  data_categories: string[];
}

export interface ResearchAggregate {
  groups: { key: string; count: number; avg_mood: number | null; avg_vividness: number | null }[];
  total_events: number;
  suppressed_groups: number;
}

export interface PatternAnalysis {
  recurring_symbols: string[];
  emotional_trends: string[];
  temporal_patterns: string[];
  summary: string;
}

export interface DreamIdea {
  content: string;
  category: string;
  reasoning: string;
}

export interface DreamIdeasResponse {
  ideas: DreamIdea[];
}

export interface DreamExploreResponse {
  answer: string;
  follow_up_questions: string[];
}

export interface GoalAlignmentResponse {
  alignment_score: number;
  analysis: string;
  relevant_themes: string[];
}

export interface SavedFilter {
  id: number;
  name: string;
  entity_type: string;
  filter_config: Record<string, unknown>;
  created_at: string;
}

export interface SavedFilterCreate {
  name: string;
  entity_type: string;
  filter_config: Record<string, unknown>;
}
