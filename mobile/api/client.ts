import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_BASE = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5111';
const TOKEN_KEY = 'dreamcatcher_token';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private token: string | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.token = await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.warn('Failed to load token from secure store:', e);
    }
    this.initialized = true;
  }

  async setToken(token: string | null): Promise<void> {
    this.token = token;
    try {
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Failed to save token to secure store:', e);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    await this.init();
    
    const { skipAuth, ...fetchOptions } = options;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
    };

    if (!skipAuth && this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/api${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
