import { api } from './client';
import type { SavedFilter, SavedFilterCreate } from './types';

export const filtersApi = {
  async create(data: SavedFilterCreate): Promise<SavedFilter> {
    return api.post<SavedFilter>('/filters/', data);
  },

  async getAll(entityType?: string): Promise<SavedFilter[]> {
    const searchParams = new URLSearchParams();
    if (entityType) searchParams.set('entity_type', entityType);
    const query = searchParams.toString();
    return api.get<SavedFilter[]>(`/filters/${query ? `?${query}` : ''}`);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`/filters/${id}`);
  },
};
