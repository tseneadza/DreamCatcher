export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Dream {
  id: number;
  user_id: number;
  title: string;
  content: string;
  mood: number;
  tags: string[];
  ai_interpretation: string | null;
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
}

export interface Goal {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  category: string;
  status: string;
  progress: number;
  target_date: string | null;
  milestones: { title: string; completed: boolean }[];
  ai_suggestions: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface GoalCreate {
  title: string;
  description?: string;
  category?: string;
  target_date?: string;
  milestones?: { title: string; completed: boolean }[];
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
  created_at: string;
  updated_at: string | null;
}

export interface SleepLogCreate {
  sleep_time: string;
  wake_time: string;
  quality?: number;
  notes?: string;
  dream_id?: number;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface InsightsResponse {
  dream_insights: string | null;
  goal_insights: string | null;
  sleep_insights: string | null;
  overall_insights: string;
}
