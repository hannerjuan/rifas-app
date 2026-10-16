import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/errores';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div
      class="flex min-h-screen items-center justify-center bg-gradient-to-br from-marca-900 via-marca-800 to-fuchsia-700 px-4 py-10"
    >
      <form class="tarjeta w-full max-w-sm p-6 sm:p-8" [formGroup]="form" (ngSubmit)="ingresar()">
        <div class="mb-6 text-center">
          <div class="text-4xl" aria-hidden="true">🎟️</div>
          <h1 class="mt-2 text-2xl font-extrabold text-slate-900">Rifas 00-99</h1>
          <p class="text-sm text-slate-500">Panel del administrador</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="etiqueta" for="email">Correo</label>
            <input id="email" type="email" class="campo" formControlName="email" autocomplete="username" />
          </div>
          <div>
            <label class="etiqueta" for="password">Contraseña</label>
            <input id="password" type="password" class="campo" formControlName="password" autocomplete="current-password" />
          </div>
          @if (error()) {
            <p class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{{ error() }}</p>
          }
          <button type="submit" class="btn btn-primario w-full" [disabled]="cargando()">
            {{ cargando() ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </div>

        <a routerLink="/" class="mt-6 block text-center text-sm text-slate-500 hover:text-marca-700">← Volver al portal</a>
      </form>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly volver = input<string>(); // ?volver=/admin/...
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    if (this.auth.autenticado()) this.router.navigate(['/admin']);
  }

  ingresar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Ingrese su correo y contraseña.');
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const destino = this.volver();
        this.router.navigateByUrl(destino?.startsWith('/admin') ? destino : '/admin');
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No fue posible iniciar sesión.'));
        this.cargando.set(false);
      },
    });
  }
}
