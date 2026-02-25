import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import type { components } from '../../api/schema';
import { AuthService } from '../../core/auth/auth.service';
import { AdminService } from '../../shared/admin.service';
import { InstancesService } from '../../shared/instances.service';
import { LoadingView } from '../../shared/components/loading-view';
import { ErrorView } from '../../shared/components/error-view';
import { CreateInstanceDialog } from './dialogs/create-instance.dialog';
import { InstanceCard } from './components/instance-card';
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

  private actionLoadingIds = signal(new Set<string>());
  private userMap = signal(new Map<string, string>());
  private cleanupInstanceWatch?: () => void;

  runningCount = computed(() => this.instances().filter((i) => i.status === 'running').length);
  stoppedCount = computed(() => this.instances().filter((i) => i.status === 'stopped').length);
  useCompact = computed(() => this.isAdmin() || this.instances().length > 2);

  constructor() {
    this.loadInstances();
    if (this.isAdmin()) {
      this.loadUsers();
    }
  }

  ngOnDestroy() {
    this.cleanupInstanceWatch?.();
  }

  isActionLoading(id: string): boolean {
    return this.actionLoadingIds().has(id);
  }

  getUserName(userId: string): string | null {
    return this.userMap().get(userId) ?? null;
  }

  private loadUsers() {
    this.adminService
      .listUsers$()
      .pipe(catchError(() => of([])))
      .subscribe((users) => {
        const map = new Map<string, string>();
        for (const user of users) {
          map.set(user.id, user.username);
        }
        this.userMap.set(map);
      });
  }

  loadInstances() {
    this.loading.set(true);
    this.error.set('');

    this.cleanupInstanceWatch?.();

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

    this.instances.update((list) =>
      list.map((item) => (item.id === id ? { ...item, status: 'stopping' as const } : item)),
    );

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

  createInstance(body: components['schemas']['InstanceCreate']) {
    this.instancesService
      .create$(body)
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: () => {
          this.showCreate.set(false);
          this.loadInstances();
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
}
