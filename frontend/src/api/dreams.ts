import { api } from './client';
import type { Dream, DreamCreate } from './types';

export const dreamsApi = {
  async getAll(params?: { mood?: number; skip?: number; limit?: number }): Promise<Dream[]> {
    const searchParams = new URLSearchParams();
    if (params?.mood) searchParams.set('mood', String(params.mood));
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const query = searchParams.toString();
    return api.get<Dream[]>(`/dreams/${query ? `?${query}` : ''}`);
  },

  async getById(id: number): Promise<Dream> {
    return api.get<Dream>(`/dreams/${id}`);
  },

  async create(data: DreamCreate): Promise<Dream> {
    return api.post<Dream>('/dreams/', data);
  },

  async update(id: number, data: Partial<DreamCreate>): Promise<Dream> {
    return api.put<Dream>(`/dreams/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`/dreams/${id}`);
  },

  async interpret(id: number): Promise<Dream> {
    return api.post<Dream>(`/dreams/${id}/interpret`);
  },
};
