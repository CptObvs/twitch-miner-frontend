import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(NonNullableFormBuilder);

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  loading = signal(false);
  error = signal('');

  ensureVisible(event: FocusEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    setTimeout(() => {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }, 220);
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.login(username, password);
      await this.router.navigate(['/dashboard']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Login failed');
    } finally {
      this.loading.set(false);
    }
  }
}
