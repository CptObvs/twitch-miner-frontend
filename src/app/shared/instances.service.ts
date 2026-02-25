import { Injectable } from '@angular/core';
import { defer, from, Observable, of, throwError, timer } from 'rxjs';
import { catchError, filter, map, switchMap, take, takeWhile } from 'rxjs/operators';
import { api } from '../api/client';
import type { components } from '../api/schema';

type Instance = components['schemas']['InstanceResponse'];
type InstanceStatus = components['schemas']['InstanceStatus'];
type InstanceCreate = components['schemas']['InstanceCreate'];
type StreamerPoints = components['schemas']['StreamerPointsSnapshot'];

@Injectable({ providedIn: 'root' })
export class InstancesService {
  watchInstance$(
    id: string,
    onUpdate: (instance: Instance | null) => void,
    onError?: () => void,
  ): () => void {
    let subscription = this.get$(id).subscribe({
      next: (instance) => {
        onUpdate(instance);

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

  watchInstances$(
    onUpdate: (instances: Instance[]) => void,
    onError?: (error: string) => void,
  ): () => void {
    const subscriptions: (() => void)[] = [];
    let currentInstances: Instance[] = [];

    const mainSub = this.list$()
      .pipe(catchError(() => of([] as Instance[])))
      .subscribe({
        next: (instances) => {
          currentInstances = instances;
          onUpdate(instances);

          subscriptions.forEach((unsub) => unsub());
          subscriptions.length = 0;

          instances
            .filter((inst) => inst.status === 'stopping')
            .forEach((inst) => {
              const unsub = this.watchInstanceUpdates$(inst.id, (updated) => {
                if (updated) {
                  const current = currentInstances.slice();
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

  list$(): Observable<Instance[]> {
    return defer(() => from(api.GET('/instances/'))).pipe(
      map(({ data, error }) => {
        if (error) throw new Error('Failed to load instances');
        return data;
      }),
      catchError((err) => throwError(() => err)),
    );
  }

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

  create$(body: InstanceCreate): Observable<Instance> {
    return defer(() => from(api.POST('/instances/', { body }))).pipe(
      map(({ data, error }) => {
        if (error || !data) throw new Error('Failed to create instance');
        return data;
      }),
    );
  }

  updateStreamers$(id: string, streamers: string[]): Observable<string[]> {
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
        return streamers;
      }),
    );
  }

  getInstancePoints$(instanceId: string): Observable<StreamerPoints[]> {
    return defer(() =>
      from(
        api.GET('/instances/{instance_id}/points', {
          params: { path: { instance_id: instanceId } },
        }),
      ),
    ).pipe(
      map(({ data, error }) => {
        if (error || !data) throw new Error('Failed to load instance points');
        return data;
      }),
      catchError(() => of([])),
    );
  }

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

  startInstance$(id: string): Observable<Instance | null> {
    return defer(() =>
      from(
        api.POST('/instances/{instance_id}/start', {
          params: { path: { instance_id: id } },
        }),
      ),
    ).pipe(
      switchMap(({ data, error }) => {
        if (error || !data) return of(null);

        if (data.status === 'running') {
          return this.get$(id);
        }

        return this.pollUntilStatus$(id, 'running');
      }),
      catchError(() => of(null)),
    );
  }

  stopInstance$(id: string): Observable<Instance | null> {
    return defer(() =>
      from(
        api.POST('/instances/{instance_id}/stop', {
          params: { path: { instance_id: id } },
        }),
      ),
    ).pipe(
      switchMap(({ data, error }) => {
        if (error || !data) return throwError(() => new Error('Failed to stop instance'));
        return this.get$(id).pipe(
          map((instance) => instance ?? null),
          catchError(() => of(null)),
        );
      }),
      catchError(() =>
        this.get$(id).pipe(
          map((instance) => instance ?? null),
          catchError(() => of(null)),
        ),
      ),
    );
  }

  pollWhileStopping$(id: string): Observable<Instance | null> {
    return timer(0, 2000).pipe(
      switchMap(() => this.get$(id)),
      filter((instance): instance is Instance => instance !== null),
      takeWhile((instance) => instance.status === 'stopping', true),
      take(30),
    );
  }

  private pollUntilStatus$(
    id: string,
    expectedStatus: 'running' | 'stopped',
  ): Observable<Instance | null> {
    return timer(0, 500).pipe(
      switchMap(() => this.getStatus$(id)),
      filter((status): status is InstanceStatus => status !== null),
      takeWhile((status) => status.status !== expectedStatus, true),
      take(12),
      switchMap((status) => {
        if (status.status === expectedStatus) {
          return this.get$(id);
        }
        return of(null);
      }),
      filter((instance): instance is Instance => instance !== null),
      take(1),
      catchError(() => of(null)),
    );
  }
}
