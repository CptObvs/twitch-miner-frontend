import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { api } from '../../api/client';
import type { components } from '../../api/schema';
import { StatusBadge } from '../../shared/components/status-badge';
import { UptimeTimer } from '../../shared/components/uptime-timer';
import { StreamersEditor } from './streamers-editor';
import { LogViewer } from './log-viewer';

type Instance = components['schemas']['InstanceResponse'];

@Component({
  selector: 'app-instance-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, UptimeTimer, StreamersEditor, LogViewer],
  template: `
    <div class="mx-auto max-w-4xl">
      <a
        routerLink="/dashboard"
        class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-twitch-light"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to Dashboard
      </a>

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
      } @else if (instance()) {
        <div class="space-y-6">
          <!-- Hero Section -->
          <div
            [class]="
              'rounded-2xl border p-4 ' +
              (instance()!.is_running
                ? 'border-twitch/30 bg-gradient-to-br from-gray-900 via-gray-900 to-twitch/5 shadow-xl shadow-twitch/20'
                : 'border-gray-800 bg-gray-900')
            "
          >
            <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div class="flex-1">
                <h1
                  class="text-2xl font-bold mb-1"
                  [class]="instance()!.is_running ? 'gradient-text' : 'text-gray-100'"
                >
                  {{ instance()!.twitch_username }}
                </h1>
                <p class="text-xs text-gray-500 font-mono">{{ instance()!.id }}</p>
              </div>
              <div class="flex flex-col gap-1.5 items-end">
                <app-status-badge [running]="instance()!.is_running" />
                <app-uptime-timer
                  [startedAt]="instance()!.last_started_at ?? null"
                  [isRunning]="instance()!.is_running"
                />
              </div>
            </div>

            <div class="flex gap-2">
              @if (instance()!.is_running) {
                <button
                  (click)="stopInstance()"
                  [disabled]="actionLoading()"
                  class="rounded-lg bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-700/30 px-4 py-2 text-xs font-bold text-red-300 transition-all duration-200 hover:from-red-900 hover:to-red-800 hover:shadow-lg hover:shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  @if (actionLoading()) {
                    Stopping...
                  } @else {
                    Stop Instance
                  }
                </button>
              } @else {
                <button
                  (click)="startInstance()"
                  [disabled]="actionLoading()"
                  class="rounded-lg bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-700/30 px-4 py-2 text-xs font-bold text-green-300 transition-all duration-200 hover:from-green-900 hover:to-emerald-900 hover:shadow-lg hover:shadow-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  @if (actionLoading()) {
                    Starting...
                  } @else {
                    Start Instance
                  }
                </button>
              }
            </div>

            <div class="mt-3 border-t border-gray-800/60 pt-3">
              <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div class="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-[11px] text-gray-400">
                  <div class="flex items-center gap-2">
                    <svg class="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    <span>Created</span>
                  </div>
                  <span class="text-xs font-semibold text-gray-200 whitespace-nowrap">{{ formatDate(instance()!.created_at) }}</span>
                </div>
                <div class="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-[11px] text-gray-400">
                  <div class="flex items-center gap-2">
                    <svg class="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                    <span>Last Started</span>
                  </div>
                  <span class="text-xs font-semibold text-gray-200 whitespace-nowrap">
                    {{ instance()!.last_started_at ? formatDate(instance()!.last_started_at!) : 'Never' }}
                  </span>
                </div>
                <div class="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-[11px] text-gray-400">
                  <div class="flex items-center gap-2">
                    <svg class="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                    </svg>
                    <span>Last Stopped</span>
                  </div>
                  <span class="text-xs font-semibold text-gray-200 whitespace-nowrap">
                    {{ instance()!.last_stopped_at ? formatDate(instance()!.last_stopped_at!) : 'Never' }}
                  </span>
                </div>
                <div class="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-[11px] text-gray-400">
                  <div class="flex items-center gap-2">
                    <svg class="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
                    </svg>
                    <span>Process ID</span>
                  </div>
                  <span class="text-xs font-semibold text-gray-200 whitespace-nowrap font-mono">{{ instance()!.pid ?? 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Streamers -->
          <app-streamers-editor
            [streamers]="instance()!.streamers"
            (save)="saveStreamers($event)"
          />

          <!-- Logs -->
          <app-log-viewer [instanceId]="instance()!.id" />
        </div>
      }
    </div>
  `,
})
export class InstanceDetailPage {
  id = input.required<string>();

  instance = signal<Instance | null>(null);
  loading = signal(false);
  error = signal('');
  actionLoading = signal(false);

  ngOnInit() {
    this.loadInstance();
  }

  async loadInstance() {
    this.loading.set(true);
    this.error.set('');
    try {
      const { data, error } = await api.GET('/instances/{instance_id}', {
        params: { path: { instance_id: this.id() } },
      });
      if (error) throw new Error('Failed to load instance');
      this.instance.set(data);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load instance');
    } finally {
      this.loading.set(false);
    }
  }

  async startInstance() {
    this.actionLoading.set(true);
    try {
      const { data } = await api.POST('/instances/{instance_id}/start', {
        params: { path: { instance_id: this.id() } },
      });

      if (data && data.is_running) {
        await this.loadInstance();
      } else {
        await this.pollUntilStatus(true);
      }
    } catch {
      await this.loadInstance();
    } finally {
      this.actionLoading.set(false);
    }
  }

  async stopInstance() {
    this.actionLoading.set(true);
    try {
      const { data } = await api.POST('/instances/{instance_id}/stop', {
        params: { path: { instance_id: this.id() } },
      });

      // If response already confirms stopped, use it directly
      if (data && !data.is_running) {
        await this.loadInstance();
        return;
      }

      // Otherwise poll until status reflects stopped
      await this.pollUntilStatus(false);
    } catch {
      // Network error — poll anyway, the stop may have gone through
      try {
        await this.pollUntilStatus(false, 6);
      } catch {
        await this.loadInstance();
      }
    } finally {
      this.actionLoading.set(false);
    }
  }

  /**
   * Poll the lightweight /status endpoint until instance matches expected state.
   */
  private async pollUntilStatus(expectRunning: boolean, maxRetries = 12) {
    for (let i = 0; i < maxRetries; i++) {
      const delay = Math.min(500 * Math.pow(1.3, i), 3000);
      await new Promise((r) => setTimeout(r, delay));
      try {
        const { data } = await api.GET('/instances/{instance_id}/status', {
          params: { path: { instance_id: this.id() } },
        });
        if (data && data.is_running === expectRunning) {
          await this.loadInstance();
          return;
        }
      } catch {
        // keep polling
      }
    }
    await this.loadInstance();
  }

  async saveStreamers(streamers: string[]) {
    try {
      await api.PUT('/instances/{instance_id}/streamers', {
        params: { path: { instance_id: this.id() } },
        body: { streamers },
      });
      await this.loadInstance();
    } catch {
      /* ignore */
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
