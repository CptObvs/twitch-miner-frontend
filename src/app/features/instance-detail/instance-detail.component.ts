import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import type { components } from '../../api/schema';
import { InstancesService } from '../../shared/instances.service';
import { StatusBadge } from '../../shared/components/status-badge';
import { UptimeTimer } from '../../shared/components/uptime-timer';
import { LoadingView } from '../../shared/components/loading-view';
import { ErrorView } from '../../shared/components/error-view';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import { StreamersEditor } from './components/streamers-editor';
import { LogViewer } from './components/log-viewer';
import { executeAction$ } from '../../shared/rxjs-utils';

type Instance = components['schemas']['InstanceResponse'];

@Component({
  selector: 'app-instance-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    StatusBadge,
    UptimeTimer,
    StreamersEditor,
    LogViewer,
    LoadingView,
    ErrorView,
    LoadingSpinner,
  ],
  templateUrl: './instance-detail.component.html',
})
export class InstanceDetailComponent {
  private readonly instancesService = inject(InstancesService);
  private readonly destroyRef = inject(DestroyRef);
  id = input.required<string>();

  // State
  instance = signal<Instance | null>(null);
  streamerPoints = signal<Record<string, string>>({});
  loading = signal(false);
  error = signal('');
  actionLoading = signal(false);
  analyticsLoading = signal(false);
  analyticsSaved = signal(false);
  logsLoading = signal(false);
  streamersSaved = signal(false);

  // Lifecycle
  private cleanupInstanceWatch?: () => void;

  // Computed
  stopping = computed(() => this.instance()?.status === 'stopping');
  isRunning = computed(() => this.instance()?.status === 'running');

  constructor() {
    // Auto-load instance when id changes
    effect(() => {
      this.id(); // track id signal
      this.loadInstance();
    });

    // Cleanup watcher on destroy
    this.destroyRef.onDestroy(() => this.cleanupInstanceWatch?.());
  }

  loadInstance(): void {
    this.loading.set(true);
    this.error.set('');

    // Cleanup old watcher if exists
    this.cleanupInstanceWatch?.();

    // Setup new watcher with auto-polling if stopping
    this.cleanupInstanceWatch = this.instancesService.watchInstance$(
      this.id(),
      (instance) => {
        if (!instance) {
          this.error.set('Failed to load instance');
          this.streamerPoints.set({});
        } else {
          this.instance.set(instance);
          this.loadStreamerPoints();
        }
        this.loading.set(false);
      },
      () => {
        this.error.set('Failed to load instance');
        this.streamerPoints.set({});
        this.loading.set(false);
      },
    );
  }

  loadStreamerPoints(forceRefresh = false): void {
    const instanceId = this.instance()?.id;
    if (!instanceId) {
      this.streamerPoints.set({});
      return;
    }

    this.instancesService
      .getPointsSnapshot$({ refresh: forceRefresh })
      .subscribe((snapshot) => this.streamerPoints.set(snapshot[instanceId] ?? {}));
  }

  startInstance(): void {
    const current = this.instance();
    if (!current) return;

    // Optimistic update: show running state immediately
    this.instance.set({ ...current, status: 'running' as Instance['status'] });

    executeAction$(
      this.instancesService.startInstance$(this.id()),
      this.actionLoading,
      (updated) => {
        if (updated) {
          this.instance.set(updated);
          this.loadStreamerPoints();
        } else {
          this.loadInstance();
        }
      },
      () => this.loadInstance(),
    );
  }

  stopInstance(): void {
    const current = this.instance();
    if (!current) return;

    // Optimistic update: show stopping state immediately
    this.instance.set({ ...current, status: 'stopping' as Instance['status'] });

    executeAction$(
      this.instancesService.stopInstance$(this.id()),
      this.actionLoading,
      () => {
        // Re-establish watcher to poll while stopping
        this.loadInstance();
      },
      () => this.loadInstance(),
    );
  }

  saveStreamers(streamers: string[]): void {
    this.streamersSaved.set(true);
    setTimeout(() => this.streamersSaved.set(false), 5000);

    this.instancesService
      .updateStreamers$(this.id(), streamers)
      .pipe(catchError(() => of(void 0)))
      .subscribe({
        next: () => {
          this.loadInstance();
        },
      });
  }

  toggleAnalytics(): void {
    const current = this.instance();
    if (!current) return;

    // Optimistic update
    const newState = !current.enable_analytics;
    this.instance.set({ ...current, enable_analytics: newState });
    this.analyticsSaved.set(true);
    setTimeout(() => this.analyticsSaved.set(false), 5000);

    this.analyticsLoading.set(true);
    this.instancesService.updateAnalytics$(this.id(), newState).subscribe({
      next: (updated) => {
        this.instance.set(updated);
        this.analyticsLoading.set(false);
      },
      error: () => {
        // Revert optimistic update on failure
        this.instance.set(current);
        this.analyticsLoading.set(false);
      },
    });
  }

  clearLogs(): void {
    this.logsLoading.set(true);
    this.instancesService
      .clearLogs$(this.id())
      .pipe(catchError(() => of(void 0)))
      .subscribe({
        next: () => {
          this.logsLoading.set(false);
        },
        error: () => {
          this.logsLoading.set(false);
        },
      });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
