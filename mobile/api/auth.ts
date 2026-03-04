import { api } from './client';
import type { User, Token, UserUpdate, PasswordChange } from './types';

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authApi = {
  async register(data: RegisterData): Promise<User> {
    return api.post<User>('/auth/register', data, { skipAuth: true });
  },

  async login(data: LoginData): Promise<Token> {
    const token = await api.post<Token>('/auth/login/json', data, { skipAuth: true });
    await api.setToken(token.access_token);
    return token;
  },

  async getMe(): Promise<User> {
    return api.get<User>('/auth/me');
  },

  async logout(): Promise<void> {
    await api.setToken(null);
  },

  async updateProfile(data: UserUpdate): Promise<User> {
    return api.put<User>('/auth/me', data);
  },

  async changePassword(data: PasswordChange): Promise<void> {
    return api.put('/auth/password', data);
  },

  async deleteAccount(password: string): Promise<void> {
    return api.delete(`/auth/me?password=${encodeURIComponent(password)}`);
  },

  async exportData(): Promise<Record<string, unknown>> {
    return api.get('/auth/export');
  },
};
