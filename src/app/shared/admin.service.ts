import { Injectable } from '@angular/core';
import { defer, from, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { api } from '../api/client';
import type { components } from '../api/schema';

type User = components['schemas']['UserResponse'];
type Code = components['schemas']['RegistrationCodeDetailResponse'];
type Role = components['schemas']['UserRole'];

@Injectable({ providedIn: 'root' })
export class AdminService {
  listUsers$(): Observable<User[]> {
    return defer(() => from(api.GET('/admin/users'))).pipe(
      map(({ data, error }) => {
        if (error) throw new Error('Failed to load users');
        return data;
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  listCodes$(): Observable<Code[]> {
    return defer(() => from(api.GET('/admin/codes'))).pipe(
      map(({ data, error }) => {
        if (error) throw new Error('Failed to load codes');
        return data;
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  generateCode$(expiresInHours: number): Observable<void> {
    return defer(() =>
      from(
        api.POST('/admin/codes/generate', {
          body: { expires_in_hours: expiresInHours },
        }),
      ),
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error('Failed to generate code');
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  deleteCode$(codeId: string): Observable<void> {
    return defer(() =>
      from(
        api.DELETE('/codes/{code_id}', {
          params: { path: { code_id: codeId } },
        }),
      ),
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error('Failed to delete code');
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  updateInviteLimit$(userId: string, maxInviteCodes: number): Observable<void> {
    return defer(() =>
      from(
        api.PATCH('/admin/users/{user_id}/invite-limit', {
          params: { path: { user_id: userId } },
          body: { max_invite_codes: maxInviteCodes },
        }),
      ),
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error('Failed to update invite limit');
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  toggleUserRole$(userId: string, role: Role): Observable<void> {
    return defer(() =>
      from(
        api.PATCH('/admin/users/{user_id}/role', {
          params: { path: { user_id: userId } },
          body: { role },
        }),
      ),
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error('Failed to update role');
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  // Legacy Promise-based methods for backward compatibility
  async listUsers(): Promise<User[]> {
    const { data, error } = await api.GET('/admin/users');
    if (error) throw new Error('Failed to load users');
    return data;
  }

  async listCodes(): Promise<Code[]> {
    const { data, error } = await api.GET('/admin/codes');
    if (error) throw new Error('Failed to load codes');
    return data;
  }
}
