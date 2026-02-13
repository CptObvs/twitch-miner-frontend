import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { components } from '../../api/schema';
import { StatusBadge } from '../../shared/components/status-badge';
import { UptimeTimer } from '../../shared/components/uptime-timer';
import { LoadingSpinner } from '../../shared/components/loading-spinner';

type Instance = components['schemas']['InstanceResponse'];

@Component({
  selector: 'app-instance-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, UptimeTimer, LoadingSpinner],
  template: `
    @if (compact()) {
      <!-- Compact row for admin view -->
      <div
        [class]="
          'flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors duration-150 ' +
          (isRunning() ? 'border-twitch/20 bg-gray-900/80' : 'border-gray-800 bg-gray-900/50')
        "
      >
        <!-- Status: Mobile = circle only, Desktop = badge with text -->
        <div class="flex items-center">
          <!-- Mobile: Only indicator circle -->
          <span
            class="sm:hidden flex h-8 w-8 items-center justify-center"
            [attr.aria-label]="stopping() ? 'Stopping' : isRunning() ? 'Running' : 'Stopped'"
          >
            @if (stopping()) {
              <app-loading-spinner size="xs" color="yellow" />
            } @else {
              <span
                [class]="
                  'h-3 w-3 rounded-full ' +
                  (isRunning() ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-gray-500')
                "
              ></span>
            }
          </span>
          <!-- Desktop: Full badge with text -->
          <app-status-badge
            [running]="isRunning()"
            [stopping]="stopping()"
            class="hidden sm:inline-flex"
          />
        </div>
        <div class="min-w-0 flex-1">
          <a
            [routerLink]="['/instances', instance().id]"
            class="block truncate text-sm font-semibold transition-colors duration-150"
            [class]="
              isRunning()
                ? 'gradient-text hover:opacity-80'
                : 'text-gray-200 hover:text-twitch-light'
            "
          >
            {{ instance().twitch_username }}
          </a>
          @if (ownerName()) {
            <span class="block truncate text-xs text-gray-500">
              <svg
                class="inline-block h-3 w-3 mr-0.5 -mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
              {{ ownerName() }}
            </span>
          }
        </div>

        <!-- Streamers count -->
        <span class="hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <svg
            class="h-3.5 w-3.5 text-twitch-light"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
          {{ instance().streamers.length }}
        </span>

        <!-- Uptime -->
        <div class="hidden md:block">
          <app-uptime-timer
            [startedAt]="instance().last_started_at ?? null"
            [isRunning]="isRunning()"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1.5">
          @if (isRunning() || stopping()) {
            <button
              (click)="stop.emit()"
              [disabled]="actionLoading() || stopping()"
              class="rounded-lg bg-red-900/40 border border-red-700/30 px-3 py-1.5 text-xs font-bold text-red-300 transition-all hover:bg-red-900/70 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (actionLoading() || stopping()) {
                <span class="flex items-center gap-1.5">
                  <app-loading-spinner size="xs" color="red" />
                  Stopping…
                </span>
              } @else {
                Stop
              }
            </button>
          } @else {
            <button
              (click)="start.emit()"
              [disabled]="actionLoading()"
              class="rounded-lg bg-green-900/40 border border-green-700/30 px-3 py-1.5 text-xs font-bold text-green-300 transition-all hover:bg-green-900/70 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (actionLoading()) {
                <span class="flex items-center gap-1.5">
                  <app-loading-spinner size="xs" color="green" />
                  Starting…
                </span>
              } @else {
                Start
              }
            </button>
          }
          <a
            [routerLink]="['/instances', instance().id]"
            class="rounded-lg bg-twitch/80 border border-twitch-light/20 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-twitch active:scale-95"
          >
            Details
          </a>
          <button
            (click)="delete.emit()"
            [disabled]="actionLoading()"
            class="rounded-lg bg-gray-800/70 border border-gray-700/50 p-1.5 text-gray-400 transition-all hover:bg-gray-700 hover:text-red-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete instance"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>
    } @else {
      <!-- Full card for user view -->
      <div
        [class]="
          'group relative rounded-2xl border p-6 backdrop-blur-xl ' +
          (isRunning()
            ? 'border-twitch/30 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-twitch/5 shadow-xl shadow-twitch/20'
            : 'border-gray-800 bg-gray-900/80')
        "
      >
        <div class="mb-4 flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <a
              [routerLink]="['/instances', instance().id]"
              class="block text-xl font-bold transition-all duration-200"
              [class]="
                isRunning()
                  ? 'gradient-text hover:opacity-80'
                  : 'text-gray-100 hover:text-twitch-light'
              "
            >
              {{ instance().twitch_username }}
            </a>
            <p class="mt-1 text-sm text-gray-500 font-mono">{{ instance().id.slice(0, 8) }}...</p>
          </div>
          <div class="flex flex-col gap-2 items-end">
            <app-status-badge [running]="isRunning()" [stopping]="stopping()" />
            <app-uptime-timer
              [startedAt]="instance().last_started_at ?? null"
              [isRunning]="isRunning()"
            />
          </div>
        </div>

        <div class="mb-5 grid gap-4 sm:grid-cols-3">
          <div class="rounded-lg bg-gray-800/50 p-3 border border-gray-700/50">
            <div class="flex items-center gap-2 mb-1">
              <svg
                class="h-4 w-4 text-twitch-light"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
              <p class="text-xs font-medium text-gray-400">Streamers</p>
            </div>
            <p class="text-2xl font-bold text-twitch-light">{{ instance().streamers.length }}</p>
          </div>
          <div class="rounded-lg bg-gray-800/50 p-3 border border-gray-700/50">
            <p class="text-xs font-medium text-gray-400 mb-1">Created</p>
            <p class="text-sm text-gray-300 font-medium">{{ formatDate(instance().created_at) }}</p>
          </div>
          <div class="rounded-lg bg-gray-800/50 p-3 border border-gray-700/50">
            <p class="text-xs font-medium text-gray-400 mb-1">Last Started</p>
            <p class="text-sm text-gray-300 font-medium">
              @if (instance().last_started_at) {
                {{ formatDate(instance().last_started_at!) }}
              } @else {
                <span class="text-gray-500">Never</span>
              }
            </p>
          </div>
        </div>

        @if (instance().streamers.length > 0) {
          <div
            class="mb-5 rounded-xl bg-gradient-to-br from-gray-800/70 to-gray-800/30 p-4 border border-gray-700/50"
          >
            <p class="mb-3 text-xs font-semibold text-gray-300 uppercase tracking-wide">Watching</p>
            <div class="flex flex-wrap gap-2">
              @for (streamer of instance().streamers; track streamer) {
                <span
                  class="rounded-lg bg-twitch/10 border border-twitch/30 px-3 py-1.5 text-xs font-medium text-twitch-light transition-all hover:bg-twitch/20 hover:scale-105"
                >
                  {{ streamer }}
                </span>
              }
            </div>
          </div>
        }

        <div class="flex gap-3">
          @if (isRunning() || stopping()) {
            <button
              (click)="stop.emit()"
              [disabled]="actionLoading() || stopping()"
              class="flex-1 rounded-xl bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-700/30 px-4 py-3 text-sm font-bold text-red-300 transition-all duration-200 hover:from-red-900 hover:to-red-800 hover:shadow-lg hover:shadow-red-900/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              @if (actionLoading() || stopping()) {
                <span class="flex items-center justify-center gap-2">
                  <app-loading-spinner size="md" color="red" />
                  Stopping…
                </span>
              } @else {
                Stop
              }
            </button>
          } @else {
            <button
              (click)="start.emit()"
              [disabled]="actionLoading()"
              class="flex-1 rounded-xl bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-700/30 px-4 py-3 text-sm font-bold text-green-300 transition-all duration-200 hover:from-green-900 hover:to-emerald-900 hover:shadow-lg hover:shadow-green-900/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              @if (actionLoading()) {
                <span class="flex items-center justify-center gap-2">
                  <app-loading-spinner size="md" color="green" />
                  Starting…
                </span>
              } @else {
                Start
              }
            </button>
          }
          <a
            [routerLink]="['/instances', instance().id]"
            class="flex-1 rounded-xl bg-gradient-to-r from-twitch to-twitch-dark border border-twitch-light/20 px-4 py-3 text-center text-sm font-bold text-white transition-colors duration-200 hover:from-twitch-dark hover:to-twitch active:scale-95"
          >
            Details
          </a>
          <button
            (click)="delete.emit()"
            [disabled]="actionLoading()"
            class="rounded-xl bg-gray-800/70 border border-gray-700/50 px-3 py-3 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-gray-700 hover:text-red-400 hover:border-red-800/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Delete instance"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>
    }
  `,
})
export class InstanceCard {
  instance = input.required<Instance>();
  compact = input(false);
  actionLoading = input(false);
  ownerName = input<string | null>(null);
  start = output<void>();
  stop = output<void>();
  delete = output<void>();

  stopping = () => this.instance().status === 'stopping';
  isRunning = () => this.instance().status === 'running';

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
