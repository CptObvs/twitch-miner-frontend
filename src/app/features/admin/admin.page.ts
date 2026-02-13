import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { api } from '../../api/client';
import type { components } from '../../api/schema';
import { ToastService } from '../../shared/toast.service';
import { UserList } from './user-list';
import { CodeList } from './code-list';

type User = components['schemas']['UserResponse'];
type Code = components['schemas']['RegistrationCodeDetailResponse'];
type Role = components['schemas']['UserRole'];

@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserList, CodeList],
  template: `
    <div class="mx-auto max-w-5xl">
      <div class="mb-8">
        <h1 class="text-3xl font-bold gradient-text">Admin Panel</h1>
        <p class="mt-1 text-sm text-gray-400">Manage users and registration codes</p>
      </div>

      <!-- Tabs -->
      <div class="mb-6 relative">
        <div class="flex gap-1 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 p-1.5">
          <button
            (click)="activeTab.set('users')"
            [class]="
              'group relative flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 ' +
              (activeTab() === 'users'
                ? 'bg-gradient-to-r from-twitch/20 to-twitch-dark/20 text-twitch-light border border-twitch/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent')
            "
          >
            <svg class="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            Users
          </button>
          <button
            (click)="activeTab.set('codes')"
            [class]="
              'group relative flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 ' +
              (activeTab() === 'codes'
                ? 'bg-gradient-to-r from-twitch/20 to-twitch-dark/20 text-twitch-light border border-twitch/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent')
            "
          >
            <svg class="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            Registration Codes
          </button>
        </div>
      </div>

      @if (activeTab() === 'users') {
        <div class="rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm shadow-xl shadow-black/10 overflow-hidden">
          @if (usersLoading()) {
            <div class="flex justify-center py-8">
              <div
                class="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-twitch"
              ></div>
            </div>
          } @else {
            <app-user-list
              [users]="users()"
              (toggleRole)="toggleUserRole($event)"
              (updateInviteLimit)="updateInviteLimit($event)"
            />
          }
        </div>
      }

      @if (activeTab() === 'codes') {
        <div class="space-y-4">
          <div class="flex items-center justify-end gap-3">
            <label class="flex items-center gap-2 text-sm text-gray-400">
              Expires in
              <select
                (change)="expiresInHours.set(+$any($event.target).value)"
                class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-twitch focus:outline-none"
              >
                @for (opt of expiryOptions; track opt.value) {
                  <option [value]="opt.value" [selected]="opt.value === expiresInHours()">
                    {{ opt.label }}
                  </option>
                }
              </select>
            </label>
            <button
              (click)="generateCode()"
              [disabled]="generatingCode()"
              class="group relative overflow-hidden rounded-xl bg-gradient-to-r from-twitch to-twitch-dark border border-twitch-light/20 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-twitch/20 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-twitch/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 active:scale-95"
            >
              <span class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></span>
              @if (generatingCode()) {
                <span class="flex items-center gap-2">
                  <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                  Generating...
                </span>
              } @else {
                <span class="flex items-center gap-2">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Generate Code
                </span>
              }
            </button>
          </div>
          <div class="rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm shadow-xl shadow-black/10 overflow-hidden">
            @if (codesLoading()) {
              <div class="flex justify-center py-8">
                <div
                  class="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-twitch"
                ></div>
              </div>
            } @else {
              <app-code-list [codes]="codes()" (deleteCode)="deleteCode($event)" />
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminPage {
  private toast = inject(ToastService);
  activeTab = signal<'users' | 'codes'>('users');
  users = signal<User[]>([]);
  codes = signal<Code[]>([]);
  usersLoading = signal(false);
  codesLoading = signal(false);
  generatingCode = signal(false);
  expiresInHours = signal(24);
  expiryOptions = [
    { value: 1, label: '1 hour' },
    { value: 6, label: '6 hours' },
    { value: 12, label: '12 hours' },
    { value: 24, label: '24 hours' },
    { value: 48, label: '48 hours' },
    { value: 168, label: '7 days' },
  ];

  constructor() {
    this.loadUsers();
    this.loadCodes();
  }

  async loadUsers() {
    this.usersLoading.set(true);
    try {
      const { data } = await api.GET('/admin/users');
      if (data) this.users.set(data);
    } finally {
      this.usersLoading.set(false);
    }
  }

  async loadCodes() {
    this.codesLoading.set(true);
    try {
      const { data } = await api.GET('/admin/codes');
      if (data) this.codes.set(data);
    } finally {
      this.codesLoading.set(false);
    }
  }

  async toggleUserRole({ userId, newRole }: { userId: string; newRole: Role }) {
    try {
      await api.PATCH('/admin/users/{user_id}/role', {
        params: { path: { user_id: userId } },
        body: { role: newRole },
      });
      await this.loadUsers();
    } catch {
      /* ignore */
    }
  }

  async generateCode() {
    this.generatingCode.set(true);
    try {
      const { error } = await api.POST('/admin/codes/generate', {
        body: { expires_in_hours: this.expiresInHours() },
      });
      if (error) {
        this.toast.show('Failed to generate code', 'error');
        return;
      }
      await this.loadCodes();
      this.toast.show('Registration code generated', 'success');
    } finally {
      this.generatingCode.set(false);
    }
  }

  async updateInviteLimit({ userId, maxInviteCodes }: { userId: string; maxInviteCodes: number }) {
    try {
      await api.PATCH('/admin/users/{user_id}/invite-limit', {
        params: { path: { user_id: userId } },
        body: { max_invite_codes: maxInviteCodes },
      });
      await this.loadUsers();
    } catch {
      /* ignore */
    }
  }

  async deleteCode(codeId: string) {
    try {
      await api.DELETE('/codes/{code_id}', {
        params: { path: { code_id: codeId } },
      });
      await this.loadCodes();
      this.toast.show('Registration code deleted', 'success');
    } catch {
      this.toast.show('Failed to delete code', 'error');
    }
  }
}
