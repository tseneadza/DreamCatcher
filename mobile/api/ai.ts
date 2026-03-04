import { api } from './client';
import type {
  InsightsResponse,
  AutoTagResponse,
  PatternAnalysis,
  DreamIdeasResponse,
  DreamExploreResponse,
  GoalAlignmentResponse,
} from './types';

export const aiApi = {
  async getInsights(): Promise<InsightsResponse> {
    return api.get<InsightsResponse>('/ai/insights');
  },

  async brainstorm(ideaContent: string, category?: string): Promise<{ suggestions: string }> {
    return api.post('/ai/brainstorm', { idea_content: ideaContent, category });
  },

  async autoTag(content: string, mood: number): Promise<AutoTagResponse> {
    return api.post<AutoTagResponse>('/ai/auto-tag', { content, mood });
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
