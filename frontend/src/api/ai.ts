import { api } from './client';
import type { PatternAnalysis, DreamIdeasResponse, DreamExploreResponse, GoalAlignmentResponse } from './types';

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

  async autoTag(content: string, mood: number): Promise<import('./types').AutoTagResponse> {
    return api.post('/ai/auto-tag', { content, mood });
  },

  async getPatterns(days = 30): Promise<PatternAnalysis> {
    return api.get<PatternAnalysis>(`/ai/patterns?days=${days}`);
  },

  async dreamToIdeas(dreamId: number): Promise<DreamIdeasResponse> {
    return api.post<DreamIdeasResponse>('/ai/dream-to-ideas', { dream_id: dreamId });
  },

  async exploreDream(dreamId: number, question: string): Promise<DreamExploreResponse> {
    return api.post<DreamExploreResponse>('/ai/explore', { dream_id: dreamId, question });
  },

  async goalAlignment(goalId: number): Promise<GoalAlignmentResponse> {
    return api.post<GoalAlignmentResponse>('/ai/goal-alignment', { goal_id: goalId });
  },
};
