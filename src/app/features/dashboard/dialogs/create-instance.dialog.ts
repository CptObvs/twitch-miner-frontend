import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import type { components } from '../../../api/schema';

type InstanceCreate = components['schemas']['InstanceCreate'];
type MinerType = components['schemas']['MinerType'];

@Component({
  selector: 'app-create-instance-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinner, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      (click)="close.emit()"
      role="dialog"
      aria-modal="true"
      aria-label="Create new instance"
    >
      <div
        class="w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 rounded-2xl border border-gray-700/50 bg-gradient-to-b from-gray-900 to-gray-900/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="mb-5 flex items-center gap-3">
          <div
            class="rounded-xl bg-gradient-to-br from-twitch/20 to-twitch-dark/20 p-2.5 ring-1 ring-twitch/30"
          >
            <svg
              class="h-5 w-5 text-twitch-light"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-100">New Miner Instance</h2>
            <p class="text-xs text-gray-500 mt-0.5">Choose miner type and configure</p>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Miner Type Toggle -->
          <div class="flex rounded-xl border border-gray-700/50 p-1 bg-gray-800/50 gap-1">
            <button
              type="button"
              (click)="minerType.set('TwitchDropsMiner')"
              [class]="
                'flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-all duration-200 ' +
                (minerType() === 'TwitchDropsMiner'
                  ? 'bg-twitch text-white shadow-md shadow-twitch/30'
                  : 'text-gray-400 hover:text-gray-200')
              "
            >
              Twitch Drops Miner
            </button>
            <button
              type="button"
              (click)="minerType.set('TwitchPointsMinerV2')"
              [class]="
                'flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-all duration-200 ' +
                (minerType() === 'TwitchPointsMinerV2'
                  ? 'bg-twitch text-white shadow-md shadow-twitch/30'
                  : 'text-gray-400 hover:text-gray-200')
              "
            >
              Twitch Miner V2
            </button>
          </div>

          <!-- Miner type description -->
          @if (minerType() === 'TwitchDropsMiner') {
            <div class="rounded-xl border border-gray-700/40 bg-gray-800/40 p-3.5">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2.5">
                Features
              </p>
              <ul class="space-y-1.5">
                <li class="flex items-start gap-2">
                  <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-twitch"></span>
                  <span class="text-xs text-gray-300"
                    >Claim
                    <span class="text-gray-100 font-medium">game-specific drops</span>
                    automatically</span
                  >
                </li>
                <li class="flex items-start gap-2">
                  <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-twitch"></span>
                  <span class="text-xs text-gray-300"
                    >Managed via built-in
                    <span class="text-gray-100 font-medium">Miner UI</span></span
                  >
                </li>
                <li class="flex items-start gap-2">
                  <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-twitch"></span>
                  <span class="text-xs text-gray-300">Detects new drop events automatically</span>
                </li>
              </ul>
            </div>
          }

          @if (minerType() === 'TwitchPointsMinerV2') {
            <div class="rounded-xl border border-gray-700/40 bg-gray-800/40 p-3.5">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2.5">
                Features
              </p>
              <ul class="space-y-1.5">
                <li class="flex items-start gap-2">
                  <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-twitch"></span>
                  <span class="text-xs text-gray-300"
                    >Farm <span class="text-gray-100 font-medium">channel points</span> per
                    streamer</span
                  >
                </li>
                <li class="flex items-start gap-2">
                  <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-twitch"></span>
                  <span class="text-xs text-gray-300"
                    >Claim <span class="text-gray-100 font-medium">drops</span> while watching</span
                  >
                </li>
                <li class="flex items-start gap-2">
                  <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-twitch"></span>
                  <span class="text-xs text-gray-300"
                    >Ideal for <span class="text-gray-100 font-medium">lurking</span> specific
                    streamers</span
                  >
                </li>
                <li class="flex items-start gap-2">
                  <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-twitch/50"></span>
                  <span class="text-xs text-gray-500"
                    ><span class="text-gray-400 font-medium">Betting system</span> — configurable in
                    a future update</span
                  >
                </li>
              </ul>
            </div>
          }

          <!-- Twitch Points Miner V2 fields -->
          @if (minerType() === 'TwitchPointsMinerV2') {
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-400 mb-1.5"
                  >Twitch Username <span class="text-red-400">*</span></label
                >
                <input
                  type="text"
                  [(ngModel)]="twitchUsernameVal"
                  placeholder="your_twitch_name"
                  class="w-full rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-twitch/50 focus:outline-none focus:ring-1 focus:ring-twitch/30"
                />
              </div>

              <!-- Streamers -->
              <div>
                <label class="block text-xs font-medium text-gray-400 mb-1.5"
                  >Streamers to watch</label
                >
                <input
                  type="text"
                  [(ngModel)]="streamersVal"
                  placeholder="xqc, theburntpeanut, …"
                  class="w-full rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-twitch/50 focus:outline-none focus:ring-1 focus:ring-twitch/30"
                />
              </div>
            </div>

            @if (validationError()) {
              <p class="text-xs text-red-400">{{ validationError() }}</p>
            }
          }
        </div>

        <!-- Actions -->
        <div class="mt-5 flex justify-end gap-3">
          <button
            type="button"
            (click)="close.emit()"
            class="rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all duration-200 hover:bg-gray-700 hover:text-white active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="onConfirm()"
            [disabled]="loading()"
            class="group relative overflow-hidden rounded-xl bg-gradient-to-r from-twitch to-twitch-dark px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-twitch/30 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-twitch/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            <div
              class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            ></div>
            <span class="relative flex items-center justify-center gap-2">
              @if (loading()) {
                <app-loading-spinner size="sm" color="white" />
                Creating...
              } @else {
                Create
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CreateInstanceDialog {
  close = output<void>();
  created = output<InstanceCreate>();

  loading = signal(false);
  minerType = signal<MinerType>('TwitchPointsMinerV2');
  twitchUsernameVal = '';
  streamersVal = '';
  validationError = signal('');

  onConfirm(): void {
    this.validationError.set('');
    if (this.minerType() === 'TwitchPointsMinerV2' && !this.twitchUsernameVal.trim()) {
      this.validationError.set('Twitch Username is required for Twitch Points Miner V2.');
      return;
    }
    const body: InstanceCreate = {
      miner_type: this.minerType(),
      streamers: [],
    };
    if (this.minerType() === 'TwitchPointsMinerV2') {
      body.twitch_username = this.twitchUsernameVal.trim();
      body.streamers = this.streamersVal
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    this.created.emit(body);
  }
}
