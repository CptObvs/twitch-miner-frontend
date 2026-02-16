import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import type { components } from '../../api/schema';
import { AuthService } from '../../core/auth/auth.service';
import { AdminService } from '../../shared/admin.service';
import { InstancesService } from '../../shared/instances.service';
import { LoadingView } from '../../shared/components/loading-view';
import { ErrorView } from '../../shared/components/error-view';
import { CreateInstanceDialog } from './create-instance-dialog';
import { InstanceCard } from './instance-card';
import { executeActionWithId$ } from '../../shared/rxjs-utils';

type Instance = components['schemas']['InstanceResponse'];

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InstanceCard, CreateInstanceDialog, LoadingView, ErrorView],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly instancesService = inject(InstancesService);
  private readonly adminService = inject(AdminService);
  readonly isAdmin = this.auth.isAdmin;

  instances = signal<Instance[]>([]);
  loading = signal(false);
  error = signal('');
  showCreate = signal(false);

  /** Track which instance IDs have an action in progress */
  private actionLoadingIds = signal(new Set<string>());

  /** Map user_id -> username (populated for admins) */
  private userMap = signal(new Map<string, string>());

  /** Cleanup function for instance watching */
  private cleanupInstanceWatch?: () => void;

  runningCount = computed(() => this.instances().filter((i) => i.status === 'running').length);
  stoppedCount = computed(() => this.instances().filter((i) => i.status === 'stopped').length);

  constructor() {
    this.loadInstances();
    if (this.isAdmin()) {
      this.loadUsers();
    }
  }

  ngOnDestroy() {
    this.cleanupInstanceWatch?.();
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
      const data = await this.adminService.listUsers();
      const map = new Map<string, string>();
      for (const user of data) {
        map.set(user.id, user.username);
      }
      this.userMap.set(map);
    } catch {
      /* non-critical */
    }
  }

  loadInstances() {
    this.loading.set(true);
    this.error.set('');

    // Cleanup old watcher if exists
    this.cleanupInstanceWatch?.();

    // Setup new watcher with auto-polling for stopping instances
    this.cleanupInstanceWatch = this.instancesService.watchInstances$(
      (instances) => {
        this.instances.set(instances);
        this.loading.set(false);
      },
      (errorMsg) => {
        this.error.set(errorMsg);
        this.loading.set(false);
      },
    );
  }

  startInstance(id: string) {
    if (this.isActionLoading(id)) return;

    executeActionWithId$(
      this.instancesService.startInstance$(id),
      id,
      this.actionLoadingIds,
      (updated) => {
        if (updated) {
          this.instances.update((list) => list.map((item) => (item.id === id ? updated : item)));
        } else {
          this.loadInstances();
        }
      },
      () => this.loadInstances(),
    );
  }

  stopInstance(id: string) {
    if (this.isActionLoading(id)) return;

    // Optimistically update status to stopping
    this.instances.update((list) =>
      list.map((item) => (item.id === id ? { ...item, status: 'stopping' as const } : item)),
    );

    // The stop endpoint blocks until the instance is fully stopped
    executeActionWithId$(
      this.instancesService.stopInstance$(id),
      id,
      this.actionLoadingIds,
      (updated) => {
        if (updated) {
          this.instances.update((list) => list.map((item) => (item.id === id ? updated : item)));
        } else {
          this.loadInstances();
        }
      },
      () => this.loadInstances(),
    );
  }

  createInstance(data: { twitch_username: string; streamers: string[] }) {
    this.instancesService
      .create$(data)
      .pipe(catchError(() => of(void 0)))
      .subscribe({
        next: () => {
          this.showCreate.set(false);
          this.loadInstances();
        },
        error: () => {
          /* ignore */
        },
      });
  }

  deleteInstance(id: string) {
    if (this.isActionLoading(id)) return;
    if (!confirm('Are you sure you want to delete this instance?')) return;

    executeActionWithId$(
      this.instancesService.delete$(id),
      id,
      this.actionLoadingIds,
      () => {
        this.instances.update((list) => list.filter((inst) => inst.id !== id));
      },
      () => this.loadInstances(),
    );
  }

  saveStreamers(id: string, streamers: string[]) {
    if (this.isActionLoading(id)) return;

    executeActionWithId$(
      this.instancesService.updateStreamers$(id, streamers),
      id,
      this.actionLoadingIds,
      (updated) => {
        if (updated) {
          this.instances.update((list) => list.map((item) => (item.id === id ? updated : item)));
        } else {
          this.loadInstances();
        }
      },
      () => this.loadInstances(),
    );
  }
}
