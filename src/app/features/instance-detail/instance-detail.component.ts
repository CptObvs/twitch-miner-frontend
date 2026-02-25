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
import type { components } from '../../api/schema';
import { API_BASE_URL } from '../../api/config';
import { AuthService } from '../../core/auth/auth.service';
import { InstancesService } from '../../shared/instances.service';
import { StatusBadge } from '../../shared/components/status-badge';
import { UptimeTimer } from '../../shared/components/uptime-timer';
import { LoadingView } from '../../shared/components/loading-view';
import { ErrorView } from '../../shared/components/error-view';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import { LogViewer } from './components/log-viewer';
import { StreamersEditor } from './components/streamers-editor';
import { executeAction$ } from '../../shared/rxjs-utils';

type Instance = components['schemas']['InstanceResponse'];

@Component({
  selector: 'app-instance-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  imports: [
    RouterLink,
    StatusBadge,
    UptimeTimer,
    LogViewer,
    StreamersEditor,
    LoadingView,
    ErrorView,
    LoadingSpinner,
  ],
  templateUrl: './instance-detail.component.html',
})
export class InstanceDetailComponent {
  private readonly instancesService = inject(InstancesService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  id = input.required<string>();

  instance = signal<Instance | null>(null);
  loading = signal(false);
  error = signal('');
  actionLoading = signal(false);

  private cleanupInstanceWatch?: () => void;

  stopping = computed(() => this.instance()?.status === 'stopping');
  isRunning = computed(() => this.instance()?.status === 'running');
  isTwitchDropsMiner = computed(() => this.instance()?.miner_type === 'TwitchDropsMiner');
  isFirstStart = computed(() => this.isRunning() && !this.instance()?.last_stopped_at);
  uiUrl = computed(() => {
    const path = this.instance()?.ui_url;
    if (!path) return null;
    const token = this.auth.getToken();
    return token ? `${API_BASE_URL}${path}?token=${token}` : null;
  });
  hasActivationCode = computed(() => !!this.instance()?.activation_code);

  constructor() {
    effect(() => {
      this.id();
      this.loadInstance();
    });

    this.destroyRef.onDestroy(() => this.cleanupInstanceWatch?.());
  }

  loadInstance(): void {
    this.loading.set(true);
    this.error.set('');

    this.cleanupInstanceWatch?.();

    this.cleanupInstanceWatch = this.instancesService.watchInstance$(
      this.id(),
      (instance) => {
        if (!instance) {
          this.error.set('Failed to load instance');
        } else {
          this.instance.set(instance);
        }
        this.loading.set(false);
      },
      () => {
        this.error.set('Failed to load instance');
        this.loading.set(false);
      },
    );
  }

  startInstance(): void {
    const current = this.instance();
    if (!current) return;

    this.instance.set({ ...current, status: 'running' as Instance['status'] });

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
    const current = this.instance();
    if (!current) return;

    this.instance.set({ ...current, status: 'stopping' as Instance['status'] });

    executeAction$(
      this.instancesService.stopInstance$(this.id()),
      this.actionLoading,
      () => {
        this.loadInstance();
      },
      () => this.loadInstance(),
    );
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
