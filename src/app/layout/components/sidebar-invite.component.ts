import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { api } from '../../api/client';
import type { components } from '../../api/schema';
import { ExpiryTimer } from '../../shared/components/expiry-timer';
import { ToastService } from '../../shared/toast.service';

type Code = components['schemas']['RegistrationCodeDetailResponse'];

@Component({
  selector: 'app-sidebar-invite',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ExpiryTimer],
  template: `
    <div class="rounded-xl border border-gray-800 bg-gray-800/30">
      <!-- Header / Toggle -->
      <button
        (click)="expanded.set(!expanded())"
        class="flex w-full items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:text-white"
      >
        <span class="flex items-center gap-2">
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
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
          Invite Codes
        </span>
        <svg
          [class]="
            'h-4 w-4 text-gray-500 transition-transform duration-200 ' +
            (expanded() ? 'rotate-180' : '')
          "
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      @if (expanded()) {
        <div class="border-t border-gray-700/50 px-3 pb-3 pt-2 space-y-2">
          <!-- Generate button -->
          <div class="flex items-center gap-2">
            <select
              (change)="expiresInHours.set(+$any($event.target).value)"
              class="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-300 focus:border-twitch focus:outline-none"
              aria-label="Expiry duration"
            >
              @for (opt of expiryOptions; track opt.value) {
                <option [value]="opt.value" [selected]="opt.value === expiresInHours()">
                  {{ opt.label }}
                </option>
              }
            </select>
            <button
              (click)="generateCode()"
              [disabled]="generating()"
              class="rounded-lg bg-twitch px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-twitch-dark disabled:opacity-50 active:scale-95"
            >
              @if (generating()) {
                <div
                  class="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
                ></div>
              } @else {
                Generate
              }
            </button>
          </div>

          @if (error()) {
            <p class="text-xs text-red-400">{{ error() }}</p>
          }

          <!-- Code list -->
          @if (loading()) {
            <div class="flex justify-center py-3">
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-gray-700 border-t-twitch"
              ></div>
            </div>
          } @else if (codes().length === 0) {
            <p class="py-2 text-center text-xs text-gray-500">No invite codes yet</p>
          } @else {
            <div class="max-h-48 space-y-1.5 overflow-y-auto">
              @for (code of sortedCodes(); track code.id) {
                <div
                  [class]="
                    'group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ' +
                    (code.used_at
                      ? 'bg-gray-900/50 opacity-50'
                      : code.is_valid
                        ? 'bg-gray-900/80'
                        : 'bg-gray-900/50 opacity-50')
                  "
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <!-- Status dot -->
                      @if (code.used_at) {
                        <span class="h-1.5 w-1.5 rounded-full bg-gray-500 shrink-0"></span>
                      } @else if (code.is_valid) {
                        <span class="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0"></span>
                      } @else {
                        <span class="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0"></span>
                      }
                      <span class="truncate font-mono text-gray-300">{{ code.code }}</span>
                    </div>
                    <div class="mt-0.5 pl-3">
                      @if (code.used_at) {
                        <span class="text-gray-500"
                          >Used{{ code.used_by ? ' by ' + code.used_by : '' }}</span
                        >
                      } @else if (code.is_valid) {
                        <app-expiry-timer [expiresAt]="code.expires_at" />
                      } @else {
                        <span class="text-red-400/70">Expired</span>
                      }
                    </div>
                  </div>
                  <div class="flex shrink-0 gap-1">
                    @if (!code.used_at && code.is_valid) {
                      <button
                        (click)="copyCode(code.code)"
                        class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                        [title]="copied() === code.code ? 'Copied!' : 'Copy code'"
                      >
                        @if (copied() === code.code) {
                          <svg
                            class="h-3.5 w-3.5 text-green-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="m4.5 12.75 6 6 9-13.5"
                            />
                          </svg>
                        } @else {
                          <svg
                            class="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                            />
                          </svg>
                        }
                      </button>
                      <button
                        (click)="deleteCode(code.id)"
                        class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-red-400"
                        title="Delete code"
                      >
                        <svg
                          class="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="1.5"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SidebarInviteComponent {
  private toast = inject(ToastService);
  codes = signal<Code[]>([]);
  sortedCodes = computed(() => {
    const allCodes = this.codes();
    return [...allCodes].sort((a, b) => {
      // Valid codes first
      const aValid = a.is_valid && !a.used_at;
      const bValid = b.is_valid && !b.used_at;
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      // Then expired codes
      const aExpired = !a.is_valid && !a.used_at;
      const bExpired = !b.is_valid && !b.used_at;
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;
      // Used codes last, sort by date descending
      return 0;
    });
  });
  loading = signal(false);
  generating = signal(false);
  error = signal('');
  expanded = signal(false);
  copied = signal('');
  expiresInHours = signal(24);

  expiryOptions = [
    { value: 1, label: '1h' },
    { value: 6, label: '6h' },
    { value: 12, label: '12h' },
    { value: 24, label: '24h' },
    { value: 48, label: '48h' },
    { value: 168, label: '7d' },
  ];

  constructor() {
    this.loadCodes();
  }

  async loadCodes() {
    this.loading.set(true);
    try {
      const { data } = await api.GET('/codes/');
      if (data) this.codes.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async generateCode() {
    this.generating.set(true);
    this.error.set('');
    try {
      const { error } = await api.POST('/codes/generate', {
        body: { expires_in_hours: this.expiresInHours() },
      });
      if (error) {
        const msg =
          typeof (error as Record<string, unknown>)['detail'] === 'string'
            ? ((error as Record<string, unknown>)['detail'] as string)
            : 'Failed to generate code';
        this.error.set(msg);
        this.toast.show(msg, 'error');
      } else {
        await this.loadCodes();
        // Auto-expand to show the new code
        this.expanded.set(true);
        this.toast.show('Invite code generated', 'success');
      }
    } catch {
      this.error.set('Failed to generate code');
      this.toast.show('Failed to generate code', 'error');
    } finally {
      this.generating.set(false);
    }
  }

  async deleteCode(codeId: string) {
    try {
      await api.DELETE('/codes/{code_id}', {
        params: { path: { code_id: codeId } },
      });
      await this.loadCodes();
      this.toast.show('Invite code deleted', 'success');
    } catch {
      this.toast.show('Failed to delete code', 'error');
    }
  }

  async copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(code);
      this.toast.show('Code copied to clipboard', 'success');
      setTimeout(() => this.copied.set(''), 2000);
    } catch {
      this.toast.show('Failed to copy code', 'error');
    }
  }
}
