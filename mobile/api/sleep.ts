import { api } from './client';
import type { SleepLog, SleepLogCreate, SleepStats, SleepCorrelation } from './types';

export const sleepApi = {
  async getAll(params?: {
    quality?: number;
    skip?: number;
    limit?: number;
    quality_min?: number;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<SleepLog[]> {
    const searchParams = new URLSearchParams();
    if (params?.quality) searchParams.set('quality', String(params.quality));
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.quality_min) searchParams.set('quality_min', String(params.quality_min));
    if (params?.date_from) searchParams.set('date_from', params.date_from);
    if (params?.date_to) searchParams.set('date_to', params.date_to);
    if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params?.sort_order) searchParams.set('sort_order', params.sort_order);
    
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

  async getStats(dateFrom?: string, dateTo?: string): Promise<SleepStats> {
    const searchParams = new URLSearchParams();
    if (dateFrom) searchParams.set('date_from', dateFrom);
    if (dateTo) searchParams.set('date_to', dateTo);
    const query = searchParams.toString();
    return api.get<SleepStats>(`/sleep/stats${query ? `?${query}` : ''}`);
  },

  async getCorrelations(dateFrom?: string, dateTo?: string): Promise<SleepCorrelation> {
    const searchParams = new URLSearchParams();
    if (dateFrom) searchParams.set('date_from', dateFrom);
    if (dateTo) searchParams.set('date_to', dateTo);
    const query = searchParams.toString();
    return api.get<SleepCorrelation>(`/sleep/correlations${query ? `?${query}` : ''}`);
  },
};
