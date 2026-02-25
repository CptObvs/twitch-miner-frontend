import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { api } from '../../api/client';
import type { components } from '../../api/schema';

type UserResponse = components['schemas']['UserResponse'];

interface StoredUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<StoredUser | null>(this.loadUser());
  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');
  private tokenValidated = false;

  constructor(private router: Router) {}

  private loadUser(): StoredUser | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  }

  private saveSession(token: string, user: StoredUser) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.userSignal.set(user);
  }

  async login(username: string, password: string): Promise<void> {
    const { data, error } = await api.POST('/auth/token', {
      body: { username, password, scope: '' },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      bodySerializer: (body) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(body as Record<string, string>)) {
          if (value != null) params.set(key, String(value));
        }
        return params.toString();
      },
    });
    if (error) throw new Error(extractError(error));
    this.saveSession(data.access_token, {
      id: data.user_id,
      username: data.username,
      role: 'user',
    });
    await this.fetchMe();
  }

  async register(username: string, password: string, registrationCode: string): Promise<void> {
    const { data, error } = await api.POST('/auth/register', {
      body: { username, password, registration_code: registrationCode },
    });
    if (error) throw new Error(extractError(error));
    this.saveSession(data.access_token, {
      id: data.user_id,
      username: data.username,
      role: 'user',
    });
    await this.fetchMe();
  }

  async fetchMe(): Promise<UserResponse> {
    const { data, error } = await api.GET('/auth/me');
    if (error) throw new Error(extractError(error));
    const user: StoredUser = { id: data.id, username: data.username, role: data.role };
    localStorage.setItem('user', JSON.stringify(user));
    this.userSignal.set(user);
    this.tokenValidated = true;
    return data;
  }

  async validateToken(): Promise<boolean> {
    if (this.tokenValidated) return true;
    try {
      await this.fetchMe();
      return true;
    } catch {
      return false;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSignal.set(null);
    this.tokenValidated = false;
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}

function extractError(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj['detail'] === 'string') return obj['detail'];
    if (Array.isArray(obj['detail'])) {
      return (obj['detail'] as { msg: string }[]).map((e) => e.msg).join(', ');
    }
  }
  return 'An error occurred';
}
