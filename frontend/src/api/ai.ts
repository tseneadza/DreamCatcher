import { api } from './client';

export interface InsightsResponse {
  dream_insights: string | null;
  goal_insights: string | null;
  sleep_insights: string | null;
  overall_insights: string;
}

export interface AIStatus {
  available: boolean;
  message: string;
}

export const aiApi = {
  async getStatus(): Promise<AIStatus> {
    return api.get<AIStatus>('/ai/status');
  },

  async getInsights(): Promise<InsightsResponse> {
    return api.get<InsightsResponse>('/ai/insights');
  },

  async brainstorm(ideaContent: string, category?: string): Promise<{ suggestions: string }> {
    return api.post('/ai/brainstorm', { idea_content: ideaContent, category });
  },
};
