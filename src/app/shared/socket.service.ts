import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../core/auth/auth.service';
import { environment } from '../../environments/environment';

// Partial instance update pushed by the server after start/stop
export interface InstanceStatusUpdate {
  id: string;
  user_id: string;
  status: 'running' | 'stopped' | 'stopping';
  container_id: string | null;
  port: number | null;
  activation_url: string | null;
  activation_code: string | null;
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private auth = inject(AuthService);
  private socket: Socket | null = null;
  private instanceUpdate$ = new Subject<InstanceStatusUpdate>();

  readonly instanceUpdates$: Observable<InstanceStatusUpdate> =
    this.instanceUpdate$.asObservable();

  connect(): void {
    if (this.socket?.connected) return;

    const apiUrl = new URL(environment.apiBaseUrl);
    const socketHost = apiUrl.origin;
    const socketPath = apiUrl.pathname + '/socket.io';

    this.socket = io(socketHost, {
      path: socketPath,
      auth: { token: this.auth.getToken() },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      console.debug('[SocketService] connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.debug('[SocketService] disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SocketService] connection error:', err.message);
    });

    this.socket.on('instance_update', (data: InstanceStatusUpdate) => {
      this.instanceUpdate$.next(data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.instanceUpdate$.complete();
  }
}
