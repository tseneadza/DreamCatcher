import { api } from './client';
import type { Dream, Goal, GoalCreate } from './types';

export const goalsApi = {
  async getAll(params?: {
    status?: string;
    category?: string;
    skip?: number;
    limit?: number;
    q?: string;
    priority_min?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<Goal[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.q) searchParams.set('q', params.q);
    if (params?.priority_min) searchParams.set('priority_min', String(params.priority_min));
    if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params?.sort_order) searchParams.set('sort_order', params.sort_order);
    
    const query = searchParams.toString();
    return api.get<Goal[]>(`/goals/${query ? `?${query}` : ''}`);
  },

  async getById(id: number): Promise<Goal> {
    return api.get<Goal>(`/goals/${id}`);
  },

  async create(data: GoalCreate): Promise<Goal> {
    return api.post<Goal>('/goals/', data);
  },

  async update(id: number, data: Partial<GoalCreate & { status?: string; progress?: number }>): Promise<Goal> {
    return api.put<Goal>(`/goals/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`/goals/${id}`);
  },

  async getCategories(): Promise<string[]> {
    return api.get<string[]>('/goals/categories/list');
  },

  async getStatuses(): Promise<string[]> {
    return api.get<string[]>('/goals/statuses/list');
  },

  async suggest(id: number): Promise<Goal> {
    return api.post<Goal>(`/goals/${id}/suggest`);
  },

  async getGoalDreams(goalId: number): Promise<Dream[]> {
    return api.get<Dream[]>(`/goals/${goalId}/dreams`);
  },
};
