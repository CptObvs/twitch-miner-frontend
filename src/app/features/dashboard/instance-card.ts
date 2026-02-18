import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { components } from '../../api/schema';
import { StatusBadge } from '../../shared/components/status-badge';
import { UptimeTimer } from '../../shared/components/uptime-timer';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import { StreamersEditor } from '../instance-detail/streamers-editor';
import { LogViewer } from '../instance-detail/log-viewer';

type Instance = components['schemas']['InstanceResponse'];

@Component({
  selector: 'app-instance-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, UptimeTimer, LoadingSpinner, StreamersEditor, LogViewer],
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
          {{ (instance().streamers ?? []).length }}
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
          'group relative rounded-xl border backdrop-blur-xl ' +
          (isRunning()
            ? 'border-twitch/30 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-twitch/5 shadow-lg shadow-twitch/15'
            : 'border-gray-800 bg-gray-900/80')
        "
      >
        <div class="p-4">
          <!-- Header -->
          <div class="mb-4 flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <a
                [routerLink]="['/instances', instance().id]"
                class="block text-lg sm:text-xl font-bold transition-all duration-200 truncate"
                [class]="
                  isRunning()
                    ? 'gradient-text hover:opacity-80'
                    : 'text-gray-100 hover:text-twitch-light'
                "
              >
                {{ instance().twitch_username }}
              </a>
            </div>
            <app-status-badge [running]="isRunning()" [stopping]="stopping()" />
          </div>

          <!-- Stats Grid -->
          <div class="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-gray-800/30 p-3 border border-gray-700/30">
              <p class="text-gray-400">Streamers</p>
              <p class="text-lg font-bold text-twitch-light">
                {{ (instance().streamers ?? []).length }}
              </p>
            </div>
            <div class="rounded-lg bg-gray-800/30 p-3 border border-gray-700/30">
              <p class="text-gray-400">Uptime</p>
              <app-uptime-timer
                [startedAt]="instance().last_started_at ?? null"
                [isRunning]="isRunning()"
              />
            </div>
          </div>

          <!-- Streamers Editor -->
          <div class="mb-4">
            <app-streamers-editor
              [streamers]="instance().streamers ?? []"
              [streamerPoints]="streamerPoints()"
              [compact]="true"
              (save)="saveStreamers.emit($event)"
            />
          </div>

          <!-- Activation Code -->
          @if (
            instance().activation_code && dismissedActivationCode() !== instance().activation_code
          ) {
            <div class="mb-4 rounded-lg border border-twitch/30 bg-twitch/5 p-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <p class="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                  Activation Code
                </p>
                <button
                  (click)="dismissActivationCode()"
                  class="rounded p-1 text-gray-400 hover:text-gray-200 transition-colors"
                  type="button"
                  aria-label="Hide activation code"
                  title="Hide activation code"
                >
                  <svg
                    class="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p class="font-mono text-lg font-bold text-twitch-light mb-3">
                {{ instance().activation_code }}
              </p>
              <a
                [href]="instance().activation_url || 'https://www.twitch.tv/activate'"
                target="_blank"
                rel="noopener"
                class="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-3 py-1.5 rounded-lg bg-twitch/20 border border-twitch/40 text-xs font-semibold text-twitch-light hover:bg-twitch/30 transition-colors"
              >
                <svg
                  class="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  ></path>
                </svg>
                twitch.tv/activate
              </a>
            </div>
          }

          <!-- Action Buttons -->
          <div class="mb-4 flex flex-col sm:flex-row gap-2 justify-center">
            @if (isRunning() || stopping()) {
              <button
                (click)="stop.emit()"
                [disabled]="actionLoading() || stopping()"
                class="w-full sm:flex-1 sm:max-w-xs rounded-lg bg-red-900/40 border border-red-700/30 px-4 py-2 text-sm font-bold text-red-300 transition-all hover:bg-red-900/70 active:scale-95 disabled:opacity-50"
              >
                @if (actionLoading() || stopping()) {
                  <span class="flex items-center justify-center gap-1.5">
                    <div
                      class="h-2.5 w-2.5 animate-spin rounded-full border border-red-300 border-t-transparent"
                    ></div>
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
                class="w-full sm:flex-1 sm:max-w-xs rounded-lg bg-green-900/40 border border-green-700/30 px-4 py-2 text-sm font-bold text-green-300 transition-all hover:bg-green-900/70 active:scale-95 disabled:opacity-50"
              >
                @if (actionLoading()) {
                  <span class="flex items-center justify-center gap-1.5">
                    <div
                      class="h-2.5 w-2.5 animate-spin rounded-full border border-green-300 border-t-transparent"
                    ></div>
                    Starting…
                  </span>
                } @else {
                  Start
                }
              </button>
            }
            <button
              (click)="delete.emit()"
              [disabled]="actionLoading()"
              class="w-full sm:w-auto rounded-lg bg-gray-800/50 border border-gray-700/30 p-2 text-gray-500 transition-all hover:bg-gray-700 hover:text-red-400 active:scale-95 disabled:opacity-50"
              title="Delete instance"
            >
              <span class="flex items-center justify-center">
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
                  ></path>
                </svg>
              </span>
            </button>
          </div>

          <!-- Console Output -->
          <app-log-viewer [instanceId]="instance().id" [compact]="true" />
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
  streamerPoints = input<Record<string, string>>({});

  start = output<void>();
  stop = output<void>();
  delete = output<void>();
  saveStreamers = output<string[]>();

  dismissedActivationCode = signal<string | null>(null);

  stopping = () => this.instance().status === 'stopping';
  isRunning = () => this.instance().status === 'running';

  dismissActivationCode() {
    this.dismissedActivationCode.set(this.instance().activation_code ?? null);
  }
}
