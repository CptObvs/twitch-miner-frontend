import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
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
  id = input.required<string>();

  // State
  instance = signal<Instance | null>(null);
  streamerPoints = signal<Record<string, string>>({});
  loading = signal(false);
  error = signal('');
  actionLoading = signal(false);

  // Lifecycle
  private cleanupInstanceWatch?: () => void;

  // Computed
  stopping = () => this.instance()?.status === 'stopping';
  isRunning = () => this.instance()?.status === 'running';

  ngOnInit(): void {
    this.loadInstance();
  }

  ngOnDestroy(): void {
    this.cleanupInstanceWatch?.();
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
    executeAction$(
      this.instancesService.startInstance$(this.id()),
      this.actionLoading,
      (updated) => {
        if (updated) {
          this.instance.set(updated);
        } else {
          this.loadInstance();
        }
      },
      () => this.loadInstance(),
    );
  }

  stopInstance(): void {
    executeAction$(
      this.instancesService.stopInstance$(this.id()),
      this.actionLoading,
      (updated) => {
        if (updated) {
          this.instance.set(updated);
        } else {
          this.loadInstance();
        }
      },
      () => this.loadInstance(),
    );
  }

  saveStreamers(streamers: string[]): void {
    this.instancesService
      .updateStreamers$(this.id(), streamers)
      .pipe(catchError(() => of(void 0)))
      .subscribe({
        next: () => {
          this.loadInstance();
        },
      });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
