import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_BASE = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5111';
const TOKEN_KEY = 'dreamcatcher_token';

// #region agent log
console.log('[DEBUG-744591] API_BASE:', API_BASE, 'expoConfig:', Constants.expoConfig?.extra);
fetch('http://127.0.0.1:7242/ingest/9bb15a77-37f7-4c75-bc72-12d426be4932',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'744591'},body:JSON.stringify({sessionId:'744591',location:'client.ts:init',message:'API client initialized',data:{API_BASE,expoExtra:Constants.expoConfig?.extra},timestamp:Date.now()})}).catch(()=>{});
// #endregion

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

    // #region agent log
    console.log('[DEBUG-744591] Request:', endpoint, 'hasToken:', !!this.token, 'URL:', `${API_BASE}/api${endpoint}`);
    fetch('http://127.0.0.1:7242/ingest/9bb15a77-37f7-4c75-bc72-12d426be4932',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'744591'},body:JSON.stringify({sessionId:'744591',location:'client.ts:request',message:'Making API request',data:{endpoint,hasToken:!!this.token,url:`${API_BASE}/api${endpoint}`,skipAuth},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const response = await fetch(`${API_BASE}/api${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // #region agent log
    const responseClone = response.clone();
    const responseText = await responseClone.text().catch(() => 'FAILED_TO_READ');
    console.log('[DEBUG-744591] Response:', endpoint, 'status:', response.status, 'ok:', response.ok, 'body:', responseText.substring(0, 200));
    fetch('http://127.0.0.1:7242/ingest/9bb15a77-37f7-4c75-bc72-12d426be4932',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'744591'},body:JSON.stringify({sessionId:'744591',location:'client.ts:response',message:'Got API response',data:{endpoint,status:response.status,ok:response.ok,bodyPreview:responseText.substring(0,200)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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
