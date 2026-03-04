import { api } from './client';
import type { ConsentTerms, ConsentResponse, ConsentGrant, ResearchAggregate } from './types';

export const researchApi = {
  async getTerms(): Promise<ConsentTerms> {
    return api.get<ConsentTerms>('/research/consent/terms', { skipAuth: true });
  },

  async getStatus(): Promise<ConsentResponse> {
    return api.get<ConsentResponse>('/research/consent/status');
  },

  async grantConsent(data: ConsentGrant): Promise<ConsentResponse> {
    return api.post<ConsentResponse>('/research/consent/grant', data);
  },

  async revokeConsent(reason?: string): Promise<ConsentResponse> {
    return api.post<ConsentResponse>('/research/consent/revoke', { reason });
  },

  async getAggregate(params?: {
    group_by?: string;
    period_type?: string;
  }): Promise<ResearchAggregate> {
    const searchParams = new URLSearchParams();
    if (params?.group_by) searchParams.set('group_by', params.group_by);
    if (params?.period_type) searchParams.set('period_type', params.period_type);
    const query = searchParams.toString();
    return api.get<ResearchAggregate>(`/research/aggregate${query ? `?${query}` : ''}`);
  },
};
