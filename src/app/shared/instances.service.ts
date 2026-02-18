import { Injectable } from '@angular/core';
import { defer, from, Observable, of, throwError, timer } from 'rxjs';
import { catchError, filter, map, switchMap, take, takeWhile } from 'rxjs/operators';
import { api } from '../api/client';
import type { components } from '../api/schema';

type Instance = components['schemas']['InstanceResponse'];
type InstanceStatus = components['schemas']['InstanceStatus'];
type InstancePointsSnapshot = components['schemas']['InstancePointsSnapshotResponse'];

@Injectable({ providedIn: 'root' })
export class InstancesService {
  /**
   * Subscribe to instance updates and auto-poll if stopping.
   * Returns a cleanup function to unsubscribe.
   */
  watchInstance$(
    id: string,
    onUpdate: (instance: Instance | null) => void,
    onError?: () => void,
  ): () => void {
    let subscription = this.get$(id).subscribe({
      next: (instance) => {
        onUpdate(instance);

        // If instance is in 'stopping' state, start polling
        if (instance?.status === 'stopping') {
          subscription.unsubscribe();
          subscription = this.pollWhileStopping$(id).subscribe({
            next: onUpdate,
            error: onError,
          });
        }
      },
      error: onError,
    });

    return () => subscription.unsubscribe();
  }

  /**
   * Subscribe to multiple instances and auto-poll any that are stopping.
   * Returns a cleanup function to unsubscribe all.
   */
  watchInstances$(
    onUpdate: (instances: Instance[]) => void,
    onError?: (error: string) => void,
  ): () => void {
    const subscriptions: (() => void)[] = [];

    const mainSub = this.list$()
      .pipe(catchError(() => of([] as Instance[])))
      .subscribe({
        next: (instances) => {
          onUpdate(instances);

          // Clean up old subscriptions
          subscriptions.forEach((unsub) => unsub());
          subscriptions.length = 0;

          // Setup polling for any stopping instances
          instances
            .filter((inst) => inst.status === 'stopping')
            .forEach((inst) => {
              const unsub = this.watchInstanceUpdates$(inst.id, (updated) => {
                if (updated) {
                  // Update this instance in the list
                  const current = instances.slice();
                  const index = current.findIndex((i) => i.id === inst.id);
                  if (index !== -1) {
                    current[index] = updated;
                    onUpdate(current);
                  }
                }
              });
              subscriptions.push(unsub);
            });
        },
        error: (err) => {
          onError?.(err instanceof Error ? err.message : 'Failed to load instances');
        },
      });

    return () => {
      mainSub.unsubscribe();
      subscriptions.forEach((unsub) => unsub());
    };
  }

  /**
   * Watch for updates to a single instance (for polling stopping state).
   */
  private watchInstanceUpdates$(
    id: string,
    onUpdate: (instance: Instance | null) => void,
  ): () => void {
    const subscription = this.pollWhileStopping$(id).subscribe({
      next: onUpdate,
      error: () => {
        /* ignore errors during polling */
      },
    });

    return () => subscription.unsubscribe();
  }
  /**
   * List all instances as Observable
   */
  list$(): Observable<Instance[]> {
    return defer(() => from(api.GET('/instances/'))).pipe(
      map(({ data, error }) => {
        if (error) throw new Error('Failed to load instances');
        return data;
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  /**
   * Get single instance as Observable
   */
  get$(id: string): Observable<Instance | null> {
    return defer(() =>
      from(
        api.GET('/instances/{instance_id}', {
          params: { path: { instance_id: id } },
        }),
      ),
    ).pipe(
      map(({ data, error }) => {
        if (error) return null;
        return data;
      }),
      catchError(() => of(null)),
    );
  }

  /**
   * Get instance status as Observable
   */
  getStatus$(id: string): Observable<InstanceStatus | null> {
    return defer(() =>
      from(
        api.GET('/instances/{instance_id}/status', {
          params: { path: { instance_id: id } },
        }),
      ),
    ).pipe(
      map(({ data, error }) => {
        if (error) return null;
        return data;
      }),
      catchError(() => of(null)),
    );
  }

  /**
   * Create instance as Observable
   */
  create$(payload: { twitch_username: string; streamers: string[] }): Observable<void> {
    return defer(() => from(api.POST('/instances/', { body: payload }))).pipe(
      map(({ error }) => {
        if (error) throw new Error('Failed to create instance');
      }),
    );
  }

  /**
   * Delete instance as Observable
   */
  delete$(id: string): Observable<void> {
    return defer(() =>
      from(
        api.DELETE('/instances/{instance_id}', {
          params: { path: { instance_id: id } },
        }),
      ),
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error('Failed to delete instance');
      }),
    );
  }

  /**
   * Start instance with polling until running
   */
  startInstance$(id: string): Observable<Instance | null> {
    return defer(() =>
      from(
        api.POST('/instances/{instance_id}/start', {
          params: { path: { instance_id: id } },
        }),
      ),
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) return of(null);

        // If immediately running, return instance
        if (data && data.status === 'running') {
          return this.get$(id).pipe(
            map((instance) => {
              if (!instance) return null;
              return {
                ...instance,
                activation_url: data.activation_url ?? instance.activation_url ?? null,
                activation_code: data.activation_code ?? instance.activation_code ?? null,
              };
            }),
          );
        }

        // Otherwise poll until running
        return this.pollUntilStatus$(id, 'running');
      }),
      catchError(() => of(null)),
    );
  }

  /**
   * Stop instance - waits for backend to complete the stop operation
   * The backend blocks until the process has fully exited
   */
  stopInstance$(id: string): Observable<Instance | null> {
    return defer(() =>
      from(
        api.POST('/instances/{instance_id}/stop', {
          params: { path: { instance_id: id } },
        }),
      ),
    ).pipe(
      switchMap(({ error }) => {
        if (error) return throwError(() => new Error('Failed to stop instance'));
        // Backend has finished stopping, fetch final state
        return this.get$(id);
      }),
      catchError(() => this.get$(id)),
    );
  }

  /**
   * Poll instance status while it's in 'stopping' state
   * Use this when page is reloaded and instance is already stopping
   */
  pollWhileStopping$(id: string): Observable<Instance | null> {
    return timer(0, 2000).pipe(
      // Poll every 2 seconds
      switchMap(() => this.get$(id)),
      filter((instance): instance is Instance => instance !== null),
      takeWhile((instance) => instance.status === 'stopping', true),
      take(30), // Max 60 seconds
    );
  }

  /**
   * Update streamers list as Observable
   */
  updateStreamers$(id: string, streamers: string[]): Observable<Instance> {
    return defer(() =>
      from(
        api.PUT('/instances/{instance_id}/streamers', {
          params: { path: { instance_id: id } },
          body: { streamers },
        }),
      ),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error('Failed to update streamers');
        return data as Instance;
      }),
    );
  }

  getPointsSnapshot$(options?: {
    refresh?: boolean;
    historyLines?: number;
  }): Observable<Record<string, Record<string, string>>> {
    return defer(() =>
      from(
        api.GET('/instances/points-snapshot', {
          params: {
            query: {
              refresh: options?.refresh,
              history_lines: options?.historyLines,
            },
          },
        }),
      ),
    ).pipe(
      map(({ data, error }) => {
        if (error || !data) return {};

        const byInstance: Record<string, Record<string, string>> = {};
        for (const entry of data as InstancePointsSnapshot[]) {
          const streamers = entry.streamers ?? [];
          byInstance[entry.instance_id] = streamers.reduce<Record<string, string>>((acc, item) => {
            acc[item.streamer] = item.channel_points;
            return acc;
          }, {});
        }
        return byInstance;
      }),
      catchError(() => of({})),
    );
  }

  /**
   * Poll instance status until it reaches expected state
   */
  private pollUntilStatus$(
    id: string,
    expectedStatus: 'running' | 'stopped',
  ): Observable<Instance | null> {
    return timer(0, 500).pipe(
      switchMap(() => this.getStatus$(id)),
      filter((status): status is InstanceStatus => status !== null),
      takeWhile((status) => status.status !== expectedStatus, true),
      take(12), // Max 6 seconds
      switchMap((status) => {
        // When status matches, fetch full instance
        if (status.status === expectedStatus) {
          return this.get$(id);
        }
        // Otherwise return null and continue polling
        return of(null);
      }),
      filter((instance): instance is Instance => instance !== null),
      take(1),
      catchError(() => of(null)),
    );
  }

  // Legacy Promise-based methods for backward compatibility
  async list(): Promise<Instance[]> {
    const { data, error } = await api.GET('/instances/');
    if (error) throw new Error('Failed to load instances');
    return data;
  }

  async get(id: string): Promise<Instance | null> {
    const { data, error } = await api.GET('/instances/{instance_id}', {
      params: { path: { instance_id: id } },
    });
    if (error) return null;
    return data;
  }
}
