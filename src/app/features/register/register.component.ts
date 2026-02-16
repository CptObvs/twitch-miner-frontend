import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
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
