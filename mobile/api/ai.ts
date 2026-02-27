import { api } from './client';
import type { InsightsResponse } from './types';

export const aiApi = {
  async getInsights(): Promise<InsightsResponse> {
    return api.get<InsightsResponse>('/ai/insights');
  },

  async brainstorm(ideaContent: string, category?: string): Promise<{ suggestions: string }> {
    return api.post('/ai/brainstorm', { idea_content: ideaContent, category });
  },
};
