import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, Subscription, defer, from, of, throwError } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import { api } from '../api/client';
import type { components } from '../api/schema';
import { SocketService } from './socket.service';

type Instance = components['schemas']['InstanceResponse'];
type InstanceStatus = components['schemas']['InstanceStatus'];
type InstanceCreate = components['schemas']['InstanceCreate'];
type StreamerPoints = components['schemas']['StreamerPointsSnapshot'];

@Injectable({ providedIn: 'root' })
export class InstancesService {
  private socket = inject(SocketService);

  watchInstance$(
    id: string,
    onUpdate: (instance: Instance | null) => void,
    onError?: () => void,
  ): () => void {
    this.socket.connect();

    const initialSub = this.get$(id).subscribe({
      next: onUpdate,
      error: onError,
    });

    // Live updates via Socket.IO — re-fetch full instance when a status update arrives
    const socketSub = this.socket.instanceUpdates$
      .pipe(
        filter((update) => update.id === id),
        switchMap(() => this.get$(id).pipe(catchError(() => of(null)))),
      )
      .subscribe({ next: onUpdate });

    return () => {
      initialSub.unsubscribe();
      socketSub.unsubscribe();
    };
  }

  watchInstances$(
    onUpdate: (instances: Instance[]) => void,
    onError?: (error: string) => void,
  ): () => void {
    this.socket.connect();
    let currentInstances: Instance[] = [];

    const mainSub = this.list$()
      .pipe(catchError(() => of([] as Instance[])))
      .subscribe({
        next: (instances) => {
          currentInstances = instances;
          onUpdate(instances);
        },
        error: (err) => {
          onError?.(err instanceof Error ? err.message : 'Failed to load instances');
        },
      });

    // Merge partial status updates from Socket.IO into the cached list
    const socketSub = this.socket.instanceUpdates$.subscribe((update) => {
      const idx = currentInstances.findIndex((i) => i.id === update.id);
      if (idx !== -1) {
        const merged = { ...currentInstances[idx], ...update } as Instance;
        const newList = [...currentInstances];
        newList[idx] = merged;
        currentInstances = newList;
        onUpdate(currentInstances);
      }
    });

    return () => {
      mainSub.unsubscribe();
      socketSub.unsubscribe();
    };
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
        // Backend always returns running immediately after docker run -d
        return this.get$(id);
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
}
