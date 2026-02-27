import { api } from './client';
import type { User, Token } from './types';

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
    api.setToken(token.access_token);
    return token;
  },

  async getMe(): Promise<User> {
    return api.get<User>('/auth/me');
  },

  logout(): void {
    api.setToken(null);
  },
};
