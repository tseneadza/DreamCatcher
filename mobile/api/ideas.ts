import { api } from './client';
import type { Idea, IdeaCreate } from './types';

export const ideasApi = {
  async getAll(params?: {
    category?: string;
    priority?: number;
    skip?: number;
    limit?: number;
    q?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<Idea[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.priority) searchParams.set('priority', String(params.priority));
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.q) searchParams.set('q', params.q);
    if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params?.sort_order) searchParams.set('sort_order', params.sort_order);
    
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
