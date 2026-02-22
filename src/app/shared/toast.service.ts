import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(message: string, variant: ToastVariant = 'info', durationMs = 2500) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.toasts.update((list) => [...list, { id, message, variant }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: string) {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
