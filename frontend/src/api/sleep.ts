import { api } from './client';
import type { SleepLog, SleepLogCreate } from './types';

export const sleepApi = {
  async getAll(params?: { quality?: number; skip?: number; limit?: number }): Promise<SleepLog[]> {
    const searchParams = new URLSearchParams();
    if (params?.quality) searchParams.set('quality', String(params.quality));
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const query = searchParams.toString();
    return api.get<SleepLog[]>(`/sleep/${query ? `?${query}` : ''}`);
  },

  async getById(id: number): Promise<SleepLog> {
    return api.get<SleepLog>(`/sleep/${id}`);
  },

  async create(data: SleepLogCreate): Promise<SleepLog> {
    return api.post<SleepLog>('/sleep/', data);
  },

  async update(id: number, data: Partial<SleepLogCreate>): Promise<SleepLog> {
    return api.put<SleepLog>(`/sleep/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`/sleep/${id}`);
  },
};
