import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { api } from '../../api/client';
import type { components } from '../../api/schema';
import { AuthService } from '../../core/auth/auth.service';
import { InstanceCard } from './instance-card';
import { CreateInstanceDialog } from './create-instance-dialog';

type Instance = components['schemas']['InstanceResponse'];
type User = components['schemas']['UserResponse'];

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InstanceCard, CreateInstanceDialog],
  template: `
    <div class="mx-auto max-w-6xl">
      <div class="mb-8 flex flex-col gap-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold gradient-text">Instances</h1>
            <p class="mt-1 text-sm text-gray-400">Manage your Twitch miner instances</p>
          </div>
          <div class="flex gap-3">
            <button
              (click)="loadInstances()"
              class="group rounded-xl bg-gray-800/70 border border-gray-700/50 p-3 text-sm font-medium text-gray-300 transition-all duration-200 hover:bg-gray-700 hover:border-gray-600 hover:text-white active:scale-95"
              aria-label="Refresh instances"
              title="Refresh instances"
            >
              <svg
                class="h-5 w-5 transition-transform group-hover:rotate-180 duration-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                />
              </svg>
            </button>
            <button
              (click)="showCreate.set(true)"
              class="rounded-xl bg-gradient-to-r from-twitch to-twitch-dark border border-twitch-light/20 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-twitch/40 hover:scale-105 active:scale-95"
            >
              <span class="flex items-center gap-2">
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Instance
              </span>
            </button>
          </div>
        </div>

        <!-- Stats Overview (Admin only) -->
        @if (isAdmin() && instances().length > 0 && !loading()) {
          <div class="grid gap-4 sm:grid-cols-3">
            <div
              class="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-800/50 p-4"
            >
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-twitch/20 p-3">
                  <svg
                    class="h-6 w-6 text-twitch-light"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400">Total Instances</p>
                  <p class="text-2xl font-bold text-gray-100">{{ instances().length }}</p>
                </div>
              </div>
            </div>
            <div
              class="rounded-xl border border-green-900/30 bg-gradient-to-br from-gray-900 to-green-900/10 p-4"
            >
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-green-500/20 p-3">
                  <svg
                    class="h-6 w-6 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400">Running</p>
                  <p class="text-2xl font-bold text-green-400">
                    {{ runningCount() }}
                  </p>
                </div>
              </div>
            </div>
            <div
              class="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-800/50 p-4"
            >
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-gray-700/50 p-3">
                  <svg
                    class="h-6 w-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400">Stopped</p>
                  <p class="text-2xl font-bold text-gray-300">
                    {{ stoppedCount() }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <div
            class="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-twitch"
          ></div>
        </div>
      } @else if (error()) {
        <div
          class="rounded-xl bg-red-900/50 border border-red-700/50 p-4 text-red-300"
          role="alert"
        >
          {{ error() }}
        </div>
      } @else if (instances().length === 0) {
        <div
          class="rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center backdrop-blur-sm"
        >
          <div
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800"
          >
            <svg
              class="h-8 w-8 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
              />
            </svg>
          </div>
          <p class="text-lg font-semibold text-gray-300">No instances yet</p>
          <p class="mt-2 text-sm text-gray-500">
            Create your first miner instance to get started with Twitch mining.
          </p>
          <button
            (click)="showCreate.set(true)"
            class="mt-6 rounded-xl bg-gradient-to-r from-twitch to-twitch-dark border border-twitch-light/20 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-twitch/40 hover:scale-105 active:scale-95"
          >
            Create Instance
          </button>
        </div>
      } @else {
        @if (isAdmin()) {
          <!-- Compact list for admins -->
          <div class="flex flex-col gap-3">
            @for (inst of instances(); track inst.id) {
              <app-instance-card
                [instance]="inst"
                [compact]="true"
                [actionLoading]="isActionLoading(inst.id)"
                [ownerName]="getUserName(inst.user_id)"
                (start)="startInstance(inst.id)"
                (stop)="stopInstance(inst.id)"
                (delete)="deleteInstance(inst.id)"
              />
            }
          </div>
        } @else {
          <div class="space-y-8">
            @for (inst of instances(); track inst.id) {
              <app-instance-card
                [instance]="inst"
                [actionLoading]="isActionLoading(inst.id)"
                (start)="startInstance(inst.id)"
                (stop)="stopInstance(inst.id)"
                (delete)="deleteInstance(inst.id)"
              />
            }
          </div>
        }
      }

      @if (showCreate()) {
        <app-create-instance-dialog
          (close)="showCreate.set(false)"
          (created)="createInstance($event)"
        />
      }

      <!-- First-start hint dialog -->
      @if (showFirstStartHint(); as instanceId) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          (click)="dismissHint()"
          role="dialog"
          aria-modal="true"
          aria-label="First start hint"
        >
          <div
            class="w-full max-w-md rounded-2xl border border-twitch/30 bg-gray-900 p-6 shadow-xl shadow-twitch/10"
            (click)="$event.stopPropagation()"
          >
            <div class="mb-4 flex items-center gap-3">
              <div class="rounded-xl bg-twitch/20 p-3">
                <svg
                  class="h-6 w-6 text-twitch-light"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                  />
                </svg>
              </div>
              <h2 class="text-lg font-bold text-gray-100">Instance Started!</h2>
            </div>
            <p class="mb-2 text-sm text-gray-300">
              Your instance has been started for the first time. To connect with Twitch, you need to check the <span class="font-semibold text-twitch-light">Console Output</span>.
            </p>
            <p class="mb-6 text-sm text-gray-400">
              Go to <span class="font-semibold text-white">Details</span> and click on <span class="font-semibold text-green-400">Connect</span> to see the logs live. There you will find the link for Twitch authentication.
            </p>
            <div class="flex gap-3">
              <button
                (click)="dismissHint()"
                class="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-gray-700 active:scale-95"
              >
                Got it
              </button>
              <button
                (click)="goToInstanceLogs(instanceId)"
                class="flex-1 rounded-xl bg-gradient-to-r from-twitch to-twitch-dark border border-twitch-light/20 px-4 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-twitch/40 active:scale-95"
              >
                View Logs
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly isAdmin = this.auth.isAdmin;

  instances = signal<Instance[]>([]);
  loading = signal(false);
  error = signal('');
  showCreate = signal(false);
  showFirstStartHint = signal<string | null>(null);

  /** Track which instance IDs have an action in progress */
  private actionLoadingIds = signal(new Set<string>());

  /** Map user_id → username (populated for admins) */
  private userMap = signal(new Map<string, string>());

  runningCount = computed(() => this.instances().filter((i) => i.is_running).length);
  stoppedCount = computed(() => this.instances().filter((i) => !i.is_running).length);

  constructor() {
    this.loadInstances();
    if (this.isAdmin()) {
      this.loadUsers();
    }
  }

  /** Check if a specific instance has an action in progress */
  isActionLoading(id: string): boolean {
    return this.actionLoadingIds().has(id);
  }

  /** Get username for a user_id (admin only) */
  getUserName(userId: string): string | null {
    return this.userMap().get(userId) ?? null;
  }

  private async loadUsers() {
    try {
      const { data } = await api.GET('/admin/users');
      if (data) {
        const map = new Map<string, string>();
        for (const user of data) {
          map.set(user.id, user.username);
        }
        this.userMap.set(map);
      }
    } catch {
      /* non-critical */
    }
  }

  private setActionLoading(id: string, loading: boolean) {
    this.actionLoadingIds.update((ids) => {
      const next = new Set(ids);
      if (loading) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async loadInstances() {
    this.loading.set(true);
    this.error.set('');
    try {
      const { data, error } = await api.GET('/instances/');
      if (error) throw new Error('Failed to load instances');
      this.instances.set(data);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load instances');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Poll the lightweight /status endpoint until instance matches expected state.
   * Uses exponential back-off starting at 500ms.
   */
  private async pollUntilStatus(id: string, expectRunning: boolean, maxRetries = 12) {
    for (let i = 0; i < maxRetries; i++) {
      const delay = Math.min(500 * Math.pow(1.3, i), 3000);
      await new Promise((r) => setTimeout(r, delay));
      try {
        const { data } = await api.GET('/instances/{instance_id}/status', {
          params: { path: { instance_id: id } },
        });
        if (data && data.is_running === expectRunning) {
          // Refresh the full instance data once status matches
          const { data: full } = await api.GET('/instances/{instance_id}', {
            params: { path: { instance_id: id } },
          });
          if (full) {
            this.instances.update((list) => list.map((inst) => (inst.id === id ? full : inst)));
          }
          return;
        }
      } catch {
        // network hiccup — keep polling
      }
    }
    // Fallback: just reload all instances
    await this.loadInstances();
  }

  async startInstance(id: string) {
    if (this.isActionLoading(id)) return;
    this.setActionLoading(id, true);

    const inst = this.instances().find((i) => i.id === id);
    const isFirstStart = inst && !inst.last_started_at;
    try {
      const { data, error } = await api.POST('/instances/{instance_id}/start', {
        params: { path: { instance_id: id } },
      });

      if (data && data.is_running) {
        // Response confirms running — refresh full data
        const { data: full } = await api.GET('/instances/{instance_id}', {
          params: { path: { instance_id: id } },
        });
        if (full) {
          this.instances.update((list) => list.map((inst) => (inst.id === id ? full : inst)));
        } else {
          await this.loadInstances();
        }
      } else if (!error) {
        await this.pollUntilStatus(id, true);
      } else {
        await this.loadInstances();
      }

      if (isFirstStart) {
        this.showFirstStartHint.set(id);
      }
    } catch {
      await this.loadInstances();
    } finally {
      this.setActionLoading(id, false);
    }
  }

  dismissHint() {
    this.showFirstStartHint.set(null);
  }

  goToInstanceLogs(id: string) {
    this.showFirstStartHint.set(null);
    this.router.navigate(['/instances', id]);
  }

  async stopInstance(id: string) {
    if (this.isActionLoading(id)) return;
    this.setActionLoading(id, true);
    try {
      const { data, error } = await api.POST('/instances/{instance_id}/stop', {
        params: { path: { instance_id: id } },
      });

      // If the response already says stopped, update UI immediately
      if (data && !data.is_running) {
        const { data: full } = await api.GET('/instances/{instance_id}', {
          params: { path: { instance_id: id } },
        });
        if (full) {
          this.instances.update((list) => list.map((inst) => (inst.id === id ? full : inst)));
        } else {
          await this.loadInstances();
        }
        return;
      }

      // Otherwise poll until status reflects stopped
      if (!error) {
        await this.pollUntilStatus(id, false);
      } else {
        // API returned an error — still poll in case stop was partially processed
        await this.pollUntilStatus(id, false, 6);
      }
    } catch {
      // Network error — poll anyway, the stop may have gone through
      try {
        await this.pollUntilStatus(id, false, 6);
      } catch {
        await this.loadInstances();
      }
    } finally {
      this.setActionLoading(id, false);
    }
  }

  async createInstance(data: { twitch_username: string; streamers: string[] }) {
    try {
      await api.POST('/instances/', { body: data });
      this.showCreate.set(false);
      await this.loadInstances();
    } catch {
      /* ignore */
    }
  }

  async deleteInstance(id: string) {
    if (this.isActionLoading(id)) return;
    if (!confirm('Are you sure you want to delete this instance?')) return;
    this.setActionLoading(id, true);
    try {
      const { error } = await api.DELETE('/instances/{instance_id}', {
        params: { path: { instance_id: id } },
      });
      if (error) throw new Error('Failed to delete instance');
      this.instances.update((list) => list.filter((inst) => inst.id !== id));
    } catch {
      await this.loadInstances();
    } finally {
      this.setActionLoading(id, false);
    }
  }
}
