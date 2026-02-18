import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-streamers-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  styles: `
    :host {
      display: block;
    }
  `,
  template: `
    @if (compact()) {
      <!-- Compact mode for dashboard -->
      <div class="space-y-2">
        <div class="flex gap-2">
          <input
            [formControl]="newStreamer"
            type="text"
            class="flex-1 min-w-0 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:border-twitch focus:ring-1 focus:ring-twitch focus:outline-none transition-colors sm:px-3.5 sm:py-2.5 sm:text-sm"
            placeholder="Add streamer…"
            (keydown.enter)="addStreamer()"
          />
          <button
            (click)="addStreamer()"
            class="shrink-0 rounded-lg bg-twitch px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-twitch-dark active:scale-95 transition-all sm:px-3.5 sm:py-2.5 sm:text-sm"
          >
            Add
          </button>
        </div>

        @if (localStreamers().length > 0) {
          <div class="flex flex-wrap gap-1.5">
            @for (name of localStreamers(); track name) {
              <span
                class="inline-flex items-center gap-1 rounded-full bg-gray-800/50 border border-gray-700/50 px-2.5 py-1 text-xs text-gray-300 sm:text-sm"
              >
                {{ name }}
                @if (pointsFor(name); as points) {
                  <span class="text-gray-500">|</span>
                  <span class="text-gray-400 tabular-nums">{{ points }}</span>
                }
                <button
                  (click)="removeStreamer(name)"
                  class="ml-0.5 text-gray-500 hover:text-red-400 transition-colors"
                  [attr.aria-label]="'Remove ' + name"
                >
                  ×
                </button>
              </span>
            }
          </div>
        }

        @if (dirty()) {
          <div class="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              (click)="save.emit(localStreamers())"
              class="w-full sm:w-auto rounded-lg bg-green-900/50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-green-300 hover:bg-green-900 active:scale-95 transition-all"
            >
              Save
            </button>
            <button
              (click)="reset()"
              class="w-full sm:w-auto rounded-lg bg-gray-800 px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-400 hover:bg-gray-700 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        }
      </div>
    } @else {
      <!-- Full mode for details page -->
      <div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h3 class="mb-3 text-sm font-semibold text-gray-300">Streamers</h3>

        <div class="mb-3 flex gap-2">
          <input
            [formControl]="newStreamer"
            type="text"
            class="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-twitch focus:ring-1 focus:ring-twitch focus:outline-none"
            placeholder="Add streamer(s), comma separated"
            (keydown.enter)="addStreamer()"
          />
          <button
            (click)="addStreamer()"
            class="rounded-lg bg-twitch px-3 py-1.5 text-sm font-medium text-white hover:bg-twitch-dark"
          >
            Add
          </button>
        </div>

        @if (localStreamers().length === 0) {
          <p class="text-sm text-gray-500">No streamers configured.</p>
        } @else {
          <div class="flex flex-wrap gap-2">
            @for (name of localStreamers(); track name) {
              <span
                class="inline-flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300"
              >
                {{ name }}
                @if (pointsFor(name); as points) {
                  <span class="text-gray-500">|</span>
                  <span class="text-gray-400 tabular-nums">{{ points }}</span>
                }
                <button
                  (click)="removeStreamer(name)"
                  class="ml-1 text-gray-500 hover:text-red-400"
                  [attr.aria-label]="'Remove ' + name"
                >
                  &times;
                </button>
              </span>
            }
          </div>
        }

        @if (dirty()) {
          <div class="mt-3 flex gap-2">
            <button
              (click)="save.emit(localStreamers())"
              class="rounded-lg bg-green-900/50 px-3 py-1.5 text-sm font-medium text-green-300 hover:bg-green-900"
            >
              Save Changes
            </button>
            <button
              (click)="reset()"
              class="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-400 hover:bg-gray-700"
            >
              Discard
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class StreamersEditor {
  private fb = inject(NonNullableFormBuilder);

  streamers = input.required<string[]>();
  streamerPoints = input<Record<string, string>>({});
  save = output<string[]>();
  compact = input(false);

  localStreamers = signal<string[]>([]);
  dirty = signal(false);

  newStreamer = this.fb.control('', Validators.required);

  ngOnChanges() {
    this.localStreamers.set([...this.streamers()]);
    this.dirty.set(false);
  }

  addStreamer() {
    const raw = this.newStreamer.value.trim();
    if (!raw) return;

    const names = raw
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (names.length === 0) return;

    this.localStreamers.update((list) => {
      const existing = new Set(list);
      const next = [...list];
      for (const name of names) {
        if (!existing.has(name)) {
          next.push(name);
          existing.add(name);
        }
      }
      return next;
    });

    this.newStreamer.reset();
    this.dirty.set(true);
  }

  removeStreamer(name: string) {
    this.localStreamers.update((list) => list.filter((s) => s !== name));
    this.dirty.set(true);
  }

  reset() {
    this.localStreamers.set([...this.streamers()]);
    this.dirty.set(false);
  }

  pointsFor(streamerName: string): string | null {
    const pointsMap = this.streamerPoints();
    return pointsMap[streamerName] ?? pointsMap[streamerName.toLowerCase()] ?? null;
  }
}
