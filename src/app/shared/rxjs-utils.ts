import { Signal, WritableSignal } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

/**
 * Execute an Observable and manage a loading signal automatically
 * @param source$ The Observable to execute
 * @param loadingSignal Signal to track loading state
 * @param onSuccess Callback when Observable completes successfully
 * @param onError Optional callback when Observable errors
 */
export function executeWithLoading$<T>(
  source$: Observable<T>,
  loadingSignal: WritableSignal<boolean>,
  onSuccess: (result: T) => void,
  onError?: (error: unknown) => void,
) {
  loadingSignal.set(true);

  return source$.pipe(catchError((err) => of(null as T))).subscribe({
    next: (result) => {
      if (result !== null) {
        onSuccess(result);
      }
      loadingSignal.set(false);
    },
    error: (err) => {
      onError?.(err);
      loadingSignal.set(false);
    },
  });
}

/**
 * Execute an action Observable with automatic loading state management and error handling
 * @param source$ The Observable to execute
 * @param actionLoading Signal to track action loading state
 * @param onSuccess Callback when action succeeds (receives result or null on error)
 * @param onError Optional callback for additional error handling
 */
export function executeAction$<T>(
  source$: Observable<T>,
  actionLoading: WritableSignal<boolean>,
  onSuccess: (result: T | null) => void,
  onError?: () => void,
) {
  actionLoading.set(true);

  return source$.pipe(catchError(() => of(null))).subscribe({
    next: (result) => {
      onSuccess(result);
      actionLoading.set(false);
    },
    error: () => {
      onError?.();
      actionLoading.set(false);
    },
  });
}

/**
 * Execute an Observable that loads data into a signal with loading/error state management
 * @param source$ The Observable to execute
 * @param dataSignal Signal to store the loaded data
 * @param loadingSignal Signal to track loading state
 * @param errorSignal Optional signal to track error state
 * @param defaultValue Default value to use on error
 */
export function loadData$<T>(
  source$: Observable<T>,
  dataSignal: WritableSignal<T>,
  loadingSignal: WritableSignal<boolean>,
  errorSignal?: WritableSignal<string>,
  defaultValue?: T,
) {
  loadingSignal.set(true);
  errorSignal?.set('');

  return source$.pipe(catchError(() => of(defaultValue ?? ([] as T)))).subscribe({
    next: (data) => {
      dataSignal.set(data);
      loadingSignal.set(false);
    },
    error: (err) => {
      errorSignal?.set(err?.message || 'An error occurred');
      loadingSignal.set(false);
    },
  });
}

/**
 * Execute an action with per-item loading tracking using a Set
 * @param source$ The Observable to execute
 * @param itemId The ID of the item being acted upon
 * @param loadingIds Signal containing a Set of IDs currently loading
 * @param onSuccess Callback when action succeeds
 * @param onError Optional callback for error handling
 */
export function executeActionWithId$<T>(
  source$: Observable<T>,
  itemId: string,
  loadingIds: WritableSignal<Set<string>>,
  onSuccess: (result: T | null) => void,
  onError?: () => void,
) {
  // Add to loading set
  loadingIds.update((ids) => {
    const next = new Set(ids);
    next.add(itemId);
    return next;
  });

  return source$.pipe(catchError(() => of(null))).subscribe({
    next: (result) => {
      onSuccess(result);
      // Remove from loading set
      loadingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(itemId);
        return next;
      });
    },
    error: () => {
      onError?.();
      // Remove from loading set
      loadingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(itemId);
        return next;
      });
    },
  });
}
