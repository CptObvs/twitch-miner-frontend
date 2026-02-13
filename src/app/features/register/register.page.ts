import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4">
      <!-- Animated background blob -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute -top-1/2 -left-1/2 h-full w-full rounded-full bg-twitch/5 blur-3xl animate-pulse"></div>
        <div class="absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-twitch-dark/5 blur-3xl animate-pulse" style="animation-delay: 1s"></div>
      </div>

      <div class="relative w-full max-w-sm space-y-6">

        <div class="text-center">
          <div class="mb-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-twitch/20 to-twitch-dark/20 p-4 ring-1 ring-twitch/30 backdrop-blur-sm">
            <svg class="h-10 w-10 text-twitch-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold bg-gradient-to-r from-twitch-light via-twitch to-twitch-dark bg-clip-text text-transparent">Register</h1>
          <p class="mt-2 text-sm text-gray-400">Create a new account</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 rounded-2xl border border-gray-800/50 bg-gray-900/50 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
          @if (error()) {
            <div class="animate-shake rounded-xl border border-red-500/20 bg-gradient-to-r from-red-900/40 to-red-800/40 p-3 text-sm text-red-300 shadow-lg shadow-red-900/20" role="alert">
              <div class="flex items-center gap-2">
                <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span>{{ error() }}</span>
              </div>
            </div>
          }

          <div>
            <label for="username" class="mb-1 block text-sm font-medium text-gray-300"
              >Username</label
            >
            <input
              id="username"
              formControlName="username"
              type="text"
              autocomplete="username"
              class="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-2.5 text-gray-100 placeholder-gray-500 shadow-inner backdrop-blur-sm transition-all duration-200 focus:border-twitch focus:bg-gray-800 focus:ring-2 focus:ring-twitch/50 focus:outline-none"
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label for="password" class="mb-1 block text-sm font-medium text-gray-300"
              >Password</label
            >
            <input
              id="password"
              formControlName="password"
              type="password"
              autocomplete="new-password"
              class="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-2.5 text-gray-100 placeholder-gray-500 shadow-inner backdrop-blur-sm transition-all duration-200 focus:border-twitch focus:bg-gray-800 focus:ring-2 focus:ring-twitch/50 focus:outline-none"
              placeholder="Choose a password"
            />
          </div>

          <div>
            <label for="code" class="mb-1 block text-sm font-medium text-gray-300"
              >Registration Code</label
            >
            <input
              id="code"
              formControlName="registrationCode"
              type="text"
              class="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-2.5 text-gray-100 placeholder-gray-500 shadow-inner backdrop-blur-sm transition-all duration-200 focus:border-twitch focus:bg-gray-800 focus:ring-2 focus:ring-twitch/50 focus:outline-none"
              placeholder="Enter your invite code"
            />
          </div>

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-twitch to-twitch-dark px-4 py-3 font-semibold text-white shadow-lg shadow-twitch/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-twitch/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
            <span class="relative flex items-center justify-center gap-2">
              @if (loading()) {
                <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              } @else {
                Register
              }
            </span>
          </button>
        </form>

        <p class="text-center text-sm text-gray-400">
          Already have an account?
          <a routerLink="/login" class="font-medium text-twitch-light transition-colors hover:text-twitch hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(NonNullableFormBuilder);

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    registrationCode: ['', Validators.required],
  });

  loading = signal(false);
  error = signal('');

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const { username, password, registrationCode } = this.form.getRawValue();
      await this.auth.register(username, password, registrationCode);
      await this.router.navigate(['/dashboard']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      this.loading.set(false);
    }
  }
}
