import { api } from './client';
import type { Idea, IdeaCreate } from './types';

export const ideasApi = {
  async getAll(params?: { category?: string; priority?: number; skip?: number; limit?: number }): Promise<Idea[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.priority) searchParams.set('priority', String(params.priority));
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const query = searchParams.toString();
    return api.get<Idea[]>(`/ideas/${query ? `?${query}` : ''}`);
  },

  async getById(id: number): Promise<Idea> {
    return api.get<Idea>(`/ideas/${id}`);
  },

  async create(data: IdeaCreate): Promise<Idea> {
    return api.post<Idea>('/ideas/', data);
  },

  async update(id: number, data: Partial<IdeaCreate>): Promise<Idea> {
    return api.put<Idea>(`/ideas/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`/ideas/${id}`);
  },
};
